"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Menu, Moon, Sun } from "lucide-react";
import { ACCENT_GLOW, ACCENT_GRADIENT, EASE, SIDEBAR_BG, THEME_KEY, type Theme } from "./shared";
import { useShell } from "./shell";

/* foto profil: public/assets/profil-pic.jpg */
const PROFILE_SRC = "/assets/profil-pic.jpg";

/* nama segmen URL -> label tampilan (tambah sesuai menu sidebar) */
const LABELS: Record<string, string> = {
  projects: "Project",
  activities: "Kegiatan",
  contacts: "Kontak",
  settings: "Pengaturan",
};

const isId = (s: string) => /^[0-9a-f-]{8,}$/i.test(s) || /^\d+$/.test(s);
const prettify = (s: string) => LABELS[s] ?? s.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());

/** Turunkan judul halaman dari pathname, mis. /dashboard/projects/new -> "Tambah Project" */
function titleFromPath(pathname: string) {
  const seg = pathname.split("/").filter(Boolean).slice(1); // buang "dashboard"
  if (seg.length === 0) return "Ringkasan";

  const last = seg[seg.length - 1];
  if (last === "new") return `Tambah ${prettify(seg[0])}`;
  if (last === "edit") return `Edit ${prettify(seg[0])}`;
  if (isId(last)) return `Detail ${prettify(seg[0])}`;
  return prettify(last);
}

/* ── toggle dark / light ───────────────────────────────── */
function ThemeToggle({ initial }: { initial: Theme }) {
  const [theme, setTheme] = useState<Theme>(initial);
  const ref = useRef<HTMLButtonElement>(null);
  const light = theme === "light";

  const toggle = () => {
    const next: Theme = light ? "dark" : "light";
    setTheme(next);
    // ganti tema langsung di pembungkus layout + simpan di cookie
    ref.current?.closest("[data-theme]")?.setAttribute("data-theme", next);
    document.cookie = `${THEME_KEY}=${next}; path=/; max-age=31536000; samesite=lax`;
  };

  return (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={!light}
      aria-label="Mode gelap"
      onClick={toggle}
      className="relative flex h-11 w-20 shrink-0 items-center rounded-full bg-[color:var(--card)] p-1 outline-none ring-1 ring-[color:var(--line)] transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-[#5A64D8]"
      style={{ boxShadow: "var(--shadow)" }}
    >
      <motion.span
        aria-hidden
        className="absolute left-1 top-1 h-9 w-9 rounded-full"
        style={{ background: ACCENT_GRADIENT, boxShadow: ACCENT_GLOW }}
        initial={false}
        animate={{ x: light ? 0 : 36 }}
        transition={{ type: "spring", stiffness: 420, damping: 32 }}
      />
      <span
        className="relative grid h-9 w-9 place-items-center transition-colors duration-200"
        style={{ color: light ? "#fff" : "var(--fg-muted)" }}
      >
        <Sun size={17} />
      </span>
      <span
        className="relative grid h-9 w-9 place-items-center transition-colors duration-200"
        style={{ color: light ? "var(--fg-muted)" : "#fff" }}
      >
        <Moon size={17} />
      </span>
    </button>
  );
}

/* ── topbar (fixed) ────────────────────────────────────── */
export function Topbar({ name, theme, title }: { name: string; theme: Theme; title?: string }) {
  const { collapsed, setMobileOpen } = useShell();
  const pathname = usePathname();
  const heading = title ?? titleFromPath(pathname);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-30 border-b border-[color:var(--line)] backdrop-blur-xl transition-[left,background-color] duration-300 ease-out motion-reduce:transition-none ${
        collapsed ? "lg:left-[6.5rem]" : "lg:left-[17rem]"
      }`}
      style={{ background: "color-mix(in srgb, var(--bg) 80%, transparent)" }}
    >
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="mx-auto flex max-w-[1240px] items-center gap-3 px-4 py-4 sm:px-8 lg:px-6"
      >
        {/* tombol buka sidebar (mobile) */}
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Buka menu"
          aria-haspopup="dialog"
          className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white outline-none ring-1 ring-white/[0.05] transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-[#5A64D8] lg:hidden"
          style={{ background: SIDEBAR_BG }}
        >
          <Menu size={20} />
        </button>

        {/* judul halaman, tetap di kotak putih (card) */}
        <div
          className="flex h-12 min-w-0 flex-1 items-center rounded-2xl bg-[color:var(--card)] px-5 ring-1 ring-[color:var(--line)] transition-colors duration-300"
          style={{ boxShadow: "var(--shadow)" }}
        >
          <h1 className="truncate text-base font-semibold tracking-tight text-[color:var(--fg)] sm:text-lg">
            {heading}
          </h1>
        </div>

        <ThemeToggle initial={theme} />

        <div className="flex items-center gap-2.5 pl-1">
          <span
            className="relative block h-12 w-12 shrink-0 overflow-hidden rounded-full ring-2 ring-[color:var(--chip)]"
            style={{ background: ACCENT_GRADIENT }}
          >
            <Image src={PROFILE_SRC} alt={`Foto ${name}`} fill sizes="48px" className="object-cover" />
          </span>
          <p className="hidden leading-tight sm:block">
            <span className="block text-[10px] text-[color:var(--fg-muted)]">Hello</span>
            <span className="block max-w-[7rem] truncate text-sm font-semibold text-[color:var(--fg)]">{name}</span>
          </p>
        </div>
      </motion.div>
    </header>
  );
}