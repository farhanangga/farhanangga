"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, MotionConfig, motion, type Variants } from "framer-motion";
import { ArrowUpRight, Images } from "lucide-react";
import { projectTabs, type ProjectItem, type ProjectTab } from "../../lib/data";
import { mono } from "../fonts";
import { ProjectModal, Shot, pad, themeOf } from "./projectModal";
import { EASE, Tilt } from "../ui";

/* ───────────── Konfigurasi ───────────── */

const ALIASES: Record<string, string[]> = {
  software: ["Software Engineer", "app", "web"],
  uiux: ["UI/UX Designer", "ui", "ux"],
  photo: ["photographer", "foto"],
};
function resolveTab(param: string | null): ProjectTab | null {
  if (!param) return null;
  const q = param.toLowerCase();
  return (
    projectTabs.find((t) => t.id.toLowerCase() === q || (ALIASES[t.id] ?? []).includes(q)) ?? null
  );
}

const COPY: Record<string, { title: string; text: string }> = {
  all: {
    title: "Semua proyek",
    text: "Kumpulan karya saya dari tiga bidang: membangun aplikasi, merancang UI/UX, dan fotografi.",
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
};

type Entry = { p: ProjectItem; tab: ProjectTab; key: string };

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
  const th = themeOf(tab.id);
  const extra = p.tools.length - 3;

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

              <span className="mt-3 line-clamp-2 text-sm leading-relaxed text-white/70">{p.desc}</span>

              <span className="mt-4 flex flex-wrap gap-1.5">
                {p.tools.slice(0, 3).map((t) => (
                  <span key={t} className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/80">
                    {t}
                  </span>
                ))}
                {extra > 0 && <span className="px-1 py-1 text-xs text-white/40">+{extra}</span>}
              </span>

              <span className="mt-auto flex items-center justify-between border-t border-white/10 pt-4 text-sm">
                <span className="text-white/60">Lihat detail</span>
                <motion.span
                  variants={arrowV}
                  className="grid h-9 w-9 place-items-center rounded-full"
                >
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

export function ProjectsView() {
  const router = useRouter();
  const params = useSearchParams();
  const active = resolveTab(params.get("role"));
  const activeId = active?.id ?? null;
  const theme = themeOf(activeId);
  const copy = COPY[activeId ?? "all"] ?? COPY.all;

  const entries = useMemo<Entry[]>(
    () =>
      (active ? [active] : projectTabs).flatMap((t) =>
        t.projects.map((p) => ({ p, tab: t, key: `${t.id}-${p.id}` }))
      ),
    [active]
  );

  const [sel, setSel] = useState<{ index: number; rect: DOMRect | null } | null>(null);
  const close = useCallback(() => setSel(null), []);

  const setRole = useCallback(
    (id: string | null) => {
      setSel(null);
      router.replace(id ? `/projects?role=${id}` : "/projects", { scroll: false });
    },
    [router]
  );

  const options = [
    { id: null as string | null, label: "Semua", short: "Semua", count: projectTabs.reduce((s, t) => s + t.projects.length, 0) },
    ...projectTabs.map((t) => ({ id: t.id as string | null, label: t.label, short: t.short, count: t.projects.length })),
  ];

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
              <motion.div
                key={activeId ?? "all"}
                exit={{ opacity: 0, y: -12, transition: { duration: 0.18 } }}
              >
                <h1
                  className={`${mono.className} overflow-hidden pb-2 text-4xl font-bold leading-[1.05] sm:text-6xl`}
                >
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
            <div
              role="tablist"
              aria-label="Filter bidang proyek"
              className="grid grid-cols-4 gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1 sm:inline-grid sm:grid-flow-col sm:grid-cols-none"
            >
              {options.map((o) => {
                const th = themeOf(o.id);
                const on = o.id === activeId;
                return (
                  <button
                    key={o.id ?? "all"}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => setRole(o.id)}
                    className="relative z-0 flex items-center justify-center gap-1.5 rounded-full px-2 py-2.5 text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/60 sm:gap-2 sm:px-5 sm:text-sm"
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
                    <th.Icon size={15} className="hidden min-[400px]:block" />
                    <span className="sm:hidden">{o.short}</span>
                    <span className="hidden sm:inline">{o.label}</span>
                    <span className={`${mono.className} hidden text-[11px] opacity-60 sm:inline`}>
                      {o.count}
                    </span>
                  </button>
                );
              })}
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
              onClose={close}
            />
          )}
        </AnimatePresence>
      </section>
    </MotionConfig>
  );
}