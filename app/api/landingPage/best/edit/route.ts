import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/session";

// GET  → daftar project_id best project saat ini, urut menurut position (hanya admin)
// POST → simpan pilihan dari dashboard (field "best" berulang, urutan = urutan tampil)
//
// Jumlah best project TIDAK dibatasi (per bidang maupun total).
// Penyimpanan lewat fungsi SQL replace_best_projects (lihat best_projects_admin.sql).
const BACK = "/dashboard/landingPage";

/** Ukuran potongan saat memeriksa id ke database (agar URL query tidak terlalu panjang). */
const CHUNK = 100;

/** Klien service role: hanya dipakai di server, setelah session admin dicek. */
function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error(
      `Env Supabase tidak terbaca (url: ${url ? "ada" : "KOSONG"}, secret key: ${key ? "ada" : "KOSONG"})`,
    );
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function redirectTo(req: Request, path: string) {
  return NextResponse.redirect(new URL(path, req.url), 303);
}

function back(req: Request, params: { saved?: string; error?: string }) {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  return redirectTo(req, `${BACK}?${qs}#best`);
}

export async function GET() {
  if (!(await getSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const { data, error } = await db()
      .from("best_projects")
      .select("project_id")
      .order("position", { ascending: true })
      // Supabase membatasi 1000 baris per query; naikkan agar daftar panjang tidak terpotong
      .range(0, 9999);
    if (error) throw error;
    const ids = (data ?? []).map((r) => String((r as { project_id: unknown }).project_id));
    return NextResponse.json({ data: { ids } }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[best GET]", err);
    const detail = process.env.NODE_ENV === "production" ? undefined : (err as { message?: string } | null)?.message;
    return NextResponse.json({ error: "server_error", detail }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await getSession())) return redirectTo(req, "/admin");

  let ids: string[];
  try {
    const form = await req.formData();
    ids = form
      .getAll("best")
      .filter((v): v is string => typeof v === "string")
      .map((v) => v.trim())
      .filter(Boolean);
  } catch {
    return back(req, { error: "best_invalid" });
  }

  // id ganda ditolak; selain itu jumlahnya bebas
  if (new Set(ids).size !== ids.length) {
    return back(req, { error: "best_invalid" });
  }

  try {
    const supabase = db();

    // semua id harus proyek yang ada (dicek per potongan supaya aman untuk daftar panjang)
    let found = 0;
    for (let i = 0; i < ids.length; i += CHUNK) {
      const part = ids.slice(i, i + CHUNK);
      const { data, error } = await supabase.from("projects").select("id").in("id", part);
      if (error) throw error;
      found += (data ?? []).length;
    }
    if (found !== ids.length) return back(req, { error: "best_invalid" });

    const { error } = await supabase.rpc("replace_best_projects", { p_ids: ids });
    if (error) throw error;
  } catch (err) {
    console.error("[best POST]", err);
    return back(req, { error: "best_save" });
  }

  return back(req, { saved: "best" });
}