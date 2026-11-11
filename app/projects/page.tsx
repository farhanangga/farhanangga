import { Suspense } from "react";
import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";

import { Footer } from "../../components/layout/footer";
import { sans } from "../../components/fonts";
import { Navbar } from "../../components/layout/navbar";
import { ProjectsView } from "@/components/projects/projectView";
import { MotionProvider, ScrollProgress } from "../../components/ui";

import type { ProjectCategory, ProjectItem, ProjectTab } from "../../lib/data";

export const metadata: Metadata = {
  title: "Proyek | Farhan Angga Riyanto",
  description:
    "Kumpulan proyek Software Engineer, UI/UX, dan Photography oleh Farhan Angga Riyanto.",
};


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  { auth: { persistSession: false } }
);

// Membaca proyek langsung dari Supabase, dikelompokkan per tab
async function fetchProjectTabs(): Promise<ProjectTab[]> {
  const [tabsRes, projectsRes, imagesRes] = await Promise.all([
    supabase.from("project_tabs").select("*").order("sort_order"),
    supabase.from("projects").select("*").order("position"),
    supabase.from("project_images").select("project_id, src").order("position"),
  ]);

  const error = tabsRes.error ?? projectsRes.error ?? imagesRes.error;
  if (error) throw new Error(`Gagal membaca data proyek: ${error.message}`);

  const images = new Map<string, string[]>();
  for (const img of imagesRes.data ?? []) {
    images.set(img.project_id, [...(images.get(img.project_id) ?? []), img.src]);
  }

  const projects: ProjectItem[] = (projectsRes.data ?? []).map((r) => ({
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
  }));

  return (tabsRes.data ?? []).map((t) => ({
    id: t.id as ProjectCategory,
    label: t.label,
    short: t.short,
    typeLabel: t.type_label,
    toolsLabel: t.tools_label,
    linkLabel: t.link_label ?? undefined,
    projects: projects.filter((p) => p.category === t.id),
  }));
}

// Komponen untuk mengambil dan menampilkan data
async function ProjectsData() {
  try {
    const tabs = await fetchProjectTabs();

    return <ProjectsView tabs={tabs} />;
  } catch (error) {
    console.error("[Projects]", error);

    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <h2 className="text-xl font-semibold text-white">
          Gagal Memuat Proyek
        </h2>

        <p className="max-w-md text-sm text-gray-400">
          Data proyek tidak dapat dimuat dari server.
          Silakan coba kembali beberapa saat lagi.
        </p>
      </div>
    );
  }
}

// Halaman utama
export default function ProjectsPage() {
  return (
    <MotionProvider>
      <main
        className={`${sans.className} min-h-screen overflow-x-hidden bg-[#02020F] text-white`}
      >
        <ScrollProgress />

        <Navbar />

        <Suspense fallback={<div className="min-h-[70vh]" />}>
          <ProjectsData />
        </Suspense>

        <Footer />
      </main>
    </MotionProvider>
  );
}