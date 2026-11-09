import { Suspense } from "react";
import type { Metadata } from "next";
import type { ActivityItem } from "@/lib/data";
import { ActivitiesClient } from "@/components/activities/clientActivities";
// TODO: sesuaikan path & nama export dengan file navbar/footer Anda
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export const metadata: Metadata = {
  title: "Kegiatan",
  description: "Kepanitiaan dan kegiatan organisasi yang pernah diikuti Farhan Angga Riyanto.",
};

/**
 * Satu-satunya sumber data: GET /api/activities (app/api/activities/route.ts).
 * API key hanya dipakai di server, tidak pernah dikirim ke browser.
 */
async function fetchActivities(): Promise<ActivityItem[] | null> {
  const base = (process.env.API_BASE_URL ?? "http://localhost:3000").trim();
  const key = (process.env.API_SECRET_KEY ?? "").trim();

  try {
    const res = await fetch(`${base}/api/activities`, {
      headers: { "x-api-key": key },
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(`[Activities] API gagal: ${res.status} (${base}/api/activities)`);
      return null;
    }
    const json = (await res.json()) as { data?: ActivityItem[] };
    return Array.isArray(json.data) ? json.data : null;
  } catch (err) {
    console.error("[Activities] tidak bisa menghubungi API", err);
    return null;
  }
}

/** Komponen yang mengakses data (harus berada di dalam <Suspense>) */
async function ActivitiesContent() {
  const items = await fetchActivities();

  if (!items) {
    return (
      <section className="mx-auto max-w-[1200px] px-5 pb-24 pt-32 sm:px-10 sm:pt-40">
        <div className="rounded-xl bg-[#14142B] px-6 py-14 text-center text-white/60">
          Data kegiatan belum bisa dimuat. Muat ulang halaman beberapa saat lagi.
        </div>
      </section>
    );
  }

  return <ActivitiesClient items={items} />;
}

/** Placeholder supaya layout tidak melompat saat data datang */
function ActivitiesSkeleton() {
  return (
    <section className="mx-auto max-w-[1200px] px-5 pb-20 pt-28 sm:px-10 sm:pb-28 sm:pt-40">
      <div className="h-4 w-40 animate-pulse rounded bg-white/10" />
      <div className="mt-4 h-12 w-80 max-w-full animate-pulse rounded-lg bg-white/10 sm:h-16" />
      <div className="mt-4 h-5 w-full max-w-md animate-pulse rounded bg-white/[0.06]" />
      <div className="mt-8 h-12 w-full max-w-md animate-pulse rounded-full bg-white/[0.06]" />
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-[360px] animate-pulse rounded-xl bg-[#14142B]" />
        ))}
      </div>
    </section>
  );
}

export default function ActivitiesPage() {
  return (
    <>
      <Navbar />
      <main>
        <Suspense fallback={<ActivitiesSkeleton />}>
          <ActivitiesContent />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}