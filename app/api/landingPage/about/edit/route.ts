import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/session";

// Lokasi: app/api/landingPage/about/edit/route.ts  (URL: /api/landingPage/about/edit)
// GET  → baca baris "Tentang saya" (hanya admin yang login)
// POST → simpan dari form dashboard, lalu redirect balik ke halaman dashboard
const TABLE = "landing_about";
const BACK = "/dashboard/landingPage";

type AboutRow = {
  lokasi: string;
  email: string;
  deskripsi: string;
  sorotan: string[];
  kampus: string;
  programStudi: string;
  tahunMasuk: number;
  tahunLulus: number;
  ipk: number;
  peran: string[];
};

type DbRow = {
  lokasi: string;
  email: string;
  deskripsi: string;
  sorotan: string[] | null;
  kampus: string;
  program_studi: string;
  tahun_masuk: number;
  tahun_lulus: number;
  ipk: number | string;
  peran: string[] | null;
};

const COLUMNS = "lokasi,email,deskripsi,sorotan,kampus,program_studi,tahun_masuk,tahun_lulus,ipk,peran";

/** Klien service role: hanya dipakai di server, setelah session admin dicek. */
function db() {
  // beberapa nama env yang umum dipakai; pakai yang ada
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE ??
    process.env.SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      `Env Supabase tidak terbaca (url: ${url ? "ada" : "KOSONG"}, service role key: ${key ? "ada" : "KOSONG"})`,
    );
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

const toRow = (d: DbRow): AboutRow => ({
  lokasi: d.lokasi,
  email: d.email,
  deskripsi: d.deskripsi,
  sorotan: d.sorotan ?? [],
  kampus: d.kampus,
  programStudi: d.program_studi,
  tahunMasuk: Number(d.tahun_masuk),
  tahunLulus: Number(d.tahun_lulus),
  ipk: Number(d.ipk),
  peran: d.peran ?? [],
});

/* ── validasi form ─────────────────────────────────────── */

function text(form: FormData, key: string, max: number): string | null {
  const v = form.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length >= 1 && t.length <= max ? t : null;
}

/** "a, b, c" atau satu item per baris → daftar unik. null bila tidak valid. */
function list(form: FormData, key: string, opts: { min: number; maxItems: number; maxLen: number }): string[] | null {
  const v = form.get(key);
  if (typeof v !== "string") return null;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of v.split(/[,\n]/)) {
    const t = raw.trim();
    if (!t) continue;
    if (t.length > opts.maxLen) return null;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  if (out.length < opts.min || out.length > opts.maxItems) return null;
  return out;
}

function int(form: FormData, key: string, min: number, max: number): number | null {
  const v = form.get(key);
  if (typeof v !== "string" || !/^\d{1,4}$/.test(v.trim())) return null;
  const n = Number(v.trim());
  return n >= min && n <= max ? n : null;
}

function ipk(form: FormData): number | null {
  const v = form.get("ipk");
  if (typeof v !== "string") return null;
  const n = Number(v.trim().replace(",", "."));
  if (!Number.isFinite(n) || n < 0 || n > 4) return null;
  return Math.round(n * 100) / 100;
}

function parse(form: FormData): AboutRow | null {
  const lokasi = text(form, "lokasi", 80);
  const email = text(form, "email", 120);
  const deskripsi = text(form, "deskripsi", 600);
  const kampus = text(form, "kampus", 100);
  const programStudi = text(form, "program_studi", 100);
  const tahunMasuk = int(form, "tahun_masuk", 1990, 2100);
  const tahunLulus = int(form, "tahun_lulus", 1990, 2100);
  const nilai = ipk(form);
  const sorotan = list(form, "sorotan", { min: 0, maxItems: 20, maxLen: 40 });
  const peran = list(form, "peran", { min: 1, maxItems: 8, maxLen: 30 });

  if (
    !lokasi || !email || !deskripsi || !kampus || !programStudi ||
    tahunMasuk === null || tahunLulus === null || nilai === null || !sorotan || !peran
  ) {
    return null;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  if (tahunLulus < tahunMasuk) return null;

  return { lokasi, email, deskripsi, sorotan, kampus, programStudi, tahunMasuk, tahunLulus, ipk: nilai, peran };
}

/* ── handler ───────────────────────────────────────────── */

function redirectTo(req: Request, path: string) {
  return NextResponse.redirect(new URL(path, req.url), 303);
}

function back(req: Request, params: { saved?: string; error?: string }) {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  return redirectTo(req, `${BACK}?${qs}#about`);
}

export async function GET() {
  if (!(await getSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const { data, error } = await db().from(TABLE).select(COLUMNS).eq("id", 1).maybeSingle();
    if (error) throw error;
    return NextResponse.json(
      { data: data ? toRow(data as unknown as DbRow) : null },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[about GET]", err);
    // detail hanya muncul saat development, supaya penyebabnya langsung terlihat di browser
    const detail = process.env.NODE_ENV === "production" ? undefined : (err as { message?: string } | null)?.message;
    return NextResponse.json({ error: "server_error", detail }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await getSession())) return redirectTo(req, "/admin");

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return back(req, { error: "about_invalid" });
  }

  const v = parse(form);
  if (!v) return back(req, { error: "about_invalid" });

  try {
    const { error } = await db()
      .from(TABLE)
      .upsert(
        {
          id: 1,
          lokasi: v.lokasi,
          email: v.email,
          deskripsi: v.deskripsi,
          sorotan: v.sorotan,
          kampus: v.kampus,
          program_studi: v.programStudi,
          tahun_masuk: v.tahunMasuk,
          tahun_lulus: v.tahunLulus,
          ipk: v.ipk,
          peran: v.peran,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );
    if (error) throw error;
  } catch (err) {
    console.error("[about POST]", err);
    return back(req, { error: "about_save" });
  }

  return back(req, { saved: "about" });
}