import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { ProjectCategory, ProjectItem, ProjectTab } from "@/lib/data";

const MAX_IMAGES = 10;

// Client Supabase untuk membaca (publishable key, tunduk pada RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  { auth: { persistSession: false } }
);

// Client Supabase untuk menulis (secret key, hanya di server, melewati RLS).
// Dibuat saat dibutuhkan supaya GET tetap jalan walau key ini belum di-set.
function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// GET /api/projects
export async function GET() {
  // Ambil 3 tabel sekaligus
  const [tabsRes, projectsRes, imagesRes] = await Promise.all([
    supabase.from("project_tabs").select("*").order("sort_order"),
    supabase.from("projects").select("*").order("position"),
    supabase.from("project_images").select("project_id, position, src").order("position"),
  ]);

  const failed = [
    ["project_tabs", tabsRes.error],
    ["projects", projectsRes.error],
    ["project_images", imagesRes.error],
  ].find(([, err]) => err);

  if (failed) {
    const [table, err] = failed as [string, { message: string }];
    console.error(`[API /projects] ${table}:`, err.message);
    return NextResponse.json(
      { success: false, error: `Gagal membaca tabel ${table}`, detail: err.message },
      { status: 500 }
    );
  }

  // Kelompokkan gambar per proyek (maks 10, sudah terurut dari query)
  const imagesByProject = new Map<string, string[]>();
  for (const img of imagesRes.data ?? []) {
    const list = imagesByProject.get(img.project_id) ?? [];
    if (list.length < MAX_IMAGES) list.push(img.src);
    imagesByProject.set(img.project_id, list);
  }

  // Ubah baris proyek ke bentuk ProjectItem
  const items: ProjectItem[] = (projectsRes.data ?? []).map((r) => ({
    id: r.id,
    category: r.category as ProjectCategory,
    title: r.title,
    type: r.type,
    role: r.role,
    tools: r.tools ?? [],
    desc: r.desc,
    highlights: r.highlights ?? [],
    url: r.url ?? undefined,
    repo: r.repo ?? undefined,
    images: imagesByProject.get(r.id) ?? [],
  }));

  // Kelompokkan proyek per tab
  const data: ProjectTab[] = (tabsRes.data ?? []).map((t) => ({
    id: t.id as ProjectCategory,
    label: t.label,
    short: t.short,
    typeLabel: t.type_label,
    toolsLabel: t.tools_label,
    linkLabel: t.link_label ?? undefined,
    projects: items.filter((p) => p.category === t.id),
  }));

  const count = data.reduce((total, tab) => total + tab.projects.length, 0);

  return NextResponse.json(
    { success: true, count, data },
    { headers: { "Cache-Control": "no-store" } }
  );
}

/* ── POST /api/projects ────────────────────────────────── */

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

export async function POST(req: Request) {
  const db = adminClient();
  if (!db) {
    console.error("[API POST /projects] SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY belum di-set");
    return NextResponse.json({ success: false, error: "Server belum dikonfigurasi untuk menulis data" }, { status: 500 });
  }

  let raw: Record<string, unknown>;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Body bukan JSON yang valid" }, { status: 400 });
  }

  const id = str(raw.id);
  const title = str(raw.title);
  const category = str(raw.category);
  const type = str(raw.type);
  const role = str(raw.role);
  const desc = str(raw.desc);
  const url = optUrl(raw.url);
  const repo = optUrl(raw.repo);
  const images = strList(raw.images);

  if (!/^\d{1,10}$/.test(id) || !title || !category || !type || !role || !desc) {
    return NextResponse.json({ success: false, error: "Isian wajib belum lengkap" }, { status: 400 });
  }
  if (url === undefined || repo === undefined) {
    return NextResponse.json({ success: false, error: "URL harus diawali http:// atau https://" }, { status: 400 });
  }
  if (images.length > MAX_IMAGES) {
    return NextResponse.json({ success: false, error: `Maksimal ${MAX_IMAGES} gambar` }, { status: 400 });
  }

  // kategori harus ada di project_tabs
  const tab = await db.from("project_tabs").select("id").eq("id", category).maybeSingle();
  if (tab.error || !tab.data) {
    return NextResponse.json({ success: false, error: "Kategori tidak dikenal" }, { status: 400 });
  }

  // kolom `position` NOT NULL → taruh di urutan paling akhir
  const last = await db.from("projects").select("position").order("position", { ascending: false }).limit(1);
  if (last.error) {
    console.error("[API POST /projects] baca position:", last.error.message);
    return NextResponse.json({ success: false, error: "Gagal membaca urutan project" }, { status: 500 });
  }
  const position = (last.data?.[0]?.position ?? 0) + 1;

  const ins = await db.from("projects").insert({
    id,
    category,
    title,
    type,
    role,
    tools: strList(raw.tools),
    desc,
    highlights: strList(raw.highlights),
    url,
    repo,
    position,
  });

  if (ins.error) {
    console.error("[API POST /projects] insert projects:", ins.error.message);
    const duplicate = ins.error.code === "23505";
    return NextResponse.json(
      { success: false, error: duplicate ? "ID project sudah dipakai" : "Gagal menyimpan project", detail: ins.error.message },
      { status: duplicate ? 409 : 500 }
    );
  }

  if (images.length > 0) {
    const rows = images.map((src, i) => ({
      id: `${id}-${i + 1}`,
      project_id: id,
      position: i + 1,
      src,
    }));
    const imgIns = await db.from("project_images").insert(rows);

    if (imgIns.error) {
      console.error("[API POST /projects] insert project_images:", imgIns.error.message);
      // jangan tinggalkan project tanpa gambar-gambarnya
      await db.from("projects").delete().eq("id", id);
      return NextResponse.json(
        { success: false, error: "Gagal menyimpan gambar project", detail: imgIns.error.message },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true, id }, { status: 201 });
}