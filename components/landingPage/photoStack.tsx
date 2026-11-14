"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { motion, type Transition } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight, Images } from "lucide-react";
import type { ProjectItem } from "@/lib/data";
import { mono } from "../fonts";
import { EASE } from "../ui";
import { pad, type Theme } from "@/components/projects/projectModal";
import { PhotoCover } from "./photoCover";

/** Jarak antar kartu, dalam % lebar kartu itu sendiri (kartu saling menumpuk). */
const STACK_STEP = 58;
/** Jarak geser (px, sudah termasuk kecepatan) minimal agar dianggap pindah kartu. */
const SWIPE_DISTANCE = 70;

const SPRING: Transition = { type: "spring", stiffness: 240, damping: 30, mass: 0.9 };
/** Kartu yang "melompat" dari ujung satu ke ujung lain berpindah seketika lalu memudar masuk. */
const TELEPORT: Transition = {
  x: { duration: 0 },
  scale: { duration: 0 },
  rotateY: { duration: 0 },
  opacity: { duration: 0.45, delay: 0.1 },
};

/**
 * Posisi kartu i relatif terhadap kartu aktif, secara melingkar.
 * Contoh n=5 → -2..2, n=3 → -1..1. Karena melingkar, sisi kiri dan kanan selalu terisi.
 */
function circOffset(i: number, active: number, n: number) {
  const half = Math.floor(n / 2);
  return ((((i - active + half) % n) + n) % n) - half;
}

export function PhotoStack({
  projects,
  theme,
  covers,
  onOpen,
}: {
  projects: ProjectItem[];
  theme: Theme;
  /** Foto sampul yang sudah dirender di server (RSC), dipetakan menurut id proyek. Opsional. */
  covers?: Record<string, ReactNode>;
  onOpen: (index: number, rect: DOMRect) => void;
}) {
  const n = projects.length;
  const [active, setActive] = useState(0);
  const prevActive = useRef(0);
  // mencegah klik "nyasar" tepat setelah menggeser kartu
  const dragged = useRef(false);

  useEffect(() => {
    prevActive.current = active;
  }, [active]);

  const go = useCallback((i: number) => setActive((((i % n) + n) % n)), [n]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(active + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(active - 1);
    }
  };

  const cur = projects[active];
  // langkah terpendek dari kartu aktif sebelumnya (dipakai mendeteksi kartu yang melompat)
  const step = circOffset(active, prevActive.current, n);

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Galeri proyek fotografi"
      onKeyDown={onKeyDown}
      className="mt-8"
    >
      {/* panggung: tinggi dibuat maksimal supaya foto tampil besar */}
      <div className="relative h-[540px] overflow-hidden py-2 sm:h-[620px] lg:h-[700px] [perspective:1400px]">
        {projects.map((p, i) => {
          const off = circOffset(i, active, n);
          const prevOff = circOffset(i, prevActive.current, n);
          const wrapped = n > 2 && off !== prevOff - step;
          const abs = Math.abs(off);
          const isActive = off === 0;
          const hidden = abs > 2;
          const extraTools = p.tools.length - 3;

          return (
            <motion.div
              key={p.id}
              className="absolute bottom-2 left-1/2 top-2 w-[76%] sm:w-[46%] lg:w-[34%]"
              style={{ zIndex: 10 - abs, pointerEvents: hidden ? "none" : "auto" }}
              initial={false}
              animate={{
                x: `${-50 + off * STACK_STEP}%`,
                scale: 1 - Math.min(abs, 2) * 0.12,
                rotateY: Math.max(Math.min(-off * 10, 20), -20),
                opacity: hidden ? 0 : wrapped ? [0, 1] : 1,
              }}
              transition={wrapped ? TELEPORT : SPRING}
            >
              <motion.div
                className={`h-full touch-pan-y ${isActive ? "cursor-grab active:cursor-grabbing" : ""}`}
                drag={isActive ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.35}
                dragSnapToOrigin
                onDragStart={() => {
                  dragged.current = true;
                }}
                onDragEnd={(_, info) => {
                  const swipe = info.offset.x + info.velocity.x * 0.2;
                  if (swipe < -SWIPE_DISTANCE) go(active + 1);
                  else if (swipe > SWIPE_DISTANCE) go(active - 1);
                  setTimeout(() => {
                    dragged.current = false;
                  }, 60);
                }}
              >
                <button
                  type="button"
                  tabIndex={hidden ? -1 : 0}
                  aria-current={isActive}
                  aria-label={
                    isActive ? `Buka detail ${p.title}` : `Tampilkan ${p.title} (${i + 1} dari ${n})`
                  }
                  onClick={(e) => {
                    if (dragged.current) return;
                    if (isActive) onOpen(i, e.currentTarget.getBoundingClientRect());
                    else go(i);
                  }}
                  className="relative block h-full w-full overflow-hidden rounded-2xl bg-[#0C0C20] text-left outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                  style={{
                    border: `1px solid ${isActive ? theme.hex : "rgba(255,255,255,0.12)"}`,
                    boxShadow: isActive ? `0 30px 80px -25px rgba(${theme.rgb},0.45)` : "none",
                    transition: "border-color 0.4s, box-shadow 0.4s",
                  }}
                >
                  {/* foto: dirender di server bila `covers` diberikan, kalau tidak dirender di sini */}
                  <span className="absolute inset-0 block">
                    {covers?.[p.id] ?? (
                      <PhotoCover
                        src={p.images[0] ?? ""}
                        alt={`Foto ${p.title}`}
                        rgb={theme.rgb}
                        eager={i < 3}
                      />
                    )}
                  </span>

                  {/* gradient bawah agar teks terbaca */}
                  <span className="absolute inset-0 bg-gradient-to-t from-[#0C0C20] from-10% via-[#0C0C20]/60 via-35% to-transparent to-65%" />

                  {/* kartu samping digelapkan agar kartu tengah menonjol */}
                  <motion.span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-[#0C0C20]"
                    initial={false}
                    animate={{ opacity: isActive ? 0 : 0.5 }}
                    transition={{ duration: 0.4 }}
                  />

                  {/* badge atas */}
                  <span className="absolute inset-x-4 top-4 z-10 flex items-center justify-between">
                    <span
                      className={`${mono.className} inline-flex items-center gap-2 rounded-full bg-black/55 px-3 py-1 text-xs text-white backdrop-blur`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: theme.hex }} />
                      {pad(i + 1)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1 text-xs text-white/80 backdrop-blur">
                      <Images size={12} /> {p.images.length}
                    </span>
                  </span>

                  {/* teks hanya tampil di kartu tengah */}
                  <motion.span
                    className="absolute inset-x-0 bottom-0 z-10 block min-w-0 overflow-hidden p-5"
                    initial={false}
                    animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : 12 }}
                    transition={{ duration: 0.4, ease: EASE }}
                  >
                    <span className="flex items-center gap-2">
                      <span className="h-px w-6 shrink-0" style={{ background: theme.hex }} />
                      <span
                        className={`${mono.className} truncate text-[11px] uppercase tracking-wider`}
                        style={{ color: theme.hex }}
                      >
                        {p.type}
                      </span>
                    </span>

                    <span className="mt-2 line-clamp-2 break-words text-2xl font-semibold leading-tight lg:text-3xl">
                      {p.title}
                    </span>

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
                      <span
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-full"
                        style={{ background: theme.hex, color: theme.ink }}
                      >
                        <ArrowRight size={18} />
                      </span>
                    </span>
                  </motion.span>
                </button>
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      {/* kontrol: panah, titik, dan keterangan */}
      <div className="mt-6 flex flex-col items-center gap-4">
        {n > 1 && (
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => go(active - 1)}
              aria-label="Foto sebelumnya"
              className="grid h-11 w-11 place-items-center rounded-full border border-white/15 text-white outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="flex items-center gap-2" role="tablist" aria-label="Pilih proyek">
              {projects.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  aria-selected={i === active}
                  aria-label={`Proyek ${i + 1}: ${p.title}`}
                  onClick={() => go(i)}
                  className="grid h-6 place-items-center outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  <motion.span
                    className="block h-2 rounded-full"
                    initial={false}
                    animate={{
                      width: i === active ? 28 : 8,
                      backgroundColor: i === active ? theme.hex : "rgba(255,255,255,0.25)",
                    }}
                    transition={{ duration: 0.3, ease: EASE }}
                  />
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => go(active + 1)}
              aria-label="Foto berikutnya"
              className="grid h-11 w-11 place-items-center rounded-full border border-white/15 text-white outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}

        <p className="text-center text-sm text-white/45" aria-live="polite">
          <span className={mono.className} style={{ color: theme.hex }}>
            {pad(active + 1)}
          </span>{" "}
          / {pad(n)} · {cur?.title}
        </p>
        <p className="text-center text-xs text-white/35">
          Geser kartu atau gunakan panah. Klik kartu tengah untuk melihat detail.
        </p>
      </div>
    </div>
  );
}