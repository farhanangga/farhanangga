"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, MotionConfig, motion, type Variants } from "framer-motion";
import { ArrowUpRight, Images, Search, X } from "lucide-react";
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

/* ───────────── Pencarian ───────────── */

/** Huruf kecil tanpa aksen, supaya "Fotografi" cocok dengan "fotografi". */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Pecah kata kunci; proyek cocok jika SEMUA kata ada di salah satu field-nya. */
function toTerms(query: string): string[] {
  return normalize(query).split(/\s+/).filter(Boolean);
}

function matchesProject(p: ProjectItem, tab: ProjectTab, terms: string[]): boolean {
  if (terms.length === 0) return true;
  const haystack = normalize(
    [p.title, p.type, p.role, p.desc, p.tools.join(" "), tab.label, tab.short ?? ""].join(" ")
  );
  return terms.every((t) => haystack.includes(t));
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Beri sorotan pada kata yang cocok dengan pencarian. */
function Highlight({ text, terms, rgb }: { text: string; terms: string[]; rgb: string }) {
  if (terms.length === 0 || !text) return <>{text}</>;
  const sorted = [...terms].sort((a, b) => b.length - a.length);
  const re = new RegExp(`(${sorted.map(escapeRe).join("|")})`, "gi");
  const parts = text.split(re);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark
            key={i}
            className="rounded-[4px] px-0.5 text-inherit"
            style={{ background: `rgba(${rgb},0.38)` }}
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

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
  terms,
  onOpen,
}: {
  entry: Entry;
  index: number;
  showRole: boolean;
  terms: string[];
  onOpen: (rect: DOMRect) => void;
}) {
  const { p, tab } = entry;
  const th = themeForTab(tab);
  const isPhoto = kindOf(tab) === "photo";
  // tab Photographer sedang aktif (showRole = false berarti sedang difilter ke satu bidang)
  const photoTab = isPhoto && !showRole;
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
            {/* sampul: di tab Photographer selalu 4/5 (seperti mobile) di semua ukuran layar;
                di tab lain / "Semua", foto hanya setinggi itu di mobile */}
            <span
              className={`relative block w-full overflow-hidden bg-[#0B0B24] ${
                photoTab
                  ? "aspect-[4/5]"
                  : isPhoto
                    ? "aspect-[4/5] sm:aspect-[16/10]"
                    : "aspect-[16/10]"
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
                <Highlight text={p.type} terms={terms} rgb={th.rgb} />
              </span>
              <span className="mt-1 text-xl font-semibold leading-snug">
                <Highlight text={p.title} terms={terms} rgb={th.rgb} />
              </span>
              <span className="text-sm text-white/60">
                <Highlight text={p.role} terms={terms} rgb={th.rgb} />
              </span>

              <span className="mt-3 line-clamp-2 break-words text-sm leading-relaxed text-white/70">
                <Highlight text={p.desc} terms={terms} rgb={th.rgb} />
              </span>

              <span className="mb-5 mt-4 flex flex-wrap gap-1.5">
                {p.tools.slice(0, 3).map((t) => (
                  <span key={t} className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/80">
                    <Highlight text={t} terms={terms} rgb={th.rgb} />
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
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const tabListRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const active = resolveTab(params.get("role"), tabs);
  const activeId = active?.id ?? null;
  const theme = themeForTab(active);
  const copy = active
    ? (COPY[kindOf(active) ?? ""] ?? { title: active.label, text: COPY.all.text })
    : COPY.all;

  const terms = useMemo(() => toTerms(query), [query]);
  const rawTerms = useMemo(() => query.trim().split(/\s+/).filter(Boolean), [query]);
  const searching = terms.length > 0;

  // tools yang paling sering dipakai, jadi saran pencarian cepat
  const popularTools = useMemo(() => {
    const freq = new Map<string, { label: string; n: number }>();
    for (const t of tabs)
      for (const p of t.projects)
        for (const tool of p.tools) {
          const k = tool.toLowerCase();
          const cur = freq.get(k);
          if (cur) cur.n += 1;
          else freq.set(k, { label: tool, n: 1 });
        }
    return [...freq.values()]
      .sort((a, b) => b.n - a.n)
      .slice(0, 12)
      .map((x) => x.label);
  }, [tabs]);

  // hasil pencarian per bidang (dipakai untuk angka di tab)
  const matchesByTab = useMemo(
    () =>
      tabs.map((t) => ({
        tab: t,
        projects: t.projects.filter((p) => matchesProject(p, t, terms)),
      })),
    [tabs, terms]
  );

  const entries = useMemo<Entry[]>(
    () =>
      matchesByTab
        .filter(({ tab }) => !active || tab.id === active.id)
        .flatMap(({ tab, projects }) =>
          projects.map((p) => ({ p, tab, key: `${tab.id}-${p.id}` }))
        ),
    [matchesByTab, active]
  );

  const options: Option[] = [
    {
      id: null,
      label: "Semua",
      short: "Semua",
      count: matchesByTab.reduce((sum, m) => sum + m.projects.length, 0),
      theme: themeForTab(null),
    },
    ...matchesByTab.map(({ tab, projects }) => ({
      id: tab.id,
      label: tab.label,
      short: tab.short,
      count: projects.length,
      theme: themeForTab(tab),
    })),
  ];

  // Di mobile, tab aktif digulung ke tengah barisan tab.
  // Hanya container tab yang digulung (bukan scrollIntoView), supaya section/halaman tidak ikut bergeser.
  useEffect(() => {
    const list = tabListRef.current;
    const el = list?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!list || !el) return;

    // di desktop barisan tab tidak meluap, jadi tidak perlu digulung
    if (list.scrollWidth <= list.clientWidth) return;

    const listRect = list.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const left =
      elRect.left - listRect.left + list.scrollLeft - (list.clientWidth - elRect.width) / 2;

    list.scrollTo({ left, behavior: "smooth" });
  }, [activeId]);

  // pintasan: tekan "/" untuk langsung mengetik di kolom cari
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      e.preventDefault();
      searchRef.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function setRole(id: string | null) {
    setSel(null);
    router.replace(id ? `/projects?role=${id}` : "/projects", { scroll: false });
  }

  function changeQuery(v: string) {
    setSel(null);
    setQuery(v);
  }

  function clearQuery() {
    changeQuery("");
    searchRef.current?.focus();
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

          {/* pencarian: bar lebar di atas filter, menyala sesuai warna bidang saat fokus */}
          <div className="mt-8">
            <motion.div
              role="search"
              onClick={() => searchRef.current?.focus()}
              animate={{
                borderColor: focused ? theme.hex : "rgba(255,255,255,0.1)",
                boxShadow: focused
                  ? `0 0 0 4px rgba(${theme.rgb},0.16), 0 12px 40px -12px rgba(${theme.rgb},0.55)`
                  : "0 0 0 0px rgba(0,0,0,0), 0 0 0 0 rgba(0,0,0,0)",
              }}
              transition={{ duration: 0.25, ease: EASE }}
              className="flex h-14 w-full cursor-text items-center gap-3 rounded-full border bg-white/[0.04] pl-5 pr-2.5 backdrop-blur"
            >
              <Search
                size={19}
                aria-hidden
                className="shrink-0 transition-colors"
                style={{ color: focused || searching ? theme.hex : "rgba(255,255,255,0.4)" }}
              />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => changeQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === "Escape" && query) {
                    e.preventDefault();
                    changeQuery("");
                  }
                }}
                placeholder="Cari proyek: judul, tools, atau jenis"
                aria-label="Cari proyek"
                autoComplete="off"
                spellCheck={false}
                className="min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-white/40 [&::-webkit-search-cancel-button]:hidden"
              />

              <AnimatePresence mode="wait" initial={false}>
                {searching ? (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.18 }}
                    className="flex shrink-0 items-center gap-2"
                  >
                    <span
                      className={`${mono.className} rounded-full px-3 py-1 text-xs font-medium`}
                      style={{ background: `rgba(${theme.rgb},0.18)`, color: theme.hex }}
                    >
                      {entries.length} hasil
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearQuery();
                      }}
                      aria-label="Hapus pencarian"
                      className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white/80 outline-none transition-colors hover:bg-white/20 hover:text-white focus-visible:ring-2 focus-visible:ring-white/60"
                    >
                      <X size={16} />
                    </button>
                  </motion.div>
                ) : (
                  <motion.kbd
                    key="hint"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className={`${mono.className} mr-2 hidden h-7 min-w-7 shrink-0 items-center justify-center rounded-md border border-white/15 bg-white/[0.06] px-2 text-xs text-white/50 sm:inline-flex`}
                    aria-hidden
                  >
                    /
                  </motion.kbd>
                )}
              </AnimatePresence>
            </motion.div>

            {/* saran cepat: tools yang paling sering dipakai */}
            <AnimatePresence initial={false}>
              {!searching && popularTools.length > 0 && (
                <motion.div
                  key="suggest"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: EASE }}
                  className="overflow-hidden"
                >
                  <div className="-mx-5 flex items-center gap-2 overflow-x-auto px-5 pt-3 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
                    <span className="shrink-0 text-xs text-white/40">Coba cari</span>
                    {popularTools.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          changeQuery(t);
                          searchRef.current?.focus();
                        }}
                        className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/70 outline-none transition-colors hover:border-white/25 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/60"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* filter bidang */}
          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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

            <p className="text-sm text-white/45" aria-live="polite">
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
                    terms={rawTerms}
                    onOpen={(rect) => setSel({ index: i, rect })}
                  />
                ))}
              </AnimatePresence>
            </ul>
          ) : (
            <div className="mt-8 rounded-xl bg-[#14142B] px-6 py-14 text-center text-white/60">
              {searching ? (
                <>
                  <p>
                    Tidak ada proyek yang cocok dengan “<span className="text-white/80">{query.trim()}</span>”
                    {active ? ` di bidang ${active.short}` : ""}.
                  </p>
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={clearQuery}
                      className="rounded-full bg-white/10 px-4 py-2 text-sm text-white outline-none transition-colors hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/60"
                    >
                      Hapus pencarian
                    </button>
                    {active && (
                      <button
                        type="button"
                        onClick={() => setRole(null)}
                        className="rounded-full px-4 py-2 text-sm font-medium outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-white/60"
                        style={{ background: theme.hex, color: theme.ink }}
                      >
                        Cari di semua bidang
                      </button>
                    )}
                  </div>
                </>
              ) : (
                "Belum ada proyek di bidang ini."
              )}
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