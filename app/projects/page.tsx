import { Suspense } from "react";
import type { Metadata } from "next";
import { Footer } from "../../components/footer";
import { sans } from "../../components/fonts";
import { Navbar } from "../../components/navbar";
import { ProjectsView } from "../../components/projectView";
import { MotionProvider, ScrollProgress } from "../../components/ui";

export const metadata: Metadata = {
  title: "Proyek | Farhan Angga Riyanto",
  description: "Kumpulan proyek Software Engineer, UI/UX, dan Photography oleh Farhan Angga Riyanto.",
};

/**
 * Satu halaman untuk semua bidang.
 *   /projects                → semua proyek
 *   /projects?role=software  → Apps
 *   /projects?role=uiux      → UI/UX
 *   /projects?role=photo     → Photography
 */
export default function ProjectsPage() {
  return (
    <MotionProvider>
      <main className={`${sans.className} min-h-screen overflow-x-hidden bg-[#02020F] text-white`}>
        <ScrollProgress />
        <Navbar />
        {/* useSearchParams di ProjectsView wajib dibungkus Suspense */}
        <Suspense fallback={<div className="min-h-[70vh]" />}>
          <ProjectsView />
        </Suspense>
        <Footer />
      </main>
    </MotionProvider>
  );
}