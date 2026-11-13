"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, MotionConfig, motion, type Variants } from "framer-motion";
import { ArrowUpRight, Images } from "lucide-react";
import type { ProjectItem, ProjectTab } from "@/lib/data";
import { mono } from "../fonts";
import { ProjectModal, Shot, pad, themeOf, type Theme } from "./projectModal";
import { EASE, Tilt } from "../ui";

/* ───────────── Warna & jenis bidang ───────────── */

type Kind = "software" | "uiux" | "photo" | "graphic";

const PALETTE: Record<Kind, { hex: string; rgb: string; ink: string }> = {
  software: { hex: "#6366F1", rgb: "99,102,241", ink: "#FFFFFF" },
  uiux: { hex: "#F25C5C", rgb: "242,92,92", ink: "#000000" },
  photo: { hex: "#FFC857", rgb: "255,200,87", ink: "#000000" },
  graphic: { hex: "#34D399", rgb: "52,211,153", ink: "#000000" },
};

/** Tentukan jenis bidang dari teks (id / label / short / param URL). */
function kindFromText(text: string): Kind | null {
  const key = text.toLowerCase();
  if (/graphic|grafis/.test(key)) return "graphic";
  if (/photo|foto/.test(key)) return "photo";
  if (/\bui\b|\bux\b|ui\s*\/\s*ux|uiux/.test(key)) return "uiux";
  if (/software|engineer|\bapp\b|\bweb\b/.test(key)) return "software";
  return null;
}

function kindOf(t: ProjectTab): Kind | null {
  return kindFromText(`${t.id} ${t.label} ${t.short ?? ""}`);
}

/** Ikon & field lain tetap dari themeOf; hanya warna yang ditimpa. */
function themeForTab(t: ProjectTab | null): Theme {
  if (!t) return themeOf(null);
  const base = themeOf(t.id);
  const kind = kindOf(t);
  return kind ? { ...base, ...PALETTE[kind] } : base;
}

/* ───────────── Konfigurasi ───────────── */

function resolveTab(param: string | null, tabs: ProjectTab[]): ProjectTab | null {
  if (!param) return null;
  const q = param.toLowerCase();
  const byId = tabs.find((t) => t.id.toLowerCase() === q);
  if (byId) return byId;
  const kind = kindFromText(q);
  return kind ? (tabs.find((t) => kindOf(t) === kind) ?? null) : null;
}

const COPY: Record<string, { title: string; text: string }> = {
  all: {
    title: "My Projects",
    text: "Kumpulan karya saya dari empat bidang: membangun aplikasi, merancang UI/UX, fotografi, dan desain grafis.",
  },
  software: {
    title: "Software Engineer",
    text: "Aplikasi dan website yang saya bangun, dari antarmuka sampai logika di baliknya.",
  },
  uiux: {
    title: "UI/UX Designer",
    text: "Rancangan antarmuka dan alur pengguna, dari wireframe sampai prototipe.",
  },
  photo: {
    title: "Photographer",
    text: "Karya fotografi yang saya ambil dan olah sendiri.",
  },
  graphic: {
    title: "Graphic Designer",
    text: "Desain visual seperti poster, logo, dan identitas merek yang saya buat.",
  },
};

type Entry = { p: ProjectItem; tab: ProjectTab; key: string };
type Option = { id: string | null; label: string; short: string; count: number; theme: Theme };

/* ───────────── Card ───────────── */

const cardParent: Variants = { rest: {}, hover: {} };
const imgV: Variants = {
  rest: { scale: 1 },
  hover: { scale: 1.07, transition: { duration: 0.8, ease: EASE } },
};

function ProjectCard({
  entry,
  index,
  showRole,
  onOpen,
}: {
  entry: Entry;
  index: number;
  showRole: boolean;
  onOpen: (rect: DOMRect) => void;
}) {
  const { p, tab } = entry;
  const th = themeForTab(tab);
  const isPhoto = kindOf(tab) === "photo";
  const extraTools = p.tools.length - 3;

  // satu-satunya varian yang bergantung pada tema
  const arrowV: Variants = {
    rest: { backgroundColor: "rgba(255,255,255,0.08)", color: "#FFFFFF", scale: 1 },
    hover: {
      backgroundColor: th.hex,
      color: th.ink,
      scale: 1.1,
      transition: { duration: 0.3, ease: EASE },
    },
  };

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 32, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.2 } }}
      transition={{
        layout: { type: "spring", stiffness: 300, damping: 32 },
        default: { duration: 0.6, ease: EASE, delay: Math.min(index, 6) * 0.05 },
      }}
      className="h-full"
    >
      <motion.div
        className="h-full"
        variants={cardParent}
        initial="rest"
        animate="rest"
        whileHover="hover"
        whileTap={{ scale: 0.985 }}
      >
        <Tilt className="h-full overflow-hidden rounded-xl bg-[#14142B]">
          <button
            type="button"
            onClick={(e) => onOpen(e.currentTarget.getBoundingClientRect())}
            className="flex h-full w-full flex-col text-left outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            {/* sampul: foto dibuat lebih tinggi hanya saat mobile (1 kolom) */}
            <span
              className={`relative block w-full overflow-hidden bg-[#0B0B24] ${
                isPhoto ? "aspect-[4/5] sm:aspect-[16/10]" : "aspect-[16/10]"
              }`}
            >
              <motion.span variants={imgV} className="absolute inset-0 block">
                <Shot
                  src={p.images[0] ?? ""}
                  alt={`Sampul proyek ${p.title}`}
                  sizes="(min-width:1024px) 380px, (min-width:640px) 50vw, 100vw"
                  theme={th}
                />
              </motion.span>
              <span className="absolute inset-0 bg-gradient-to-t from-[#14142B] via-transparent to-transparent" />

              <span className="absolute inset-x-3 top-3 flex items-center justify-between">
                <span
                  className={`${mono.className} rounded-full bg-black/55 px-2.5 py-1 text-xs text-white backdrop-blur`}
                >
                  {pad(index + 1)}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-xs text-white/80 backdrop-blur">
                  <Images size={12} /> {p.images.length}
                </span>
              </span>

              {showRole && (
                <span
                  className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
                  style={{ background: th.hex, color: th.ink }}
                >
                  <th.Icon size={12} /> {tab.short}
                </span>
              )}
            </span>

            {/* isi */}
            <span className="flex flex-1 flex-col p-5">
              <span className={`${mono.className} text-sm`} style={{ color: th.hex }}>
                {p.type}
              </span>
              <span className="mt-1 text-xl font-semibold leading-snug">{p.title}</span>
              <span className="text-sm text-white/60">{p.role}</span>

              <span className="mt-3 line-clamp-2 break-words text-sm leading-relaxed text-white/70">
                {p.desc}
              </span>

              <span className="mt-4 flex flex-wrap gap-1.5">
                {p.tools.slice(0, 3).map((t) => (
                  <span key={t} className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/80">
                    {t}
                  </span>
                ))}
                {extraTools > 0 && <span className="px-1 py-1 text-xs text-white/40">+{extraTools}</span>}
              </span>

              <span className="mt-auto flex items-center justify-between border-t border-white/10 pt-4 text-sm">
                <span className="text-white/60">Lihat detail</span>
                <motion.span variants={arrowV} className="grid h-9 w-9 place-items-center rounded-full">
                  <ArrowUpRight size={17} />
                </motion.span>
              </span>
            </span>
          </button>
        </Tilt>
      </motion.div>
    </motion.li>
  );
}

/* ───────────── Halaman ───────────── */

/** Data tab dikirim dari server component (app/projects/page.tsx). Filter bidang lewat ?role=... */
export function ProjectsView({ tabs = [] }: { tabs?: ProjectTab[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [sel, setSel] = useState<{ index: number; rect: DOMRect | null } | null>(null);
  const tabListRef = useRef<HTMLDivElement>(null);

  const active = resolveTab(params.get("role"), tabs);
  const activeId = active?.id ?? null;
  const theme = themeForTab(active);
  const copy = active
    ? (COPY[kindOf(active) ?? ""] ?? { title: active.label, text: COPY.all.text })
    : COPY.all;

  const entries = useMemo<Entry[]>(
    () =>
      (active ? [active] : tabs).flatMap((t) =>
        t.projects.map((p) => ({ p, tab: t, key: `${t.id}-${p.id}` }))
      ),
    [active, tabs]
  );

  const options: Option[] = [
    {
      id: null,
      label: "Semua",
      short: "Semua",
      count: tabs.reduce((sum, t) => sum + t.projects.length, 0),
      theme: themeForTab(null),
    },
    ...tabs.map((t) => ({
      id: t.id,
      label: t.label,
      short: t.short,
      count: t.projects.length,
      theme: themeForTab(t),
    })),
  ];

  // di mobile, tab aktif digulung ke tengah barisan tab
  useEffect(() => {
    const el = tabListRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    el?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [activeId]);

  function setRole(id: string | null) {
    setSel(null);
    router.replace(id ? `/projects?role=${id}` : "/projects", { scroll: false });
  }

  return (
    <MotionConfig reducedMotion="user">
      <section className="relative overflow-hidden">
        {/* dot grid + blob cahaya mengikuti warna bidang */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)",
            backgroundSize: "26px 26px",
            maskImage: "radial-gradient(ellipse 75% 45% at 50% 20%, black, transparent)",
            WebkitMaskImage: "radial-gradient(ellipse 75% 45% at 50% 20%, black, transparent)",
          }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -left-32 top-24 h-[380px] w-[380px] rounded-full opacity-25 blur-[120px]"
          animate={{ backgroundColor: theme.hex, x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{
            backgroundColor: { duration: 0.8 },
            x: { duration: 14, repeat: Infinity, ease: "easeInOut" },
            y: { duration: 14, repeat: Infinity, ease: "easeInOut" },
          }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -right-32 top-[40%] h-[340px] w-[340px] rounded-full opacity-15 blur-[120px]"
          animate={{ backgroundColor: theme.hex, x: [0, -40, 0], y: [0, -40, 0] }}
          transition={{
            backgroundColor: { duration: 0.8 },
            x: { duration: 17, repeat: Infinity, ease: "easeInOut" },
            y: { duration: 17, repeat: Infinity, ease: "easeInOut" },
          }}
        />

        <div className="relative mx-auto max-w-[1200px] px-5 pb-24 pt-32 sm:px-10 sm:pb-28 sm:pt-40">
          {/* judul */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className={`${mono.className} text-sm text-white/50`}
          >
            Portofolio <span className="text-white/25">/</span>{" "}
            <span style={{ color: theme.hex }}>Proyek</span>
          </motion.p>

          <div className="relative mt-3 min-h-[8.5rem] sm:min-h-[11rem]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={activeId ?? "all"} exit={{ opacity: 0, y: -12, transition: { duration: 0.18 } }}>
                <h1 className={`${mono.className} overflow-hidden pb-2 text-4xl font-bold leading-[1.05] sm:text-6xl`}>
                  <motion.span
                    className="block"
                    initial={{ y: "115%" }}
                    animate={{ y: 0 }}
                    transition={{ duration: 0.8, ease: EASE }}
                  >
                    {copy.title}
                  </motion.span>
                </h1>
                <motion.p
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.15, ease: EASE }}
                  className="mt-4 max-w-[52ch] leading-relaxed text-white/70"
                >
                  {copy.text}
                </motion.p>
              </motion.div>
            </AnimatePresence>

            {/* angka outline raksasa */}
            <span
              aria-hidden
              className={`${mono.className} pointer-events-none absolute right-0 top-0 hidden select-none text-[9rem] font-black leading-none md:block`}
              style={{ color: "transparent", WebkitTextStroke: `1px rgba(${theme.rgb},0.3)` }}
            >
              {pad(entries.length)}
            </span>
          </div>

          {/* filter bidang */}
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* mobile: bisa digeser ke samping; sm ke atas: tampil biasa */}
            <div
              ref={tabListRef}
              className="-mx-5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:mx-0 sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden"
            >
              <div
                role="tablist"
                aria-label="Filter bidang proyek"
                className="inline-flex w-max snap-x snap-mandatory gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1"
              >
                {options.map((o) => {
                  const th = o.theme;
                  const on = o.id === activeId;
                  return (
                    <button
                      key={o.id ?? "all"}
                      type="button"
                      role="tab"
                      aria-selected={on}
                      onClick={() => setRole(o.id)}
                      className="relative z-0 flex shrink-0 snap-center items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2.5 text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/60 sm:gap-2 sm:px-5 sm:text-sm"
                      style={{ color: on ? th.ink : "rgba(255,255,255,0.6)" }}
                    >
                      {on && (
                        <motion.span
                          layoutId="projects-filter-pill"
                          transition={{ type: "spring", stiffness: 380, damping: 34 }}
                          className="absolute inset-0 -z-10 rounded-full"
                          style={{ background: th.hex }}
                        />
                      )}
                      <th.Icon size={15} />
                      <span className="sm:hidden">{o.short}</span>
                      <span className="hidden sm:inline">{o.label}</span>
                      <span className={`${mono.className} text-[11px] opacity-60`}>{o.count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="text-sm text-white/45">
              <span className={mono.className} style={{ color: theme.hex }}>
                {pad(entries.length)}
              </span>{" "}
              proyek ditampilkan
            </p>
          </div>

          {/* grid card */}
          {entries.length > 0 ? (
            <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {entries.map((e, i) => (
                  <ProjectCard
                    key={e.key}
                    entry={e}
                    index={i}
                    showRole={!active}
                    onOpen={(rect) => setSel({ index: i, rect })}
                  />
                ))}
              </AnimatePresence>
            </ul>
          ) : (
            <div className="mt-8 rounded-xl bg-[#14142B] px-6 py-14 text-center text-white/60">
              Belum ada proyek di bidang ini.
            </div>
          )}
        </div>

        {/* detail (modal yang sama dengan section proyek di beranda) */}
        <AnimatePresence>
          {sel && entries[sel.index] && (
            <ProjectModal
              key="modal"
              entries={entries}
              index={sel.index}
              origin={sel.rect}
              onNavigate={(i) => setSel((cur) => (cur ? { ...cur, index: i } : cur))}
              onClose={() => setSel(null)}
            />
          )}
        </AnimatePresence>
      </section>
    </MotionConfig>
  );
}