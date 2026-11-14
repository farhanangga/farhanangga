import { Suspense } from "react";
import { EditHero, EditHeroSkeleton } from "@/components/dashboard/editHero";
import type { Params } from "@/components/dashboard/landing/shared";

export const metadata = { title: "Hero · Landing page" };

export default function HeroPage({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <Suspense fallback={<EditHeroSkeleton />}>
      <EditHero searchParams={searchParams} />
    </Suspense>
  );
}
