import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { ActivityItem } from "@/lib/data";

const MAX_PICTURES_PER_ACTIVITY = 10;
const BUCKET = process.env.SUPABASE_ACTIVITIES_BUCKET ?? "activityImages";

type ActivityRow = {
  id: string;
  nama_kegiatan: string;
  tahun: number | null;
  role: string;
  jobdesc: unknown;
  deskripsi: string;
};

type ImageRow = {
  activity_id: string;
  nama_file: string;
  urutan: number;
  lokasi_file: string | null;
};

function dbClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("Konfigurasi Supabase belum lengkap.");
  }

  return createClient(url, key, { auth: { persistSession: false } });
}

type Db = ReturnType<typeof dbClient>;

/**
 * URL publik gambar dari bucket.
 * - lokasi_file berisi URL penuh (http...)  -> dipakai apa adanya
 * - selain itu: path di bucket = lokasi_file (folder, boleh kosong) + "/" + nama_file
 */
function pictureUrl(db: Db, img: ImageRow) {
  const name = (img.nama_file ?? "").trim().replace(/^\/+/, "");
  const loc = (img.lokasi_file ?? "").trim();

  // lokasi_file berisi URL penuh
  if (/^https?:\/\//i.test(loc)) {
    return loc.endsWith(name) ? loc : `${loc.replace(/\/$/, "")}/${name}`;
  }

  // buang slash di tepi; abaikan nilai lokasi yang sebenarnya hanya nama file
  let folder = loc.replace(/^\/+|\/+$/g, "");
  if (folder === name || folder.endsWith(`/${name}`)) {
    folder = folder.slice(0, folder.length - name.length).replace(/\/$/, "");
  }

  const path = folder ? `${folder}/${name}` : name;
  return db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Ubah nilai jobdesc apa pun (array, JSON, literal array Postgres, teks per baris) menjadi string[]. */
function toStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof value !== "string") return [];

  const s = value.trim();
  if (!s) return [];

  // JSON: ["a","b"]
  if (s.startsWith("[")) {
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return toStringList(parsed);
    } catch {
      /* lanjut ke format lain */
    }
  }

  // literal array Postgres: {"a","b"} atau {a,b}
  if (s.startsWith("{") && s.endsWith("}")) {
    const inner = s.slice(1, -1);
    const out: string[] = [];
    const re = /"((?:[^"\\]|\\.)*)"|([^,]+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(inner))) {
      const item = (m[1] !== undefined ? m[1].replace(/\\(.)/g, "$1") : m[2]).trim();
      if (item) out.push(item);
    }
    return out;
  }

  // teks biasa: satu poin per baris
  return s.split("\n").map((l) => l.trim()).filter(Boolean);
}

export async function GET() {
  try {
    const db = dbClient();

    const [activitiesRes, imagesRes] = await Promise.all([
      db.from("activities").select("id, nama_kegiatan, tahun, role, jobdesc, deskripsi"),
      db
        .from("activity_images")
        .select("activity_id, nama_file, urutan, lokasi_file")
        .order("urutan", { ascending: true }),
    ]);

    if (activitiesRes.error) throw activitiesRes.error;
    if (imagesRes.error) throw imagesRes.error;

    const imagesByActivity = new Map<string, string[]>();
    for (const img of (imagesRes.data ?? []) as ImageRow[]) {
      const list = imagesByActivity.get(img.activity_id) ?? [];
      if (list.length < MAX_PICTURES_PER_ACTIVITY) {
        list.push(pictureUrl(db, img));
        imagesByActivity.set(img.activity_id, list);
      }
    }

    const items: ActivityItem[] = ((activitiesRes.data ?? []) as ActivityRow[])
      .map((a) => ({
        id: a.id,
        namaKegiatan: a.nama_kegiatan,
        tahun: a.tahun ?? undefined,
        role: a.role,
        jobdesc: toStringList(a.jobdesc),
        deskripsi: a.deskripsi,
        images: imagesByActivity.get(a.id) ?? [],
      }))
      .sort((a, b) => (b.tahun ?? 0) - (a.tahun ?? 0));

    return NextResponse.json({ data: items });
  } catch (error) {
    console.error("[activities] GET error:", error);
    return NextResponse.json({ error: "Gagal memuat data kegiatan." }, { status: 500 });
  }
}