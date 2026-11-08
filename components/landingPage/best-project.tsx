import { Suspense } from "react";
import type { ProjectTab } from "@/lib/data";
import { BestProjectClient } from "./best-project-client";

/**
 * Server component: memanggil GET /api/bestProjects dengan API key dari env.
 * Key hanya ada di server, tidak pernah dikirim ke browser
 * (jangan pakai prefix NEXT_PUBLIC_ untuk API_SECRET_KEY).
 */
async function fetchBestProjectTabs(): Promise<ProjectTab[]> {
  // const base = (process.env.API_BASE_URL ?? "http://localhost:3000").trim();
  const base = (process.env.API_BASE_URL ?? "farhanangga.vercel.app").trim();
  const key = (process.env.API_SECRET_KEY ?? "").trim();

  try {
    const res = await fetch(`${base}/api/bestProjects`, {
      headers: { "x-api-key": key },
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(`[BestProject] API gagal: ${res.status}`);
      return [];
    }
    const json = (await res.json()) as { data?: ProjectTab[] };
    const tabs = Array.isArray(json.data) ? json.data : [];
    // buang item yang bukan tab valid (misalnya route lama masih mengembalikan format datar)
    return tabs.filter((t) => Array.isArray(t?.projects) && t.projects.length > 0);
  } catch (err) {
    console.error("[BestProject] tidak bisa menghubungi API", err);
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