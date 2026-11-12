"use client";

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, MotionConfig, motion, type Variants } from "framer-motion";
import { ArrowUpRight, Images, LayoutGrid } from "lucide-react";
import type { ActivityItem } from "../../lib/data";
import { mono } from "../fonts";
import { EASE, Tilt } from "../ui";
import { ACTIVITY_THEME, ActivityModal, Shot, pad } from "./activitiesModal";

/* ───────────── Card ───────────── */

const cardParent: Variants = { rest: {}, hover: {} };
const imgV: Variants = {
  rest: { scale: 1 },
  hover: { scale: 1.07, transition: { duration: 0.8, ease: EASE } },
};

function ActivityCard({
  a,
  index,
  onOpen,
}: {
  a: ActivityItem;
  index: number;
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
                {a.tahun ?? "Kepanitiaan"}
              </span>
              <span className="mt-1 text-xl font-semibold leading-snug">{a.namaKegiatan}</span>
              <span className="mt-1 inline-flex w-fit max-w-full rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/80">
                <span className="truncate">{a.role}</span>
              </span>

              <span className="mt-3 line-clamp-2 text-sm leading-relaxed text-white/70">{a.deskripsi}</span>

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
  const close = useCallback(() => setSel(null), []);

  // daftar tahun yang ada di data, terbaru dulu
  const years = useMemo(
    () => [...new Set(items.map((a) => a.tahun).filter((y): y is number => typeof y === "number"))].sort((a, b) => b - a),
    [items]
  );
  const entries = useMemo(() => (year ? items.filter((a) => a.tahun === year) : items), [items, year]);

  const options = [
    { id: null as number | null, label: "Semua", count: items.length },
    ...years.map((y) => ({ id: y as number | null, label: String(y), count: items.filter((a) => a.tahun === y).length })),
  ];

  const setFilter = (id: number | null) => {
    setSel(null);
    setYear(id);
  };

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

          {/* filter tahun */}
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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

            <p className="text-sm text-white/45">
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
                    onOpen={(rect) => setSel({ index: i, rect })}
                  />
                ))}
              </AnimatePresence>
            </ul>
          ) : (
            <div className="mt-8 rounded-xl bg-[#14142B] px-6 py-14 text-center text-white/60">
              Belum ada kegiatan di tahun ini.
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