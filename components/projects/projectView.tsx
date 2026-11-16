"use client";

import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, MotionConfig, motion, type Variants } from "framer-motion";
import { ArrowUpRight, Images, Search, X } from "lucide-react";
import type { ProjectItem, ProjectTab } from "@/lib/data";
import { mono } from "../fonts";
import { ProjectModal, Shot, pad, themeOf, type Theme } from "./projectModal";
import { EASE, Tilt } from "../ui";

/* ───────────── Colors & field kinds ───────────── */

type Kind = "software" | "uiux" | "photo" | "graphic";

const PALETTE: Record<Kind, { hex: string; rgb: string; ink: string }> = {
  software: { hex: "#6366F1", rgb: "99,102,241", ink: "#FFFFFF" },
  uiux: { hex: "#F25C5C", rgb: "242,92,92", ink: "#000000" },
  photo: { hex: "#FFC857", rgb: "255,200,87", ink: "#000000" },
  graphic: { hex: "#34D399", rgb: "52,211,153", ink: "#000000" },
};

/**
 * Determine the field kind from text (id / label / short / URL param).
 * "grafis" and "foto" are kept so labels stored in Indonesian in the database still match.
 */
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

/** Icon & other fields still come from themeOf; only the colors are overridden. */
function themeForTab(t: ProjectTab | null): Theme {
  if (!t) return themeOf(null);
  const base = themeOf(t.id);
  const kind = kindOf(t);
  return kind ? { ...base, ...PALETTE[kind] } : base;
}

/* ───────────── Configuration ───────────── */

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
    text: "A collection of my work from four areas: building applications, designing UI/UX, photography, and graphic design.",
  },
  software: {
    title: "Software Engineer",
    text: "The applications and websites I've built, from the interface to the underlying logic.",
  },
  uiux: {
    title: "UI/UX Designer",
    text: "Interface and user flow design, from wireframe to prototype.",
  },
  photo: {
    title: "Photographer",
    text: "Photography work that I took and edited myself.",
  },
  graphic: {
    title: "Graphic Designer",
    text: "Visual designs such as posters, logos, and brand identities that I created.",
  },
};

type Entry = { p: ProjectItem; tab: ProjectTab; key: string };
type Option = { id: string | null; label: string; short: string; count: number; theme: Theme };

/* ───────────── Search ───────────── */

/** Lowercase without accents, so "Fotografi" matches "fotografi". */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Split the query into terms; a project matches if ALL terms appear in any of its fields. */
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

/** Highlight the words that match the search. */
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

type ProjectCardProps = {
  entry: Entry;
  index: number;
  showRole: boolean;
  terms: string[];
  onOpen: (rect: DOMRect) => void;
};

/**
 * forwardRef is REQUIRED: AnimatePresence mode="popLayout" needs a ref to the
 * root DOM element of every direct child so it can measure it and pop it out
 * of the layout when it exits. Without it, exiting cards get stuck in the grid.
 */
const ProjectCard = forwardRef<HTMLLIElement, ProjectCardProps>(function ProjectCard(
  { entry, index, showRole, terms, onOpen },
  ref
) {
  const { p, tab } = entry;
  const th = themeForTab(tab);
  const isPhoto = kindOf(tab) === "photo";
  // Photographer tab is active (showRole = false means it's filtered to a single field)
  const photoTab = isPhoto && !showRole;
  const extraTools = p.tools.length - 3;

  // the only variant that depends on the theme
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
      ref={ref}
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
            {/* cover: on the Photographer tab it's always 4/5 (like mobile) at every screen size;
                on other tabs / "All", photos only get that height on mobile */}
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
                  alt={`Cover of ${p.title}`}
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

            {/* content */}
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
                <span className="text-white/60">View details</span>
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
});

/* ───────────── Page ───────────── */

/** Tab data is passed from a server component (app/projects/page.tsx). Field filter via ?role=... */
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
  // search panel text/fill follows the field color's contrast (white or black)
  const darkInk = theme.ink.toLowerCase() === "#000000" || theme.ink.toLowerCase() === "#000";
  const inkRgb = darkInk ? "0,0,0" : "255,255,255";
  const fieldBg = darkInk ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.22)";
  const copy = active
    ? (COPY[kindOf(active) ?? ""] ?? { title: active.label, text: COPY.all.text })
    : COPY.all;

  const terms = useMemo(() => toTerms(query), [query]);
  const rawTerms = useMemo(() => query.trim().split(/\s+/).filter(Boolean), [query]);
  const searching = terms.length > 0;

  // most-used tools, shown as quick search suggestions
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

  // search results per field (used for the counts on the tabs)
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
      label: "All",
      short: "All",
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

  // On mobile, scroll the active tab to the center of the tab row.
  // Only the tab container is scrolled (not scrollIntoView), so the section/page doesn't shift.
  useEffect(() => {
    const list = tabListRef.current;
    const el = list?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!list || !el) return;

    // on desktop the tab row doesn't overflow, so there's nothing to scroll
    if (list.scrollWidth <= list.clientWidth) return;

    const listRect = list.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const left =
      elRect.left - listRect.left + list.scrollLeft - (list.clientWidth - elRect.width) / 2;

    list.scrollTo({ left, behavior: "smooth" });
  }, [activeId]);

  // close the modal whenever the field filter changes (including changes coming
  // from the URL, e.g. a button on another page), so sel.index never points at
  // a card from the previous list
  useEffect(() => {
    setSel(null);
  }, [activeId]);

  // shortcut: press "/" to jump straight into the search field
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
        {/* dot grid + glow blobs that follow the field color */}
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
          {/* title */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className={`${mono.className} text-sm text-white/50`}
          >
            Portfolio <span className="text-white/25">/</span>{" "}
            <span style={{ color: theme.hex }}>Projects</span>
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

            {/* giant outline number */}
            <span
              aria-hidden
              className={`${mono.className} pointer-events-none absolute right-0 top-0 hidden select-none text-[9rem] font-black leading-none md:block`}
              style={{ color: "transparent", WebkitTextStroke: `1px rgba(${theme.rgb},0.3)` }}
            >
              {pad(entries.length)}
            </span>
          </div>

          {/* search + tool suggestions: solid panel, color follows the active field */}
          <motion.div
            className="mt-8 rounded-[2rem] p-3 sm:p-4"
            initial={false}
            animate={{
              backgroundColor: theme.hex,
            }}
            transition={{ duration: 0.5, ease: EASE }}
            style={{ color: theme.ink }}
          >
            <motion.div
              role="search"
              onClick={() => searchRef.current?.focus()}
              animate={{
                backgroundColor: fieldBg,
                boxShadow: focused
                  ? `0 0 0 3px rgba(${inkRgb},0.35)`
                  : `0 0 0 0px rgba(${inkRgb},0)`,
              }}
              transition={{ duration: 0.25, ease: EASE }}
              className="flex h-14 w-full cursor-text items-center gap-3 rounded-full pl-5 pr-2.5"
            >
              <Search size={19} aria-hidden className="shrink-0" style={{ color: theme.ink }} />
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
                placeholder="Search projects: title, tools, or type"
                aria-label="Search projects"
                autoComplete="off"
                spellCheck={false}
                className="min-w-0 flex-1 bg-transparent text-[15px] font-medium outline-none placeholder:text-[color:var(--ph)] [&::-webkit-search-cancel-button]:hidden"
                style={{ color: theme.ink, ["--ph" as string]: `rgba(${inkRgb},0.6)` }}
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
                      className={`${mono.className} rounded-full px-3 py-1 text-xs font-semibold`}
                      style={{ background: `rgba(${inkRgb},0.16)`, color: theme.ink }}
                    >
                      {entries.length} {entries.length === 1 ? "result" : "results"}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearQuery();
                      }}
                      aria-label="Clear search"
                      className="grid h-9 w-9 place-items-center rounded-full outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-white/60"
                      style={{ background: `rgba(${inkRgb},0.16)`, color: theme.ink }}
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
                    className={`${mono.className} mr-2 hidden h-7 min-w-7 shrink-0 items-center justify-center rounded-md px-2 text-xs sm:inline-flex`}
                    style={{ background: `rgba(${inkRgb},0.14)`, color: `rgba(${inkRgb},0.75)` }}
                    aria-hidden
                  >
                    /
                  </motion.kbd>
                )}
              </AnimatePresence>
            </motion.div>

            {/* quick suggestions: most-used tools */}
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
                  <div className="-mx-3 flex items-center gap-2 overflow-x-auto px-3 pb-1 pt-3 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
                    <span className="shrink-0 text-xs font-semibold" style={{ color: theme.ink }}>
                      Try searching
                    </span>
                    {popularTools.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          changeQuery(t);
                          searchRef.current?.focus();
                        }}
                        className="shrink-0 rounded-full px-3 py-1 text-xs font-medium outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-white/60"
                        style={{ background: `rgba(${inkRgb},0.16)`, color: theme.ink }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* field filter */}
          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* mobile: scrollable sideways; sm and up: displayed normally */}
            <div
              ref={tabListRef}
              className="-mx-5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:mx-0 sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden"
            >
              <div
                role="tablist"
                aria-label="Filter projects by field"
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
              {entries.length === 1 ? "project" : "projects"} shown
            </p>
          </div>

          {/* card grid */}
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
                    No projects match “<span className="text-white/80">{query.trim()}</span>”
                    {active ? ` in ${active.short}` : ""}.
                  </p>
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={clearQuery}
                      className="rounded-full bg-white/10 px-4 py-2 text-sm text-white outline-none transition-colors hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/60"
                    >
                      Clear search
                    </button>
                    {active && (
                      <button
                        type="button"
                        onClick={() => setRole(null)}
                        className="rounded-full px-4 py-2 text-sm font-medium outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-white/60"
                        style={{ background: theme.hex, color: theme.ink }}
                      >
                        Search all fields
                      </button>
                    )}
                  </div>
                </>
              ) : (
                "No projects in this field yet."
              )}
            </div>
          )}
        </div>

        {/* detail (same modal as the projects section on the home page) */}
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