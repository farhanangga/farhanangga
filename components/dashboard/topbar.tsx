"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Menu, Moon, Search, Sun } from "lucide-react";
import { ACCENT_GLOW, ACCENT_GRADIENT, EASE, SIDEBAR_BG, THEME_KEY, type Theme } from "./shared";

/* foto profil: public/assets/profil-pic.jpg */
const PROFILE_SRC = "/assets/profil-pic.jpg";
import { useShell } from "./shell";

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
export function Topbar({ name, theme }: { name: string; theme: Theme }) {
  const { collapsed, setMobileOpen } = useShell();
  const searchRef = useRef<HTMLInputElement>(null);

  // tekan "/" untuk fokus ke search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !/^(INPUT|TEXTAREA)$/.test(t.tagName) && !t.isContentEditable) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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

        <label
          className="flex h-12 min-w-0 flex-1 items-center gap-3 rounded-2xl bg-[color:var(--card)] px-4 ring-1 ring-[color:var(--line)] transition-colors duration-300 focus-within:ring-2 focus-within:ring-[#5A64D8]"
          style={{ boxShadow: "var(--shadow)" }}
        >
          <Search size={20} className="shrink-0 text-[color:var(--fg-muted)]" />
          <input
            ref={searchRef}
            type="search"
            placeholder="Cari…"
            aria-label="Cari"
            className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-[color:var(--fg)] outline-none placeholder:text-[color:var(--fg-muted)] [&::-webkit-search-cancel-button]:hidden"
          />
          <kbd className="hidden rounded-md bg-[color:var(--chip)] px-2 py-0.5 text-xs font-medium text-[color:var(--fg-muted)] sm:block">
            /
          </kbd>
        </label>

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