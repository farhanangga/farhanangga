import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { ProjectCategory, ProjectItem, ProjectTab } from "@/lib/data";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  { auth: { persistSession: false } }
);

// GET /api/bestProjects
export async function GET() {
  const [bestRes, tabsRes, projectsRes, imagesRes] = await Promise.all([
    supabase.from("best_projects").select("project_id").order("position"),
    supabase.from("project_tabs").select("*").order("sort_order"),
    supabase.from("projects").select("*"),
    supabase.from("project_images").select("project_id, src").order("position"),
  ]);

  const error = bestRes.error ?? tabsRes.error ?? projectsRes.error ?? imagesRes.error;
  if (error) {
    console.error("[API /bestProjects]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
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

  const data: ProjectTab[] = (tabsRes.data ?? [])
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

  return NextResponse.json(
    { count: best.length, data },
    { headers: { "Cache-Control": "no-store" } }
  );
}