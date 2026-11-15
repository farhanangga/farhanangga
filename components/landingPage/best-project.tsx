"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { ArrowRight, Images } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import type { ProjectItem, ProjectTab } from "@/lib/data";
import { mono } from "../fonts";
import { EASE, Heading } from "../ui";
import { ProjectModal, Shot, pad, themeOf, type Theme } from "@/components/projects/projectModal";
import { PhotoStack } from "./photoStack";
import { isPhotoTab, tabKey } from "./photoCover";

/* ───────────── Konfigurasi & data ───────────── */

/** Palet yang sama dengan daftar role (Software, UI/UX, Photography, Graphic). */
const ROLE_COLORS = ["#6366F1", "#F25C5C", "#FFC857", "#34D399"] as const;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  { auth: { persistSession: false } }
);

/** Semua tab + proyeknya dari api/projects (data = daftar tab, tiap tab punya array projects). */
async function fetchTabs(): Promise<ProjectTab[]> {
  const res = await fetch("/api/projects", { cache: "no-store" });
  if (!res.ok) throw new Error(`api/projects status ${res.status}`);
  const json = (await res.json()) as { data?: ProjectTab[] };
  return Array.isArray(json.data) ? json.data : [];
}

/** Tab dari api/projects, pilihan best project dari best_projects. */
async function fetchBestProjectTabs(): Promise<ProjectTab[]> {
  try {
    const [tabs, bestRes] = await Promise.all([
      fetchTabs(),
      supabase.from("best_projects").select("project_id").order("position"),
    ]);

    if (bestRes.error) {
      console.error("[BestProject] gagal membaca best_projects:", bestRes.error.message);
      return [];
    }

    // urutan tampil mengikuti best_projects.position
    const rank = new Map<string, number>();
    (bestRes.data ?? []).forEach((b, i) => rank.set(String(b.project_id), i));

    // semua tab tetap tampil (juga yang belum punya best project); jumlah proyek tidak dibatasi
    return tabs.map((t) => ({
      ...t,
      projects: t.projects
        .filter((p) => rank.has(String(p.id)))
        .sort((a, b) => (rank.get(String(a.id)) ?? 0) - (rank.get(String(b.id)) ?? 0)),
    }));
  } catch (err) {
    console.error("[BestProject] tidak bisa membaca data", err);
    return [];
  }
}

/* ───────────── Warna per bidang ───────────── */

const PALETTE = {
  software: { hex: "#6366F1", rgb: "99,102,241", ink: "#FFFFFF" },
  uiux: { hex: "#F25C5C", rgb: "242,92,92", ink: "#000000" },
  photo: { hex: "#FFC857", rgb: "255,200,87", ink: "#000000" },
  graphic: { hex: "#34D399", rgb: "52,211,153", ink: "#000000" },
} as const;

/** Tentukan warna dari nama tab; ikon & field lain tetap dari themeOf. */
function themeForTab(t: ProjectTab): Theme {
  const base = themeOf(t.id);
  const key = tabKey(t);

  const color = /graphic/.test(key)
    ? PALETTE.graphic
    : /photo/.test(key)
      ? PALETTE.photo
      : /\bui\b|\bux\b|ui\s*\/\s*ux|uiux/.test(key)
        ? PALETTE.uiux
        : /software|engineer/.test(key)
          ? PALETTE.software
          : null;

  return color ? { ...base, ...color } : base;
}

/* ───────────── Layout grid ───────────── */

// Pola lebar card di layar besar (3 kolom) untuk jumlah proyek berapa pun.
// Kartu disusun berpasangan per baris, selang-seling 2+1 lalu 1+2 (total selalu 3 kolom).
// Jika jumlahnya ganjil, kartu terakhir mengisi satu baris penuh. Tidak ada lubang di grid.
function lgSpan(i: number, n: number): string {
  if (i === n - 1 && n % 2 === 1) return "lg:col-span-3";
  const firstInPair = i % 2 === 0;
  const wideFirst = Math.floor(i / 2) % 2 === 0;
  return firstInPair === wideFirst ? "lg:col-span-2" : "";
}

function layoutFor(i: number, n: number): { spanClass: string; big: boolean } {
  const lg = lgSpan(i, n);
  // layar sedang (2 kolom): kartu terakhir yang sendirian mengisi satu baris penuh
  const sm = n % 2 === 1 && i === n - 1 ? "sm:col-span-2" : "";
  return { spanClass: `${sm} ${lg}`.trim(), big: lg !== "" };
}

/* ───────────── Animasi (tidak bergantung pada data) ───────────── */

const cardV = {
  hidden: { opacity: 0, y: 36, filter: "blur(10px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.7, ease: EASE },
  },
};

const imgV = {
  rest: { scale: 1 },
  hover: { scale: 1.08, transition: { duration: 0.8, ease: EASE } },
};

const shineV = {
  rest: { x: "-160%", transition: { duration: 0 } },
  hover: { x: "460%", transition: { duration: 0.9, ease: EASE } },
};

const titleV = {
  rest: { y: 0 },
  hover: { y: -4, transition: { duration: 0.4, ease: EASE } },
};

/* ───────────── Skeleton ───────────── */

/** Placeholder supaya layout tidak melompat saat data datang */
function BestProjectSkeleton() {
  return (
    <section className="mx-auto max-w-[1200px] px-5 pb-24 sm:px-10 sm:pb-28">
      {/* judul */}
      <div
        className="h-10 w-64 animate-pulse rounded-lg"
        style={{ backgroundColor: `${ROLE_COLORS[0]}33` }}
      />

      {/* tab: satu pil per warna role */}
      <div className="mt-8 flex w-full max-w-md gap-3">
        {ROLE_COLORS.map((color) => (
          <div
            key={color}
            className="h-12 flex-1 animate-pulse rounded-full"
            style={{ backgroundColor: `${color}26` }}
          />
        ))}
      </div>

      {/* kartu proyek */}
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => {
          const color = ROLE_COLORS[i % ROLE_COLORS.length];
          return (
            <div
              key={i}
              className={`h-[360px] animate-pulse rounded-2xl border-t-2 bg-[#14142B] sm:h-[380px] ${
                i === 0 || i === 3 || i === 4 ? "lg:col-span-2" : ""
              }`}
              style={{ borderTopColor: `${color}80` }}
            />
          );
        })}
      </div>
    </section>
  );
}

/* ───────────── Card (grid biasa) ───────────── */

function ProjectCard({
  p,
  index,
  theme,
  spanClass,
  big,
  onOpen,
}: {
  p: ProjectItem;
  index: number;
  theme: Theme;
  spanClass: string;
  big: boolean;
  onOpen: (rect: DOMRect) => void;
}) {
  const extraTools = p.tools.length - 3;

  // posisi kursor 0..1, dipakai untuk tilt, parallax, dan cahaya
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const spring = { stiffness: 170, damping: 18 };
  const rotateX = useSpring(useTransform(my, [0, 1], [5, -5]), spring);
  const rotateY = useSpring(useTransform(mx, [0, 1], [-5, 5]), spring);
  const px = useSpring(useTransform(mx, [0, 1], [8, -8]), spring);
  const py = useSpring(useTransform(my, [0, 1], [6, -6]), spring);
  const gx = useTransform(mx, (v) => `${v * 100}%`);
  const gy = useTransform(my, (v) => `${v * 100}%`);
  const borderGlow = useMotionTemplate`radial-gradient(240px circle at ${gx} ${gy}, rgba(${theme.rgb},1), transparent 70%)`;
  const innerGlow = useMotionTemplate`radial-gradient(380px circle at ${gx} ${gy}, rgba(${theme.rgb},0.22), transparent 65%)`;

  // satu-satunya varian yang bergantung pada tema
  const arrowV = {
    rest: { rotate: 0, backgroundColor: "rgba(255,255,255,0.08)", color: "#FFFFFF" },
    hover: {
      rotate: -45,
      backgroundColor: theme.hex,
      color: theme.ink,
      transition: { duration: 0.35, ease: EASE },
    },
  };

  return (
    <motion.li
      variants={cardV}
      className={`${spanClass} h-[360px] [perspective:1200px] sm:h-[380px] lg:h-auto`}
    >
      <motion.div
        className="group relative h-full"
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        initial="rest"
        animate="rest"
        whileHover="hover"
        whileTap={{ scale: 0.985 }}
        onPointerMove={(e) => {
          if (e.pointerType !== "mouse") return;
          const r = e.currentTarget.getBoundingClientRect();
          mx.set((e.clientX - r.left) / r.width);
          my.set((e.clientY - r.top) / r.height);
        }}
        onPointerLeave={() => {
          mx.set(0.5);
          my.set(0.5);
        }}
      >
        <button
          type="button"
          onClick={(e) => onOpen(e.currentTarget.getBoundingClientRect())}
          className="block h-full w-full rounded-2xl text-left outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <span className="relative block h-full rounded-2xl p-px">
            {/* border: putih tipis + sorotan warna mengikuti kursor */}
            <span aria-hidden className="absolute inset-0 rounded-2xl bg-white/10" />
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{ background: borderGlow }}
            />

            <span className="relative block h-full overflow-hidden rounded-[15px] bg-[#0C0C20]">
              {/* gambar dengan parallax */}
              <motion.span variants={imgV} style={{ x: px, y: py }} className="absolute -inset-4 block">
                <Shot
                  src={p.images[0] ?? ""}
                  alt={`Sampul proyek ${p.title}`}
                  sizes="(min-width:1024px) 760px, (min-width:640px) 50vw, 100vw"
                  theme={theme}
                />
              </motion.span>

              {/* gradient (lebih pekat di bawah agar teks selalu terbaca) + cahaya + kilau */}
              <span className="absolute inset-0 bg-gradient-to-t from-[#0C0C20] from-15% via-[#0C0C20]/85 via-45% to-[#0C0C20]/0" />
              <motion.span
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{ background: innerGlow }}
              />
              <motion.span
                aria-hidden
                variants={shineV}
                className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/15 to-transparent"
              />

              {/* badge atas */}
              <span className="absolute inset-x-4 top-4 z-10 flex items-center justify-between">
                <span
                  className={`${mono.className} inline-flex items-center gap-2 rounded-full bg-black/55 px-3 py-1 text-xs text-white backdrop-blur`}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: theme.hex }} />
                  {pad(index + 1)}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1 text-xs text-white/80 backdrop-blur">
                  <Images size={12} /> {p.images.length}
                </span>
              </span>

              {/* isi bawah */}
              <span className="absolute inset-x-0 bottom-0 z-10 block min-w-0 overflow-hidden p-5">
                <span className="flex items-center gap-2">
                  <span className="h-px w-6 shrink-0" style={{ background: theme.hex }} />
                  <span
                    className={`${mono.className} truncate text-[11px] uppercase tracking-wider`}
                    style={{ color: theme.hex }}
                  >
                    {p.type}
                  </span>
                </span>

                {/*
                  judul: maksimal 2 baris.
                  Catatan: JANGAN menambahkan class "block" bersama line-clamp, karena "block"
                  menimpa display:-webkit-box milik line-clamp sehingga pemotongan teks tidak jalan.
                */}
                <motion.span
                  variants={titleV}
                  className={`mt-2 line-clamp-2 break-words text-2xl font-semibold leading-tight ${
                    big ? "lg:text-3xl" : ""
                  }`}
                >
                  {p.title}
                </motion.span>

                {/* deskripsi: maksimal 2 baris, sisanya dipotong dengan "…"; teks lengkap ada di modal */}
                <span className="mt-2 line-clamp-2 max-w-[56ch] break-words text-sm leading-relaxed text-white/75">
                  {p.desc}
                </span>

                <span className="mt-4 flex items-center justify-between gap-3">
                  <span className="flex min-w-0 flex-wrap gap-1.5">
                    {p.tools.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className={`${mono.className} max-w-[120px] truncate rounded-md border border-white/10 bg-white/[0.06] px-2 py-1 text-[11px] text-white/75 backdrop-blur`}
                      >
                        {t}
                      </span>
                    ))}
                    {extraTools > 0 && (
                      <span className={`${mono.className} px-1 py-1 text-[11px] text-white/40`}>
                        +{extraTools}
                      </span>
                    )}
                  </span>
                  <motion.span
                    variants={arrowV}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/15"
                  >
                    <ArrowRight size={18} />
                  </motion.span>
                </span>
              </span>
            </span>
          </span>
        </button>
      </motion.div>
    </motion.li>
  );
}

/* ───────────── Tampilan section ───────────── */

function BestProjectView({
  tabs,
  covers,
}: {
  tabs: ProjectTab[];
  covers?: Record<string, ReactNode>;
}) {
  // buka tab pertama yang sudah punya best project
  const [tabId, setTabId] = useState(() => (tabs.find((t) => t.projects.length > 0) ?? tabs[0]).id);
  const [sel, setSel] = useState<{ index: number; rect: DOMRect | null } | null>(null);

  const tab = tabs.find((t) => t.id === tabId) ?? tabs[0];
  const theme = themeForTab(tab);
  const photo = isPhotoTab(tab);
  const totalProjects = tabs.reduce((sum, t) => sum + t.projects.length, 0);
  const n = tab.projects.length;

  // modal bersama menerima daftar { p, tab }
  const entries = useMemo(() => tab.projects.map((p) => ({ p, tab })), [tab]);

  return (
    <MotionConfig reducedMotion="user">
      <section className="relative overflow-hidden">
        {/* dot grid */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)",
            backgroundSize: "26px 26px",
            maskImage: "radial-gradient(ellipse 75% 55% at 50% 30%, black, transparent)",
            WebkitMaskImage: "radial-gradient(ellipse 75% 55% at 50% 30%, black, transparent)",
          }}
        />
        {/* blob cahaya mengikuti warna tab */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -left-32 top-20 h-[420px] w-[420px] rounded-full opacity-25 blur-[130px]"
          animate={{ backgroundColor: theme.hex, x: [0, 60, 0], y: [0, 40, 0] }}
          transition={{
            backgroundColor: { duration: 0.8 },
            x: { duration: 14, repeat: Infinity, ease: "easeInOut" },
            y: { duration: 14, repeat: Infinity, ease: "easeInOut" },
          }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -right-32 top-[45%] h-[380px] w-[380px] rounded-full opacity-20 blur-[130px]"
          animate={{ backgroundColor: theme.hex, x: [0, -50, 0], y: [0, -50, 0] }}
          transition={{
            backgroundColor: { duration: 0.8 },
            x: { duration: 17, repeat: Infinity, ease: "easeInOut" },
            y: { duration: 17, repeat: Infinity, ease: "easeInOut" },
          }}
        />

        <div className="relative mx-auto max-w-[1200px] px-5 pb-24 sm:px-10 sm:pb-28">
          <Heading sub="Pilih bidang, lalu klik proyek untuk melihat detailnya">Proyek terbaik</Heading>

          {/* tab role: semua bidang dari project_tabs */}
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div
              role="tablist"
              aria-label="Bidang proyek"
              className="grid gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1 sm:inline-grid"
              style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
            >
              {tabs.map((t) => {
                const th = themeForTab(t);
                const on = t.id === tabId;
                return (
                  <button
                    key={t.id}
                    role="tab"
                    type="button"
                    aria-selected={on}
                    onClick={() => {
                      setSel(null);
                      setTabId(t.id);
                    }}
                    className="relative z-0 flex items-center justify-center gap-2 rounded-full px-3 py-2.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/60 sm:px-5"
                    style={{ color: on ? th.ink : "rgba(255,255,255,0.6)" }}
                  >
                    {on && (
                      <motion.span
                        layoutId="role-pill"
                        transition={{ type: "spring", stiffness: 380, damping: 34 }}
                        className="absolute inset-0 -z-10 rounded-full"
                        style={{ background: th.hex }}
                      />
                    )}
                    <th.Icon size={16} />
                    <span className="sm:hidden">{t.short}</span>
                    <span className="hidden sm:inline">{t.label}</span>
                    <span className={`${mono.className} hidden text-[11px] opacity-60 sm:inline`}>
                      {t.projects.length}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="text-sm text-white/45">
              <span className={mono.className} style={{ color: theme.hex }}>
                {pad(n)}
              </span>{" "}
              proyek terbaik di bidang ini · {totalProjects} total
            </p>
          </div>

          {/* konten: pesan kosong, tumpukan foto (photography), atau grid card */}
          <AnimatePresence mode="wait">
            {n === 0 ? (
              <motion.div
                key={`${tab.id}-kosong`}
                role="tabpanel"
                className="mt-8 grid place-items-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-20 text-center"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
              >
                <p className="text-white/70">Belum ada proyek terbaik di bidang {tab.label}.</p>
                <p className="mt-1 text-sm text-white/40">Segera hadir.</p>
              </motion.div>
            ) : photo ? (
              <motion.div
                key={`${tab.id}-stack`}
                role="tabpanel"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } }}
                exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
              >
                <PhotoStack
                  projects={tab.projects}
                  theme={theme}
                  covers={covers}
                  onOpen={(index, rect) => setSel({ index, rect })}
                />
              </motion.div>
            ) : (
              <motion.ul
                key={tab.id}
                role="tabpanel"
                className="mt-8 grid gap-5 sm:grid-cols-2 lg:auto-rows-[380px] lg:grid-cols-3 lg:grid-flow-dense"
                initial="hidden"
                animate="show"
                exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
              >
                {tab.projects.map((p, i) => {
                  const { spanClass, big } = layoutFor(i, n);
                  return (
                    <ProjectCard
                      key={p.id}
                      p={p}
                      index={i}
                      theme={theme}
                      spanClass={spanClass}
                      big={big}
                      onOpen={(rect) => setSel({ index: i, rect })}
                    />
                  );
                })}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>

        {/* detail */}
        <AnimatePresence>
          {sel && (
            <ProjectModal
              entries={entries}
              index={sel.index}
              origin={sel.rect}
              onNavigate={(i) => setSel((s) => (s ? { ...s, index: i } : s))}
              onClose={() => setSel(null)}
            />
          )}
        </AnimatePresence>
      </section>
    </MotionConfig>
  );
}

/* ───────────── Export utama ───────────── */

/** Pakai langsung di page: <BestProject /> (loading & skeleton sudah ditangani di dalam) */
export function BestProject({ covers }: { covers?: Record<string, ReactNode> }) {
  const [tabs, setTabs] = useState<ProjectTab[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetchBestProjectTabs().then((t) => {
      if (alive) setTabs(t);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (tabs === null) return <BestProjectSkeleton />;
  // belum ada satu pun best project → bagian ini tidak ditampilkan
  if (tabs.length === 0 || tabs.every((t) => t.projects.length === 0)) return null;
  return <BestProjectView tabs={tabs} covers={covers} />;
}