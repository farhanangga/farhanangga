"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { Award, Check, ChevronDown, MapPin, Trophy, Users, type LucideIcon } from "lucide-react";
import {
  formatPeriod,
  type EmploymentType,
  type Experience as ExperienceData,
} from "@/lib/data";
import { mono } from "@/components/fonts";
import { EASE, Heading, Tilt } from "@/components/ui";

/* ───────────── Tipe data dari Supabase (dipakai juga oleh route) ───────────── */

export type Org = {
  id: string;
  position: number;
  jabatan: string;
  lembaga: string;
  periode: string;
};

export type AwardData = {
  id: string;
  position: number;
  judul: string;
  penerbit: string;
  tahun: string;
};

export type LandingData = {
  experiences: ExperienceData[];
  orgs: Org[];
  awards: AwardData[];
};

/* ───────────── Helper ───────────── */

const pad = (n: number) => String(n).padStart(2, "0");

/** Warna badge status pekerjaan */
const TYPE_STYLE: Record<EmploymentType, string> = {
  freelance: "bg-[#FFC857]/15 text-[#FFC857]",
  internship: "bg-[#6C63FF]/20 text-[#A9A4FF]",
  fulltime: "bg-white/10 text-white/70",
};
const TYPE_LABEL: Record<EmploymentType, string> = {
  freelance: "Freelance",
  internship: "Internship",
  fulltime: "Full-time",
};
const TYPE_FALLBACK = "bg-white/10 text-white/70";

type Row = { key: string; title: string; sub: string; tag: string; Icon: LucideIcon };

/** landing_organization -> baris kartu */
const orgToRow = (o: Org): Row => ({
  key: o.id,
  title: o.jabatan,
  sub: o.lembaga,
  tag: o.periode,
  Icon: Users,
});

/** landing_award -> baris kartu */
const awardToRow = (a: AwardData): Row => ({
  key: a.id,
  title: a.judul,
  sub: a.penerbit,
  tag: a.tahun,
  Icon: /^juara/i.test(a.judul) ? Trophy : Award,
});

/* ───────────── Kartu dengan sorotan kursor ───────────── */

function Spot({
  children,
  className = "",
  rgb = "108,99,255",
}: {
  children: ReactNode;
  className?: string;
  rgb?: string;
}) {
  const x = useMotionValue(-300);
  const y = useMotionValue(-300);
  const bg = useMotionTemplate`radial-gradient(320px circle at ${x}px ${y}px, rgba(${rgb},0.18), transparent 70%)`;

  return (
    <div
      onPointerMove={(ev) => {
        if (ev.pointerType !== "mouse") return;
        const r = ev.currentTarget.getBoundingClientRect();
        x.set(ev.clientX - r.left);
        y.set(ev.clientY - r.top);
      }}
      className={`group relative overflow-hidden ${className}`}
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: bg }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

/* ───────────── Variants ───────────── */

const rise = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};
const slideX = {
  hidden: { opacity: 0, x: -16 },
  show: { opacity: 1, x: 0, transition: { duration: 0.45, ease: EASE } },
};
const pop = {
  hidden: { opacity: 0, scale: 0.8 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: EASE } },
};
const stagger = (s = 0.08, d = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren: s, delayChildren: d } },
});

/* ───────────── Item timeline ───────────── */

function ExperienceItem({
  e,
  i,
  total,
  open,
  onToggle,
}: {
  e: ExperienceData;
  i: number;
  total: number;
  open: boolean;
  onToggle: () => void;
}) {
  const ref = useRef<HTMLLIElement>(null);
  // aktif saat item melewati garis tengah layar
  const active = useInView(ref, { margin: "-45% 0px -45% 0px" });

  const tags = e.tools ?? [];
  const period = formatPeriod(e.start, e.end);
  const isNow = !e.end;
  const initials = e.company
    .replace(/^PT\s+/i, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const badge =
    "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider sm:px-2.5 sm:text-[11px]";

  return (
    <motion.li
      ref={ref}
      className="relative pb-5 pl-9 sm:pb-7 sm:pl-10 md:grid md:grid-cols-[150px_1fr] md:items-start md:gap-x-14 md:pl-0"
      initial={{ opacity: 0, x: -30, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.9, ease: EASE }}
    >
      {/* node di garis */}
      <motion.span
        aria-hidden
        className="absolute left-0 top-7 z-10 md:left-[171px] md:top-8"
        initial={{ scale: 0 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true }}
        transition={{ type: "spring", stiffness: 300, damping: 12, delay: 0.2 }}
      >
        {active && (
          <span className="absolute inset-0 animate-ping rounded-full bg-[#6C63FF]/60" />
        )}
        <motion.span
          className="relative block h-3.5 w-3.5 rounded-full ring-4 ring-[#02020F]"
          animate={{
            backgroundColor: open || active ? "#FFC857" : "#6C63FF",
            scale: active ? 1.35 : 1,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 18 }}
        />
      </motion.span>

      {/* kolom periode (desktop) */}
      <div className="hidden pt-7 text-right md:block">
        <p className={`${mono.className} text-sm text-[#FFC857]`}>{period}</p>
        <p className={`${mono.className} mt-3 text-xs text-white/30`}>
          {pad(i + 1)} / {pad(total)}
        </p>
      </div>

      {/* kartu */}
      <motion.div
        whileHover={{ y: -3 }}
        animate={{
          boxShadow: active
            ? "0 0 0 1px rgba(108,99,255,0.7), 0 24px 60px -24px rgba(108,99,255,0.55)"
            : "0 0 0 1px rgba(255,255,255,0.08), 0 0 0 0 rgba(108,99,255,0)",
        }}
        transition={{ duration: 0.5 }}
        className="min-w-0 overflow-hidden rounded-2xl bg-[#14142B]"
      >
        <Spot>
          <button
            type="button"
            aria-expanded={open}
            onClick={onToggle}
            className="flex w-full items-center gap-3 px-4 py-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6C63FF] sm:gap-4 sm:px-6 sm:py-5"
          >
            <motion.span
              whileHover={{ rotate: -8, scale: 1.08 }}
              className={`${mono.className} grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xs font-bold sm:h-12 sm:w-12 sm:text-sm`}
              style={{ background: "linear-gradient(135deg,#6C63FF,#F25C5C)" }}
            >
              {initials}
            </motion.span>

            <span className="min-w-0 flex-1">
              <span className={`${mono.className} block text-[11px] text-[#FFC857] sm:text-xs md:hidden`}>
                {period}
              </span>
              <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="break-words text-base font-semibold leading-snug sm:text-xl">
                  {e.role}
                </span>
                {isNow && (
                  <span className={`${badge} bg-emerald-400/10 text-emerald-300 md:hidden`}>
                    Aktif
                  </span>
                )}
                {e.type && (
                  <span className={`${badge} ${TYPE_STYLE[e.type] ?? TYPE_FALLBACK}`}>
                    {TYPE_LABEL[e.type] ?? e.type}
                  </span>
                )}
              </span>
              <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-white/60 sm:text-sm">
                <span className="break-words">{e.company}</span>
                <span className="inline-flex items-center gap-1 text-white/45">
                  <MapPin size={13} className="shrink-0" /> {e.place}
                </span>
              </span>
            </span>

            <motion.span
              animate={{ rotate: open ? 180 : 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/5 sm:h-9 sm:w-9"
            >
              <ChevronDown size={18} />
            </motion.span>
          </button>

          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.5, ease: EASE }}
                className="overflow-hidden"
              >
                <motion.div
                  className="px-4 pb-5 sm:px-6 sm:pb-6"
                  variants={stagger(0.09, 0.1)}
                  initial="hidden"
                  animate="show"
                >
                  <motion.span
                    aria-hidden
                    variants={{
                      hidden: { scaleX: 0 },
                      show: { scaleX: 1, transition: { duration: 0.7, ease: EASE } },
                    }}
                    className="mb-4 block h-px origin-left bg-gradient-to-r from-[#6C63FF] via-[#F25C5C] to-transparent sm:mb-5"
                  />

                  <ul className="space-y-3">
                    {e.points.map((pt) => (
                      <motion.li
                        key={pt}
                        variants={slideX}
                        className="flex max-w-[70ch] items-start gap-2.5 text-sm leading-relaxed text-white/75 sm:gap-3 sm:text-base"
                      >
                        <span className="mt-[3px] grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#6C63FF]/20 text-[#A9A4FF]">
                          <Check size={12} strokeWidth={3} />
                        </span>
                        <span className="min-w-0 flex-1 break-words">{pt}</span>
                      </motion.li>
                    ))}
                  </ul>

                  {tags.length > 0 && (
                    <motion.ul
                      variants={stagger(0.05)}
                      className="mt-5 flex flex-wrap gap-1.5 sm:mt-6 sm:gap-2"
                    >
                      {tags.map((t) => (
                        <motion.li
                          key={t}
                          variants={pop}
                          whileHover={{ y: -3, backgroundColor: "#6C63FF" }}
                          className={`${mono.className} cursor-default rounded-lg border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[11px] text-white/85 sm:px-3 sm:py-1.5 sm:text-xs`}
                        >
                          {t}
                        </motion.li>
                      ))}
                    </motion.ul>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </Spot>
      </motion.div>
    </motion.li>
  );
}

function Timeline({ items }: { items: ExperienceData[] }) {
  const ref = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 70%", "end 55%"] });
  const line = useSpring(scrollYProgress, { stiffness: 100, damping: 25, mass: 0.4 });
  const headTop = useTransform(line, (v) => `${v * 100}%`);
  const [open, setOpen] = useState(0);

  return (
    <ol ref={ref} className="relative">
      <span
        aria-hidden
        className="absolute bottom-0 left-[6px] top-0 w-px bg-white/10 md:left-[178px]"
      />
      <motion.span
        aria-hidden
        style={{ scaleY: line }}
        className="absolute bottom-0 left-[6px] top-0 w-px origin-top bg-gradient-to-b from-[#6C63FF] via-[#F25C5C] to-[#FFC857] md:left-[178px]"
      />
      {/* titik bercahaya di ujung garis */}
      <motion.span
        aria-hidden
        style={{ top: headTop }}
        className="absolute left-[6px] z-20 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_18px_4px_rgba(255,200,87,0.7)] md:left-[178px]"
      />

      {items.map((e, i) => (
        <ExperienceItem
          key={e.id}
          e={e}
          i={i}
          total={items.length}
          open={open === i}
          onToggle={() => setOpen(open === i ? -1 : i)}
        />
      ))}
    </ol>
  );
}

/* ───────────── Organisasi & sertifikat ───────────── */

function InfoCard({
  title,
  Icon,
  hex,
  rgb,
  rows,
}: {
  title: string;
  Icon: LucideIcon;
  hex: string;
  rgb: string;
  rows: Row[];
}) {
  return (
    <Tilt className="h-full overflow-hidden rounded-2xl">
      <Spot
        rgb={rgb}
        className="h-full rounded-2xl border border-white/10 bg-[#14142B] p-4 sm:p-6"
      >
        <div className="flex items-center gap-3">
          <motion.span
            whileHover={{ rotate: -10, scale: 1.1 }}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
            style={{ background: `rgba(${rgb},0.15)`, color: hex }}
          >
            <Icon size={20} />
          </motion.span>
          <h3
            className={`${mono.className} min-w-0 text-base font-semibold leading-tight sm:text-lg`}
          >
            {title}
          </h3>
          <span
            className={`${mono.className} ml-auto shrink-0 rounded-full bg-white/5 px-2.5 py-1 text-xs text-white/50`}
          >
            {pad(rows.length)}
          </span>
        </div>

        <motion.span
          aria-hidden
          className="mt-4 block h-px origin-left"
          style={{ background: `linear-gradient(90deg, ${hex}, transparent)` }}
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: EASE }}
        />

        <motion.ul
          className="mt-3 space-y-1"
          variants={stagger(0.1, 0.2)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-40px" }}
        >
          {rows.map((r) => (
            <motion.li
              key={r.key}
              variants={slideX}
              whileHover={{ x: 6 }}
              className="flex items-start gap-3 rounded-xl px-1.5 py-2.5 transition-colors hover:bg-white/[0.04] sm:px-2 sm:py-3"
            >
              <span
                className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg"
                style={{ background: `rgba(${rgb},0.12)`, color: hex }}
              >
                <r.Icon size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block break-words text-sm font-medium leading-snug text-white/90">
                  {r.title}
                </span>
                {r.sub && (
                  <span className="mt-0.5 block break-words text-xs leading-snug text-white/50">
                    {r.sub}
                  </span>
                )}
                {/* tahun: di bawah teks pada layar kecil */}
                {r.tag && (
                  <span
                    className={`${mono.className} mt-1.5 inline-block rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-white/60 sm:hidden`}
                  >
                    {r.tag}
                  </span>
                )}
              </span>
              {/* tahun: di kanan pada layar sm ke atas */}
              {r.tag && (
                <span
                  className={`${mono.className} hidden shrink-0 rounded-md bg-white/5 px-2 py-1 text-[11px] text-white/60 sm:inline-block`}
                >
                  {r.tag}
                </span>
              )}
            </motion.li>
          ))}
        </motion.ul>
      </Spot>
    </Tilt>
  );
}

/* ───────────── Section ───────────── */

export function Experience() {
  const [data, setData] = useState<LandingData>({ experiences: [], orgs: [], awards: [] });
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const { experiences, orgs, awards } = data;

  // ambil dari route /api/landingPage/experience -> Supabase
  useEffect(() => {
    let alive = true;
    fetch("/api/landingPage/experience", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: { data: LandingData }) => {
        if (!alive) return;
        setData(j.data);
        setStatus("ok");
      })
      .catch(() => alive && setStatus("error"));
    return () => {
      alive = false;
    };
  }, []);

  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const bgX = useTransform(scrollYProgress, [0, 1], ["20%", "-45%"]);

  const orgRows = orgs.map(orgToRow);
  const awardRows = awards.map(awardToRow);

  return (
    <MotionConfig reducedMotion="user">
      <section ref={sectionRef} className="relative overflow-hidden">
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
        {/* teks outline raksasa yang bergeser saat scroll */}
        <motion.div
          aria-hidden
          className={`${mono.className} pointer-events-none absolute left-0 top-24 select-none whitespace-nowrap text-[7rem] font-black leading-none sm:text-[14rem]`}
          style={{
            x: bgX,
            color: "transparent",
            WebkitTextStroke: "1px rgba(255,255,255,0.06)",
          }}
        >
          PENGALAMAN · EXPERIENCE · PENGALAMAN
        </motion.div>
        {/* blob cahaya */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -left-24 top-40 h-[260px] w-[260px] rounded-full bg-[#6C63FF]/20 blur-[100px] sm:-left-32 sm:h-[420px] sm:w-[420px] sm:blur-[130px]"
          animate={{ x: [0, 60, 0], y: [0, 50, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -right-24 top-[55%] h-[240px] w-[240px] rounded-full bg-[#F25C5C]/15 blur-[100px] sm:-right-32 sm:h-[380px] sm:w-[380px] sm:blur-[130px]"
          animate={{ x: [0, -50, 0], y: [0, -50, 0] }}
          transition={{ duration: 17, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative mx-auto max-w-[1200px] px-4 pb-20 sm:px-10 sm:pb-28">
          <Heading sub="Perjalanan kerja, organisasi, dan penghargaan">Pengalaman kerja</Heading>

          {status !== "ok" && (
            <p className="mt-8 text-center text-sm text-white/50 sm:mt-10">
              {status === "loading" ? "Memuat data..." : "Gagal memuat data pengalaman."}
            </p>
          )}
          {experiences.length > 0 && (
            <div className="mt-8 sm:mt-10">
              <Timeline items={experiences} />
            </div>
          )}

          {/* organisasi & sertifikat */}
          {(orgRows.length > 0 || awardRows.length > 0) && (
            <motion.div
              className="mt-2 grid gap-4 sm:mt-6 sm:gap-5 md:grid-cols-2"
              variants={stagger(0.15)}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
            >
              {orgRows.length > 0 && (
                <motion.div variants={rise} className="min-w-0">
                  <InfoCard
                    title="Organisasi"
                    Icon={Users}
                    hex="#F25C5C"
                    rgb="242,92,92"
                    rows={orgRows}
                  />
                </motion.div>
              )}
              {awardRows.length > 0 && (
                <motion.div variants={rise} className="min-w-0">
                  <InfoCard
                    title="Sertifikat dan penghargaan"
                    Icon={Award}
                    hex="#FFC857"
                    rgb="255,200,87"
                    rows={awardRows}
                  />
                </motion.div>
              )}
            </motion.div>
          )}
        </div>
      </section>
    </MotionConfig>
  );
}