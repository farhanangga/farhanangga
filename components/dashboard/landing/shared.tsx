import type { ReactNode } from "react";
import { CircleAlert, ExternalLink } from "lucide-react";

export type Params = { saved?: string; error?: string };

/** Alamat website utama. "/" = halaman utama di domain yang sama. */
export const WEBSITE_URL = "/";

/* token tema (lihat THEME_CSS di components/dashboard/shared.tsx) */
export const muted = "text-[color:var(--fg-muted)]";
const focus = "outline-none focus-visible:ring-2 focus-visible:ring-[#5A64D8]";

export function CardHead({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="mb-5">
      <h2 className="font-semibold">{title}</h2>
      {desc && <p className={`mt-0.5 text-sm ${muted}`}>{desc}</p>}
    </div>
  );
}

export function ErrorAlert({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="mt-5 flex items-start gap-3 rounded-2xl border border-[#E85B53]/30 bg-[#E85B53]/10 px-4 py-3 text-sm font-medium text-[#E85B53]"
    >
      <CircleAlert size={18} className="mt-px shrink-0" />
      <span>{children}</span>
    </div>
  );
}

/** Tombol ke website utama. Gayanya sama dengan tombol aksi di Ringkasan (+ Project, + Kegiatan, + Kontak). */
export function WebsiteButton() {
  return (
    <a
      href={WEBSITE_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Lihat website (tab baru)"
      className={`inline-flex h-10 shrink-0 items-center gap-2 self-start rounded-xl bg-[color:var(--chip)] px-4 text-sm font-medium transition hover:brightness-110 active:scale-[0.98] sm:self-auto ${focus}`}
    >
      <ExternalLink size={15} aria-hidden /> Lihat website
    </a>
  );
}

/**
 * Pembungkus satu bagian (satu bagian = satu halaman).
 * Barisnya meniru halaman Ringkasan: keterangan di kiri, tombol aksi di kanan.
 * Judul tetap ada untuk pembaca layar (sr-only) karena judul halaman sudah tampil di topbar.
 */
export function SectionShell({
  id,
  title,
  desc,
  children,
}: {
  id: string;
  title: string;
  desc: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="mt-5">
      <h2 className="sr-only">{title}</h2>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className={`max-w-[70ch] text-sm ${muted}`}>{desc}</p>
        <WebsiteButton />
      </div>
      {children}
    </section>
  );
}

export function SectionSkeleton({ label }: { label: string }) {
  const pulse = "animate-pulse motion-reduce:animate-none";
  return (
    <div role="status" aria-busy="true" aria-label={label} className={`mt-5 ${pulse}`}>
      <div className="h-5 w-72 max-w-full rounded-lg bg-[color:var(--chip)]" />
      <div className="mt-6 h-96 rounded-3xl bg-[color:var(--card)]" />
    </div>
  );
}