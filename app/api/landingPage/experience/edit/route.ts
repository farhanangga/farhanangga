import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/session";

// GET  → data mentah 3 tabel (landing_experience, landing_organization, landing_award) untuk dashboard (hanya admin)
// POST → simpan satu bagian dari dashboard. Field "section" = experience | organization | award.
//        Baris dikirim dengan nama "<prefix>.<indeks>.<field>" (prefix: exp / org / awd).
//
// Aturan simpan (aman, tidak menghapus massal):
// - baris yang punya id → diperbarui; baris tanpa id (baru) → ditambahkan; baris kosong tanpa id → diabaikan
// - baris dihapus HANYA bila kotak "hapus" dicentang
// - kolom position dibuat ulang menurut field "urutan" (lalu urutan baris di form)
const BACK = "/dashboard/landingPage";
const MAX_ROWS = 30; // baris tersimpan per bagian
const MAX_INDEX = 80; // batas wajar indeks field agar request aneh ditolak
const TYPES = ["freelance", "internship", "fulltime"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  return redirectTo(req, `${BACK}?${qs}#experience`);
}

/* ── pembersih input ───────────────────────────────────── */

type Raw = Record<string, string>;
type Values = Record<string, unknown>;

/** Teks wajib (1..max) atau null. */
function text(v: string | undefined, max: number): string | null {
  const t = (v ?? "").trim();
  return t && t.length <= max ? t : null;
}

function isDate(v: string | undefined): v is string {
  return !!v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
}

/** jsonb dari DB → string[] */
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

/** "<prefix>.<i>.<field>" → daftar baris urut menurut indeks. null = ada indeks tidak wajar. */
function parseRows(form: FormData, prefix: string): Raw[] | null {
  const map = new Map<number, Raw>();
  const re = new RegExp(`^${prefix}\\.(\\d+)\\.([a-z_]+)$`);
  for (const [k, v] of form.entries()) {
    if (typeof v !== "string") continue;
    const m = k.match(re);
    if (!m) continue;
    const i = Number(m[1]);
    if (i > MAX_INDEX) return null;
    const row = map.get(i) ?? {};
    row[m[2]] = v;
    map.set(i, row);
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([, r]) => r);
}

/* ── definisi tiap bagian ──────────────────────────────── */

type Spec = {
  table: string;
  prefix: string;
  fields: string[]; // field isian (untuk mendeteksi baris baru yang masih kosong)
  saved: string; // nilai ?saved=
  errKey: string; // awalan kunci error (?error=<errKey>_invalid / _save)
  build: (r: Raw) => Values | null; // null = tidak valid
};

const SPECS: Record<string, Spec> = {
  experience: {
    table: "landing_experience",
    prefix: "exp",
    fields: ["jabatan", "perusahaan", "lokasi", "mulai", "selesai", "deskripsi", "teknologi"],
    saved: "experience",
    errKey: "experience",
    build: (r) => {
      const jabatan = text(r.jabatan, 120);
      const perusahaan = text(r.perusahaan, 120);
      const lokasi = text(r.lokasi, 120);
      const tipe = TYPES.includes(r.tipe ?? "") ? r.tipe : null;
      if (!jabatan || !perusahaan || !lokasi || !tipe || !isDate(r.mulai)) return null;

      const selesai = (r.selesai ?? "").trim();
      if (selesai && (!isDate(selesai) || selesai < r.mulai)) return null;

      const deskripsi = (r.deskripsi ?? "")
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (deskripsi.length > 12 || deskripsi.some((s) => s.length > 300)) return null;

      const teknologi = Array.from(
        new Set(
          (r.teknologi ?? "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        ),
      );
      if (teknologi.length > 20 || teknologi.some((s) => s.length > 40)) return null;

      return { jabatan, perusahaan, lokasi, tipe, mulai: r.mulai, selesai: selesai || null, deskripsi, teknologi };
    },
  },
  organization: {
    table: "landing_organization",
    prefix: "org",
    fields: ["jabatan", "lembaga", "periode"],
    saved: "organization",
    errKey: "org",
    build: (r) => {
      const jabatan = text(r.jabatan, 120);
      const lembaga = text(r.lembaga, 120);
      const periode = text(r.periode, 40);
      return jabatan && lembaga && periode ? { jabatan, lembaga, periode } : null;
    },
  },
  award: {
    table: "landing_award",
    prefix: "awd",
    fields: ["judul", "penerbit", "tahun"],
    saved: "award",
    errKey: "award",
    build: (r) => {
      const judul = text(r.judul, 160);
      const penerbit = text(r.penerbit, 120);
      const tahun = text(r.tahun, 20);
      return judul && penerbit && tahun ? { judul, penerbit, tahun } : null;
    },
  },
};

/* ── GET ───────────────────────────────────────────────── */

export async function GET() {
  if (!(await getSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const supabase = db();
    const [exp, org, awd] = await Promise.all([
      supabase.from("landing_experience").select("*").order("position", { ascending: true }),
      supabase.from("landing_organization").select("*").order("position", { ascending: true }),
      supabase.from("landing_award").select("*").order("position", { ascending: true }),
    ]);
    if (exp.error) throw exp.error;
    if (org.error) throw org.error;
    if (awd.error) throw awd.error;

    const experiences = (exp.data ?? []).map((r) => ({
      id: String(r.id),
      position: Number(r.position) || 0,
      jabatan: String(r.jabatan ?? ""),
      perusahaan: String(r.perusahaan ?? ""),
      lokasi: String(r.lokasi ?? ""),
      tipe: r.tipe ? String(r.tipe) : null,
      mulai: String(r.mulai ?? ""),
      selesai: r.selesai ? String(r.selesai) : null,
      deskripsi: toStringArray(r.deskripsi),
      teknologi: toStringArray(r.teknologi),
    }));

    return NextResponse.json(
      { data: { experiences, orgs: org.data ?? [], awards: awd.data ?? [] } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[experience edit GET]", err);
    const detail = process.env.NODE_ENV === "production" ? undefined : (err as { message?: string } | null)?.message;
    return NextResponse.json({ error: "server_error", detail }, { status: 500 });
  }
}

/* ── POST ──────────────────────────────────────────────── */

export async function POST(req: Request) {
  if (!(await getSession())) return redirectTo(req, "/admin");

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return back(req, { error: "experience_invalid" });
  }

  const section = String(form.get("section") ?? "");
  const spec = Object.prototype.hasOwnProperty.call(SPECS, section) ? SPECS[section] : null;
  if (!spec) return back(req, { error: "experience_invalid" });
  const invalid = { error: `${spec.errKey}_invalid` };

  const rows = parseRows(form, spec.prefix);
  if (!rows) return back(req, invalid);

  // pilah: dihapus / dipertahankan (baru atau diperbarui)
  const removed: string[] = [];
  const keep: { id?: string; order: number; values: Values }[] = [];

  for (let idx = 0; idx < rows.length; idx++) {
    const r = rows[idx];
    const id = (r.id ?? "").trim() || undefined;
    if (id && !UUID.test(id)) return back(req, invalid);

    if (r.hapus === "1") {
      if (id) removed.push(id);
      continue;
    }
    const blank = spec.fields.every((f) => !(r[f] ?? "").trim());
    if (blank && !id) continue; // baris baru yang tidak diisi

    const values = spec.build(r);
    if (!values) return back(req, invalid);

    const n = Number((r.urutan ?? "").trim());
    // urutan kosong → taruh di akhir; indeks menjaga urutan yang stabil
    const order = (r.urutan ?? "").trim() !== "" && Number.isFinite(n) ? n : 1e6;
    keep.push({ id, order: order * 1000 + idx, values });
  }

  if (keep.length > MAX_ROWS) return back(req, invalid);
  keep.sort((a, b) => a.order - b.order);

  try {
    const supabase = db();

    // id yang dikirim harus benar-benar ada di tabel
    const { data: existing, error: selErr } = await supabase.from(spec.table).select("id");
    if (selErr) throw selErr;
    const known = new Set((existing ?? []).map((r) => String((r as { id: unknown }).id)));
    if (keep.some((k) => k.id && !known.has(k.id))) return back(req, invalid);

    const toDelete = Array.from(new Set(removed)).filter((id) => known.has(id));
    if (toDelete.length > 0) {
      const { error } = await supabase.from(spec.table).delete().in("id", toDelete);
      if (error) throw error;
    }

    const updates = keep
      .map((k, i) => ({ k, position: i + 1 }))
      .filter(({ k }) => k.id)
      .map(({ k, position }) => ({ id: k.id, position, ...k.values }));
    const inserts = keep
      .map((k, i) => ({ k, position: i + 1 }))
      .filter(({ k }) => !k.id)
      .map(({ k, position }) => ({ position, ...k.values }));

    if (updates.length > 0) {
      const { error } = await supabase.from(spec.table).upsert(updates, { onConflict: "id" });
      if (error) throw error;
    }
    if (inserts.length > 0) {
      const { error } = await supabase.from(spec.table).insert(inserts);
      if (error) throw error;
    }
  } catch (err) {
    console.error(`[experience edit POST ${section}]`, err);
    return back(req, { error: `${spec.errKey}_save` });
  }

  return back(req, { saved: spec.saved });
}