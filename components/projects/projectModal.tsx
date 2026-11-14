"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  AnimatePresence,
  motion,
  useDragControls,
  useReducedMotion,
} from "framer-motion";
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  LayoutGrid,
  Palette,
  Pause,
  Play,
  Terminal,
  X,
  type LucideIcon,
} from "lucide-react";
import type { ProjectItem, ProjectTab } from "../../lib/data";
import { mono } from "../fonts";
import { EASE, Icon } from "../ui";

/* ───────────── Konfigurasi bersama ───────────── */

const STORY_MS = 5000; // durasi autoplay per gambar di galeri
export const pad = (n: number) => String(n).padStart(2, "0");

export type Theme = { hex: string; rgb: string; ink: string; Icon: LucideIcon };

// warna aksen per bidang (sama dengan warna role di data.ts)
const THEMES: Record<string, Theme> = {
  all: { hex: "#6C63FF", rgb: "108,99,255", ink: "#FFFFFF", Icon: LayoutGrid },
  software: { hex: "#6366F1", rgb: "99,102,241", ink: "#FFFFFF", Icon: Terminal },
  uiux: { hex: "#F25C5C", rgb: "242,92,92", ink: "#0B0B24", Icon: Palette },
  photo: { hex: "#FFC857", rgb: "255,200,87", ink: "#0B0B24", Icon: Camera },
};
export const themeOf = (id?: string | null) => THEMES[id ?? "all"] ?? THEMES.all;

export type ModalEntry = { p: ProjectItem; tab: ProjectTab };

/** Ambil hostname dari URL untuk ditampilkan di tombol. Aman terhadap URL yang salah. */
function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Tampilkan "github.com/owner/repo" dari URL repository. */
function repoLabel(url: string) {
  try {
    const u = new URL(url);
    return `${u.hostname.replace(/^www\./, "")}${u.pathname}`.replace(/\/$/, "");
  } catch {
    return url;
  }
}

/** Hanya izinkan http(s) supaya tidak ada link "javascript:" yang lolos dari data. */
function safeUrl(url?: string) {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : null;
  } catch {
    return null;
  }
}

/* ───────────── Gambar + fallback ───────────── */

function ShotImage({
  src,
  alt,
  sizes,
  priority,
  theme,
  fit = "cover",
  quality,
  onSize,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  theme: Theme;
  /** "cover" memenuhi container (terpotong); "contain" menampilkan seluruh gambar sesuai rasio aslinya */
  fit?: "cover" | "contain";
  /** kualitas kompresi 1–100 (bawaan Next.js: 75) */
  quality?: number;
  /** dipanggil saat gambar selesai dimuat, dengan ukuran aslinya (piksel) */
  onSize?: (w: number, h: number) => void;
}) {
  // 0 = lewat optimizer Next.js, 1 = file asli apa adanya, 2 = placeholder
  const [level, setLevel] = useState<0 | 1 | 2>(0);

  if (level === 2 || !src) {
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
          {src ? src.split("/").pop() : "belum ada gambar"}
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
      quality={quality}
      priority={priority}
      unoptimized={level === 1}
      draggable={false}
      onError={() => setLevel((l) => (l === 0 ? 1 : 2))}
      onLoad={(e) => {
        const el = e.currentTarget;
        if (el.naturalWidth && el.naturalHeight) onSize?.(el.naturalWidth, el.naturalHeight);
      }}
      className={`select-none ${fit === "contain" ? "object-contain" : "object-cover"}`}
    />
  );
}

/** Latar buram dari gambar yang sama: mengisi ruang kosong di sekitar foto tanpa memotong foto utama. */
function Backdrop({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  return (
    <Image
      src={src}
      alt=""
      aria-hidden
      fill
      sizes="96px"
      quality={30}
      draggable={false}
      onError={() => setFailed(true)}
      className="pointer-events-none origin-center scale-125 select-none object-cover opacity-60 blur-2xl"
    />
  );
}

/** Gambar dengan fallback bertahap. `key={src}` mengulang dari awal saat gambarnya berganti. */
export function Shot(props: ComponentProps<typeof ShotImage>) {
  return <ShotImage key={props.src} {...props} />;
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
  // rasio asli (lebar / tinggi) tiap gambar, diisi saat gambarnya selesai dimuat
  const [ratios, setRatios] = useState<Record<number, number>>({});
  const total = p.images.length;
  const many = total > 1;
  const paused = userPaused || hover || dragging;
  const autoplay = !reduced && many;
  // Mobile: tinggi area foto mengikuti rasio asli gambar (dibatasi) supaya foto memenuhi lebar tanpa ruang kosong
  const ratio = ratios[index];
  const stageRatio = ratio ? Math.min(2.4, Math.max(0.62, ratio)) : 1.6;

  const go = useCallback(
    (to: number, d?: number) => {
      if (total < 2) return;
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
        className="relative aspect-[var(--ar)] max-h-[68dvh] w-full overflow-hidden bg-[#080817] md:aspect-auto md:max-h-none md:min-h-0 md:flex-1"
        style={{ "--ar": stageRatio } as CSSProperties}
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
            drag={many ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragStart={() => setDragging(true)}
            onDragEnd={(_, info) => {
              setDragging(false);
              if (info.offset.x < -70 || info.velocity.x < -500) go(index + 1, 1);
              else if (info.offset.x > 70 || info.velocity.x > 500) go(index - 1, -1);
            }}
            className={`absolute inset-0 ${many ? "cursor-grab active:cursor-grabbing" : ""}`}
          >
            {/* gambar utama: ditampilkan utuh (tidak terpotong) dan dibuat sebesar mungkin; sisa ruang diisi latar buram */}
            <div className="absolute inset-0">
              <Backdrop src={p.images[index] ?? ""} />
              <Shot
                src={p.images[index] ?? ""}
                alt={`${p.title}, gambar ${index + 1} dari ${total}`}
                sizes="(min-width:768px) 1400px, 100vw"
                quality={95}
                fit="contain"
                priority={index === 0}
                theme={theme}
                onSize={(w, h) =>
                  setRatios((r) => (r[index] === w / h ? r : { ...r, [index]: w / h }))
                }
              />
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-black/50 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/50 to-transparent" />

        {/* bar progres ala stories */}
        {many && (
          <div className="absolute inset-x-3 top-2 z-10 flex gap-1.5">
            {p.images.map((src, i) => (
              <button
                key={`${src}-${i}`}
                type="button"
                aria-label={`Lihat gambar ${i + 1}`}
                onClick={() => go(i)}
                className="flex-1 py-2"
              >
                <span className="relative block h-[3px] overflow-hidden rounded-full bg-white/25">
                  {i < index && <span className="absolute inset-0" style={{ background: theme.hex }} />}
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
        )}

        {/* panah (desktop) */}
        {many &&
          [
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
      {many && (
        <div className="grid grid-cols-5 gap-2 bg-[#080817] p-3 md:p-4">
          {p.images.slice(0, 10).map((src, i) => {
            const on = i === index;
            return (
              <motion.button
                key={`${src}-${i}`}
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
      )}
    </div>
  );
}

/* ───────────── Panel info (kanan) ───────────── */

const group = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.2 } },
};
const rise = {
  hidden: { opacity: 0, y: 20, filter: "blur(10px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.7, ease: EASE } },
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

/** Tombol menuju halaman web proyek. Tidak dirender kalau proyek belum punya URL. */
function VisitButton({ url, label, theme }: { url: string; label: string; theme: Theme }) {
  return (
    <motion.a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE, delay: 0.35 } }}
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.98 }}
      className="group relative flex items-center justify-between gap-3 overflow-hidden rounded-xl px-4 py-3.5 outline-none focus-visible:ring-2 focus-visible:ring-white/80"
      style={{ background: theme.hex, color: theme.ink }}
    >
      {/* kilau saat hover */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[460%]"
      />
      <span className="relative min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        <span className={`${mono.className} block truncate text-[11px] opacity-70`}>{hostOf(url)}</span>
      </span>
      <span
        className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        style={{ background: "rgba(0,0,0,0.18)" }}
      >
        <ExternalLink size={16} />
      </span>
      <span className="sr-only"> (buka di tab baru)</span>
    </motion.a>
  );
}

/** Tombol hitam menuju repository GitHub. Tidak dirender kalau proyek belum punya link repo. */
function RepoButton({ url }: { url: string }) {
  return (
    <motion.a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE, delay: 0.45 } }}
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.98 }}
      className="group relative flex items-center justify-between gap-3 overflow-hidden rounded-xl border border-white/15 bg-black px-4 py-3.5 text-white outline-none transition-colors hover:border-white/30 focus-visible:ring-2 focus-visible:ring-white/80"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[460%]"
      />
      <span className="relative flex min-w-0 items-center gap-3">
        <Icon name="github" className="h-5 w-5 shrink-0" />
        <span className="min-w-0">
          <span className="block text-sm font-semibold">Lihat repository</span>
          <span className={`${mono.className} block truncate text-[11px] text-white/50`}>{repoLabel(url)}</span>
        </span>
      </span>
      <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
        <ExternalLink size={16} />
      </span>
      <span className="sr-only"> (buka di tab baru)</span>
    </motion.a>
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
  delay,
  onNavigate,
}: {
  p: ProjectItem;
  tab: ProjectTab;
  theme: Theme;
  index: number;
  total: number;
  prev: ProjectItem;
  next: ProjectItem;
  /** jeda sebelum isi panel muncul: lebih lama saat modal baru dibuka, supaya menunggu tirai turun */
  delay: number;
  onNavigate: (i: number) => void;
}) {
  const url = safeUrl(p.url);
  const repo = safeUrl(p.repo);
  const stagger = useMemo(
    () => ({ hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: delay } } }),
    [delay]
  );

  return (
    <div className="flex min-h-0 flex-col md:h-full">
      <motion.div
        className="relative space-y-7 p-5 sm:p-7 md:flex-1 md:overflow-y-auto md:overscroll-contain"
        variants={stagger}
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

        {p.highlights.length > 0 && (
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
        )}

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

      {/* tombol link: di luar area scroll supaya selalu terlihat. Masing-masing hanya muncul kalau datanya ada. */}
      {(url || repo) && (
        <div className="space-y-2.5 border-t border-white/10 p-4 sm:px-7">
          {url && <VisitButton url={url} label={tab.linkLabel ?? "Kunjungi website"} theme={theme} />}
          {repo && <RepoButton url={repo} />}
        </div>
      )}

      {/* navigasi antar proyek */}
      {total > 1 && (
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
      )}
    </div>
  );
}

/* ───────────── Modal ───────────── */

/* Transisi mobile: tirai ungu naik dari bawah, lalu panel gelap menyusul sedikit
   di belakangnya (pola yang sama dengan menu navbar, tapi arahnya dari bawah).
   Keluar: turun lagi ke bawah. */
const curtainV = {
  closed: { y: "100%", transition: { duration: 0.7, delay: 0.08, ease: EASE } },
  open: { y: 0, transition: { duration: 0.7, ease: EASE } },
};
const panelV = {
  closed: { y: "100%", transition: { duration: 0.6, ease: EASE } },
  open: { y: 0, transition: { duration: 0.7, delay: 0.1, ease: EASE } },
};

export function ProjectModal({
  entries,
  index,
  origin,
  onNavigate,
  onClose,
}: {
  entries: ModalEntry[];
  index: number;
  origin: DOMRect | null;
  onNavigate: (i: number) => void;
  onClose: () => void;
}) {
  const { p, tab } = entries[index];
  const theme = themeOf(tab.id);
  const total = entries.length;
  const panelRef = useRef<HTMLDivElement>(null);
  const controls = useDragControls();

  // true hanya sebentar setelah modal dibuka; pindah proyek (Sebelumnya/Berikutnya) tidak perlu menunggu tirai
  const [intro, setIntro] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setIntro(false), 1000);
    return () => clearTimeout(t);
  }, []);

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

  // Portal ke <body>: lepas dari stacking context / transform milik section,
  // jadi modal benar-benar menutupi layar sampai paling atas (termasuk navbar).
  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-end justify-center md:items-center md:p-6">
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* tirai ungu (mobile): naik dari bawah lebih dulu dari panel */}
      {!isDesktop && (
        <motion.div
          aria-hidden
          variants={curtainV}
          initial="closed"
          animate="open"
          exit="closed"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-dvh rounded-t-[2rem] bg-[#6C63FF]"
        />
      )}

      <motion.div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`Detail proyek ${p.title}`}
        className="relative flex h-dvh w-full flex-col overflow-hidden rounded-t-[2rem] bg-[#0C0C20] outline-none md:block md:h-auto md:max-w-6xl md:rounded-3xl md:ring-1 md:ring-white/10"
        variants={isDesktop ? undefined : panelV}
        initial={isDesktop ? { opacity: 0, x: dx, y: dy, scale: 0.45 } : "closed"}
        animate={isDesktop ? { opacity: 1, x: 0, y: 0, scale: 1 } : "open"}
        exit={isDesktop ? { opacity: 0, scale: 0.92, y: 20 } : "closed"}
        transition={isDesktop ? { type: "spring", stiffness: 240, damping: 28 } : undefined}
        drag={isDesktop ? false : "y"}
        dragControls={controls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.7 }}
        onDragEnd={(_, info) => {
          // panel naik dari bawah, jadi ditutup dengan menariknya ke bawah
          if (info.offset.y > 110 || info.velocity.y > 600) onClose();
        }}
      >
        {/* cahaya aksen (desktop saja) */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-24 hidden h-72 w-72 rounded-full opacity-25 blur-3xl md:block"
          style={{ background: theme.hex }}
        />

        {/* header mobile: handle untuk ditarik ke bawah + tombol tutup, menghormati safe-area (notch) */}
        <div
          className="relative z-20 flex shrink-0 touch-none items-center justify-between bg-[#0C0C20] px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] md:hidden"
          onPointerDown={(e) => controls.start(e)}
        >
          <span className="h-9 w-9" aria-hidden />
          <span className="h-1.5 w-12 rounded-full bg-white/25" />
          <button
            type="button"
            onClick={onClose}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Tutup detail"
            className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white"
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

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)] md:pb-0 md:grid md:h-[min(88dvh,660px)] md:flex-none md:grid-cols-[1.3fr_1fr] md:overflow-hidden">
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
            prev={entries[(index - 1 + total) % total].p}
            next={entries[(index + 1) % total].p}
            delay={intro ? (isDesktop ? 0.25 : 0.4) : 0.1}
            onNavigate={onNavigate}
          />
        </div>
      </motion.div>
    </div>,
    document.body
  );
}