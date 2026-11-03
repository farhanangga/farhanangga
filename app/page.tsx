"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  MotionConfig,
  MotionValue,
  animate,
  motion,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";

/* Dependensi: npm i framer-motion */

const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600", "700"], style: ["normal", "italic"] });
const sans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"] });

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/* ------------------------------------------------------------------ */
/* DATA (dari CV). Nanti ganti dengan fetch dari database.             */
/* ------------------------------------------------------------------ */

function placeholder(w: number, h: number, inner: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${inner}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const dummyPhoto = placeholder(
  520, 720,
  `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E8ECFF"/><stop offset="1" stop-color="#9AA3E8"/></linearGradient></defs>
   <circle cx="260" cy="230" r="120" fill="url(#g)"/>
   <path d="M40 720 C40 520 140 430 260 430 C380 430 480 520 480 720 Z" fill="url(#g)"/>`
);

const dummyProject = placeholder(
  1280, 800,
  `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1E1B6B"/><stop offset="1" stop-color="#6C63FF"/></linearGradient></defs>
   <rect width="1280" height="800" fill="url(#g)"/>
   <rect x="140" y="130" width="1000" height="540" rx="24" fill="#0B0B24" opacity="0.85"/>
   <rect x="190" y="190" width="300" height="28" rx="14" fill="#FFC857"/>
   <rect x="190" y="260" width="620" height="18" rx="9" fill="#fff" opacity="0.5"/>
   <rect x="190" y="300" width="520" height="18" rx="9" fill="#fff" opacity="0.3"/>
   <rect x="190" y="380" width="280" height="220" rx="16" fill="#6C63FF" opacity="0.7"/>
   <rect x="500" y="380" width="280" height="220" rx="16" fill="#F25C5C" opacity="0.6"/>
   <rect x="810" y="380" width="280" height="220" rx="16" fill="#FFC857" opacity="0.6"/>`
);

const profile = {
  firstName: "FARHAN",
  accent: "ANGGA",
  lastName: "RIYANTO",
  photo: dummyPhoto, // ganti dengan "/profile.png"
  tagline:
    "Membangun antarmuka web yang responsif dan mudah dipakai, dari desain di Figma sampai kode yang berjalan di produksi.",
  about:
    "Front-end developer yang berpengalaman membangun aplikasi web responsif dengan React.js, Next.js, TypeScript, dan Tailwind CSS. Saya terbiasa menerjemahkan desain Figma menjadi antarmuka yang berfungsi, membuat komponen yang bisa dipakai ulang, menghubungkan REST API, dan bekerja bersama desainer UI/UX maupun tim pengembang.",
  graduatedFrom: "Universitas Pendidikan Indonesia",
  degree: "S1 Rekayasa Perangkat Lunak, 2022 – 2026",
  gpa: 3.83,
  projectCount: 6,
  email: "farhanangga8900@gmail.com",
  location: "Cirebon, Indonesia",
};

const roles = [
  { label: "Software Engineer", href: "/apps", color: "#6366F1", text: "#fff", icon: "terminal" },
  { label: "UI/UX Designer", href: "/uiux", color: "#F25C5C", text: "#000", icon: "palette" },
  { label: "Photography", href: "/photography", color: "#FFC857", text: "#000", icon: "camera" },
];

const navLinks = [
  { label: "Blog", href: "/blog", locked: true },
  { label: "Apps", href: "/apps" },
  { label: "Home", href: "/" },
  { label: "Photography", href: "/photography" },
  { label: "UI/UX", href: "/uiux" },
];

// Ganti href dengan username asli Anda
const contacts = [
  { platform: "LinkedIn", href: "https://linkedin.com", icon: "linkedin" },
  { platform: "GitHub", href: "https://github.com", icon: "github" },
  { platform: "Instagram", href: "https://instagram.com", icon: "instagram" },
];

const bestProject = {
  title: "Casepose",
  subtitle: "Student Portfolio & Social Media Platform",
  description:
    "Platform web tempat mahasiswa memamerkan portofolio, mempromosikan proyek, dan mengelola konten. Dilengkapi CRUD, login Google, fitur promosi postingan, serta riwayat transaksi dan laporan.",
  image: dummyProject,
  role: "Full-Stack Developer",
  engagement: "Individu",
  category: "Website",
  tools: ["PHP Native", "MySQL", "Google Login", "CRUD", "Tailwind CSS"],
};

const otherProjects = [
  { title: "SlogLab", type: "Document Tracking System", desc: "Antarmuka pelacakan dokumen untuk alur kerja operasional, dibangun dari desain UI/UX.", tools: "React.js, Tailwind CSS" },
  { title: "Rampcheck Nasional", type: "Transportation Inspection System", desc: "Antarmuka web inspeksi bus untuk penilaian kelayakan kendaraan, mendigitalkan formulir inspeksi.", tools: "Next.js, React.js, Tailwind CSS" },
  { title: "Bimbim", type: "Digital Cashier & Financial Reporting", desc: "Aplikasi kasir digital dengan manajemen transaksi dan laporan keuangan.", tools: "Web App" },
  { title: "Kerthi Bali Santhi", type: "Digital Dashboard", desc: "Dashboard perusahaan daerah Bali dengan visualisasi data operasional interaktif.", tools: "Laravel, Tailwind CSS, Chart.js" },
  { title: "Jaring Company Profile", type: "Corporate Website", desc: "Website perusahaan responsif berisi profil, produk, dan layanan.", tools: "Web" },
];

const experiences = [
  {
    role: "Front-End Developer", company: "SuCC Team (Freelance)", place: "Remote", period: "Mei 2026 – Sekarang",
    points: [
      "Membuat antarmuka web responsif dengan React.js, Next.js, dan Tailwind CSS sesuai kebutuhan proyek.",
      "Menerjemahkan desain UI/UX menjadi antarmuka yang konsisten dan berfungsi.",
      "Ikut mendukung pengembangan produk dari desain antarmuka sampai implementasi front-end.",
    ],
  },
  {
    role: "Front-End Developer (Magang)", company: "PT Jaring Solusi Aplikasi", place: "Jakarta Pusat", period: "Sep – Des 2025",
    points: [
      "Mengembangkan antarmuka untuk beberapa proyek aplikasi web dengan React.js, Next.js, dan Tailwind CSS.",
      "Membuat komponen yang bisa dipakai ulang agar tampilan konsisten dan implementasi lebih cepat.",
      "Berkolaborasi dengan desainer UI/UX dan tim pengembang.",
    ],
  },
  {
    role: "Front-End Developer (Magang)", company: "PT Masagi Energi Hijau", place: "Sukabumi", period: "Mar – Jun 2025",
    points: [
      "Merancang antarmuka website di Figma berdasarkan kebutuhan bisnis.",
      "Mengimplementasikan desain Figma dengan Next.js dan Tailwind CSS.",
      "Membuat layout responsif untuk desktop dan mobile.",
    ],
  },
];

const orgs = [
  "Staf Divisi Koordinasi dan Aspirasi, DPM UPI Cibiru (2024 – 2025)",
  "Staf Divisi BURTA, HIMA RPL (2024)",
  "Staf Komisi, HIMA RPL (2023)",
];
const certs = [
  "Dicoding: Belajar Dasar AI",
  "BNSP: KKNI Level II Rekayasa Perangkat Lunak",
  "Juara 1 Sayembara Logo Kabinet Daya Cita, DPM UPI Cibiru",
];

const toolGroups = [
  { title: "Frontend", items: ["React.js", "Next.js", "TypeScript", "JavaScript", "HTML5", "CSS3", "Tailwind CSS"] },
  { title: "UI/UX Design", items: ["Figma", "Wireframing", "Prototyping", "UI Design", "UX Principles"] },
  { title: "Backend & Database", items: ["Node.js", "NestJS", "Laravel", "PHP", "PostgreSQL", "MySQL", "Supabase"] },
  { title: "Tools & Deployment", items: ["Git", "GitHub", "Vercel", "VS Code"] },
];
const marqueeTools = toolGroups.flatMap((g) => g.items);

/* ------------------------------------------------------------------ */
/* ICONS                                                               */
/* ------------------------------------------------------------------ */

function Icon({ name, className = "h-6 w-6" }: { name: string; className?: string }) {
  const p = { className, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  switch (name) {
    case "terminal": return (<svg {...p}><rect x="3" y="4" width="18" height="16" rx="3" /><path d="m7 10 3 2-3 2M12 15h5" /></svg>);
    case "palette": return (<svg {...p}><path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-1 1.6-2.1-.4-1.1.3-2.4 1.6-2.4H17a4 4 0 0 0 4-4c0-5-4-9.5-9-9.5Z" /><circle cx="8" cy="11" r="1" /><circle cx="12" cy="7.5" r="1" /><circle cx="16" cy="11" r="1" /></svg>);
    case "camera": return (<svg {...p}><path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" /><circle cx="12" cy="13" r="3.5" /></svg>);
    case "lock": return (<svg {...p}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>);
    case "arrow": return (<svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>);
    case "chevron": return (<svg {...p}><path d="m6 9 6 6 6-6" /></svg>);
    case "up": return (<svg {...p}><path d="M12 19V5M6 11l6-6 6 6" /></svg>);
    case "linkedin": return (<svg {...p}><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M8 11v5M8 8v.01M12 16v-5m0 2.5c0-1.5 1-2.5 2.5-2.5S17 12 17 13.5V16" /></svg>);
    case "github": return (<svg {...p}><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" /><path d="M9 18c-4.51 2-5-2-7-2" /></svg>);
    case "instagram": return (<svg {...p}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><path d="M17.5 6.5v.01" /></svg>);
    default: return null;
  }
}

/* ------------------------------------------------------------------ */
/* REUSABLE ANIMATION PIECES                                           */
/* ------------------------------------------------------------------ */

/** Judul section: naik dari balik garis (mask reveal). */
function Heading({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div>
      <h2 className={`${mono.className} overflow-hidden pb-2 text-4xl font-bold sm:text-5xl`}>
        <motion.span
          className="block"
          initial={{ y: "115%" }}
          whileInView={{ y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.9, ease: EASE }}
        >
          {children}
        </motion.span>
      </h2>
      {sub && (
        <motion.p
          className="mt-1 text-white/60"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          {sub}
        </motion.p>
      )}
    </div>
  );
}

/** Kartu miring 3D mengikuti kursor + sorotan cahaya. */
function Tilt({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);
  const rx = useSpring(useTransform(y, [0, 1], [6, -6]), { stiffness: 180, damping: 18 });
  const ry = useSpring(useTransform(x, [0, 1], [-6, 6]), { stiffness: 180, damping: 18 });
  const gx = useTransform(x, (v) => `${v * 100}%`);
  const gy = useTransform(y, (v) => `${v * 100}%`);
  const glow = useMotionTemplate`radial-gradient(circle at ${gx} ${gy}, rgba(108,99,255,0.3), transparent 60%)`;
  return (
    <motion.div
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - r.left) / r.width);
        y.set((e.clientY - r.top) / r.height);
      }}
      onMouseLeave={() => { x.set(0.5); y.set(0.5); }}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      className={`group/tilt relative ${className}`}
    >
      {children}
      <motion.div
        aria-hidden
        style={{ backgroundImage: glow }}
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover/tilt:opacity-100"
      />
    </motion.div>
  );
}

/** Elemen yang tertarik ke kursor. */
function Magnetic({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 14 });
  const sy = useSpring(y, { stiffness: 200, damping: 14 });
  return (
    <motion.div
      ref={ref}
      style={{ x: sx, y: sy }}
      className="inline-block"
      onMouseMove={(e) => {
        const r = ref.current!.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * 0.3);
        y.set((e.clientY - (r.top + r.height / 2)) * 0.3);
      }}
      onMouseLeave={() => { x.set(0); y.set(0); }}
    >
      {children}
    </motion.div>
  );
}

function CountUp({ to, decimals = 0, suffix = "" }: { to: number; decimals?: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const c = animate(0, to, { duration: 1.8, ease: "easeOut", onUpdate: (v) => setVal(v) });
    return () => c.stop();
  }, [inView, to]);
  return <span ref={ref}>{val.toFixed(decimals)}{suffix}</span>;
}

/* ------------------------------------------------------------------ */
/* PAGE                                                                */
/* ------------------------------------------------------------------ */

export default function HomePage() {
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 24 });
  return (
    <MotionConfig reducedMotion="user">
      <main className={`${sans.className} min-h-screen overflow-x-hidden bg-[#02020F] text-white`}>
        <motion.div
          aria-hidden
          style={{ scaleX: progress }}
          className="fixed inset-x-0 top-0 z-[60] h-1 origin-left bg-gradient-to-r from-[#6C63FF] to-[#FFC857]"
        />
        <Navbar />
        <Hero />
        <About />
        <BestProject />
        <Experience />
        <Tools />
        <Footer />
      </main>
    </MotionConfig>
  );
}

/* ---------------------------- NAVBAR ------------------------------ */

function Navbar() {
  const [hovered, setHovered] = useState<string | null>(null);
  return (
    <motion.header
      initial={{ y: -90, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.9, ease: EASE }}
      className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-8 sm:pt-6"
    >
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4">
        <Link href="/" className={`${mono.className} text-2xl font-bold transition-transform hover:scale-110`}>
          Angga
        </Link>

        <nav
          aria-label="Navigasi utama"
          onMouseLeave={() => setHovered(null)}
          className="hidden items-center rounded-full border border-white/10 bg-black/50 p-1.5 backdrop-blur-md md:flex"
        >
          {navLinks.map((l) => {
            const showPill = !l.locked && (hovered === l.label || (hovered === null && l.href === "/"));
            return (
              <motion.div key={l.label} whileHover={l.locked ? { x: [0, -3, 3, -3, 0] } : undefined} transition={{ duration: 0.35 }}>
                <Link
                  href={l.locked ? "#" : l.href}
                  aria-disabled={l.locked}
                  title={l.locked ? "Halaman ini belum tersedia" : undefined}
                  onMouseEnter={() => setHovered(l.label)}
                  className={`relative flex items-center gap-1.5 rounded-full px-6 py-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6C63FF] ${l.locked ? "cursor-not-allowed text-white/40" : "text-white"}`}
                >
                  {showPill && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-full bg-[#6C63FF]"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{l.label}</span>
                  {l.locked && <Icon name="lock" className="relative z-10 h-3.5 w-3.5" />}
                </Link>
              </motion.div>
            );
          })}
        </nav>

        <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/50 p-1.5 backdrop-blur-md">
          {contacts.map((c, i) => (
            <motion.a
              key={c.platform}
              href={c.href}
              target="_blank"
              rel="noreferrer"
              aria-label={c.platform}
              whileHover={{ y: -3, rotate: i % 2 ? 8 : -8, backgroundColor: "#6C63FF" }}
              whileTap={{ scale: 0.9 }}
              className="grid h-10 w-10 place-items-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6C63FF]"
            >
              <Icon name={c.icon} className="h-5 w-5" />
            </motion.a>
          ))}
        </div>
      </div>
    </motion.header>
  );
}

/* ----------------------------- HERO ------------------------------- */

function SplitLine({ text, className, delay }: { text: string; className?: string; delay: number }) {
  return (
    <span className={`block overflow-hidden pb-[0.06em] ${className ?? ""}`} aria-label={text}>
      {text.split("").map((c, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="inline-block"
          initial={{ y: "115%", rotate: 8 }}
          animate={{ y: 0, rotate: 0 }}
          transition={{ duration: 0.9, delay: delay + i * 0.05, ease: EASE }}
        >
          {c}
        </motion.span>
      ))}
    </span>
  );
}

function Float({ sx, sy, depth, delay, label, className, children }: {
  sx: MotionValue<number>; sy: MotionValue<number>; depth: number; delay: number;
  label: string; className: string; children: React.ReactNode;
}) {
  const x = useTransform(sx, [-0.5, 0.5], [-depth, depth]);
  const y = useTransform(sy, [-0.5, 0.5], [-depth, depth]);
  return (
    <motion.span role="img" aria-label={label} style={{ x, y }} className={`absolute hidden sm:block ${className}`}>
      <motion.span
        className="block text-7xl drop-shadow-[0_12px_24px_rgba(99,102,241,0.5)]"
        initial={{ scale: 0, rotate: -40 }}
        animate={{ scale: 1, rotate: 0, y: [0, -14, 0] }}
        transition={{
          scale: { type: "spring", stiffness: 160, damping: 12, delay: 1.1 + delay },
          rotate: { type: "spring", delay: 1.1 + delay },
          y: { duration: 4 + delay * 3, repeat: Infinity, ease: "easeInOut", delay: 1.8 },
        }}
      >
        {children}
      </motion.span>
    </motion.span>
  );
}

function Hero() {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 15 });
  const sy = useSpring(my, { stiffness: 60, damping: 15 });
  const photoX = useTransform(sx, [-0.5, 0.5], [-16, 16]);
  const photoY = useTransform(sy, [-0.5, 0.5], [-10, 10]);
  const { scrollY } = useScroll();
  const bgY = useTransform(scrollY, [0, 700], [0, -140]);
  const bgOpacity = useTransform(scrollY, [0, 600], [1, 0.2]);

  return (
    <section
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width - 0.5);
        my.set((e.clientY - r.top) / r.height - 0.5);
      }}
      className="relative isolate flex min-h-screen items-end overflow-hidden bg-[radial-gradient(ellipse_at_top,#0A0A6B_0%,#02020F_55%)] pt-32 lg:items-center"
    >
      <motion.span
        aria-hidden
        style={{ y: bgY, opacity: bgOpacity }}
        className={`${mono.className} pointer-events-none absolute inset-x-0 top-1/3 -z-10 select-none text-center text-[22vw] font-bold leading-none text-[#4F46E5]/40 blur-2xl`}
      >
        FARHAN
      </motion.span>

      <div className="mx-auto grid w-full max-w-[1400px] items-center gap-10 px-6 sm:px-10 lg:grid-cols-[1fr_auto_1fr]">
        <div className="order-2 pb-10 lg:order-1 lg:pb-0">
          <motion.p
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: EASE }}
            className={`${mono.className} text-3xl italic text-white/90 sm:text-4xl`}
          >
            Hello, I’am
          </motion.p>
          <h1 className={`${mono.className} mt-2 text-6xl font-bold leading-[0.95] sm:text-7xl xl:text-8xl`}>
            <SplitLine text={profile.firstName} delay={0.45} />
            <SplitLine text={profile.accent} delay={0.75} className="text-[#FFC857]" />
            <SplitLine text={profile.lastName} delay={1.0} />
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.5 }}
            className="mt-6 max-w-[44ch] leading-relaxed text-white/70"
          >
            {profile.tagline}
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 1.7 }} className="mt-8">
            <Magnetic>
              <Link
                href="/apps"
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-[#6C63FF] px-7 py-3.5 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <span aria-hidden className="absolute inset-0 -translate-x-full bg-[#FFC857] transition-transform duration-500 ease-out group-hover:translate-x-0" />
                <span className="relative z-10 transition-colors duration-500 group-hover:text-black">Lihat proyek saya</span>
                <Icon name="arrow" className="relative z-10 h-4 w-4 transition-all duration-500 group-hover:translate-x-1 group-hover:text-black" />
              </Link>
            </Magnetic>
          </motion.div>
        </div>

        <motion.div
          style={{ x: photoX, y: photoY }}
          className="relative order-1 mx-auto h-[420px] w-[320px] sm:h-[560px] sm:w-[430px] lg:order-2 lg:h-[720px] lg:w-[520px]"
        >
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 0.9, y: 80 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.2, ease: EASE }}
          >
            <Image src={profile.photo} alt="Foto profesional Farhan Angga Riyanto" fill priority className="object-contain object-bottom" />
          </motion.div>
          <Float sx={sx} sy={sy} depth={50} delay={0} label="Keyboard" className="left-0 top-[28%] -rotate-12">⌨️</Float>
          <Float sx={sx} sy={sy} depth={35} delay={0.3} label="Palet warna" className="right-0 top-[38%] rotate-12">🎨</Float>
          <Float sx={sx} sy={sy} depth={60} delay={0.6} label="Kamera" className="bottom-[22%] left-[8%] -rotate-6">📷</Float>
        </motion.div>

        <ul className="order-3 flex flex-col gap-4 pb-12 lg:pb-0">
          {roles.map((r, i) => (
            <motion.li
              key={r.label}
              initial={{ opacity: 0, x: 90 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.9, delay: 1.2 + i * 0.15, ease: EASE }}
            >
              <Link
                href={r.href}
                className="group relative flex items-center gap-5 overflow-hidden rounded-xl bg-[#2B2B2B] p-3 pr-6 transition-transform duration-300 hover:-translate-x-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6C63FF]"
              >
                <span
                  aria-hidden
                  className="absolute inset-0 origin-left scale-x-0 transition-transform duration-500 ease-out group-hover:scale-x-100"
                  style={{ backgroundColor: r.color }}
                />
                <span
                  className="relative grid h-14 w-14 shrink-0 place-items-center rounded-lg text-black transition-transform duration-500 group-hover:-rotate-12 group-hover:scale-110 sm:h-16 sm:w-16"
                  style={{ backgroundColor: r.color }}
                >
                  <Icon name={r.icon} className="h-7 w-7" />
                </span>
                <span
                  className={`${mono.className} relative flex-1 text-center text-xl font-semibold transition-colors duration-500 sm:text-2xl`}
                  style={{ color: undefined }}
                >
                  <span className="group-hover:hidden">{r.label}</span>
                  <span className="hidden group-hover:inline" style={{ color: r.text }}>{r.label}</span>
                </span>
                <Icon
                  name="arrow"
                  className="relative h-5 w-5 -translate-x-3 opacity-0 transition-all duration-500 group-hover:translate-x-0 group-hover:opacity-100"
                />
              </Link>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ----------------------------- ABOUT ------------------------------ */

function About() {
  const words = profile.about.split(" ");
  return (
    <section className="mx-auto grid max-w-[1200px] gap-14 px-6 py-28 sm:px-10 lg:grid-cols-[1.2fr_1fr]">
      <div>
        <Heading>Tentang saya</Heading>
        <p className="mt-6 max-w-[60ch] text-lg leading-relaxed text-white/80">
          {words.map((w, i) => (
            <motion.span
              key={i}
              className="inline-block"
              initial={{ opacity: 0.12, y: 6 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: Math.min(i * 0.025, 1.2) }}
            >
              {w}&nbsp;
            </motion.span>
          ))}
        </p>
      </div>

      <div className="grid gap-4 [perspective:1000px]">
        {[
          { label: "Lulusan dari", content: <><span className={`${mono.className} block text-2xl font-semibold`}>{profile.graduatedFrom}</span><span className="mt-1 block text-sm text-white/60">{profile.degree}</span></> },
          { label: "IPK", content: <span className={`${mono.className} text-5xl font-bold text-[#FFC857]`}><CountUp to={profile.gpa} decimals={2} /></span> },
          { label: "Proyek dikerjakan", content: <span className={`${mono.className} text-5xl font-bold text-[#FFC857]`}><CountUp to={profile.projectCount} suffix="+" /></span> },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, rotateX: -35, y: 40 }}
            whileInView={{ opacity: 1, rotateX: 0, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.9, delay: i * 0.15, ease: EASE }}
          >
            <Tilt className="overflow-hidden rounded-xl bg-[#14142B] px-6 py-5">
              <p className="mb-1 text-sm text-white/55">{s.label}</p>
              {s.content}
            </Tilt>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* -------------------------- BEST PROJECT -------------------------- */

function BestProject() {
  const p = bestProject;
  return (
    <section className="mx-auto max-w-[1200px] px-6 pb-28 sm:px-10">
      <Heading sub="Proyek terbaik saya sebagai Full-Stack Developer">Proyek terbaik</Heading>

      <Tilt className="mt-10 overflow-hidden rounded-2xl bg-[#14142B]">
        <article className="grid lg:grid-cols-2">
          <motion.div
            className="group relative aspect-[16/10] overflow-hidden bg-[#0B0B24]"
            initial={{ clipPath: "inset(0 100% 0 0)" }}
            whileInView={{ clipPath: "inset(0 0% 0 0)" }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 1.2, ease: EASE }}
          >
            <Image src={p.image} alt={`Tampilan proyek ${p.title}`} fill className="object-cover transition-transform duration-700 group-hover:scale-110" />
          </motion.div>

          <motion.div
            className="flex flex-col justify-center gap-5 p-8 sm:p-10"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            variants={{ show: { transition: { staggerChildren: 0.12, delayChildren: 0.4 } } }}
          >
            {[
              <div key="t"><h3 className={`${mono.className} text-3xl font-semibold`}>{p.title}</h3><p className="text-white/60">{p.subtitle}</p></div>,
              <p key="d" className="max-w-[60ch] leading-relaxed text-white/75">{p.description}</p>,
              <p key="m" className="text-sm text-white/60">{p.role} · {p.category} · {p.engagement}</p>,
              <ul key="l" className="flex flex-wrap gap-2">
                {p.tools.map((t) => (
                  <motion.li key={t} whileHover={{ y: -3, backgroundColor: "#6C63FF" }} className="cursor-default rounded-full bg-white/10 px-3 py-1 text-sm">{t}</motion.li>
                ))}
              </ul>,
            ].map((node, i) => (
              <motion.div key={i} variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } } }}>
                {node}
              </motion.div>
            ))}
          </motion.div>
        </article>
      </Tilt>

      <ul className="mt-12 divide-y divide-white/10 border-y border-white/10">
        {otherProjects.map((o, i) => (
          <motion.li
            key={o.title}
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.7, delay: i * 0.07, ease: EASE }}
          >
            <Link href="/apps" className="group relative block overflow-hidden px-2 py-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6C63FF]">
              <span aria-hidden className="absolute inset-0 origin-bottom scale-y-0 bg-[#14142B] transition-transform duration-500 ease-out group-hover:scale-y-100" />
              <div className="relative flex items-center justify-between gap-4 transition-transform duration-500 group-hover:translate-x-3">
                <div>
                  <h3 className={`${mono.className} text-xl font-semibold`}>{o.title}</h3>
                  <p className="text-sm text-white/55">{o.type}</p>
                </div>
                <Icon name="arrow" className="h-5 w-5 -translate-x-3 text-[#FFC857] opacity-0 transition-all duration-500 group-hover:translate-x-0 group-hover:opacity-100" />
              </div>
              <div className="relative grid grid-rows-[0fr] transition-all duration-500 group-hover:grid-rows-[1fr] group-focus-visible:grid-rows-[1fr]">
                <div className="overflow-hidden">
                  <p className="max-w-[70ch] pt-3 text-sm text-white/75 transition-transform duration-500 group-hover:translate-x-3">{o.desc}</p>
                  <p className={`${mono.className} pt-1 text-xs text-[#FFC857] transition-transform duration-500 group-hover:translate-x-3`}>{o.tools}</p>
                </div>
              </div>
            </Link>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}

/* --------------------------- EXPERIENCE --------------------------- */

function Experience() {
  const ref = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 60%"] });
  const line = useSpring(scrollYProgress, { stiffness: 100, damping: 25 });
  const [open, setOpen] = useState(0);

  return (
    <section className="mx-auto max-w-[1200px] px-6 pb-28 sm:px-10">
      <Heading>Pengalaman kerja</Heading>

      <ol ref={ref} className="relative mt-10">
        <span aria-hidden className="absolute bottom-0 left-[6px] top-0 w-px bg-white/10" />
        <motion.span aria-hidden style={{ scaleY: line }} className="absolute bottom-0 left-[6px] top-0 w-px origin-top bg-gradient-to-b from-[#6C63FF] to-[#FFC857]" />
        {experiences.map((e, i) => {
          const isOpen = open === i;
          return (
            <motion.li
              key={e.company}
              className="relative pb-6 pl-10"
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.8, ease: EASE }}
            >
              <motion.span
                aria-hidden
                className="absolute left-0 top-6 h-3.5 w-3.5 rounded-full bg-[#6C63FF] ring-4 ring-[#02020F]"
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ type: "spring", stiffness: 300, damping: 12, delay: 0.2 }}
                animate={isOpen ? { backgroundColor: "#FFC857" } : { backgroundColor: "#6C63FF" }}
              />
              <motion.div whileHover={{ y: -3 }} className="overflow-hidden rounded-xl bg-[#14142B]">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6C63FF]"
                >
                  <span>
                    <span className={`${mono.className} block text-sm text-[#FFC857]`}>{e.period}</span>
                    <span className="mt-1 block text-xl font-semibold">{e.role}</span>
                    <span className="block text-white/60">{e.company} · {e.place}</span>
                  </span>
                  <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ type: "spring", stiffness: 260, damping: 18 }}>
                    <Icon name="chevron" className="h-6 w-6" />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.ul
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.5, ease: EASE }}
                      className="overflow-hidden px-6"
                    >
                      {e.points.map((pt, k) => (
                        <motion.li
                          key={k}
                          initial={{ opacity: 0, x: -16 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.15 + k * 0.08 }}
                          className="max-w-[70ch] pb-3 text-white/75 last:pb-6"
                        >
                          {pt}
                        </motion.li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.li>
          );
        })}
      </ol>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {[{ title: "Organisasi", items: orgs }, { title: "Sertifikat dan penghargaan", items: certs }].map((g, gi) => (
          <motion.div
            key={g.title}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.8, delay: gi * 0.12, ease: EASE }}
          >
            <Tilt className="h-full overflow-hidden rounded-xl bg-[#14142B] p-6">
              <h3 className={`${mono.className} mb-3 text-lg font-semibold`}>{g.title}</h3>
              <ul className="space-y-2 text-sm text-white/75">
                {g.items.map((it) => (
                  <motion.li key={it} whileHover={{ x: 6, color: "#ffffff" }} className="cursor-default">{it}</motion.li>
                ))}
              </ul>
            </Tilt>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------ TOOLS ----------------------------- */

function Marquee({ reverse = false }: { reverse?: boolean }) {
  const items = [...marqueeTools, ...marqueeTools];
  return (
    <div className="marquee overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]">
      <div className={`marquee-track ${reverse ? "marquee-rev" : ""}`}>
        {items.map((t, i) => (
          <span key={i} className={`${mono.className} mr-3 shrink-0 rounded-xl bg-[#2B2B2B] px-6 py-3 text-lg font-medium transition-colors hover:bg-[#6C63FF]`}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function Tools() {
  return (
    <section className="pb-28">
      <style>{`
        .marquee-track{display:flex;width:max-content;animation:mq 35s linear infinite}
        .marquee-rev{animation-direction:reverse;animation-duration:42s}
        .marquee:hover .marquee-track{animation-play-state:paused}
        @keyframes mq{to{transform:translateX(-50%)}}
        @media (prefers-reduced-motion:reduce){.marquee-track{animation:none}}
      `}</style>
      <div className="mx-auto max-w-[1200px] px-6 sm:px-10"><Heading>Tools yang saya kuasai</Heading></div>

      <div className="mt-10 space-y-3">
        <Marquee />
        <Marquee reverse />
      </div>

      <div className="mx-auto mt-12 grid max-w-[1200px] gap-4 px-6 sm:grid-cols-2 sm:px-10">
        {toolGroups.map((g, gi) => (
          <motion.div
            key={g.title}
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.7, delay: gi * 0.1, ease: EASE }}
          >
            <Tilt className="h-full overflow-hidden rounded-xl bg-[#14142B] p-6">
              <h3 className={`${mono.className} mb-4 text-lg font-semibold`}>{g.title}</h3>
              <ul className="flex flex-wrap gap-2">
                {g.items.map((t) => (
                  <motion.li
                    key={t}
                    whileHover={{ scale: 1.12, y: -3, backgroundColor: "#FFC857", color: "#000" }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    className="cursor-default rounded-full bg-white/10 px-3 py-1 text-sm"
                  >
                    {t}
                  </motion.li>
                ))}
              </ul>
            </Tilt>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ----------------------------- FOOTER ----------------------------- */

function Footer() {
  const words = "Mari bekerja sama".split(" ");
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto max-w-[1200px] px-6 pb-8 pt-20 sm:px-10">
        <h2 className={`${mono.className} text-5xl font-bold sm:text-7xl`} aria-label="Mari bekerja sama">
          {words.map((w, wi) => (
            <span key={wi} aria-hidden className="mr-[0.25em] inline-block whitespace-nowrap">
              {w.split("").map((c, ci) => (
                <motion.span
                  key={ci}
                  className="inline-block"
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: (wi * 6 + ci) * 0.03, ease: EASE }}
                  whileHover={{ y: -14, color: "#FFC857", transition: { type: "spring", stiffness: 500, damping: 12 } }}
                >
                  {c}
                </motion.span>
              ))}
            </span>
          ))}
        </h2>

        <a href={`mailto:${profile.email}`} className="group relative mt-6 inline-block text-xl text-white/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6C63FF]">
          {profile.email}
          <span aria-hidden className="absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-[#FFC857] transition-transform duration-500 group-hover:scale-x-100" />
        </a>
        <p className="mt-1 text-white/50">{profile.location}</p>

        <div className="mt-12 flex flex-col items-center justify-between gap-6 border-t border-white/10 pt-8 sm:flex-row">
          <p className={`${mono.className} text-lg font-bold`}>Angga</p>
          <div className="flex gap-2">
            {contacts.map((c, i) => (
              <motion.a
                key={c.platform}
                href={c.href}
                target="_blank"
                rel="noreferrer"
                aria-label={c.platform}
                whileHover={{ y: -5, rotate: i % 2 ? 10 : -10, backgroundColor: "#6C63FF" }}
                whileTap={{ scale: 0.9 }}
                className="grid h-11 w-11 place-items-center rounded-full bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6C63FF]"
              >
                <Icon name={c.icon} className="h-5 w-5" />
              </motion.a>
            ))}
          </div>
          <p className="text-sm text-white/50">© {new Date().getFullYear()} Farhan Angga Riyanto</p>
        </div>
      </div>

      <motion.button
        type="button"
        aria-label="Kembali ke atas"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        whileHover={{ y: -4, scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        className="fixed bottom-6 right-6 z-50 grid h-12 w-12 place-items-center rounded-full bg-[#6C63FF] shadow-lg shadow-[#6C63FF]/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
      >
        <Icon name="up" className="h-5 w-5" />
      </motion.button>
    </footer>
  );
}