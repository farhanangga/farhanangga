"use client";

import { motion, type Variants } from "framer-motion";
import type { IconType } from "react-icons";
import {
  SiReact, SiNextdotjs, SiTypescript, SiJavascript, SiTailwindcss, SiNodedotjs,
  SiExpress, SiMongodb, SiMysql, SiPostgresql, SiPrisma, SiLaravel, SiPhp,
  SiPython, SiGit, SiGithub, SiFigma, SiVercel, SiFirebase, SiSupabase,
  SiDocker, SiFramer, SiVuedotjs, SiBootstrap, SiSass, SiRedux, SiPostman,
  SiLinux, SiNpm, SiVite, SiWordpress, SiFlutter, SiDart, SiKotlin, SiNotion,
  SiTrello, SiNestjs, SiGraphql, SiRedis, SiNetlify, SiCloudflare, SiStripe,
  SiThreedotjs, SiGreensock,
} from "react-icons/si";
import { FaHtml5, FaCss3Alt, FaJava } from "react-icons/fa";
import { VscVscode } from "react-icons/vsc";
import { marqueeTools, toolGroups } from "../../lib/data";
import { mono } from "../fonts";
import { EASE, Heading, Tilt } from "../ui";

/* ------------------------------------------------------------------ */
/*  Brand map: logo + warna iconic. Key = nama tool (huruf kecil,      */
/*  tanpa spasi/titik/strip). Brand gelap (Next, GitHub, dll) dibuat   */
/*  putih supaya terlihat di background gelap.                         */
/* ------------------------------------------------------------------ */
type Brand = { icon: IconType; color: string };

const brands: Record<string, Brand> = {
  react: { icon: SiReact, color: "#61DAFB" },
  reactjs: { icon: SiReact, color: "#61DAFB" },
  nextjs: { icon: SiNextdotjs, color: "#FFFFFF" },
  typescript: { icon: SiTypescript, color: "#3178C6" },
  javascript: { icon: SiJavascript, color: "#F7DF1E" },
  js: { icon: SiJavascript, color: "#F7DF1E" },
  ts: { icon: SiTypescript, color: "#3178C6" },
  html: { icon: FaHtml5, color: "#E34F26" },
  html5: { icon: FaHtml5, color: "#E34F26" },
  css: { icon: FaCss3Alt, color: "#1572B6" },
  css3: { icon: FaCss3Alt, color: "#1572B6" },
  tailwind: { icon: SiTailwindcss, color: "#06B6D4" },
  tailwindcss: { icon: SiTailwindcss, color: "#06B6D4" },
  bootstrap: { icon: SiBootstrap, color: "#7952B3" },
  sass: { icon: SiSass, color: "#CC6699" },
  scss: { icon: SiSass, color: "#CC6699" },
  vue: { icon: SiVuedotjs, color: "#4FC08D" },
  vuejs: { icon: SiVuedotjs, color: "#4FC08D" },
  redux: { icon: SiRedux, color: "#764ABC" },
  framermotion: { icon: SiFramer, color: "#FFFFFF" },
  framer: { icon: SiFramer, color: "#FFFFFF" },
  gsap: { icon: SiGreensock, color: "#88CE02" },
  threejs: { icon: SiThreedotjs, color: "#FFFFFF" },
  vite: { icon: SiVite, color: "#A78BFA" },
  node: { icon: SiNodedotjs, color: "#5FA04E" },
  nodejs: { icon: SiNodedotjs, color: "#5FA04E" },
  express: { icon: SiExpress, color: "#FFFFFF" },
  expressjs: { icon: SiExpress, color: "#FFFFFF" },
  nestjs: { icon: SiNestjs, color: "#E0234E" },
  laravel: { icon: SiLaravel, color: "#FF2D20" },
  php: { icon: SiPHPFix(), color: "#777BB4" },
  python: { icon: SiPython, color: "#3776AB" },
  java: { icon: FaJava, color: "#ED8B00" },
  kotlin: { icon: SiKotlin, color: "#7F52FF" },
  dart: { icon: SiDart, color: "#0175C2" },
  flutter: { icon: SiFlutter, color: "#02569B" },
  graphql: { icon: SiGraphql, color: "#E10098" },
  mongodb: { icon: SiMongodb, color: "#47A248" },
  mysql: { icon: SiMysql, color: "#4479A1" },
  postgresql: { icon: SiPostgresql, color: "#4169E1" },
  postgres: { icon: SiPostgresql, color: "#4169E1" },
  prisma: { icon: SiPrisma, color: "#5A67D8" },
  redis: { icon: SiRedis, color: "#DC382D" },
  firebase: { icon: SiFirebase, color: "#FFCA28" },
  supabase: { icon: SiSupabase, color: "#3ECF8E" },
  git: { icon: SiGit, color: "#F05032" },
  github: { icon: SiGithub, color: "#FFFFFF" },
  docker: { icon: SiDocker, color: "#2496ED" },
  linux: { icon: SiLinux, color: "#FCC624" },
  npm: { icon: SiNpm, color: "#CB3837" },
  postman: { icon: SiPostman, color: "#FF6C37" },
  vercel: { icon: SiVercel, color: "#FFFFFF" },
  netlify: { icon: SiNetlify, color: "#00C7B7" },
  cloudflare: { icon: SiCloudflare, color: "#F38020" },
  stripe: { icon: SiStripe, color: "#635BFF" },
  figma: { icon: SiFigma, color: "#F24E1E" },
  wordpress: { icon: SiWordpress, color: "#21759B" },
  notion: { icon: SiNotion, color: "#FFFFFF" },
  trello: { icon: SiTrello, color: "#0052CC" },
  vscode: { icon: VscVscode, color: "#007ACC" },
  visualstudiocode: { icon: VscVscode, color: "#007ACC" },
};

// php icon helper (SiPhp)
function SiPHPFix(): IconType {
  return SiPhp;
}

const FALLBACK = "#6C63FF";
const getBrand = (name: string): Brand | null =>
  brands[name.toLowerCase().replace(/[^a-z0-9]/g, "")] ?? null;

type CSSVars = React.CSSProperties & { "--c": string };

/* Logo bulat: icon brand, atau huruf awal kalau tool belum ada di map */
function Logo({ name, className = "" }: { name: string; className?: string }) {
  const b = getBrand(name);
  if (b) {
    const Icon = b.icon;
    return <Icon className={className} style={{ color: b.color }} aria-hidden />;
  }
  return (
    <span
      aria-hidden
      className={`${className} grid place-items-center rounded-md text-[0.7em] font-bold leading-none text-white`}
      style={{ background: FALLBACK }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

const colorOf = (name: string) => getBrand(name)?.color ?? FALLBACK;

/* ------------------------------ Marquee ------------------------------ */
/**
 * offset  : geser awal daftar supaya tiap baris isinya berbeda
 * secPerChip : detik per chip -> makin besar makin LAMBAT (kecepatan konsisten
 *              berapa pun jumlah tool-nya)
 * className : mis. "sm:hidden" untuk baris yang hanya tampil di mobile
 */
function Marquee({
  reverse = false,
  offset = 0,
  secPerChip = 4.5,
  className = "",
}: {
  reverse?: boolean;
  offset?: number;
  secPerChip?: number;
  className?: string;
}) {
  const n = marqueeTools.length;
  const rot = n ? offset % n : 0;
  const rotated = [...marqueeTools.slice(rot), ...marqueeTools.slice(0, rot)];
  const base = reverse ? rotated.reverse() : rotated;
  const items = [...base, ...base, ...base, ...base]; // 2 set identik -> loop mulus
  const duration = Math.max(60, n * 2 * secPerChip);

  return (
    <div className={`marquee overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)] ${className}`}>
      <div
        className={`marquee-track ${reverse ? "marquee-rev" : ""}`}
        style={{ animationDuration: `${duration}s` }}
      >
        {items.map((t, i) => (
          <span
            key={i}
            style={{ "--c": colorOf(t) } as CSSVars}
            className={`${mono.className} chip mr-2.5 flex shrink-0 items-center gap-2.5 rounded-2xl border border-white/10 bg-[#1B1B22] px-4 py-2.5 text-sm font-medium sm:mr-3 sm:gap-3 sm:px-6 sm:py-3 sm:text-lg`}
          >
            <Logo name={t} className="h-5 w-5 sm:h-6 sm:w-6" />
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------ Group card ---------------------------- */
const list: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.15 } },
};
const chipAnim: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.8 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 20 } },
};

export function Tools() {
  return (
    <section className="relative overflow-hidden pb-20 sm:pb-28">
      <style>{`
        .marquee-track{display:flex;width:max-content;animation:mq 120s linear infinite}
        .marquee-rev{animation-direction:reverse}
        .marquee:hover .marquee-track,.marquee:active .marquee-track{animation-play-state:paused}
        @keyframes mq{to{transform:translateX(-50%)}}
        .chip{transition:border-color .25s,box-shadow .25s,background .25s,transform .25s}
        .chip:hover,.chip:active{
          border-color:var(--c);
          background:color-mix(in srgb,var(--c) 14%,#14141c);
          box-shadow:0 0 26px -6px var(--c),inset 0 0 14px -8px var(--c);
        }
        @media (prefers-reduced-motion:reduce){.marquee-track{animation:none}}
      `}</style>

      {/* glow dekorasi */}
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-24 h-72 w-72 -translate-x-1/2 rounded-full bg-[#6C63FF]/20 blur-[110px] sm:h-96 sm:w-96" />

      <div className="relative mx-auto max-w-[1200px] px-5 sm:px-10">
        <Heading>Tools yang saya kuasai</Heading>
      </div>

      <div className="relative mt-8 space-y-2.5 sm:mt-10 sm:space-y-3">
        {/* Desktop: 2 baris. Mobile: 4 baris (baris 3 & 4 disembunyikan di sm ke atas) */}
        <Marquee secPerChip={4.5} />
        <Marquee reverse secPerChip={5} />
        <Marquee offset={Math.floor(marqueeTools.length / 3)} secPerChip={5.5} className="sm:hidden" />
        <Marquee reverse offset={Math.floor((marqueeTools.length * 2) / 3)} secPerChip={6} className="sm:hidden" />
      </div>

      <div className="relative mx-auto mt-10 grid max-w-[1200px] gap-4 px-5 sm:mt-14 sm:grid-cols-2 sm:gap-5 sm:px-10">
        {toolGroups.map((g, gi) => {
          const accent = g.items.slice(0, 4).map(colorOf);
          const gradient = `linear-gradient(90deg, ${accent.join(", ")})`;
          return (
            <motion.div
              key={g.title}
              initial={{ opacity: 0, scale: 0.92, y: 30 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.7, delay: (gi % 2) * 0.1, ease: EASE }}
            >
              <Tilt className="relative h-full overflow-hidden rounded-2xl border border-white/10 bg-[#14142B] p-5 sm:p-6">
                {/* garis aksen warna brand */}
                <div aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ background: gradient }} />
                {/* glow lembut dari warna brand pertama */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-25 blur-3xl"
                  style={{ background: accent[0] }}
                />

                <div className="relative mb-4 flex items-center justify-between gap-3 sm:mb-5">
                  <h3 className={`${mono.className} text-base font-semibold sm:text-lg`}>{g.title}</h3>
                  <span className={`${mono.className} rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-xs text-white/70`}>
                    {g.items.length}
                  </span>
                </div>

                <motion.ul
                  variants={list}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, margin: "-40px" }}
                  className="relative flex flex-wrap gap-2 sm:gap-2.5"
                >
                  {g.items.map((t) => (
                    <motion.li
                      key={t}
                      variants={chipAnim}
                      whileHover={{ scale: 1.08, y: -3 }}
                      whileTap={{ scale: 0.94 }}
                      style={{ "--c": colorOf(t) } as CSSVars}
                      className="chip flex cursor-default items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] py-1.5 pl-2.5 pr-3.5 text-[13px] sm:py-2 sm:pl-3 sm:pr-4 sm:text-sm"
                    >
                      <Logo name={t} className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
                      {t}
                    </motion.li>
                  ))}
                </motion.ul>
              </Tilt>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}