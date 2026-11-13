import { Suspense } from "react";
import { unstable_noStore as noStore } from "next/cache";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { ProjectTab } from "@/lib/data";
// Daftar tab (dari tabel project_tabs) dan semua proyeknya diambil dari api/projects.
import { GET as getProjectsRoute } from "@/app/api/projects/route";
import { BestProjectClient } from "./best-project-client";

/** Maksimal best project per tab/bidang (sama dengan batas di dashboard). */
const MAX_PER_TAB = 6;

/** Palet yang sama dengan daftar role (Software, UI/UX, Photography, Graphic). */
const ROLE_COLORS = ["#6366F1", "#F25C5C", "#FFC857", "#34D399"] as const;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  { auth: { persistSession: false } }
);

/** Semua tab + proyeknya dari api/projects (data = daftar tab, tiap tab punya array projects). */
async function fetchTabs(): Promise<ProjectTab[]> {
  const call = getProjectsRoute as unknown as (req: NextRequest) => Promise<Response>;
  const res = await call(new NextRequest("http://localhost/api/projects"));
  if (!res.ok) throw new Error(`api/projects status ${res.status}`);
  const json = (await res.json()) as { data?: ProjectTab[] };
  return Array.isArray(json.data) ? json.data : [];
}

/** Server component: tab dari api/projects, pilihan best project dari best_projects. */
async function fetchBestProjectTabs(): Promise<ProjectTab[]> {
  noStore(); // selalu data terbaru

  try {
    const [tabs, bestRes] = await Promise.all([
      fetchTabs(),
      supabase.from("best_projects").select("project_id").order("position"),
    ]);

    if (bestRes.error) {
      console.error("[BestProject] gagal membaca best_projects:", bestRes.error.message);
      return [];
    }

    // urutan tampil mengikuti best_projects.position
    const rank = new Map<string, number>();
    (bestRes.data ?? []).forEach((b, i) => rank.set(String(b.project_id), i));

    // semua tab tetap tampil (juga yang belum punya best project); tiap tab maksimal 6
    return tabs.map((t) => ({
      ...t,
      projects: t.projects
        .filter((p) => rank.has(String(p.id)))
        .sort((a, b) => (rank.get(String(a.id)) ?? 0) - (rank.get(String(b.id)) ?? 0))
        .slice(0, MAX_PER_TAB),
    }));
  } catch (err) {
    console.error("[BestProject] tidak bisa membaca data", err);
    return [];
  }
}

/** Komponen yang mengakses data (harus berada di dalam <Suspense>) */
async function BestProjectData() {
  const tabs = await fetchBestProjectTabs();
  // belum ada satu pun best project → bagian ini tidak ditampilkan
  if (tabs.every((t) => t.projects.length === 0)) return null;
  return <BestProjectClient tabs={tabs} />;
}

/** Placeholder supaya layout tidak melompat saat data datang */
function BestProjectSkeleton() {
  return (
    <section className="mx-auto max-w-[1200px] px-5 pb-24 sm:px-10 sm:pb-28">
      {/* judul */}
      <div
        className="h-10 w-64 animate-pulse rounded-lg"
        style={{ backgroundColor: `${ROLE_COLORS[0]}33` }}
      />

      {/* tab: satu pil per warna role */}
      <div className="mt-8 flex w-full max-w-md gap-3">
        {ROLE_COLORS.map((color) => (
          <div
            key={color}
            className="h-12 flex-1 animate-pulse rounded-full"
            style={{ backgroundColor: `${color}26` }}
          />
        ))}
      </div>

      {/* kartu proyek */}
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => {
          const color = ROLE_COLORS[i % ROLE_COLORS.length];
          return (
            <div
              key={i}
              className={`h-[360px] animate-pulse rounded-2xl border-t-2 bg-[#14142B] sm:h-[380px] ${
                i === 0 || i === 3 || i === 4 ? "lg:col-span-2" : ""
              }`}
              style={{ borderTopColor: `${color}80` }}
            />
          );
        })}
      </div>
    </section>
  );
}

/** Pakai langsung di page: <BestProject /> (Suspense sudah ada di dalam) */
export function BestProject() {
  return (
    <Suspense fallback={<BestProjectSkeleton />}>
      <BestProjectData />
    </Suspense>
  );
}