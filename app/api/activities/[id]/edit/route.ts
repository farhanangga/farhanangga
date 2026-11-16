import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/session";

const BASE = "/dashboard/activities";
const MAX_IMAGES = 10;
const MAX_SIZE = 5 * 1024 * 1024;
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET_ACTIVITIES ?? "activityImages";

type Ctx = { params: Promise<{ id: string }> };

// activity_images: nama_file = path file di bucket, lokasi_file = public URL, urutan = posisi
type ImageRow = { id: string; nama_file: string | null; lokasi_file: string | null; urutan: number };
type ActivityRow = {
  id: string;
  nama_kegiatan: string;
  tahun: number | null;
  role: string;
  jobdesc: string;
  deskripsi: string;
};
type Uploaded = { urls: string[]; paths: string[] };

const ACTIVITY_COLUMNS = "id, nama_kegiatan, tahun, role, jobdesc, deskripsi";
const MIN_YEAR = 1900;
const MAX_YEAR = 2100;

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

/** Tahun opsional: "" → null, selain itu harus bilangan bulat 1900–2100. undefined = tidak valid. */
function parseYear(value: string): number | null | undefined {
  if (!value) return null;
  if (!/^\d{4}$/.test(value)) return undefined;
  const year = Number(value);
  return year >= MIN_YEAR && year <= MAX_YEAR ? year : undefined;
}

/** Jobdesc tersimpan sebagai JSON array string, mis. ["a","b"]. Untuk form diubah jadi satu poin per baris. */
function jobdescToText(raw: unknown) {
  if (Array.isArray(raw)) return raw.map((x) => String(x).trim()).filter(Boolean).join("\n");

  const value = String(raw ?? "").trim();
  if (value.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((x) => String(x).trim()).filter(Boolean).join("\n");
      }
    } catch {
      /* bukan JSON valid: pakai apa adanya */
    }
  }
  return value;
}

/** Kebalikannya: satu poin per baris → JSON array string (format yang sama dengan data lama). */
function jobdescFromText(input: string) {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.length ? JSON.stringify(lines) : "";
}

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url), 303);
}

function extOf(file: File) {
  const dot = file.name.lastIndexOf(".");
  const raw = dot > -1 ? file.name.slice(dot + 1) : file.type.split("/")[1] ?? "";
  return raw.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
}

/** Path file di bucket dari public URL. Null jika bukan file milik bucket ini. */
function storagePathFromUrl(src: string) {
  const marker = `/${BUCKET}/`;
  const i = src.indexOf(marker);
  if (i === -1) return null;
  const path = decodeURIComponent(src.slice(i + marker.length).split("?")[0]);
  return path || null;
}

/** Path file di bucket: dari nama_file, atau dari lokasi_file bila nama_file kosong. */
function pathOf(img: ImageRow) {
  return img.nama_file || (img.lokasi_file ? storagePathFromUrl(img.lokasi_file) : null);
}

/** URL publik gambar. Diutamakan dibentuk dari path di bucket (selalu sesuai bucket & project
 *  saat ini), lalu jatuh ke lokasi_file. Kosong hanya jika kedua kolom kosong. */
function imageUrl(db: Db, img: ImageRow) {
  const path = pathOf(img);
  if (path) return db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  return img.lokasi_file ?? "";
}

async function getActivity(db: Db, id: string) {
  const { data, error } = await db
    .from("activities")
    .select(ACTIVITY_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as ActivityRow | null) ?? null;
}

async function getImages(db: Db, id: string) {
  const { data, error } = await db
    .from("activity_images")
    .select("id, nama_file, lokasi_file, urutan")
    .eq("activity_id", id)
    .order("urutan");
  if (error) throw error;
  return (data ?? []) as ImageRow[];
}

/** Unggah dengan nama unik (timestamp + uuid). URL tidak pernah dipakai ulang, jadi aman di-cache lama. */
async function uploadImages(db: Db, files: File[]): Promise<Uploaded> {
  const urls: string[] = [];
  const paths: string[] = [];

  if (files.length === 0) return { urls, paths };

  const store = db.storage.from(BUCKET);

  try {
    for (const file of files) {
      const path = `${Date.now()}-${randomUUID().slice(0, 8)}.${extOf(file)}`;

      const { error } = await store.upload(path, file, {
        contentType: file.type,
        upsert: false,
        cacheControl: "31536000",
      });
      if (error) throw error;

      paths.push(path);
      urls.push(store.getPublicUrl(path).data.publicUrl);
    }

    return { urls, paths };
  } catch (error) {
    if (paths.length) await store.remove(paths).catch(() => {});
    throw error;
  }
}

/* ── GET: data untuk form edit (activity + gambar) ── */

export async function GET(_request: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const db = adminClient();
    const [activity, images] = await Promise.all([getActivity(db, id), getImages(db, id)]);

    if (!activity) {
      return NextResponse.json({ error: "Activity tidak ditemukan." }, { status: 404 });
    }

    const mapped = images.map((img) => ({ id: img.id, src: imageUrl(db, img), position: img.urutan }));

    return NextResponse.json({
      data: { activity: { ...activity, jobdesc: jobdescToText(activity.jobdesc), images: mapped } },
    });
  } catch (error) {
    console.error("[edit activity] GET error:", error);
    return NextResponse.json({ error: "Gagal memuat data activity." }, { status: 500 });
  }
}

/* ── POST: simpan perubahan ────────────────────────────── */

export async function POST(request: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session) return redirectTo(request, "/admin");

  const { id } = await params;
  const editUrl = `${BASE}/${encodeURIComponent(id)}/edit`;

  let uploaded: Uploaded = { urls: [], paths: [] };
  let backup: ActivityRow | null = null;
  let activityUpdated = false;

  try {
    const formData = await request.formData();
    const db = adminClient();

    // 1. Activity harus ada
    const [activity, oldImages] = await Promise.all([getActivity(db, id), getImages(db, id)]);
    if (!activity) return redirectTo(request, `${BASE}?error=notfound`);
    backup = activity;

    // 2. Gambar: yang dihapus, yang dipertahankan (sesuai urutan dari form), dan yang baru
    const removeIds = new Set(formData.getAll("remove").map(String));
    const orderIds = formData.getAll("order").map(String);
    const rank = new Map(orderIds.map((value, index) => [value, index] as const));

    const keptOriginal = oldImages.filter((img) => !removeIds.has(img.id));
    const kept = [...keptOriginal].sort(
      (a, b) =>
        (rank.get(a.id) ?? 1_000_000 + a.urutan) - (rank.get(b.id) ?? 1_000_000 + b.urutan)
    );
    const removed = oldImages.filter((img) => removeIds.has(img.id));
    const reordered = kept.some((img, index) => img.id !== keptOriginal[index].id);

    const files = formData
      .getAll("images")
      .filter((file): file is File => file instanceof File && file.size > 0);

    if (kept.length + files.length > MAX_IMAGES) {
      return redirectTo(request, `${editUrl}?error=limit`);
    }
    if (files.some((file) => !file.type.startsWith("image/"))) {
      return redirectTo(request, `${editUrl}?error=type`);
    }
    if (files.some((file) => file.size > MAX_SIZE)) {
      return redirectTo(request, `${editUrl}?error=size`);
    }

    // 3. Isian
    const fields = {
      nama_kegiatan: text(formData.get("nama_kegiatan")),
      tahun: parseYear(text(formData.get("tahun"))),
      role: text(formData.get("role")),
      jobdesc: jobdescFromText(text(formData.get("jobdesc"))),
      deskripsi: text(formData.get("deskripsi")),
    };

    const valid =
      fields.nama_kegiatan &&
      fields.role &&
      fields.jobdesc &&
      fields.deskripsi &&
      fields.tahun !== undefined;
    if (!valid) return redirectTo(request, `${editUrl}?error=invalid`);

    // 4. Unggah gambar baru (setelah semua isian valid)
    try {
      uploaded = await uploadImages(db, files);
    } catch (error) {
      console.error("[edit activity] Upload error:", error);
      return redirectTo(request, `${editUrl}?error=upload`);
    }

    // 5. Perbarui data activity
    const update = await db
      .from("activities")
      .update({
        nama_kegiatan: fields.nama_kegiatan,
        tahun: fields.tahun,
        role: fields.role,
        jobdesc: fields.jobdesc,
        deskripsi: fields.deskripsi,
      })
      .eq("id", id);
    if (update.error) throw update.error;
    activityUpdated = true;

    // 6. Susun ulang gambar bila ada yang dihapus, ditambah, atau diurutkan ulang
    const imagesChanged = removed.length > 0 || uploaded.urls.length > 0 || reordered;

    if (imagesChanged) {
      const finalFiles = [
        ...kept.map((img) => ({ nama_file: pathOf(img), lokasi_file: imageUrl(db, img) })),
        ...uploaded.urls.map((url, i) => ({ nama_file: uploaded.paths[i], lokasi_file: url })),
      ];
      const rows = finalFiles.map((file, index) => ({
        id: `${id}-${index + 1}`,
        activity_id: id,
        nama_file: file.nama_file,
        urutan: index + 1,
        lokasi_file: file.lokasi_file,
      }));

      const del = await db.from("activity_images").delete().eq("activity_id", id);
      if (del.error) throw del.error;

      if (rows.length > 0) {
        const ins = await db.from("activity_images").insert(rows);
        if (ins.error) {
          // kembalikan baris gambar lama supaya activity tidak kehilangan gambar
          const restore = await db.from("activity_images").insert(
            oldImages.map((img) => ({
              id: img.id,
              activity_id: id,
              nama_file: img.nama_file,
              urutan: img.urutan,
              lokasi_file: img.lokasi_file,
            }))
          );
          if (restore.error) {
            console.error("[edit activity] Restore gambar gagal:", restore.error);
          }
          throw ins.error;
        }
      }
    }

    // 7. Hapus file gambar yang dibuang dari bucket (terbaik-usaha, tidak membatalkan simpan)
    if (removed.length > 0) {
      try {
        const paths = removed.map(pathOf).filter((p): p is string => !!p);
        if (paths.length) await db.storage.from(BUCKET).remove(paths);
      } catch (cleanupError) {
        console.error("[edit activity] Hapus file lama gagal:", cleanupError);
      }
    }

    revalidatePath(BASE);
    revalidatePath(editUrl);
    revalidatePath("/activities");
    revalidatePath("/");
    return redirectTo(request, BASE);
  } catch (error) {
    console.error("[edit activity] Error:", error);

    try {
      const db = adminClient();

      // batalkan perubahan data activity
      if (activityUpdated && backup) {
        const { id: _id, ...original } = backup;
        await db.from("activities").update(original).eq("id", id);
      }

      // jangan tinggalkan gambar baru yatim di bucket
      if (uploaded.paths.length) {
        await db.storage.from(BUCKET).remove(uploaded.paths);
      }
    } catch (cleanupError) {
      console.error("[edit activity] Cleanup error:", cleanupError);
    }

    return redirectTo(request, `${editUrl}?error=1`);
  }
}