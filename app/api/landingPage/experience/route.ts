// app/api/landingPage/experience/route.ts
// GET -> ambil langsung dari Supabase: landing_experience, landing_organization, landing_award.
// Publik & hanya baca (data memang tampil di landing page), jadi tanpa getSession().
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { EmploymentType, Experience } from "@/lib/data";
import type { AwardData, LandingData, Org } from "@/components/landingPage/experience";

/** Klien service role: hanya dipakai di server. */
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

/** Samakan nilai kolom `tipe` (mis. "Full-time", "Magang", "Freelance") ke kunci baku */
function normalizeType(v: unknown): EmploymentType | undefined {
  const raw = String(v ?? "").trim();
  if (!raw) return undefined;
  const t = raw.toLowerCase().replace(/[^a-z]/g, "");
  if (t.includes("free")) return "freelance";
  if (t.includes("intern") || t.includes("magang")) return "internship";
  if (t.includes("full") || t.includes("tetap") || t.includes("karyawan")) return "fulltime";
  return raw as EmploymentType; // nilai lain tetap ditampilkan apa adanya
}

/** jsonb bisa array, string JSON, atau null -> selalu string[] */
function toStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === "string") {
    try {
      const p = JSON.parse(v);
      return Array.isArray(p) ? p.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export async function GET() {
  try {
    const supabase = db();
    const [exp, org, award] = await Promise.all([
      supabase.from("landing_experience").select("*").order("position", { ascending: true }),
      supabase.from("landing_organization").select("*").order("position", { ascending: true }),
      supabase.from("landing_award").select("*").order("position", { ascending: true }),
    ]);
    if (exp.error) throw exp.error;
    if (org.error) throw org.error;
    if (award.error) throw award.error;

    const experiences = (exp.data ?? []).map(
      (r) =>
        ({
          id: String(r.id),
          role: r.jabatan,
          company: r.perusahaan,
          place: r.lokasi,
          type: normalizeType(r.tipe),
          start: r.mulai,
          end: r.selesai ?? undefined, // null = masih aktif
          points: toStringArray(r.deskripsi),
          tools: toStringArray(r.teknologi),
        }) as Experience,
    );

    const data: LandingData = {
      experiences,
      orgs: (org.data ?? []) as Org[],
      awards: (award.data ?? []) as AwardData[],
    };
    return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[landing GET]", err);
    const detail =
      process.env.NODE_ENV === "production" ? undefined : (err as { message?: string } | null)?.message;
    return NextResponse.json({ error: "server_error", detail }, { status: 500 });
  }
}