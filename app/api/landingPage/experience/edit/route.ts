// app/api/landingPage/experience/edit/route.ts
//
// GET  -> { data: { experiences, orgs, awards } }   (baca; konten memang publik di website)
// POST -> body JSON { section: "experience" | "organization" | "award", items: [...] }
//         Menyinkronkan SATU tabel dengan daftar yang dikirim:
//           - item dengan id yang sudah ada  -> diperbarui
//           - item tanpa id                  -> ditambahkan
//           - baris di database yang tidak ada di daftar -> dihapus
//           - kolom position = urutan item di daftar (mulai dari 1)
//         Hanya untuk admin (butuh session).

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/session";
import type {
  AwardRow,
  ExpRow,
  OrgRow,
} from "@/components/dashboard/experienceEditor";

const TABLES = {
  experience: "landing_experience",
  organization: "landing_organization",
  award: "landing_award",
} as const;
type Section = keyof typeof TABLES;

const LABEL: Record<Section, string> = {
  experience: "Pengalaman",
  organization: "Organisasi",
  award: "Penghargaan",
};

const MAX_ITEMS = 50;
const TIPE = ["fulltime", "internship", "freelance"];

class InvalidInput extends Error {}

/* ── koneksi Supabase (server only, pakai secret key) ──────────────── */

function getDb(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Env Supabase belum lengkap (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY)");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/* ── normalisasi baris dari database ───────────────────────────────── */

type Raw = Record<string, unknown>;
const s = (v: unknown) => (v == null ? "" : String(v));

/** jsonb bisa datang sebagai array, string JSON, atau kosong -> selalu string[]. */
function toArr(v: unknown): string[] {
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

const normExp = (r: Raw): ExpRow => ({
  id: s(r.id),
  position: Number(r.position) || 0,
  jabatan: s(r.jabatan),
  perusahaan: s(r.perusahaan),
  lokasi: s(r.lokasi),
  tipe: r.tipe ? s(r.tipe) : null,
  mulai: s(r.mulai).slice(0, 10),
  selesai: r.selesai ? s(r.selesai).slice(0, 10) : null,
  deskripsi: toArr(r.deskripsi),
  teknologi: toArr(r.teknologi),
});

const normOrg = (r: Raw): OrgRow => ({
  id: s(r.id),
  position: Number(r.position) || 0,
  jabatan: s(r.jabatan),
  lembaga: s(r.lembaga),
  periode: s(r.periode),
});

const normAward = (r: Raw): AwardRow => ({
  id: s(r.id),
  position: Number(r.position) || 0,
  judul: s(r.judul),
  penerbit: s(r.penerbit),
  tahun: s(r.tahun),
});

async function readTable(db: SupabaseClient, section: Section): Promise<Raw[]> {
  const { data, error } = await db
    .from(TABLES[section])
    .select("*")
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Raw[];
}

async function readSection(db: SupabaseClient, section: Section) {
  const rows = await readTable(db, section);
  if (section === "experience") return rows.map(normExp);
  if (section === "organization") return rows.map(normOrg);
  return rows.map(normAward);
}

/* ── validasi payload ──────────────────────────────────────────────── */

function text(o: Raw, k: string, label: string, max: number, where: string): string {
  const v = typeof o[k] === "string" ? (o[k] as string).trim() : "";
  if (!v) throw new InvalidInput(`${where}: ${label} wajib diisi.`);
  if (v.length > max) throw new InvalidInput(`${where}: ${label} maksimal ${max} karakter.`);
  return v;
}

function list(o: Raw, k: string, label: string, maxItems: number, maxLen: number, where: string): string[] {
  const raw = o[k];
  if (raw == null) return [];
  if (!Array.isArray(raw)) throw new InvalidInput(`${where}: ${label} tidak valid.`);
  const out = Array.from(new Set(raw.map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean)));
  if (out.length > maxItems) throw new InvalidInput(`${where}: ${label} maksimal ${maxItems}.`);
  if (out.some((x) => x.length > maxLen)) {
    throw new InvalidInput(`${where}: tiap poin ${label} maksimal ${maxLen} karakter.`);
  }
  return out;
}

function isDate(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

type Parsed = Raw & { id?: string };

function parseItem(section: Section, raw: unknown, i: number): Parsed {
  const where = `${LABEL[section]} #${i + 1}`;
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new InvalidInput(`${where}: format data tidak valid.`);
  }
  const o = raw as Raw;
  const id = typeof o.id === "string" && o.id ? o.id : undefined;

  if (section === "experience") {
    const tipe = typeof o.tipe === "string" ? o.tipe : "";
    if (!TIPE.includes(tipe)) throw new InvalidInput(`${where}: tipe tidak valid.`);

    const mulai = typeof o.mulai === "string" ? o.mulai : "";
    if (!isDate(mulai)) throw new InvalidInput(`${where}: tanggal mulai wajib diisi dan harus valid.`);

    const selesaiRaw = typeof o.selesai === "string" && o.selesai ? o.selesai : null;
    if (selesaiRaw && !isDate(selesaiRaw)) throw new InvalidInput(`${where}: tanggal selesai tidak valid.`);
    if (selesaiRaw && selesaiRaw < mulai) {
      throw new InvalidInput(`${where}: tanggal selesai tidak boleh sebelum tanggal mulai.`);
    }

    return {
      id,
      jabatan: text(o, "jabatan", "jabatan", 120, where),
      perusahaan: text(o, "perusahaan", "perusahaan", 120, where),
      lokasi: text(o, "lokasi", "lokasi", 120, where),
      tipe,
      mulai,
      selesai: selesaiRaw,
      deskripsi: list(o, "deskripsi", "deskripsi", 12, 300, where),
      teknologi: list(o, "teknologi", "teknologi", 20, 40, where),
    };
  }

  if (section === "organization") {
    return {
      id,
      jabatan: text(o, "jabatan", "jabatan", 120, where),
      lembaga: text(o, "lembaga", "lembaga", 120, where),
      periode: text(o, "periode", "periode", 40, where),
    };
  }

  return {
    id,
    judul: text(o, "judul", "judul", 160, where),
    penerbit: text(o, "penerbit", "penerbit", 120, where),
    tahun: text(o, "tahun", "tahun", 20, where),
  };
}

/* ── sinkronisasi satu tabel ───────────────────────────────────────── */

async function syncTable(db: SupabaseClient, section: Section, rows: Parsed[]) {
  const table = TABLES[section];

  const { data: existing, error: e0 } = await db.from(table).select("id");
  if (e0) throw e0;
  const existingIds = new Set((existing ?? []).map((r) => String((r as Raw).id)));

  const keep = new Set<string>();
  const updates: Raw[] = [];
  const inserts: Raw[] = [];

  rows.forEach((r, idx) => {
    const { id, ...rest } = r;
    const payload = { ...rest, position: idx + 1 };
    if (id && existingIds.has(id) && !keep.has(id)) {
      keep.add(id);
      updates.push({ id, ...payload });
    } else {
      inserts.push(payload);
    }
  });

  // urutan aman: tambah & perbarui dulu, hapus terakhir (kalau gagal, data lama tidak hilang)
  if (inserts.length) {
    const { error } = await db.from(table).insert(inserts);
    if (error) throw error;
  }
  if (updates.length) {
    const { error } = await db.from(table).upsert(updates, { onConflict: "id" });
    if (error) throw error;
  }
  const removed = [...existingIds].filter((id) => !keep.has(id));
  if (removed.length) {
    const { error } = await db.from(table).delete().in("id", removed);
    if (error) throw error;
  }
}

/* ── handler ───────────────────────────────────────────────────────── */

export async function GET() {
  try {
    const db = getDb();
    const [experiences, orgs, awards] = await Promise.all([
      readSection(db, "experience"),
      readSection(db, "organization"),
      readSection(db, "award"),
    ]);
    return NextResponse.json({ data: { experiences, orgs, awards } });
  } catch (err) {
    console.error("[api experience] GET", err);
    return NextResponse.json(
      { error: "experience_load", message: "Data pengalaman gagal dimuat." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  if (!(await getSession())) {
    return NextResponse.json(
      { error: "unauthorized", message: "Sesi berakhir. Silakan masuk kembali." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json", message: "Body request bukan JSON yang valid." }, { status: 400 });
  }

  const { section, items } = (body ?? {}) as { section?: unknown; items?: unknown };
  if (typeof section !== "string" || !Object.prototype.hasOwnProperty.call(TABLES, section)) {
    return NextResponse.json({ error: "bad_section", message: "Bagian data tidak dikenal." }, { status: 400 });
  }
  const sec = section as Section;

  if (!Array.isArray(items)) {
    return NextResponse.json({ error: `${sec}_invalid`, message: "Daftar data tidak valid." }, { status: 400 });
  }
  if (items.length > MAX_ITEMS) {
    return NextResponse.json(
      { error: `${sec}_invalid`, message: `Maksimal ${MAX_ITEMS} baris per bagian.` },
      { status: 400 },
    );
  }

  let rows: Parsed[];
  try {
    rows = items.map((it, i) => parseItem(sec, it, i));
  } catch (err) {
    if (err instanceof InvalidInput) {
      return NextResponse.json({ error: `${sec}_invalid`, message: err.message }, { status: 400 });
    }
    throw err;
  }

  try {
    const db = getDb();
    await syncTable(db, sec, rows);
    const fresh = await readSection(db, sec);

    try {
      revalidatePath("/");
      revalidatePath("/dashboard/landingPage");
    } catch {
      /* revalidate gagal tidak membatalkan penyimpanan */
    }

    return NextResponse.json({ data: { section: sec, items: fresh } });
  } catch (err) {
    console.error(`[api experience] POST ${sec}`, err);
    return NextResponse.json(
      {
        error: `${sec}_save`,
        message: `${LABEL[sec]} gagal disimpan. Periksa tabel ${TABLES[sec]} dan secret key Supabase.`,
      },
      { status: 500 },
    );
  }
}