"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useDragControls,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  ArrowRight,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Images,
  Palette,
  Pause,
  Play,
  Terminal,
  X,
  type LucideIcon,
} from "lucide-react";
import { projectTabs, type ProjectItem, type ProjectTab } from "../lib/data";
import { mono } from "./fonts";
import { EASE, Heading } from "./ui";

/* ───────────── Konfigurasi ───────────── */

const STORY_MS = 5000; // durasi autoplay per gambar di galeri
const pad = (n: number) => String(n).padStart(2, "0");

type Theme = { hex: string; rgb: string; ink: string; Icon: LucideIcon };

// warna aksen per tab (sama dengan warna role di data.ts)
const THEMES: Record<string, Theme> = {
  software: { hex: "#6366F1", rgb: "99,102,241", ink: "#FFFFFF", Icon: Terminal },
  uiux: { hex: "#F25C5C", rgb: "242,92,92", ink: "#0B0B24", Icon: Palette },
  photo: { hex: "#FFC857", rgb: "255,200,87", ink: "#0B0B24", Icon: Camera },
};
const themeOf = (id: string) => THEMES[id] ?? THEMES.software;

// pola lebar card di layar besar (berulang tiap 6 item): 2+1 / 1+2 / 2+1
const SPANS = ["lg:col-span-2", "", "", "lg:col-span-2", "lg:col-span-2", ""];

/* ───────────── Gambar + fallback ───────────── */

function Shot({
  src,
  alt,
  sizes,
  priority,
  theme,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  theme: Theme;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ background: `linear-gradient(135deg, rgba(${theme.rgb},0.35), #0C0C20 65%)` }}
      >
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <span
          className={`${mono.className} absolute inset-0 grid place-items-center px-4 text-center text-[11px] text-white/40`}
        >
          {src.split("/").pop()}
        </span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      draggable={false}
      onError={() => setFailed(true)}
      className="select-none object-cover"
    />
  );
}
/* ───────────── Card ───────────── */

const cardV = {
  hidden: { opacity: 0, y: 36, filter: "blur(10px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.7, ease: EASE },
  },
};

function ProjectCard({
  p,
  index,
  theme,
  spanClass,
  onOpen,
}: {
  p: ProjectItem;
  index: number;
  theme: Theme;
  spanClass: string;
  onOpen: (rect: DOMRect) => void;
}) {
  const big = spanClass !== "";

  // posisi kursor 0..1, dipakai untuk tilt, parallax, dan cahaya
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const spring = { stiffness: 170, damping: 18 };
  const rotateX = useSpring(useTransform(my, [0, 1], [6, -6]), spring);
  const rotateY = useSpring(useTransform(mx, [0, 1], [-6, 6]), spring);
  const px = useSpring(useTransform(mx, [0, 1], [12, -12]), spring);
  const py = useSpring(useTransform(my, [0, 1], [9, -9]), spring);
  const gx = useTransform(mx, (v) => `${v * 100}%`);
  const gy = useTransform(my, (v) => `${v * 100}%`);
  const borderGlow = useMotionTemplate`radial-gradient(240px circle at ${gx} ${gy}, rgba(${theme.rgb},1), transparent 70%)`;
  const innerGlow = useMotionTemplate`radial-gradient(380px circle at ${gx} ${gy}, rgba(${theme.rgb},0.22), transparent 65%)`;

  const extra = p.tools.length - 3;

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
              <motion.span
                variants={imgV}
                style={{ x: px, y: py }}
                className="absolute -inset-5 block"
              >
                <Shot
                  src={p.images[0]}
                  alt={`Sampul proyek ${p.title}`}
                  sizes="(min-width:1024px) 760px, (min-width:640px) 50vw, 100vw"
                  theme={theme}
                />
              </motion.span>

              {/* gradient + cahaya + kilau */}
              <span className="absolute inset-0 bg-gradient-to-t from-[#0C0C20] via-[#0C0C20]/60 to-[#0C0C20]/5" />
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
              <span className="absolute inset-x-0 bottom-0 z-10 block p-5">
                <span className="flex items-center gap-2">
                  <span className="h-px w-6" style={{ background: theme.hex }} />
                  <span
                    className={`${mono.className} text-[11px] uppercase tracking-wider`}
                    style={{ color: theme.hex }}
                  >
                    {p.type}
                  </span>
                </span>

                <motion.span
                  variants={titleV}
                  className={`mt-2 block text-2xl font-semibold leading-tight ${
                    big ? "lg:text-3xl" : ""
                  }`}
                >
                  {p.title}
                </motion.span>

                <span className="mt-2 line-clamp-2 block max-w-[56ch] text-sm leading-relaxed text-white/65">
                  {p.desc}
                </span>

                <span className="mt-4 flex items-center justify-between gap-3">
                  <span className="flex flex-wrap gap-1.5">
                    {p.tools.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className={`${mono.className} rounded-md border border-white/10 bg-white/[0.06] px-2 py-1 text-[11px] text-white/75 backdrop-blur`}
                      >
                        {t}
                      </span>
                    ))}
                    {extra > 0 && (
                      <span className={`${mono.className} px-1 py-1 text-[11px] text-white/40`}>
                        +{extra}
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

/* ───────────── Galeri (gaya stories) ───────────── */

const slideV = {
  enter: (d: number) => ({ x: d > 0 ? "14%" : "-14%", opacity: 0, scale: 1.05 }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit: (d: number) => ({ x: d > 0 ? "-14%" : "14%", opacity: 0 }),
};

function Gallery({ p, theme }: { p: ProjectItem; theme: Theme }) {
  const reduced = !!useReducedMotion();
  const [[index, dir], setPage] = useState<[number, number]>([0, 0]);
  const [hover, setHover] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const total = p.images.length;
  const paused = userPaused || hover || dragging;
  const autoplay = !reduced;

  const go = useCallback(
    (to: number, d?: number) => {
      setPage(([cur]) => {
        const next = ((to % total) + total) % total;
        return [next, d ?? (next >= cur ? 1 : -1)];
      });
    },
    [total]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(index + 1, 1);
      if (e.key === "ArrowLeft") go(index - 1, -1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, go]);

  return (
    <div className="flex flex-col md:h-full">
      <style>{`@keyframes pj-story{from{transform:scaleX(0)}to{transform:scaleX(1)}}`}</style>

      <div
        className="relative aspect-[16/10] overflow-hidden bg-[#080817] md:aspect-auto md:min-h-0 md:flex-1"
        onPointerEnter={(e) => e.pointerType === "mouse" && setHover(true)}
        onPointerLeave={(e) => e.pointerType === "mouse" && setHover(false)}
      >
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.div
            key={index}
            custom={dir}
            variants={slideV}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.6, ease: EASE }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragStart={() => setDragging(true)}
            onDragEnd={(_, info) => {
              setDragging(false);
              if (info.offset.x < -70 || info.velocity.x < -500) go(index + 1, 1);
              else if (info.offset.x > 70 || info.velocity.x > 500) go(index - 1, -1);
            }}
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
          >
            {/* Ken Burns: zoom pelan */}
            <motion.div
              className="absolute inset-0"
              initial={{ scale: 1 }}
              animate={{ scale: 1.08 }}
              transition={{ duration: 8, ease: "linear" }}
            >
              <Shot
                src={p.images[index]}
                alt={`${p.title}, gambar ${index + 1} dari ${total}`}
                sizes="(min-width:768px) 700px, 100vw"
                priority={index === 0}
                theme={theme}
              />
            </motion.div>
          </motion.div>
        </AnimatePresence>

        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/60 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />

        {/* bar progres ala stories */}
        <div className="absolute inset-x-3 top-2 z-10 flex gap-1.5">
          {p.images.map((src, i) => (
            <button
              key={src}
              type="button"
              aria-label={`Lihat gambar ${i + 1}`}
              onClick={() => go(i)}
              className="flex-1 py-2"
            >
              <span className="relative block h-[3px] overflow-hidden rounded-full bg-white/25">
                {i < index && (
                  <span className="absolute inset-0" style={{ background: theme.hex }} />
                )}
                {i === index &&
                  (autoplay ? (
                    <span
                      key={`${p.id}-${index}`}
                      className="absolute inset-0 origin-left"
                      style={{
                        background: theme.hex,
                        animation: `pj-story ${STORY_MS}ms linear forwards`,
                        animationPlayState: paused ? "paused" : "running",
                      }}
                      onAnimationEnd={() => go(index + 1, 1)}
                    />
                  ) : (
                    <span className="absolute inset-0" style={{ background: theme.hex }} />
                  ))}
              </span>
            </button>
          ))}
        </div>

        {/* panah (desktop) */}
        {[
          { step: -1, Ico: ChevronLeft, side: "left-3", label: "Gambar sebelumnya" },
          { step: 1, Ico: ChevronRight, side: "right-3", label: "Gambar berikutnya" },
        ].map(({ step, Ico, side, label }) => (
          <motion.button
            key={label}
            type="button"
            aria-label={label}
            onClick={() => go(index + step, step)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.88 }}
            className={`absolute ${side} top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white backdrop-blur transition-colors hover:bg-black/80 md:grid`}
          >
            <Ico size={20} />
          </motion.button>
        ))}

        {/* counter + jeda */}
        <div className="absolute inset-x-3 bottom-3 z-10 flex items-center justify-between">
          <span
            className={`${mono.className} rounded-full bg-black/55 px-3 py-1 text-xs text-white backdrop-blur`}
          >
            <span style={{ color: theme.hex }}>{pad(index + 1)}</span>
            <span className="text-white/50"> / {pad(total)}</span>
          </span>
          {autoplay && (
            <motion.button
              type="button"
              onClick={() => setUserPaused((v) => !v)}
              aria-label={userPaused ? "Putar otomatis" : "Jeda"}
              whileTap={{ scale: 0.88 }}
              className="grid h-8 w-8 place-items-center rounded-full bg-black/55 text-white backdrop-blur transition-colors hover:bg-black/80"
            >
              {userPaused ? <Play size={14} /> : <Pause size={14} />}
            </motion.button>
          )}
        </div>
      </div>

      {/* thumbnail */}
      <div className="grid grid-cols-5 gap-2 bg-[#080817] p-3 md:p-4">
        {p.images.map((src, i) => {
          const on = i === index;
          return (
            <motion.button
              key={src}
              type="button"
              aria-label={`Lihat gambar ${i + 1}`}
              aria-current={on}
              onClick={() => go(i)}
              whileHover={{ y: -3 }}
              animate={{ opacity: on ? 1 : 0.45 }}
              className="relative aspect-[16/10] overflow-hidden rounded-md bg-[#14142B]"
            >
              <Shot src={src} alt="" sizes="140px" theme={theme} />
              {on && (
                <motion.span
                  layoutId={`thumb-ring-${p.id}`}
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  className="absolute inset-0 rounded-md"
                  style={{ boxShadow: `inset 0 0 0 2px ${theme.hex}` }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────── Panel info (kanan) ───────────── */

const group = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.2 } },
};
const rise = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};
const slideX = {
  hidden: { opacity: 0, x: -14 },
  show: { opacity: 1, x: 0, transition: { duration: 0.45, ease: EASE } },
};
const pop = {
  hidden: { opacity: 0, scale: 0.8 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: EASE } },
};

function RevealTitle({ text, className }: { text: string; className?: string }) {
  return (
    <h3 className={className}>
      {text.split(" ").map((w, i) => (
        <span key={i} className="mr-[0.25em] inline-block overflow-hidden pb-[0.12em] align-bottom">
          <motion.span
            className="inline-block"
            variants={{
              hidden: { y: "115%" },
              show: { y: 0, transition: { duration: 0.7, ease: EASE, delay: i * 0.07 } },
            }}
          >
            {w}
          </motion.span>
        </span>
      ))}
    </h3>
  );
}

function ProjectInfo({
  p,
  tab,
  theme,
  index,
  total,
  prev,
  next,
  onNavigate,
}: {
  p: ProjectItem;
  tab: ProjectTab;
  theme: Theme;
  index: number;
  total: number;
  prev: ProjectItem;
  next: ProjectItem;
  onNavigate: (i: number) => void;
}) {
  return (
    <div className="flex min-h-0 flex-col md:h-full">
      <motion.div
        className="relative space-y-7 p-5 sm:p-7 md:flex-1 md:overflow-y-auto md:overscroll-contain"
        variants={group}
        initial="hidden"
        animate="show"
      >
        {/* angka outline raksasa */}
        <span
          aria-hidden
          className={`${mono.className} pointer-events-none absolute right-3 top-2 hidden select-none text-[9rem] font-black leading-none md:block`}
          style={{ color: "transparent", WebkitTextStroke: `1px rgba(${theme.rgb},0.28)` }}
        >
          {pad(index + 1)}
        </span>

        <div className="relative z-10">
          <motion.span
            variants={rise}
            className={`${mono.className} inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] uppercase tracking-wider`}
            style={{ background: `rgba(${theme.rgb},0.15)`, color: theme.hex }}
          >
            <theme.Icon size={13} /> {p.type}
          </motion.span>
          <RevealTitle
            text={p.title}
            className="mt-4 text-3xl font-bold leading-[1.1] sm:text-4xl md:pr-16"
          />
        </div>

        <motion.p variants={rise} className="relative z-10 leading-relaxed text-white/75">
          {p.desc}
        </motion.p>

        <motion.div variants={rise} className="relative z-10">
          <p className="mb-3 text-xs uppercase tracking-widest text-white/40">Fitur utama</p>
          <motion.ul variants={group} className="space-y-2.5">
            {p.highlights.map((h) => (
              <motion.li key={h} variants={slideX} className="flex items-start gap-3 text-sm text-white/75">
                <span
                  className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full"
                  style={{ background: `rgba(${theme.rgb},0.18)`, color: theme.hex }}
                >
                  <Check size={12} strokeWidth={3} />
                </span>
                {h}
              </motion.li>
            ))}
          </motion.ul>
        </motion.div>

        <motion.div variants={rise} className="relative z-10 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs uppercase tracking-widest text-white/40">Peran</p>
            <p className="mt-1.5 text-sm font-medium">{p.role}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs uppercase tracking-widest text-white/40">{tab.typeLabel}</p>
            <p className="mt-1.5 text-sm font-medium">{p.type}</p>
          </div>
        </motion.div>

        <motion.div variants={rise} className="relative z-10">
          <p className="mb-3 text-xs uppercase tracking-widest text-white/40">{tab.toolsLabel}</p>
          <motion.ul
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
            className="flex flex-wrap gap-2"
          >
            {p.tools.map((t) => (
              <motion.li
                key={t}
                variants={pop}
                whileHover={{ y: -3, backgroundColor: theme.hex, color: theme.ink }}
                className={`${mono.className} cursor-default rounded-lg border border-white/15 bg-white/[0.06] px-3 py-1.5 text-xs text-white/85`}
              >
                {t}
              </motion.li>
            ))}
          </motion.ul>
        </motion.div>
      </motion.div>

      {/* navigasi antar proyek */}
      <div className="grid grid-cols-2 divide-x divide-white/10 border-t border-white/10">
        {[
          { dirn: -1, item: prev, Ico: ChevronLeft, label: "Sebelumnya", align: "text-left" },
          { dirn: 1, item: next, Ico: ChevronRight, label: "Berikutnya", align: "text-right" },
        ].map(({ dirn, item, Ico, label, align }) => (
          <button
            key={label}
            type="button"
            onClick={() => onNavigate((index + dirn + total) % total)}
            className={`group flex items-center gap-3 px-4 py-4 outline-none transition-colors hover:bg-white/[0.05] focus-visible:bg-white/[0.08] ${
              dirn === 1 ? "flex-row-reverse" : ""
            }`}
          >
            <Ico
              size={18}
              className={`shrink-0 text-white/50 transition-transform duration-300 ${
                dirn === 1 ? "group-hover:translate-x-1" : "group-hover:-translate-x-1"
              }`}
            />
            <span className={`min-w-0 flex-1 ${align}`}>
              <span className="block text-[11px] uppercase tracking-widest text-white/40">{label}</span>
              <span className="block truncate text-sm font-medium">{item.title}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ───────────── Modal ───────────── */

function ProjectModal({
  items,
  index,
  tab,
  origin,
  onNavigate,
  onClose,
}: {
  items: ProjectItem[];
  index: number;
  tab: ProjectTab;
  origin: DOMRect | null;
  onNavigate: (i: number) => void;
  onClose: () => void;
}) {
  const p = items[index];
  const theme = themeOf(tab.id);
  const total = items.length;
  const panelRef = useRef<HTMLDivElement>(null);
  const controls = useDragControls();

  const isDesktop = useMemo(() => window.innerWidth >= 768, []);
  // titik awal animasi: dari posisi card yang diklik
  const [dx, dy] = useMemo(() => {
    if (!origin) return [0, 40];
    return [
      origin.left + origin.width / 2 - window.innerWidth / 2,
      origin.top + origin.height / 2 - window.innerHeight / 2,
    ];
  }, [origin]);

  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6">
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`Detail proyek ${p.title}`}
        className="relative w-full overflow-hidden rounded-t-3xl bg-[#0C0C20] outline-none ring-1 ring-white/10 md:max-w-6xl md:rounded-3xl"
        initial={isDesktop ? { opacity: 0, x: dx, y: dy, scale: 0.45 } : { y: "100%" }}
        animate={isDesktop ? { opacity: 1, x: 0, y: 0, scale: 1 } : { y: 0 }}
        exit={isDesktop ? { opacity: 0, scale: 0.92, y: 20 } : { y: "100%" }}
        transition={
          isDesktop
            ? { type: "spring", stiffness: 240, damping: 28 }
            : { duration: 0.45, ease: EASE }
        }
        drag={isDesktop ? false : "y"}
        dragControls={controls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.7 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 110 || info.velocity.y > 600) onClose();
        }}
      >
        {/* cahaya aksen */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full opacity-25 blur-3xl"
          style={{ background: theme.hex }}
        />

        {/* header mobile: handle untuk ditarik + tombol tutup */}
        <div
          className="relative z-20 flex touch-none items-center justify-center py-3 md:hidden"
          onPointerDown={(e) => controls.start(e)}
        >
          <span className="h-1.5 w-12 rounded-full bg-white/25" />
          <button
            type="button"
            onClick={onClose}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Tutup detail"
            className="absolute right-3 top-1.5 grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* tombol tutup desktop */}
        <motion.button
          type="button"
          onClick={onClose}
          aria-label="Tutup detail"
          whileHover={{ rotate: 90, scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
          className="absolute right-4 top-4 z-30 hidden h-10 w-10 place-items-center rounded-full bg-black/60 text-white backdrop-blur transition-colors hover:bg-black md:grid"
        >
          <X size={18} />
        </motion.button>

        <div className="max-h-[calc(92dvh-3.25rem)] overflow-y-auto overscroll-contain md:grid md:h-[min(88dvh,660px)] md:max-h-none md:grid-cols-[1.3fr_1fr] md:overflow-hidden">
          <div className="md:min-h-0">
            <Gallery key={p.id} p={p} theme={theme} />
          </div>
          <ProjectInfo
            key={p.id}
            p={p}
            tab={tab}
            theme={theme}
            index={index}
            total={total}
            prev={items[(index - 1 + total) % total]}
            next={items[(index + 1) % total]}
            onNavigate={onNavigate}
          />
        </div>
      </motion.div>
    </div>
  );
}

/* ───────────── Section ───────────── */

export function BestProject() {
  const [tabId, setTabId] = useState(projectTabs[0].id);
  const [sel, setSel] = useState<{ index: number; rect: DOMRect | null } | null>(null);
  const tab = projectTabs.find((t) => t.id === tabId) ?? projectTabs[0];
  const theme = themeOf(tab.id);
  const totalProjects = projectTabs.reduce((s, t) => s + t.projects.length, 0);

  const closeModal = useCallback(() => setSel(null), []);

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
          <Heading sub="Pilih bidang, lalu klik proyek untuk melihat detailnya">
            Proyek terbaik
          </Heading>
          {/* tab role */}
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div
              role="tablist"
              aria-label="Bidang proyek"
              className="grid grid-cols-3 gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1 sm:inline-grid"
            >
              {projectTabs.map((t) => {
                const th = themeOf(t.id);
                const on = t.id === tabId;
                return (
                  <button
                    key={t.id}
                    role="tab"
                    type="button"
                    aria-selected={on}
                    onClick={() => setTabId(t.id)}
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
                {pad(tab.projects.length)}
              </span>{" "}
              proyek di bidang ini · {totalProjects} total
            </p>
          </div>

          {/* grid card */}
          <AnimatePresence mode="wait">
            <motion.ul
              key={tab.id}
              role="tabpanel"
              className="mt-8 grid gap-5 sm:grid-cols-2 lg:auto-rows-[380px] lg:grid-cols-3 lg:grid-flow-dense"
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
            >
              {tab.projects.map((p, i) => (
                <ProjectCard
                  key={p.id}
                  p={p}
                  index={i}
                  theme={theme}
                  spanClass={SPANS[i % SPANS.length]}
                  onOpen={(rect) => setSel({ index: i, rect })}
                />
              ))}
            </motion.ul>
          </AnimatePresence>
        </div>

        {/* detail */}
        <AnimatePresence>
          {sel && (
            <ProjectModal
              items={tab.projects}
              index={sel.index}
              tab={tab}
              origin={sel.rect}
              onNavigate={(i) => setSel((s) => (s ? { ...s, index: i } : s))}
              onClose={closeModal}
            />
          )}
        </AnimatePresence>
      </section>
    </MotionConfig>
  );
}