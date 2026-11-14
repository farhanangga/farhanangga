import type { ReactNode } from "react";
import { LandingNav } from "@/components/dashboard/landing/landingNav";

/* app/dashboard/landingPage/layout.tsx
 * Hanya tab antar bagian. Judul halaman sudah ada di topbar, dan keterangan + tombol
 * "Lihat website" ada di baris pertama tiap bagian (SectionShell). */
export default function LandingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <LandingNav />
      {children}
    </>
  );
}