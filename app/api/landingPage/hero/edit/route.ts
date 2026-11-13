import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/session";

const DASH = "/dashboard/landingPage";
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET_LANDING ?? "landingImages";
const MAX_SIZE = 5 * 1024 * 1024;

const noStoreFetch = (input: RequestInfo | URL, init?: RequestInit) => fetch(input, { ...init, cache: "no-store" });

/* ── GET: data hero (publik, dibaca oleh komponen Hero dan halaman dashboard) ── */

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!url || !key) {
      throw new Error("Konfigurasi Supabase belum lengkap.");
    }

    // publishable key: hanya bisa membaca, tunduk pada RLS (policy landing_hero_public_read)
    const supabase = createClient(url, key, {
      auth: { persistSession: false },
      global: { fetch: noStoreFetch },
    });

    const { data, error } = await supabase
      .from("landing_hero")
      .select("nama_lengkap, deskripsi, url_foto")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw error;

    return NextResponse.json({
      data: data
        ? { namaLengkap: data.nama_lengkap, deskripsi: data.deskripsi, urlFoto: data.url_foto }
        : null,
    });
  } catch (error) {
    console.error("[landing hero] GET error:", error);
    return NextResponse.json({ error: "Gagal memuat data hero." }, { status: 500 });
  }
}

/* ── POST: simpan perubahan dari dashboard (butuh login) ── */

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error("Konfigurasi Supabase server belum lengkap.");
  }

  return createClient(url, key, { auth: { persistSession: false }, global: { fetch: noStoreFetch } });
}

const text = (value: FormDataEntryValue | null) => String(value ?? "").trim();

function isHttpUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function extOf(file: File) {
  const dot = file.name.lastIndexOf(".");
  const raw = dot > -1 ? file.name.slice(dot + 1) : file.type.split("/")[1] ?? "";
  return raw.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
}

function back(request: NextRequest, params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  return NextResponse.redirect(new URL(`${DASH}${qs ? `?${qs}` : ""}`, request.url), 303);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL("/admin", request.url), 303);

  let db: ReturnType<typeof adminClient> | null = null;
  let uploadedPath: string | null = null;

  try {
    const formData = await request.formData();

    const namaLengkap = text(formData.get("nama_lengkap"));
    const deskripsi = text(formData.get("deskripsi"));
    const rawUrl = text(formData.get("url_foto"));
    const entry = formData.get("foto");
    const file = entry instanceof File && entry.size > 0 ? entry : null;

    const valid =
      namaLengkap &&
      namaLengkap.length <= 80 &&
      deskripsi &&
      deskripsi.length <= 300 &&
      (!rawUrl || (rawUrl.length <= 500 && isHttpUrl(rawUrl)));
    if (!valid) return back(request, { error: "invalid" });

    if (file && !file.type.startsWith("image/")) return back(request, { error: "photo_type" });
    if (file && file.size > MAX_SIZE) return back(request, { error: "photo_size" });

    db = adminClient();

    // kosong = foto bawaan; file yang diunggah menggantikan isian URL
    let urlFoto: string | null = rawUrl || null;

    if (file) {
      const path = `hero-${Date.now()}.${extOf(file)}`;
      const { error: uploadError } = await db.storage.from(BUCKET).upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (uploadError) {
        console.error("[landing hero] Upload error:", uploadError);
        return back(request, { error: "upload" });
      }
      uploadedPath = path;
      urlFoto = db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    }

    const { error } = await db
      .from("landing_hero")
      .upsert({ id: 1, nama_lengkap: namaLengkap, deskripsi, url_foto: urlFoto });
    if (error) throw error;

    revalidatePath("/");
    revalidatePath(DASH);
    return back(request, { saved: "1" });
  } catch (error) {
    console.error("[landing hero] POST error:", error);
    // jangan tinggalkan file baru yatim di bucket bila data gagal disimpan
    if (uploadedPath && db) await db.storage.from(BUCKET).remove([uploadedPath]).catch(() => {});
    return back(request, { error: "1" });
  }
}