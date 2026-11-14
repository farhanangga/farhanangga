/** Folder halaman: app/dashboard/landingPage. Ubah di sini bila foldernya berbeda. */
export const LANDING_BASE = "/dashboard/landingPage";

/** Daftar bagian landing page. slug = nama folder di bawah LANDING_BASE. */
export const LANDING_SECTIONS = [
  { slug: "hero", label: "Hero" },
  { slug: "about", label: "Tentang saya" },
  { slug: "best", label: "Best project" },
  { slug: "experience", label: "Pengalaman kerja" },
  { slug: "tools", label: "Tools" },
] as const;

export type LandingSlug = (typeof LANDING_SECTIONS)[number]["slug"];
