import { Suspense } from "react";
import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import type { ProjectCategory, ProjectItem, ProjectTab } from "@/lib/data";
import { BestProjectClient } from "./best-project-client";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  { auth: { persistSession: false } }
);

/** Server component: membaca best project langsung dari Supabase. */
async function fetchBestProjectTabs(): Promise<ProjectTab[]> {
  noStore(); // selalu data terbaru

  try {
    const [bestRes, tabsRes, projectsRes, imagesRes] = await Promise.all([
      supabase.from("best_projects").select("project_id").order("position"),
      supabase.from("project_tabs").select("*").order("sort_order"),
      supabase.from("projects").select("*"),
      supabase.from("project_images").select("project_id, src").order("position"),
    ]);

    const error = bestRes.error ?? tabsRes.error ?? projectsRes.error ?? imagesRes.error;
    if (error) {
      console.error("[BestProject] gagal membaca data:", error.message);
      return [];
    }

    const images = new Map<string, string[]>();
    for (const img of imagesRes.data ?? []) {
      images.set(img.project_id, [...(images.get(img.project_id) ?? []), img.src]);
    }

    const projects = new Map<string, ProjectItem>(
      (projectsRes.data ?? []).map((r) => [
        r.id,
        {
          id: r.id,
          category: r.category as ProjectCategory,
          title: r.title,
          type: r.type,
          role: r.role,
          tools: r.tools ?? [],
          desc: r.desc,
          highlights: r.highlights ?? [],
          url: r.url ?? undefined,
          repo: r.repo ?? undefined,
          images: images.get(r.id) ?? [],
        },
      ])
    );

    // urutan mengikuti best_projects.position
    const best = (bestRes.data ?? []).flatMap((b) => projects.get(b.project_id) ?? []);

    return (tabsRes.data ?? [])
      .map((t) => ({
        id: t.id as ProjectCategory,
        label: t.label,
        short: t.short,
        typeLabel: t.type_label,
        toolsLabel: t.tools_label,
        linkLabel: t.link_label ?? undefined,
        projects: best.filter((p) => p.category === t.id),
      }))
      .filter((t) => t.projects.length > 0);
  } catch (err) {
    console.error("[BestProject] tidak bisa membaca data", err);
    return [];
  }
}

/** Komponen yang mengakses data (harus berada di dalam <Suspense>) */
async function BestProjectData() {
  const tabs = await fetchBestProjectTabs();
  if (tabs.length === 0) return null;
  return <BestProjectClient tabs={tabs} />;
}

/** Placeholder supaya layout tidak melompat saat data datang */
function BestProjectSkeleton() {
  return (
    <section className="mx-auto max-w-[1200px] px-5 pb-24 sm:px-10 sm:pb-28">
      <div className="h-10 w-64 animate-pulse rounded-lg bg-white/10" />
      <div className="mt-8 h-12 w-full max-w-md animate-pulse rounded-full bg-white/[0.06]" />
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={`h-[360px] animate-pulse rounded-2xl bg-[#14142B] sm:h-[380px] ${
              i === 0 || i === 3 || i === 4 ? "lg:col-span-2" : ""
            }`}
          />
        ))}
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