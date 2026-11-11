import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "projectsImages";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/** URL publik → path di bucket. Hanya untuk file di bucket ini; selain itu null (tidak disentuh). */
function pathFromUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const i = url.indexOf(marker);
  if (i === -1) return null;
  try {
    return decodeURIComponent(url.slice(i + marker.length).split("?")[0]);
  } catch {
    return null;
  }
}

// DELETE /api/projects/:id
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Tidak diizinkan" }, { status: 401 });
  }

  const { id } = await params;
  if (!/^\d{1,10}$/.test(id)) {
    return NextResponse.json({ success: false, error: "ID project tidak valid" }, { status: 400 });
  }

  const db = adminClient();
  if (!db) {
    console.error("[API DELETE /projects] SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY belum di-set");
    return NextResponse.json({ success: false, error: "Server belum dikonfigurasi untuk menulis data" }, { status: 500 });
  }

  // 1. project harus ada
  const found = await db.from("projects").select("id").eq("id", id).maybeSingle();
  if (found.error) {
    console.error("[API DELETE /projects] cek project:", found.error.message);
    return NextResponse.json({ success: false, error: "Gagal membaca project" }, { status: 500 });
  }
  if (!found.data) {
    return NextResponse.json({ success: false, error: "Project tidak ditemukan" }, { status: 404 });
  }

  // 2. simpan salinan baris gambar (untuk dipulihkan jika penghapusan project gagal)
  const imgs = await db.from("project_images").select("id, project_id, position, src").eq("project_id", id);
  if (imgs.error) {
    console.error("[API DELETE /projects] baca project_images:", imgs.error.message);
    return NextResponse.json({ success: false, error: "Gagal membaca gambar project" }, { status: 500 });
  }
  const imageRows = imgs.data ?? [];

  // 3. hapus baris gambar, lalu project
  const delImgs = await db.from("project_images").delete().eq("project_id", id);
  if (delImgs.error) {
    console.error("[API DELETE /projects] hapus project_images:", delImgs.error.message);
    return NextResponse.json({ success: false, error: "Gagal menghapus gambar project" }, { status: 500 });
  }

  const delProject = await db.from("projects").delete().eq("id", id);
  if (delProject.error) {
    console.error("[API DELETE /projects] hapus projects:", delProject.error.message);
    // pulihkan baris gambar agar project tidak kehilangan gambarnya
    if (imageRows.length > 0) {
      const restore = await db.from("project_images").insert(imageRows);
      if (restore.error) console.error("[API DELETE /projects] pulihkan project_images:", restore.error.message);
    }
    return NextResponse.json({ success: false, error: "Gagal menghapus project" }, { status: 500 });
  }

  // 4. berhasil: hapus file gambar di bucket (gagal di sini tidak membatalkan penghapusan)
  const paths = imageRows.map((r) => pathFromUrl(r.src)).filter((p): p is string => !!p);
  if (paths.length > 0) {
    const rm = await db.storage.from(BUCKET).remove(paths);
    if (rm.error) console.error("[API DELETE /projects] hapus file bucket:", rm.error.message);
  }

  revalidatePath("/dashboard/projects");
  return NextResponse.json({ success: true, id });
}