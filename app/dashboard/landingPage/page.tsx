import { redirect } from "next/navigation";
import { LANDING_BASE, LANDING_SECTIONS } from "@/components/dashboard/landing/sections";
import type { Params } from "@/components/dashboard/landing/shared";

/**
 * Halaman indeks. Tanpa query → buka bagian pertama (Hero).
 * Dengan ?saved=best atau ?error=best_max (redirect lama dari route API) → diarahkan ke
 * halaman bagian yang sesuai sambil membawa query-nya, jadi route API tidak wajib diubah.
 */
export default async function LandingIndex({ searchParams }: { searchParams: Promise<Params> }) {
  const { saved, error } = await searchParams;
  const hint = (saved ?? error ?? "").toLowerCase();
  const target =
    LANDING_SECTIONS.find((s) => hint === s.slug || hint.startsWith(`${s.slug}_`)) ?? LANDING_SECTIONS[0];

  const qs = new URLSearchParams();
  if (saved) qs.set("saved", saved);
  if (error) qs.set("error", error);
  const q = qs.toString();

  redirect(`${LANDING_BASE}/${target.slug}${q ? `?${q}` : ""}`);
}
