import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/session";

const BASE = "/dashboard/activities";
const ID_DIGITS = 4;
const IMG_DIGITS = 8;
const MAX_IMAGES = 10;
const MAX_SIZE = 5 * 1024 * 1024;
const BUCKET = process.env.SUPABASE_ACTIVITIES_BUCKET ?? "activitiesImages";

type Uploaded = { names: string[]; paths: string[] };

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error("Konfigurasi Supabase server belum lengkap.");
  }

  return createClient(url, key, { auth: { persistSession: false } });
}

type Db = ReturnType<typeof adminClient>;

const text = (value: FormDataEntryValue | null) => String(value ?? "").trim();

const lines = (value: FormDataEntryValue | null) =>
  String(value ?? "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url), 303);
}

/** Tahun opsional: kosong = null, selain itu bilangan bulat 1900–2100. NaN = tidak valid. */
function parseYear(value: string): number | null {
  if (!value) return null;
  if (!/^\d{4}$/.test(value)) return NaN;
  const year = Number(value);
  return year >= 1900 && year <= 2100 ? year : NaN;
}

function extOf(file: File) {
  const dot = file.name.lastIndexOf(".");
  const raw = dot > -1 ? file.name.slice(dot + 1) : file.type.split("/")[1] ?? "";
  return raw.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
}

/** ID berikutnya: angka tertinggi yang sudah ada + 1, dipad 4 digit. */
function nextActivityId(rows: { id: string }[]) {
  const max = rows.reduce(
    (maximum, row) => (/^\d+$/.test(row.id) ? Math.max(maximum, Number(row.id)) : maximum),
    0
  );
  return String(max + 1).padStart(ID_DIGITS, "0");
}

async function getIds(db: Db) {
  const { data, error } = await db.from("activities").select("id");
  if (error) throw error;
  return (data ?? []) as { id: string }[];
}

/** Unggah berurutan (00000001.jpg, 00000002.png, …) ke root bucket. Bentrok nama → nomor dinaikkan. */
async function uploadImages(db: Db, files: File[]): Promise<Uploaded> {
  const names: string[] = [];
  const paths: string[] = [];

  if (files.length === 0) return { names, paths };

  const store = db.storage.from(BUCKET);

  try {
    const { data, error } = await store.list("", {
      limit: 1000,
      sortBy: { column: "name", order: "desc" },
    });
    if (error) throw error;

    let max = 0;
    for (const file of data ?? []) {
      const match = new RegExp(`^(\\d{${IMG_DIGITS}})\\.`).exec(file.name);
      if (match) max = Math.max(max, Number(match[1]));
    }

    let number = max + 1;

    for (const file of files) {
      let saved = false;

      for (let attempt = 0; attempt < 5 && !saved; attempt++) {
        const name = `${String(number).padStart(IMG_DIGITS, "0")}.${extOf(file)}`;

        const { error: uploadError } = await store.upload(name, file, {
          contentType: file.type,
          upsert: false,
        });

        if (!uploadError) {
          names.push(name);
          paths.push(name);
          saved = true;
        } else if (
          /already exists|duplicate/i.test(uploadError.message) ||
          (uploadError as { statusCode?: string }).statusCode === "409"
        ) {
          // Nomor sudah dipakai pihak lain, coba nomor berikutnya.
        } else {
          throw uploadError;
        }

        number++;
      }

      if (!saved) throw new Error("Nomor gambar bentrok terus-menerus.");
    }

    return { names, paths };
  } catch (error) {
    if (paths.length) await store.remove(paths).catch(() => {});
    throw error;
  }
}

/* ── GET: data untuk form (ID berikutnya) ──────────────── */

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = adminClient();
    return NextResponse.json({ data: { nextId: nextActivityId(await getIds(db)) } });
  } catch (error) {
    console.error("[create activity] GET error:", error);
    return NextResponse.json({ error: "Gagal memuat data form." }, { status: 500 });
  }
}

/* ── POST: simpan kegiatan baru ────────────────────────── */

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return redirectTo(request, "/admin");

  const newUrl = `${BASE}/new`;

  let uploaded: Uploaded = { names: [], paths: [] };
  let activityId = "";
  let activityInserted = false;

  try {
    const formData = await request.formData();

    // 1. Validasi gambar
    const files = formData
      .getAll("images")
      .filter((file): file is File => file instanceof File && file.size > 0);

    if (files.length > MAX_IMAGES) return redirectTo(request, `${newUrl}?error=limit`);
    if (files.some((file) => !file.type.startsWith("image/"))) {
      return redirectTo(request, `${newUrl}?error=type`);
    }
    if (files.some((file) => file.size > MAX_SIZE)) return redirectTo(request, `${newUrl}?error=size`);

    // 2. Validasi isian
    const fields = {
      nama: text(formData.get("nama_kegiatan")),
      tahun: text(formData.get("tahun")),
      role: text(formData.get("role")),
      deskripsi: text(formData.get("deskripsi")),
    };
    const year = parseYear(fields.tahun);

    if (!fields.nama || !fields.role || !fields.deskripsi || Number.isNaN(year)) {
      return redirectTo(request, `${newUrl}?error=invalid`);
    }

    // 3. Koneksi + ID baru
    const db = adminClient();
    activityId = nextActivityId(await getIds(db));

    // 4. Unggah gambar (setelah semua isian valid, supaya tidak ada upload sia-sia)
    try {
      uploaded = await uploadImages(db, files);
    } catch (error) {
      console.error("[create activity] Upload error:", error);
      return redirectTo(request, `${newUrl}?error=upload`);
    }

    // 5. Simpan kegiatan
    const insertActivity = await db.from("activities").insert({
      id: activityId,
      nama_kegiatan: fields.nama,
      tahun: year,
      role: fields.role,
      jobdesc: lines(formData.get("jobdesc")),
      deskripsi: fields.deskripsi,
    });
    if (insertActivity.error) throw insertActivity.error;
    activityInserted = true;

    // 6. Simpan gambar
    if (uploaded.names.length > 0) {
      const rows = uploaded.names.map((name, index) => ({
        id: `${activityId}-${index + 1}`,
        activity_id: activityId,
        nama_file: name,
        urutan: index + 1,
        lokasi_file: "",
      }));

      const insertImages = await db.from("activity_images").insert(rows);
      if (insertImages.error) throw insertImages.error;
    }

    revalidatePath(BASE);
    revalidatePath("/activities");
    return redirectTo(request, BASE);
  } catch (error) {
    console.error("[create activity] Error:", error);

    try {
      const db = adminClient();

      // jangan tinggalkan kegiatan tanpa gambar-gambarnya
      if (activityInserted && activityId) {
        await db.from("activities").delete().eq("id", activityId);
      }

      // jangan tinggalkan gambar yatim di bucket
      if (uploaded.paths.length) {
        await db.storage.from(BUCKET).remove(uploaded.paths);
      }
    } catch (cleanupError) {
      console.error("[create activity] Cleanup error:", cleanupError);
    }

    return redirectTo(request, `${newUrl}?error=1`);
  }
}