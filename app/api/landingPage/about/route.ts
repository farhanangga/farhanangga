import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Lokasi: app/api/landingPage/about/route.ts
// GET publik (tanpa login) → dipakai komponen About di landing page.
// Penyimpanan data tetap lewat app/api/dashboard/landingPage/about/route.ts (khusus admin).
const TABLE = "landing_about";
const COLUMNS = "lokasi,email,deskripsi,sorotan,kampus,program_studi,tahun_masuk,tahun_lulus,ipk,peran";

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

/** Klien service role: hanya dipakai di server dan hanya untuk membaca. */
function db() {
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

const toRow = (d: DbRow) => ({
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

export async function GET() {
  try {
    const { data, error } = await db().from(TABLE).select(COLUMNS).eq("id", 1).maybeSingle();
    if (error) throw error;

    return NextResponse.json(
      { data: data ? toRow(data as unknown as DbRow) : null },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[public about GET]", err);
    const detail = process.env.NODE_ENV === "production" ? undefined : (err as { message?: string } | null)?.message;
    return NextResponse.json({ error: "server_error", detail }, { status: 500 });
  }
}