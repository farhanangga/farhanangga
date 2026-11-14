/**
 * Tanpa "use client": komponen ini boleh dirender di server (RSC).
 * Tidak ada hook, state, maupun event handler di sini.
 */
import Image from "next/image";
import type { ProjectTab } from "@/lib/data";

/** Warna aksen bidang fotografi (sama dengan PALETTE.photo di BestProjectClient). */
export const PHOTO_RGB = "255,200,87";

/** Kunci pencarian dari tab: dipakai untuk warna dan untuk mengenali tab fotografi. */
export function tabKey(t: Pick<ProjectTab, "id" | "label" | "short">) {
  return `${t.id} ${t.label} ${t.short ?? ""}`.toLowerCase();
}

/** Tab fotografi memakai tampilan kartu bertumpuk, bidang lain tetap grid. */
export function isPhotoTab(t: Pick<ProjectTab, "id" | "label" | "short">) {
  return /photo/.test(tabKey(t));
}

/**
 * Foto sampul HD. `sizes` sengaja dibuat sedikit lebih besar dari lebar kartu di layar
 * (±380px) supaya layar retina memilih ukuran sumber yang tajam.
 */
export function PhotoCover({
  src,
  alt,
  rgb = PHOTO_RGB,
  eager = false,
}: {
  src: string;
  alt: string;
  rgb?: string;
  eager?: boolean;
}) {
  if (!src) {
    return (
      <span
        aria-hidden
        className="absolute inset-0 block"
        style={{ background: `radial-gradient(circle at 30% 20%, rgba(${rgb},0.35), #0C0C20 70%)` }}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      quality={90}
      sizes="(min-width:1024px) 480px, (min-width:640px) 55vw, 80vw"
      loading={eager ? "eager" : "lazy"}
      draggable={false}
      className="pointer-events-none select-none object-cover"
    />
  );
}