import { Suspense } from "react";
import type { Metadata } from "next";

import { Footer } from "../../components/layout/footer";
import { sans } from "../../components/fonts";
import { Navbar } from "../../components/layout/navbar";
import { ProjectsView } from "@/components/projects/projectView";
import { MotionProvider, ScrollProgress } from "../../components/ui";

import type { ProjectTab } from "../../lib/data";

export const metadata: Metadata = {
  title: "Proyek | Farhan Angga Riyanto",
  description:
    "Kumpulan proyek Software Engineer, UI/UX, dan Photography oleh Farhan Angga Riyanto.",
};

// Mengambil data proyek HANYA melalui API
async function fetchProjectTabs(): Promise<ProjectTab[]> {
  const base = process.env.API_BASE_URL?.trim().replace(/\/+$/, "");
  const key = process.env.API_SECRET_KEY?.trim();

  // Memastikan konfigurasi tersedia
  if (!base || !key) {
    throw new Error("API_BASE_URL atau API_SECRET_KEY belum dikonfigurasi.");
  }

  // Request ke API
  const res = await fetch(`${base}/api/projects`, {
    method: "GET",
    headers: {
      "x-api-key": key,
    },
    cache: "no-store",
  });

  // Jika API gagal
  if (!res.ok) {
    throw new Error(`Gagal mengambil data proyek: HTTP ${res.status}`);
  }

  // Membaca respons JSON
  const json = (await res.json()) as {
    success: boolean;
    count: number;
    data: ProjectTab[];
  };

  // Validasi respons
  if (!json.success || !Array.isArray(json.data)) {
    throw new Error("Format respons API tidak valid.");
  }

  // Mengembalikan data dari API
  return json.data;
}

// Komponen untuk mengambil dan menampilkan data
async function ProjectsData() {
  try {
    const tabs = await fetchProjectTabs();

    return <ProjectsView tabs={tabs} />;
  } catch (error) {
    console.error("[Projects] API Error:", error);

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