"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
} from "framer-motion";
import { Mail, MapPin } from "lucide-react";
import { roles } from "@/lib/data";
import { mono } from "@/components/fonts";
import { CountUp, EASE, Heading, Tilt } from "@/components/ui";

/* ------------------------------------------------------------------ */
/* DATA: filled from the database (table landing_about).              */
/*  - /api/landingPage/about : location, email, bio, campus, GPA…     */
/*  - /api/projects          : count for "Projects completed"         */
/*  - /api/activities        : count for "Activities done"            */
/*  All endpoints must allow GET without login (public page).         */
/* ------------------------------------------------------------------ */
const ABOUT_API = "/api/landingPage/about";
const PROJECTS_API = "/api/projects";
const ACTIVITIES_API = "/api/activities"; // adjust to your activities endpoint

type AboutData = {
  lokasi: string;
  email: string;
  deskripsi: string;
  sorotan: string[];
  kampus: string;
  programStudi: string;
  tahunMasuk: number;
  tahunLulus: number;
  ipk: number;
  peran: string[];
};

type Status = "loading" | "ready" | "empty" | "error";

/* ───────────── EDIT: availability status (static) ───────────── */
const AVAILABLE = false;
const AVAILABLE_TEXT = "Open to freelance & collaboration";
/* ──────────────────────────────────────────────────────────── */

/** Fallback colors when a role from the database isn't in the roles list. */
const FALLBACK_CHIPS = [
  { color: "#6366F1", text: "#fff" },
  { color: "#F25C5C", text: "#000" },
  { color: "#FFC857", text: "#000" },
  { color: "#34D399", text: "#000" },
];

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

type Part = { t: string; hot: boolean };

/**
 * Split the description into words for animation.
 * Phrases in `phrases` (e.g. "Tailwind CSS", "REST API") are marked hot, even when
 * they span several words; trailing punctuation ("," ".") stays uncolored.
 */
function buildWords(text: string, phrases: string[]): Part[][] {
  const list = phrases.map((p) => p.trim()).filter(Boolean).sort((a, b) => b.length - a.length);
  const hot: boolean[] = new Array(text.length).fill(false);

  if (list.length > 0) {
    const re = new RegExp(`(${list.map(escapeRe).join("|")})`, "gi");
    for (const m of text.matchAll(re)) {
      const start = m.index ?? 0;
      for (let k = start; k < start + m[0].length; k++) hot[k] = true;
    }
  }

  const words: Part[][] = [];
  for (const m of text.matchAll(/\S+/g)) {
    const start = m.index ?? 0;
    const parts: Part[] = [];
    let cur: Part = { t: "", hot: hot[start] };
    for (let i = 0; i < m[0].length; i++) {
      const h = hot[start + i];
      if (h !== cur.hot) {
        parts.push(cur);
        cur = { t: "", hot: h };
      }
      cur.t += m[0][i];
    }
    parts.push(cur);
    words.push(parts);
  }
  return words;
}

/**
 * Count items in an API response.
 * Supports: plain array, { data: [...] }, { total }, { count }, { projects | activities | items: [...] },
 * and { data: [category, ...] } where each category has a `projects` or `activities` array.
 */
function countOf(json: unknown): number | null {
  if (Array.isArray(json)) return json.length;
  if (json && typeof json === "object") {
    const o = json as Record<string, unknown>;

    if (Array.isArray(o.data) && o.data.length > 0) {
      for (const key of ["projects", "activities"]) {
        const grouped = o.data.every(
          (g) => g && typeof g === "object" && Array.isArray((g as Record<string, unknown>)[key]),
        );
        if (grouped) {
          return (o.data as Record<string, unknown[]>[]).reduce((n, g) => n + g[key].length, 0);
        }
      }
    }

    if (typeof o.total === "number") return o.total;
    if (typeof o.count === "number") return o.count;
    for (const k of ["data", "projects", "activities", "items"]) {
      if (Array.isArray(o[k])) return (o[k] as unknown[]).length;
    }
  }
  return null;
}

/** Card with a light that follows the cursor */
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

/** Section shell (background blobs + container), used by every status. */
function Shell({ children }: { children: ReactNode }) {
  return (
    <section className="relative overflow-hidden">
      {/* background gradient blobs */}
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

      <div className="relative mx-auto max-w-[1200px] px-6 py-28 sm:px-10">{children}</div>
    </section>
  );
}

/** Placeholder while data is loading. */
function AboutSkeleton() {
  const bar = "animate-pulse rounded-lg bg-white/10 motion-reduce:animate-none";
  return (
    <div role="status" aria-busy="true" aria-label="Loading about me" className="grid gap-14 lg:grid-cols-[1.2fr_1fr]">
      <div>
        <Heading>About me</Heading>
        <div className="mt-6 flex gap-2">
          <div className={`${bar} h-8 w-40 rounded-full`} />
          <div className={`${bar} h-8 w-56 rounded-full`} />
        </div>
        <div className="mt-8 space-y-3">
          <div className={`${bar} h-5 w-full max-w-[60ch]`} />
          <div className={`${bar} h-5 w-11/12 max-w-[56ch]`} />
          <div className={`${bar} h-5 w-full max-w-[60ch]`} />
          <div className={`${bar} h-5 w-3/4 max-w-[44ch]`} />
        </div>
        <div className="mt-8 flex gap-3">
          <div className={`${bar} h-9 w-32 rounded-full`} />
          <div className={`${bar} h-9 w-28 rounded-full`} />
          <div className={`${bar} h-9 w-28 rounded-full`} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        <div className={`${bar} h-24 rounded-xl sm:col-span-2 lg:col-span-1`} />
        <div className={`${bar} h-24 rounded-xl`} />
        <div className={`${bar} h-24 rounded-xl`} />
        <div className={`${bar} h-24 rounded-xl sm:col-span-2 lg:col-span-1`} />
      </div>
    </div>
  );
}

export function About() {
  const [status, setStatus] = useState<Status>("loading");
  const [errMsg, setErrMsg] = useState("");
  const [about, setAbout] = useState<AboutData | null>(null);
  const [projectCount, setProjectCount] = useState<number | null>(null);
  const [activityCount, setActivityCount] = useState<number | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();

    const get = async (url: string) => {
      const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
      if (!res.ok) throw new Error(`${url} → status ${res.status}`);
      return res.json();
    };

    (async () => {
      const [aboutRes, projectsRes, activitiesRes] = await Promise.allSettled([
        get(ABOUT_API),
        get(PROJECTS_API),
        get(ACTIVITIES_API),
      ]);
      if (ctrl.signal.aborted) return;

      if (aboutRes.status === "rejected") {
        const msg = String((aboutRes.reason as Error | undefined)?.message ?? "");
        console.error("[about] failed to load data:", aboutRes.reason);
        setErrMsg(
          /status 40[13]/.test(msg) ? "The about section can't be accessed." : "The about section failed to load.",
        );
        setStatus("error");
        return;
      }

      const d = (aboutRes.value as { data?: AboutData | null }).data;
      if (!d) {
        setStatus("empty");
        return;
      }

      setAbout(d);
      // if projects / activities fail to load → show "—", the rest still renders
      setProjectCount(projectsRes.status === "fulfilled" ? countOf(projectsRes.value) : null);
      setActivityCount(activitiesRes.status === "fulfilled" ? countOf(activitiesRes.value) : null);
      setStatus("ready");
    })();

    return () => ctrl.abort();
  }, []);

  const words = useMemo(() => (about ? buildWords(about.deskripsi, about.sorotan) : []), [about]);

  if (status === "loading") {
    return (
      <Shell>
        <AboutSkeleton />
      </Shell>
    );
  }

  if (status !== "ready" || !about) {
    return (
      <Shell>
        <Heading>About me</Heading>
        <p role="status" className="mt-6 text-white/70">
          {status === "error" ? errMsg : "The about section hasn't been filled in yet."}
        </p>
      </Shell>
    );
  }

  /* roles come from the database; href & colors are taken from the roles list when the label matches */
  const known = new Map(roles.map((r) => [r.label.toLowerCase(), r]));
  const chips = about.peran.map((label, i) => {
    const r = known.get(label.toLowerCase());
    const fb = FALLBACK_CHIPS[i % FALLBACK_CHIPS.length];
    return { label, href: r?.href ?? "/projects", color: r?.color ?? fb.color, text: r?.text ?? fb.text };
  });

  const stats = [
    {
      label: "Graduated from",
      content: (
        <>
          <span className={`${mono.className} block text-xl font-semibold`}>{about.kampus}</span>
          <span className="mt-1 block text-sm text-white/60">
            {about.programStudi}, {about.tahunMasuk} – {about.tahunLulus}
          </span>
        </>
      ),
    },
    {
      label: "GPA",
      content: (
        <span className={`${mono.className} text-5xl font-bold text-[#FFC857]`}>
          <CountUp to={about.ipk} decimals={2} />
        </span>
      ),
    },
    {
      label: "Projects completed",
      content: (
        <span className={`${mono.className} text-5xl font-bold text-[#FFC857]`}>
          {projectCount === null ? "—" : <CountUp to={projectCount} suffix="+" />}
        </span>
      ),
    },
    {
      label: "Activities done",
      content: (
        <span className={`${mono.className} text-5xl font-bold text-[#FFC857]`}>
          {activityCount === null ? "—" : <CountUp to={activityCount} suffix="+" />}
        </span>
      ),
    },
  ];

  return (
    <Shell>
      {/* ───── Part 1: intro + stats ───── */}
      <div className="grid gap-14 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <Heading>About me</Heading>

          {/* status + quick info */}
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
              <MapPin size={14} /> {about.lokasi}
            </span>
            <a
              href={`mailto:${about.email}`}
              className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <Mail size={14} /> {about.email}
            </a>
          </Reveal>

          <p className="mt-8 max-w-[60ch] text-lg leading-relaxed text-white/80">
            {words.map((parts, i) => (
              <motion.span
                key={i}
                className="inline-block"
                initial={{ opacity: 0.12, y: 6 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: Math.min(i * 0.025, 1.2) }}
              >
                {parts.map((p, j) =>
                  p.hot ? (
                    <span key={j} className="bg-gradient-to-r from-[#8B85FF] to-[#FFC857] bg-clip-text font-medium text-transparent">
                      {p.t}
                    </span>
                  ) : (
                    <span key={j}>{p.t}</span>
                  ),
                )}
                &nbsp;
              </motion.span>
            ))}
          </p>

          {/* roles */}
          <Reveal delay={0.1} className="mt-8 flex flex-wrap gap-3">
            {chips.map((r) => (
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
              /* first & last cards span the full width on sm screens, so no card is left orphaned */
              className={i === 0 || i === stats.length - 1 ? "sm:col-span-2 lg:col-span-1" : ""}
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
    </Shell>
  );
}