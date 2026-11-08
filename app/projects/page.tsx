import { Suspense } from "react";
import type { Metadata } from "next";
import { Footer } from "../../components/layout/footer";
import { sans } from "../../components/fonts";
import { Navbar } from "../../components/layout/navbar";
import { ProjectsView } from "../../components/projects/projectView";
import { MotionProvider, ScrollProgress } from "../../components/ui";
import { projectTabs, type ProjectTab } from "../../lib/data";

export const metadata: Metadata = {
  title: "Proyek | Farhan Angga Riyanto",
  description: "Kumpulan proyek Software Engineer, UI/UX, dan Photography oleh Farhan Angga Riyanto.",
};

/**
 * Ambil semua proyek dari GET /api/projects.
 * Host dan password dibaca dari .env.local (API_BASE_URL, API_SECRET_KEY), hanya di server.
 * Kalau API belum siap (key belum diisi / 401 / server tidak terjangkau),
 * halaman tetap tampil memakai data langsung dari lib/data.ts.
 */
async function fetchProjectTabs(): Promise<ProjectTab[]> {
  // const base = (process.env.API_BASE_URL ?? "http://localhost:3000").trim();
  const base = (process.env.API_BASE_URL ?? "https://farhanangga.vercel.app/").trim();
  const key = (process.env.API_SECRET_KEY ?? "").trim();

  if (key) {
    try {
      const res = await fetch(`${base}/api/projects`, {
        headers: { "x-api-key": key },
        cache: "no-store",
      });
      if (res.ok) {
        const json = (await res.json()) as { data?: ProjectTab[] };
        const tabs = Array.isArray(json.data)
          ? json.data.filter((t) => Array.isArray(t?.projects))
          : [];
        if (tabs.length > 0) return tabs;
      } else {
        console.warn(`[Projects] API gagal: ${res.status}, memakai data lokal`);
      }
    } catch (err) {
      console.warn("[Projects] tidak bisa menghubungi API, memakai data lokal", err);
    }
  } else {
    console.warn("[Projects] API_SECRET_KEY belum diisi di .env.local, memakai data lokal");
  }

  return projectTabs;
}

/** Komponen yang mengakses data (harus di dalam <Suspense>) */
async function ProjectsData() {
  const tabs = await fetchProjectTabs();
  return <ProjectsView tabs={tabs} />;
}

export default function ProjectsPage() {
  return (
    <MotionProvider>
      <main className={`${sans.className} min-h-screen overflow-x-hidden bg-[#02020F] text-white`}>
        <ScrollProgress />
        <Navbar />
        {/* fetch data + useSearchParams di ProjectsView wajib dibungkus Suspense */}
        <Suspense fallback={<div className="min-h-[70vh]" />}>
          <ProjectsData />
        </Suspense>
        <Footer />
      </main>
    </MotionProvider>
  );
}