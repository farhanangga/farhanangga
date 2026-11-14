import { Suspense } from "react";
import { EditAbout, EditAboutSkeleton } from "@/components/dashboard/editAbout";
import type { Params } from "@/components/dashboard/landing/shared";

export const metadata = { title: "Tentang saya · Landing page" };

export default function AboutPage({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <Suspense fallback={<EditAboutSkeleton />}>
      <EditAbout searchParams={searchParams} />
    </Suspense>
  );
}
