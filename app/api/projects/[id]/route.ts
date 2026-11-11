import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const MAX_IMAGES = 10;

// Client untuk menulis (secret key, hanya di server, melewati RLS)
function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const strList = (v: unknown) =>
  Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string").map((s) => s.trim()).filter(Boolean)
    : [];
const optUrl = (v: unknown): string | null | undefined => {
  const s = str(v);
  if (!s) return null;
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:" ? s : undefined;
  } catch {
    return undefined;
  }
};

const fail = (status: number, error: string, detail?: string) =>
  NextResponse.json({ success: false, error, ...(detail ? { detail } : {}) }, { status });

// PUT /api/projects/[id]
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const db = adminClient();
  if (!db) {
    console.error("[API PUT /projects/:id] SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY belum di-set");
    return fail(500, "Server belum dikonfigurasi untuk menulis data");
  }

  const { id } = await params;

  let raw: Record<string, unknown>;
  try {
    raw = await req.json();
  } catch {
    return fail(400, "Body bukan JSON yang valid");
  }

  const title = str(raw.title);
  const category = str(raw.category);
  const type = str(raw.type);
  const role = str(raw.role);
  const desc = str(raw.desc);
  const url = optUrl(raw.url);
  const repo = optUrl(raw.repo);

  if (!title || !category || !type || !role || !desc) return fail(400, "Isian wajib belum lengkap");
  if (url === undefined || repo === undefined) return fail(400, "URL harus diawali http:// atau https://");

  // gambar: hanya diganti kalau `images` dikirim
  const replaceImages = Array.isArray(raw.images);
  const images = strList(raw.images);
  if (images.length > MAX_IMAGES) return fail(400, `Maksimal ${MAX_IMAGES} gambar`);

  const tab = await db.from("project_tabs").select("id").eq("id", category).maybeSingle();
  if (tab.error || !tab.data) return fail(400, "Kategori tidak dikenal");

  // update baris project (position tidak diubah)
  const upd = await db
    .from("projects")
    .update({ category, title, type, role, tools: strList(raw.tools), desc, highlights: strList(raw.highlights), url, repo })
    .eq("id", id)
    .select("id");

  if (upd.error) {
    console.error("[API PUT /projects/:id] update projects:", upd.error.message);
    return fail(500, "Gagal menyimpan perubahan", upd.error.message);
  }
  if (!upd.data || upd.data.length === 0) return fail(404, "Project tidak ditemukan");

  // ganti seluruh gambar project (simpan salinan lama untuk pemulihan)
  if (replaceImages) {
    const old = await db.from("project_images").select("id, project_id, position, src").eq("project_id", id);
    if (old.error) {
      console.error("[API PUT /projects/:id] baca project_images:", old.error.message);
      return fail(500, "Gagal membaca gambar project", old.error.message);
    }

    const del = await db.from("project_images").delete().eq("project_id", id);
    if (del.error) {
      console.error("[API PUT /projects/:id] hapus project_images:", del.error.message);
      return fail(500, "Gagal memperbarui gambar project", del.error.message);
    }

    if (images.length > 0) {
      const rows = images.map((src, i) => ({ id: `${id}-${i + 1}`, project_id: id, position: i + 1, src }));
      const ins = await db.from("project_images").insert(rows);
      if (ins.error) {
        console.error("[API PUT /projects/:id] insert project_images:", ins.error.message);
        // kembalikan gambar lama agar project tidak kehilangan gambarnya
        if (old.data && old.data.length > 0) await db.from("project_images").insert(old.data);
        return fail(500, "Gagal menyimpan gambar project", ins.error.message);
      }
    }
  }

  return NextResponse.json({ success: true, id });
}