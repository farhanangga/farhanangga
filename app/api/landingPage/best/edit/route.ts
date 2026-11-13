import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/session";

// GET  → daftar project_id best project saat ini, urut menurut position (hanya admin)
// POST → simpan pilihan dari dashboard (field "best" berulang, urutan = urutan tampil)
//
// Aturan: maksimal 6 proyek per bidang/tab. Boleh kurang dari 6.
// Penyimpanan lewat fungsi SQL replace_best_projects (lihat best_projects_admin.sql).
const MAX_PER_TAB = 6;
const MAX_TOTAL = 60; // batas wajar agar request aneh ditolak
const BACK = "/dashboard/landingPage";

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
    const { data, error } = await db().from("best_projects").select("project_id").order("position");
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

  if (ids.length > MAX_TOTAL || new Set(ids).size !== ids.length) {
    return back(req, { error: "best_invalid" });
  }

  try {
    const supabase = db();

    // semua id harus proyek yang ada; kategori dibaca dari database, bukan dari form
    if (ids.length > 0) {
      const { data, error } = await supabase.from("projects").select("id, category").in("id", ids);
      if (error) throw error;
      const rows = (data ?? []) as { id: string; category: string }[];
      if (rows.length !== ids.length) return back(req, { error: "best_invalid" });

      const perTab = new Map<string, number>();
      for (const r of rows) perTab.set(r.category, (perTab.get(r.category) ?? 0) + 1);
      for (const n of perTab.values()) {
        if (n > MAX_PER_TAB) return back(req, { error: "best_max" });
      }
    }

    const { error } = await supabase.rpc("replace_best_projects", { p_ids: ids });
    if (error) throw error;
  } catch (err) {
    console.error("[best POST]", err);
    return back(req, { error: "best_save" });
  }

  return back(req, { saved: "best" });
}