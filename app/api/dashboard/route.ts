import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/session";

const LATEST = 5;
const TOP_TOOLS = 8;

type Tab = { id: string; label: string };
type ProjectRow = {
  id: string;
  category: string;
  title: string;
  type: string;
  role: string;
  tools: string[] | null;
  url: string | null;
  repo: string | null;
  position: number;
};
type ProjectImageRow = { project_id: string; src: string; position: number };
type ActivityRow = {
  id: string;
  nama_kegiatan: string;
  tahun: number | null;
  role: string;
  jobdesc: string | null;
};
type ActivityImageRow = { activity_id: string; lokasi_file: string; urutan: number };
type ContactRow = { id: string; platform: string; icon: string; handle: string; href: string; position: number };

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error("Konfigurasi Supabase server belum lengkap.");
  }

  return createClient(url, key, {
    auth: { persistSession: false },
    // jangan biarkan Next.js menyimpan hasil query di cache fetch
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
}

/** Cover = gambar pertama (urutan terkecil) + jumlah gambar per induk. */
function indexImages<T>(rows: T[], keyOf: (r: T) => string, srcOf: (r: T) => string) {
  const count = new Map<string, number>();
  const cover = new Map<string, string>();
  for (const r of rows) {
    const k = keyOf(r);
    count.set(k, (count.get(k) ?? 0) + 1);
    if (!cover.has(k)) cover.set(k, srcOf(r));
  }
  return { count, cover };
}

/* ── GET: ringkasan statistik seluruh data dashboard ───── */

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = adminClient();

    const [tabsRes, projectsRes, projectImgRes, activitiesRes, activityImgRes, contactsRes] = await Promise.all([
      db.from("project_tabs").select("id, label").order("sort_order"),
      db.from("projects").select("id, category, title, type, role, tools, url, repo, position").order("position"),
      db.from("project_images").select("project_id, src, position").order("position"),
      db
        .from("activities")
        .select("id, nama_kegiatan, tahun, role, jobdesc")
        .order("tahun", { ascending: false, nullsFirst: false })
        .order("id", { ascending: false }),
      db.from("activity_images").select("activity_id, lokasi_file, urutan").order("urutan"),
      db.from("contacts").select("id, platform, icon, handle, href, position").order("position"),
    ]);

    for (const res of [tabsRes, projectsRes, projectImgRes, activitiesRes, activityImgRes, contactsRes]) {
      if (res.error) throw res.error;
    }

    const tabs = (tabsRes.data ?? []) as Tab[];
    const projects = (projectsRes.data ?? []) as ProjectRow[];
    const projectImages = (projectImgRes.data ?? []) as ProjectImageRow[];
    const activities = (activitiesRes.data ?? []) as ActivityRow[];
    const activityImages = (activityImgRes.data ?? []) as ActivityImageRow[];
    const contacts = (contactsRes.data ?? []) as ContactRow[];

    const pImg = indexImages(projectImages, (r) => r.project_id, (r) => r.src);
    const aImg = indexImages(activityImages, (r) => r.activity_id, (r) => r.lokasi_file);

    /* project per kategori (urut sesuai tab, kategori yatim di belakang) */
    const labelOf = new Map(tabs.map((t) => [t.id, t.label]));
    const catCount = new Map<string, number>();
    for (const p of projects) catCount.set(p.category, (catCount.get(p.category) ?? 0) + 1);
    const byCategory = [
      ...tabs.map((t) => ({ id: t.id, label: t.label, count: catCount.get(t.id) ?? 0 })),
      ...[...catCount.entries()]
        .filter(([id]) => !labelOf.has(id))
        .map(([id, count]) => ({ id, label: id, count })),
    ];

    /* tools terpopuler (huruf besar/kecil digabung) */
    const toolMap = new Map<string, { name: string; count: number }>();
    for (const p of projects) {
      for (const raw of new Set((p.tools ?? []).map((t) => t.trim()).filter(Boolean))) {
        const key = raw.toLowerCase();
        const cur = toolMap.get(key);
        if (cur) cur.count += 1;
        else toolMap.set(key, { name: raw, count: 1 });
      }
    }
    const topTools = [...toolMap.values()]
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, TOP_TOOLS);

    /* kegiatan per tahun (terbaru dulu, "tanpa tahun" di akhir) */
    const yearCount = new Map<number | null, number>();
    for (const a of activities) yearCount.set(a.tahun, (yearCount.get(a.tahun) ?? 0) + 1);
    const byYear = [...yearCount.entries()]
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => (a.year === null ? 1 : b.year === null ? -1 : b.year - a.year));

    const data = {
      totals: {
        projects: projects.length,
        activities: activities.length,
        contacts: contacts.length,
        projectImages: projectImages.length,
        activityImages: activityImages.length,
      },
      projects: {
        byCategory,
        topTools,
        withUrl: projects.filter((p) => p.url).length,
        withRepo: projects.filter((p) => p.repo).length,
        withoutImages: projects.filter((p) => !pImg.count.get(p.id)).length,
        withoutUrl: projects.filter((p) => !p.url).length,
        // posisi terbesar = paling akhir ditambahkan
        latest: [...projects]
          .reverse()
          .slice(0, LATEST)
          .map((p) => ({
            id: p.id,
            title: p.title,
            category: labelOf.get(p.category) ?? p.category,
            type: p.type,
            role: p.role,
            images: pImg.count.get(p.id) ?? 0,
            cover: pImg.cover.get(p.id) ?? null,
          })),
      },
      activities: {
        byYear,
        withoutYear: activities.filter((a) => a.tahun == null).length,
        withoutImages: activities.filter((a) => !aImg.count.get(a.id)).length,
        withJobdesc: activities.filter((a) => (a.jobdesc ?? "").trim()).length,
        latest: activities.slice(0, LATEST).map((a) => ({
          id: a.id,
          nama: a.nama_kegiatan,
          tahun: a.tahun,
          role: a.role,
          images: aImg.count.get(a.id) ?? 0,
          cover: aImg.cover.get(a.id) ?? null,
        })),
      },
      contacts: contacts.map((c) => ({
        id: c.id,
        platform: c.platform,
        icon: c.icon,
        handle: c.handle,
        href: c.href,
      })),
    };

    return NextResponse.json({ data });
  } catch (error) {
    console.error("[dashboard] GET error:", error);
    return NextResponse.json({ error: "Gagal memuat ringkasan dashboard." }, { status: 500 });
  }
}