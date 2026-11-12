import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/session";

const BASE = "/dashboard/projects";
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "projectsImages";

type Ctx = { params: Promise<{ id: string }> };

type ImageRow = { id: string; project_id: string; src: string; position: number };

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

/* ── POST: hapus project + gambarnya (dikonfirmasi dengan mengetik "delete <judul project>") ── */

export async function POST(request: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session) return redirectTo(request, "/admin");

  const { id } = await params;

  try {
    const formData = await request.formData();
    const confirm = String(formData.get("confirm") ?? "").trim();
    const db = adminClient();

    // 1. Project harus ada
    const { data: project, error: findError } = await db
      .from("projects")
      .select("id, title")
      .eq("id", id)
      .maybeSingle();
    if (findError) throw findError;
    if (!project) return redirectTo(request, `${BASE}?error=notfound`);

    // 2. Teks konfirmasi harus persis (validasi sebenarnya ada di server, bukan hanya atribut pattern)
    if (confirm !== `delete ${project.title}`.trim()) {
      return redirectTo(request, `${BASE}?error=delete`);
    }

    // 3. Ambil baris gambar (untuk membersihkan bucket dan untuk cadangan bila gagal)
    const { data: imageData, error: imagesError } = await db
      .from("project_images")
      .select("id, project_id, src, position")
      .eq("project_id", id);
    if (imagesError) throw imagesError;
    const images = (imageData ?? []) as ImageRow[];

    // 4. Hapus baris gambar lalu project-nya
    if (images.length > 0) {
      const delImages = await db.from("project_images").delete().eq("project_id", id);
      if (delImages.error) throw delImages.error;
    }

    const delProject = await db.from("projects").delete().eq("id", id);
    if (delProject.error) {
      // kembalikan baris gambar supaya project tidak kehilangan gambar
      if (images.length > 0) {
        const restore = await db.from("project_images").insert(images);
        if (restore.error) console.error("[delete project] Restore gambar gagal:", restore.error);
      }
      throw delProject.error;
    }

    // 5. Hapus file dari bucket (terbaik-usaha, tidak membatalkan penghapusan)
    try {
      const paths = images
        .map((img) => storagePathFromUrl(img.src))
        .filter((p): p is string => !!p);
      if (paths.length) {
        const { error } = await db.storage.from(BUCKET).remove(paths);
        if (error) console.error("[delete project] Hapus file gagal:", error);
      }
    } catch (cleanupError) {
      console.error("[delete project] Hapus file gagal:", cleanupError);
    }

    revalidatePath(BASE);
    revalidatePath("/projects");
    revalidatePath("/");
    return redirectTo(request, BASE);
  } catch (error) {
    console.error("[delete project] Error:", error);
    return redirectTo(request, `${BASE}?error=delete`);
  }
}