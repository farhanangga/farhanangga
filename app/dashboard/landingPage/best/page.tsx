import { Suspense } from "react";
import { BestSection } from "@/components/dashboard/landing/bestSection";
import { SectionSkeleton, type Params } from "@/components/dashboard/landing/shared";

export const metadata = { title: "Best project · Landing page" };

export default function BestPage({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <Suspense fallback={<SectionSkeleton label="Memuat best project" />}>
      <BestSection searchParams={searchParams} />
    </Suspense>
  );
}
