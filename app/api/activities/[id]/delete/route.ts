import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/session";

const BASE = "/dashboard/activities";
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET_ACTIVITIES ?? "activityImages";

type Ctx = { params: Promise<{ id: string }> };

type ImageRow = { id: string; activity_id: string; nama_file: string | null; urutan: number; lokasi_file: string };

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error("Konfigurasi Supabase server belum lengkap.");
  }

  return createClient(url, key, { auth: { persistSession: false } });
}

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url), 303);
}

/** Path file di bucket dari public URL. Null jika bukan file milik bucket ini. */
function storagePathFromUrl(src: string) {
  const marker = `/${BUCKET}/`;
  const i = src.indexOf(marker);
  if (i === -1) return null;
  const path = decodeURIComponent(src.slice(i + marker.length).split("?")[0]);
  return path || null;
}

/* ── POST: hapus kegiatan + gambarnya (dikonfirmasi dengan mengetik "delete <nama kegiatan>") ── */

export async function POST(request: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session) return redirectTo(request, "/admin");

  const { id } = await params;

  try {
    const formData = await request.formData();
    const confirm = String(formData.get("confirm") ?? "").trim();
    const db = adminClient();

    // 1. Kegiatan harus ada
    const { data: activity, error: findError } = await db
      .from("activities")
      .select("id, nama_kegiatan")
      .eq("id", id)
      .maybeSingle();
    if (findError) throw findError;
    if (!activity) return redirectTo(request, `${BASE}?error=notfound`);

    // 2. Teks konfirmasi harus persis (validasi sebenarnya ada di server, bukan hanya atribut pattern)
    if (confirm !== `delete ${activity.nama_kegiatan}`.trim()) {
      return redirectTo(request, `${BASE}?error=delete`);
    }

    // 3. Ambil baris gambar (untuk membersihkan bucket dan untuk cadangan bila gagal)
    const { data: imageData, error: imagesError } = await db
      .from("activity_images")
      .select("id, activity_id, nama_file, urutan, lokasi_file")
      .eq("activity_id", id);
    if (imagesError) throw imagesError;
    const images = (imageData ?? []) as ImageRow[];

    // 4. Hapus baris gambar lalu kegiatannya
    if (images.length > 0) {
      const delImages = await db.from("activity_images").delete().eq("activity_id", id);
      if (delImages.error) throw delImages.error;
    }

    const delActivity = await db.from("activities").delete().eq("id", id);
    if (delActivity.error) {
      // kembalikan baris gambar supaya kegiatan tidak kehilangan gambar
      if (images.length > 0) {
        const restore = await db.from("activity_images").insert(images);
        if (restore.error) console.error("[delete activity] Restore gambar gagal:", restore.error);
      }
      throw delActivity.error;
    }

    // 5. Hapus file dari bucket (terbaik-usaha, tidak membatalkan penghapusan)
    try {
      const paths = images
        .map((img) => img.nama_file || storagePathFromUrl(img.lokasi_file))
        .filter((p): p is string => !!p);
      if (paths.length) {
        const { error } = await db.storage.from(BUCKET).remove(paths);
        if (error) console.error("[delete activity] Hapus file gagal:", error);
      }
    } catch (cleanupError) {
      console.error("[delete activity] Hapus file gagal:", cleanupError);
    }

    revalidatePath(BASE);
    revalidatePath("/activities");
    revalidatePath("/");
    return redirectTo(request, BASE);
  } catch (error) {
    console.error("[delete activity] Error:", error);
    return redirectTo(request, `${BASE}?error=delete`);
  }
}