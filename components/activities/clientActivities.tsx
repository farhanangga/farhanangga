"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion, type Variants } from "framer-motion";
import { ArrowUpRight, Images, LayoutGrid, Search, X } from "lucide-react";
import type { ActivityItem } from "../../lib/data";
import { mono } from "../fonts";
import { EASE, Tilt } from "../ui";
import { ACTIVITY_THEME, ActivityModal, Shot, pad } from "./activitiesModal";

/* ───────────── Pencarian ───────────── */

/** Huruf kecil tanpa aksen, supaya pencarian tidak sensitif huruf besar/aksen. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Pecah kata kunci; kegiatan cocok jika SEMUA kata ada di salah satu field-nya. */
function toTerms(query: string): string[] {
  return normalize(query).split(/\s+/).filter(Boolean);
}

function matchesActivity(a: ActivityItem, terms: string[]): boolean {
  if (terms.length === 0) return true;
  const haystack = normalize(
    [a.namaKegiatan, a.role, a.deskripsi, a.tahun != null ? String(a.tahun) : "kepanitiaan"].join(" ")
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

function ActivityCard({
  a,
  index,
  terms,
  onOpen,
}: {
  a: ActivityItem;
  index: number;
  terms: string[];
  onOpen: (rect: DOMRect) => void;
}) {
  const th = ACTIVITY_THEME;
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
            {/* sampul */}
            <span className="relative block aspect-[16/10] w-full overflow-hidden bg-[#0B0B24]">
              <motion.span variants={imgV} className="absolute inset-0 block">
                <Shot
                  src={a.images[0] ?? ""}
                  alt={`Sampul kegiatan ${a.namaKegiatan}`}
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
                  <Images size={12} /> {a.images.length}
                </span>
              </span>
            </span>

            {/* isi */}
            <span className="flex flex-1 flex-col p-5">
              <span className={`${mono.className} text-sm`} style={{ color: th.hex }}>
                <Highlight text={a.tahun != null ? String(a.tahun) : "Kepanitiaan"} terms={terms} rgb={th.rgb} />
              </span>
              <span className="mt-1 text-xl font-semibold leading-snug">
                <Highlight text={a.namaKegiatan} terms={terms} rgb={th.rgb} />
              </span>
              <span className="mt-1 inline-flex w-fit max-w-full rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/80">
                <span className="truncate">
                  <Highlight text={a.role} terms={terms} rgb={th.rgb} />
                </span>
              </span>

              <span className="mt-3 line-clamp-2 text-sm leading-relaxed text-white/70">
                <Highlight text={a.deskripsi} terms={terms} rgb={th.rgb} />
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

/** Data datang dari API (/api/activities) lewat app/activities/page.tsx */
export function ActivitiesClient({ items }: { items: ActivityItem[] }) {
  const theme = ACTIVITY_THEME;
  const [year, setYear] = useState<number | null>(null);
  const [sel, setSel] = useState<{ index: number; rect: DOMRect | null } | null>(null);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const close = useCallback(() => setSel(null), []);

  // warna teks/isi panel pencarian mengikuti kontras warna tema (putih atau hitam)
  const darkInk = theme.ink.toLowerCase() === "#000000" || theme.ink.toLowerCase() === "#000";
  const inkRgb = darkInk ? "0,0,0" : "255,255,255";
  const fieldBg = darkInk ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.22)";

  const terms = useMemo(() => toTerms(query), [query]);
  const rawTerms = useMemo(() => query.trim().split(/\s+/).filter(Boolean), [query]);
  const searching = terms.length > 0;

  // daftar tahun yang ada di data, terbaru dulu
  const years = useMemo(
    () => [...new Set(items.map((a) => a.tahun).filter((y): y is number => typeof y === "number"))].sort((a, b) => b - a),
    [items]
  );

  // peran yang paling sering muncul, jadi saran pencarian cepat
  const popularRoles = useMemo(() => {
    const freq = new Map<string, { label: string; n: number }>();
    for (const a of items) {
      const label = a.role?.trim();
      if (!label) continue;
      const k = label.toLowerCase();
      const cur = freq.get(k);
      if (cur) cur.n += 1;
      else freq.set(k, { label, n: 1 });
    }
    return [...freq.values()]
      .sort((a, b) => b.n - a.n)
      .slice(0, 8)
      .map((x) => x.label);
  }, [items]);

  // hasil pencarian (dipakai untuk angka di filter tahun)
  const matched = useMemo(() => items.filter((a) => matchesActivity(a, terms)), [items, terms]);
  const entries = useMemo(() => (year ? matched.filter((a) => a.tahun === year) : matched), [matched, year]);

  const options = [
    { id: null as number | null, label: "Semua", count: matched.length },
    ...years.map((y) => ({
      id: y as number | null,
      label: String(y),
      count: matched.filter((a) => a.tahun === y).length,
    })),
  ];

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

  const setFilter = (id: number | null) => {
    setSel(null);
    setYear(id);
  };

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
        {/* dot grid + blob cahaya */}
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
          className="pointer-events-none absolute -left-32 top-24 h-[300px] w-[300px] rounded-full opacity-25 blur-[110px] sm:h-[380px] sm:w-[380px] sm:blur-[120px]"
          style={{ backgroundColor: theme.hex }}
          animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -right-32 top-[40%] h-[280px] w-[280px] rounded-full opacity-15 blur-[110px] sm:h-[340px] sm:w-[340px] sm:blur-[120px]"
          style={{ backgroundColor: theme.hex }}
          animate={{ x: [0, -40, 0], y: [0, -40, 0] }}
          transition={{ duration: 17, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative mx-auto max-w-[1200px] px-5 pb-20 pt-28 sm:px-10 sm:pb-28 sm:pt-40">
          {/* judul */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className={`${mono.className} text-sm text-white/50`}
          >
            Portofolio <span className="text-white/25">/</span>{" "}
            <span style={{ color: theme.hex }}>Kegiatan</span>
          </motion.p>

          <div className="relative">
            <h1
              className={`${mono.className} mt-3 overflow-hidden pb-2 text-4xl font-bold leading-[1.05] sm:text-6xl lg:text-7xl`}
            >
              <motion.span
                className="block"
                initial={{ y: "115%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, ease: EASE }}
              >
                My Activities
              </motion.span>
            </h1>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15, ease: EASE }}
              className="mt-4 max-w-[52ch] leading-relaxed text-white/70"
            >
              Kegiatan organisasi dan kepanitiaan yang pernah saya ikuti, dari operator acara sampai
              kepala divisi.
            </motion.p>

            {/* angka outline raksasa */}
            <span
              aria-hidden
              className={`${mono.className} pointer-events-none absolute right-0 top-0 hidden select-none text-[9rem] font-black leading-none md:block`}
              style={{ color: "transparent", WebkitTextStroke: `1px rgba(${theme.rgb},0.3)` }}
            >
              {pad(entries.length)}
            </span>
          </div>

          {/* pencarian + saran peran: panel solid sesuai warna tema */}
          <div
            className="mt-8 rounded-[2rem] p-3 sm:p-4"
            style={{ background: theme.hex, color: theme.ink }}
          >
            <motion.div
              role="search"
              onClick={() => searchRef.current?.focus()}
              animate={{
                boxShadow: focused
                  ? `0 0 0 3px rgba(${inkRgb},0.35)`
                  : `0 0 0 0px rgba(${inkRgb},0)`,
              }}
              transition={{ duration: 0.25, ease: EASE }}
              className="flex h-14 w-full cursor-text items-center gap-3 rounded-full pl-5 pr-2.5"
              style={{ background: fieldBg }}
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
                placeholder="Cari kegiatan: nama, peran, atau tahun"
                aria-label="Cari kegiatan"
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
                      {entries.length} hasil
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearQuery();
                      }}
                      aria-label="Hapus pencarian"
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

            {/* saran cepat: peran yang paling sering muncul */}
            <AnimatePresence initial={false}>
              {!searching && popularRoles.length > 0 && (
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
                      Coba cari
                    </span>
                    {popularRoles.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => {
                          changeQuery(r);
                          searchRef.current?.focus();
                        }}
                        className="max-w-[16rem] shrink-0 truncate rounded-full px-3 py-1 text-xs font-medium outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-white/60"
                        style={{ background: `rgba(${inkRgb},0.16)`, color: theme.ink }}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* filter tahun */}
          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div
              role="tablist"
              aria-label="Filter tahun kegiatan"
              className="-mx-5 flex gap-1 overflow-x-auto px-5 pb-1 sm:mx-0 sm:px-0 sm:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              <div className="flex gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1">
                {options.map((o) => {
                  const on = o.id === year;
                  return (
                    <button
                      key={o.id ?? "all"}
                      type="button"
                      role="tab"
                      aria-selected={on}
                      onClick={() => setFilter(o.id)}
                      className="relative z-0 flex shrink-0 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/60 sm:px-5"
                      style={{ color: on ? theme.ink : "rgba(255,255,255,0.6)" }}
                    >
                      {on && (
                        <motion.span
                          layoutId="activities-filter-pill"
                          transition={{ type: "spring", stiffness: 380, damping: 34 }}
                          className="absolute inset-0 -z-10 rounded-full"
                          style={{ background: theme.hex }}
                        />
                      )}
                      {o.id === null && <LayoutGrid size={15} />}
                      <span>{o.label}</span>
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
              kegiatan ditampilkan
            </p>
          </div>

          {/* grid card */}
          {entries.length > 0 ? (
            <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {entries.map((a, i) => (
                  <ActivityCard
                    key={a.id}
                    a={a}
                    index={i}
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
                    Tidak ada kegiatan yang cocok dengan “<span className="text-white/80">{query.trim()}</span>”
                    {year ? ` di tahun ${year}` : ""}.
                  </p>
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={clearQuery}
                      className="rounded-full bg-white/10 px-4 py-2 text-sm text-white outline-none transition-colors hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/60"
                    >
                      Hapus pencarian
                    </button>
                    {year && (
                      <button
                        type="button"
                        onClick={() => setFilter(null)}
                        className="rounded-full px-4 py-2 text-sm font-medium outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-white/60"
                        style={{ background: theme.hex, color: theme.ink }}
                      >
                        Cari di semua tahun
                      </button>
                    )}
                  </div>
                </>
              ) : (
                "Belum ada kegiatan di tahun ini."
              )}
            </div>
          )}
        </div>

        {/* detail */}
        <AnimatePresence>
          {sel && entries[sel.index] && (
            <ActivityModal
              key="modal"
              entries={entries}
              index={sel.index}
              origin={sel.rect}
              theme={theme}
              onNavigate={(i) => setSel((cur) => (cur ? { ...cur, index: i } : cur))}
              onClose={close}
            />
          )}
        </AnimatePresence>
      </section>
    </MotionConfig>
  );
}