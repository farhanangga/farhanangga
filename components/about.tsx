"use client";

import { type ReactNode } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
} from "framer-motion";
import {
  Award,
  GraduationCap,
  Mail,
  MapPin,
  Users,
} from "lucide-react";
import {
  profile,
  orgs,
  certs,
  roles,
} from "../lib/data";
import { mono } from "./fonts";
import { CountUp, EASE, Heading, Tilt } from "@/components/ui";

/* ───────────── EDIT: sesuaikan dengan data Anda ───────────── */
const AVAILABLE = false; // status ketersediaan
const AVAILABLE_TEXT = "Terbuka untuk freelance & kolaborasi";

// kata yang di-highlight di paragraf "about"
const KEYWORDS = [
  "react.js,", "next.js,", "typescript,", "tailwind", "css.", "figma",
  "responsif", "rest", "api,", "komponen",
];
/* ──────────────────────────────────────────────────────────── */

/** Kartu dengan cahaya yang mengikuti kursor */
function Spotlight({
  children,
  className = "",
  color = "108,99,255",
}: {
  children: ReactNode;
  className?: string;
  color?: string;
}) {
  const x = useMotionValue(-300);
  const y = useMotionValue(-300);
  const bg = useMotionTemplate`radial-gradient(280px circle at ${x}px ${y}px, rgba(${color},0.22), transparent 70%)`;

  return (
    <div
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set(e.clientX - r.left);
        y.set(e.clientY - r.top);
      }}
      className={`group relative overflow-hidden rounded-2xl border border-white/5 bg-[#14142B] transition-colors hover:border-white/15 ${className}`}
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

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.8, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

export function About() {
  const words = profile.about.split(" ");
  const stats = [
    {
      label: "Lulusan dari",
      content: (
        <>
          <span className={`${mono.className} block text-xl font-semibold`}>
            {profile.graduatedFrom}
          </span>
          <span className="mt-1 block text-sm text-white/60">{profile.degree}</span>
        </>
      ),
    },
    {
      label: "IPK",
      content: (
        <span className={`${mono.className} text-5xl font-bold text-[#FFC857]`}>
          <CountUp to={profile.gpa} decimals={2} />
        </span>
      ),
    },
    {
      label: "Proyek dikerjakan",
      content: (
        <span className={`${mono.className} text-5xl font-bold text-[#FFC857]`}>
          <CountUp to={profile.projectCount} suffix="+" />
        </span>
      ),
    },
  ];

  return (
    <section className="relative overflow-hidden">
      {/* blob gradient latar */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -left-40 top-20 h-[420px] w-[420px] rounded-full bg-[#6366F1]/20 blur-[120px]"
        animate={{ x: [0, 60, 0], y: [0, 40, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-32 top-[40%] h-[380px] w-[380px] rounded-full bg-[#F25C5C]/15 blur-[120px]"
        animate={{ x: [0, -50, 0], y: [0, -50, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative mx-auto max-w-[1200px] px-6 py-28 sm:px-10">
        {/* ───── Bagian 1: intro + statistik ───── */}
        <div className="grid gap-14 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <Heading>Tentang saya</Heading>

            {/* status + info cepat */}
            <Reveal className="mt-6 flex flex-wrap gap-2 text-sm">
              {AVAILABLE && (
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-emerald-300">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  </span>
                  {AVAILABLE_TEXT}
                </span>
              )}
              <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-white/70">
                <MapPin size={14} /> {profile.location}
              </span>
              <a
                href={`mailto:${profile.email}`}
                className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                <Mail size={14} /> {profile.email}
              </a>
            </Reveal>

            <p className="mt-8 max-w-[60ch] text-lg leading-relaxed text-white/80">
              {words.map((w, i) => {
                const hot = KEYWORDS.includes(w.toLowerCase());
                return (
                  <motion.span
                    key={i}
                    className={`inline-block ${hot ? "font-medium text-white" : ""}`}
                    initial={{ opacity: 0.12, y: 6 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.5, delay: Math.min(i * 0.025, 1.2) }}
                  >
                    {hot ? (
                      <span className="bg-gradient-to-r from-[#8B85FF] to-[#FFC857] bg-clip-text text-transparent">
                        {w}
                      </span>
                    ) : (
                      w
                    )}
                    &nbsp;
                  </motion.span>
                );
              })}
            </p>

            {/* peran */}
            <Reveal delay={0.1} className="mt-8 flex flex-wrap gap-3">
              {roles.map((r) => (
                <motion.a
                  key={r.label}
                  href={r.href}
                  whileHover={{ y: -3, scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="rounded-full px-4 py-2 text-sm font-semibold"
                  style={{ background: r.color, color: r.text }}
                >
                  {r.label}
                </motion.a>
              ))}
            </Reveal>
          </div>

          <div className="grid gap-4 [perspective:1000px] sm:grid-cols-2 lg:grid-cols-1">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                className={i === 0 ? "sm:col-span-2 lg:col-span-1" : ""}
                initial={{ opacity: 0, rotateX: -35, y: 40 }}
                whileInView={{ opacity: 1, rotateX: 0, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.9, delay: i * 0.12, ease: EASE }}
              >
                <Tilt className="overflow-hidden rounded-xl bg-[#14142B] px-6 py-5">
                  <p className="mb-1 text-sm text-white/55">{s.label}</p>
                  {s.content}
                </Tilt>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ───── Bagian 2: organisasi & sertifikasi ───── */}
        <div className="mt-24 grid gap-4 md:grid-cols-2">
          <Reveal>
            <Spotlight className="h-full p-6" color="242,92,92">
              <h4 className="mb-4 flex items-center gap-2 font-semibold">
                <Users size={18} className="text-[#F25C5C]" /> Organisasi
              </h4>
              <ul className="space-y-3 text-sm text-white/70">
                {orgs.map((o) => (
                  <li key={o} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#F25C5C]" />
                    {o}
                  </li>
                ))}
              </ul>
            </Spotlight>
          </Reveal>
          <Reveal delay={0.1}>
            <Spotlight className="h-full p-6" color="255,200,87">
              <h4 className="mb-4 flex items-center gap-2 font-semibold">
                <Award size={18} className="text-[#FFC857]" /> Sertifikasi & Prestasi
              </h4>
              <ul className="space-y-3 text-sm text-white/70">
                {certs.map((c) => (
                  <li key={c} className="flex gap-3">
                    <GraduationCap size={16} className="mt-0.5 shrink-0 text-[#FFC857]" />
                    {c}
                  </li>
                ))}
              </ul>
            </Spotlight>
          </Reveal>
        </div>
      </div>
    </section>
  );
}