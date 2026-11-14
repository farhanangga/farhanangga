import { Suspense } from "react";
import { ExperienceSection } from "@/components/dashboard/landing/experienceSection";
import { SectionSkeleton } from "@/components/dashboard/landing/shared";

export const metadata = { title: "Pengalaman kerja · Landing page" };

export default function ExperiencePage() {
  return (
    <Suspense fallback={<SectionSkeleton label="Memuat pengalaman kerja" />}>
      <ExperienceSection />
    </Suspense>
  );
}
