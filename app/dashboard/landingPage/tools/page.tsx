import { Suspense } from "react";
import { ToolsSection } from "@/components/dashboard/landing/toolsSection";
import { SectionSkeleton } from "@/components/dashboard/landing/shared";

export const metadata = { title: "Tools · Landing page" };

export default function ToolsPage() {
  return (
    <Suspense fallback={<SectionSkeleton label="Memuat tools" />}>
      <ToolsSection />
    </Suspense>
  );
}
