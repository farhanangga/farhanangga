"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { PenTool, type LucideIcon } from "lucide-react";
import {
  MotionValue,
  motion,
  useMotionTemplate,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { mono } from "@/components/fonts";
import { EASE, Icon, Magnetic } from "@/components/ui";

/* ------------------------------------------------------------------ */
/* DATA: nama lengkap, deskripsi, dan foto HANYA dari API.             */
/* Tidak ada isi bawaan di komponen ini.                               */
/* ------------------------------------------------------------------ */
const API_URL = "/api/landingPage/hero";

type HeroData = {
  namaLengkap: string;
  deskripsi: string;
  urlFoto: string | null;
};

type Status = "loading" | "ready" | "empty" | "error";

/* ------------------------------------------------------------------ */
/* GAMBAR IKON HERO: public/assets/hero/ → dipanggil /assets/hero      */
/* ------------------------------------------------------------------ */
const ASSET_DIR = "/assets/hero";

const heroIcons = [
  { key: "keyboard", src: `${ASSET_DIR}/keyboard.png`, label: "Keyboard", fallback: "⌨️" },
  { key: "palette", src: `${ASSET_DIR}/palette.png`, label: "Palet warna", fallback: "🎨" },
  { key: "camera", src: `${ASSET_DIR}/camera.png`, label: "Kamera", fallback: "📷" },
  { key: "graphic", src: `${ASSET_DIR}/graphic.png`, label: "Graphic design", fallback: "✏️" },
];

type HeroIconData = (typeof heroIcons)[number];

/* ------------------------------------------------------------------ */
/* ROLE (statis).                                                      */
/* ------------------------------------------------------------------ */
type Role = {
  label: string;
  href: string;
  color: string;
  text: string;
  icon: string | LucideIcon;
};

const roles: Role[] = [
  { label: "Software Engineer", href: "/projects?role=software", color: "#6366F1", text: "#fff", icon: "terminal" },
  { label: "UI/UX Designer", href: "/projects?role=uiux", color: "#F25C5C", text: "#000", icon: "palette" },
  { label: "Photography", href: "/projects?role=photo", color: "#FFC857", text: "#000", icon: "camera" },
  { label: "Graphic Designer", href: "/projects?role=graphic", color: "#34D399", text: "#000", icon: PenTool },
];

/** "Farhan Angga Riyanto" → baris nama. 3+ kata: awal / tengah (kuning) / akhir. 2 kata: awal / akhir (kuning). */
function nameLines(full: string): { text: string; accent: boolean }[] {
  const parts = full.trim().split(/\s+/).filter(Boolean).map((w) => w.toUpperCase());
  if (parts.length === 0) return [];
  if (parts.length === 1) return [{ text: parts[0], accent: false }];
  if (parts.length === 2) return [{ text: parts[0], accent: false }, { text: parts[1], accent: true }];
  return [
    { text: parts[0], accent: false },
    { text: parts.slice(1, -1).join(" "), accent: true },
    { text: parts[parts.length - 1], accent: false },
  ];
}

/* ------------------------------------------------------------------ */
/* CSS khusus hero                                                     */
/* ------------------------------------------------------------------ */
const heroCss = `
/* ---------- dasar (mobile & tablet) ---------- */
.hero-inner{display:flex;flex:1;width:100%;max-width:1600px;margin-inline:auto;padding:5.5rem 1.5rem 0}
.hero-grid{display:grid;width:100%;gap:1.5rem;align-content:start}
.hero-photo{order:1;position:relative;margin-inline:auto;aspect-ratio:4/5;width:min(100%,400px)}
.hero-side{order:2;position:relative;z-index:5;text-align:center;margin-top:calc(clamp(120px,40vw,190px) * -1)}
.hero-roles{order:3;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.65rem;padding-bottom:.5rem}
.hero-hello{font-size:clamp(1.25rem,4.6vw,1.75rem)}
.hero-name{font-size:clamp(2.75rem,15.5vw,5.75rem);line-height:.95}
.hero-tagline{max-width:40ch;margin:1.1rem auto 0;font-size:.95rem;line-height:1.6;color:rgba(255,255,255,.72)}
/* ikon: 2 kiri + 2 kanan, ukuran sama, sejajar rapi (simetris) */
.hero-fl-kb{left:-2%;top:8%;width:34%}
.hero-fl-pal{right:-2%;top:8%;width:34%}
.hero-fl-cam{left:-2%;top:40%;width:34%}
.hero-fl-gfx{right:-2%;top:40%;width:34%}
.hero-ico-fluid{display:block;position:relative;width:100%;aspect-ratio:1/1}
.hero-hide-lg{display:block}
.hero-show-lg{display:none}
.hero-fade{position:absolute;left:-8%;right:-8%;bottom:0;height:55%;z-index:3;pointer-events:none;
  background:linear-gradient(to top,#02020F 6%,rgba(2,2,15,.88) 30%,rgba(2,2,15,0) 100%)}
.hero-role-card{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.55rem;
  padding:.9rem .4rem;height:100%;text-align:center}
.hero-role-ico{width:2.75rem;height:2.75rem}
.hero-role-label{flex:0 1 auto;font-size:.78rem;line-height:1.25;text-wrap:balance;text-align:center}
.hero-mq{display:flex;width:max-content;animation:heromq 30s linear infinite}
.hero-sheen{animation:herosheen 4.5s ease-in-out infinite}
.hero-skel{border-radius:.5rem;background:rgba(255,255,255,.1);animation:heropulse 1.4s ease-in-out infinite}
@keyframes heromq{to{transform:translateX(-50%)}}
@keyframes herosheen{0%{transform:translateX(-160%) skewX(-20deg)}55%,100%{transform:translateX(700%) skewX(-20deg)}}
@keyframes heropulse{0%,100%{opacity:.45}50%{opacity:.9}}
@media (min-width:640px){.hero-inner{padding-inline:2.5rem}.hero-role-label{font-size:.9rem}}
@media (min-width:768px){.hero-role-card{flex-direction:row;gap:.9rem;padding:.8rem 1rem .8rem .8rem;text-align:left}.hero-role-label{text-align:left;font-size:.95rem}}

/* ---------- desktop ---------- */
@media (min-width:1024px){
  .hero-hide-lg{display:none!important}
  .hero-show-lg{display:block}
  .hero-inner{align-items:flex-end;padding-top:6.5rem;padding-inline:2rem}
  .hero-grid{grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:end;align-content:normal;gap:2rem}
  .hero-side,.hero-photo,.hero-roles{order:0}
  .hero-side{align-self:center;padding-bottom:3svh;margin-top:0;text-align:left}
  .hero-hello{font-size:clamp(1.25rem,2.2vw,2.5rem)}
  .hero-name{font-size:clamp(3rem,5.4vw,6rem)}
  .hero-tagline{margin:1.25rem 0 0;font-size:1rem}
  .hero-photo{width:auto;height:clamp(360px,calc(100svh - 7rem),680px)}
  /* kolom kiri & kanan sejajar, lebih besar */
  .hero-fl-kb{left:-9%;top:14%;width:36%}
  .hero-fl-pal{right:-9%;top:14%;width:36%}
  .hero-fl-cam{left:-9%;top:48%;width:36%}
  .hero-fl-gfx{right:-9%;top:48%;width:36%}
  .hero-roles{grid-template-columns:1fr;gap:1rem;padding-bottom:3svh;align-self:center}
  .hero-role-card{gap:1rem;padding:.75rem 1.25rem .75rem .75rem;transition:transform .3s}
  .hero-role-card:hover{transform:translateX(-.5rem)}
  .hero-role-ico{width:clamp(48px,4.2vw,64px);height:clamp(48px,4.2vw,64px)}
  .hero-role-label{flex:1 1 0%;font-size:clamp(.95rem,1.4vw,1.5rem);text-align:center}
}
@media (min-width:1536px){.hero-inner{padding-inline:3rem}}
@media (prefers-reduced-motion:reduce){.hero-mq,.hero-sheen,.hero-skel{animation:none}}
`;

/* ------------------------------------------------------------------ */
/* Potongan kecil                                                      */
/* ------------------------------------------------------------------ */

/** Nama muncul huruf per huruf. */
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
          {c === " " ? "\u00A0" : c}
        </motion.span>
      ))}
    </span>
  );
}

/** Ikon 3D. Kalau file PNG belum ada / path salah, tampil emoji. */
function HeroIcon({ item }: { item: HeroIconData }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span role="img" aria-label={item.label} className="hero-ico-fluid grid place-items-center text-6xl">
        {item.fallback}
      </span>
    );
  }
  return (
    <span className="hero-ico-fluid relative block">
      <Image
        src={item.src}
        alt={item.label}
        fill
        sizes="260px"
        onError={() => setFailed(true)}
        className="object-contain drop-shadow-[0_12px_24px_rgba(99,102,241,0.55)]"
      />
    </span>
  );
}

/** Ikon melayang di depan foto. */
function Float({ sx, sy, depth, delay, item, cls, rot }: {
  sx: MotionValue<number>; sy: MotionValue<number>; depth: number; delay: number;
  item: HeroIconData; cls: string; rot: number;
}) {
  const x = useTransform(sx, [-0.5, 0.5], [-depth, depth]);
  const y = useTransform(sy, [-0.5, 0.5], [-depth, depth]);
  return (
    <motion.span style={{ x, y, position: "absolute", zIndex: 4 }} className={cls}>
      <motion.span
        className="block cursor-pointer"
        whileHover={{ scale: 1.1, rotate: 6, y: -6 }}
        whileTap={{ scale: 1.06, rotate: -6 }}
        transition={{ type: "spring", stiffness: 300, damping: 14 }}
      >
        <motion.span
          className="block"
          initial={{ scale: 0, rotate: rot - 30 }}
          animate={{ scale: 1, rotate: [rot - 2, rot + 2, rot - 2], y: [0, -6, 0] }}
          transition={{
            scale: { type: "spring", stiffness: 160, damping: 12, delay: 1.1 + delay },
            rotate: { duration: 5 + delay * 2, repeat: Infinity, ease: "easeInOut", delay: 1.4 },
            y: { duration: 4 + delay * 2, repeat: Infinity, ease: "easeInOut", delay: 1.4 },
          }}
        >
          <HeroIcon item={item} />
        </motion.span>
      </motion.span>
    </motion.span>
  );
}

/** Placeholder teks selama data dimuat / bila gagal. */
function NameSkeleton() {
  return (
    <div aria-hidden className="mt-2 flex flex-col gap-3 max-lg:items-center">
      <div className="hero-skel h-12 w-4/5 lg:h-16" />
      <div className="hero-skel h-12 w-3/5 lg:h-16" />
      <div className="hero-skel mt-2 h-4 w-full max-w-[40ch]" />
      <div className="hero-skel h-4 w-2/3 max-w-[28ch]" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* HERO                                                                */
/* ------------------------------------------------------------------ */

export function Hero() {
  const [status, setStatus] = useState<Status>("loading");
  const [nama, setNama] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [photoSrc, setPhotoSrc] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();

    fetch(API_URL, { signal: ctrl.signal, cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`status ${res.status}`))))
      .then((json: { data?: Partial<HeroData> | null }) => {
        const d = json.data;
        if (!d) {
          setStatus("empty");
          return;
        }
        setNama(d.namaLengkap?.trim() ?? "");
        setDeskripsi(d.deskripsi?.trim() ?? "");
        setPhotoSrc(d.urlFoto?.trim() || null);
        setStatus("ready");
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        console.error("[hero] gagal memuat data:", err);
        setStatus("error");
      });

    return () => ctrl.abort();
  }, []);

  const lines = nameLines(nama);

  /* posisi kursor untuk ikon & cahaya */
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 15 });
  const sy = useSpring(my, { stiffness: 60, damping: 15 });

  /* posisi kursor KHUSUS foto orang: berhenti diperbarui saat foto disorot */
  const photoFrozen = useRef(false);
  const pmx = useMotionValue(0);
  const pmy = useMotionValue(0);
  const spx = useSpring(pmx, { stiffness: 60, damping: 15 });
  const spy = useSpring(pmy, { stiffness: 60, damping: 15 });
  const photoX = useTransform(spx, [-0.5, 0.5], [-16, 16]);
  const photoY = useTransform(spy, [-0.5, 0.5], [-10, 10]);

  const { scrollY } = useScroll();
  const bgY = useTransform(scrollY, [0, 700], [0, -140]);
  const bgOpacity = useTransform(scrollY, [0, 600], [1, 0.2]);
  const textY = useTransform(scrollY, [0, 600], [0, -40]);
  const photoScale = useTransform(scrollY, [0, 600], [1, 1.08]);

  const gx = useTransform(sx, [-0.5, 0.5], ["0%", "100%"]);
  const gy = useTransform(sy, [-0.5, 0.5], ["0%", "100%"]);
  const cursorGlow = useMotionTemplate`radial-gradient(520px circle at ${gx} ${gy}, rgba(108,99,255,0.22), transparent 65%)`;

  const bandItems = [...roles, ...roles, ...roles, ...roles];

  return (
    <section
      onPointerMove={(e) => {
        // parallax kursor hanya untuk desktop; di mobile foto harus tetap rata tengah
        if (!window.matchMedia("(min-width: 1024px)").matches) return;
        const r = e.currentTarget.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width - 0.5;
        const ny = (e.clientY - r.top) / r.height - 0.5;
        mx.set(nx);
        my.set(ny);
        // saat kursor di atas foto orang, foto tidak ikut bergerak
        if (!photoFrozen.current) {
          pmx.set(nx);
          pmy.set(ny);
        }
      }}
      className="relative isolate flex flex-col overflow-hidden bg-[radial-gradient(ellipse_at_top,#0A0A6B_0%,#02020F_55%)]"
      style={{ minHeight: "100svh" }}
    >
      <style>{heroCss}</style>

      {/* latar */}
      <motion.div aria-hidden style={{ backgroundImage: cursorGlow }} className="pointer-events-none absolute inset-0 -z-10" />
      {status === "ready" && lines[0] && (
        <motion.span
          aria-hidden
          style={{
            y: bgY,
            opacity: bgOpacity,
            position: "absolute",
            left: 0,
            right: 0,
            top: "20%",
            zIndex: -10,
            textAlign: "center",
            lineHeight: 1,
            fontWeight: 700,
            fontSize: "clamp(8rem,22vw,22rem)",
            color: "rgba(79,70,229,0.45)",
            filter: "blur(22px)",
          }}
          className={`${mono.className} pointer-events-none select-none`}
        >
          {lines[0].text}
        </motion.span>
      )}

      <div className="hero-inner">
        <div className="hero-grid">
          {/* ---------- nama ---------- */}
          <motion.div style={{ y: textY }} className="hero-side">
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: EASE }}
              className={`${mono.className} hero-hello italic text-white/90`}
            >
              Hello, I’am
            </motion.p>

            {status === "loading" && <NameSkeleton />}

            {(status === "error" || status === "empty") && (
              <p role="status" className="hero-tagline">
                {status === "error" ? "Data hero gagal dimuat." : "Data hero belum diisi."}
              </p>
            )}

            {status === "ready" && (
              <>
                <h1 className={`${mono.className} hero-name mt-1 font-bold`}>
                  {lines.map((l, i) => (
                    <SplitLine
                      key={`${i}-${l.text}`}
                      text={l.text}
                      delay={0.15 + i * 0.3}
                      className={l.accent ? "text-[#FFC857]" : undefined}
                    />
                  ))}
                </h1>
                {deskripsi && (
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 1.0 }}
                    className="hero-tagline"
                  >
                    {deskripsi}
                  </motion.p>
                )}
              </>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.2 }}
              style={{ marginTop: "1.5rem" }}
            >
              <Magnetic>
                <Link
                  href="/projects"
                  className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-[#6C63FF] px-7 py-3.5 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <span aria-hidden className="absolute inset-0 -translate-x-full bg-[#FFC857] transition-transform duration-500 ease-out group-hover:translate-x-0 group-active:translate-x-0" />
                  <span className="relative z-10 transition-colors duration-500 group-hover:text-black group-active:text-black">My Projects</span>
                  <Icon name="arrow" className="relative z-10 h-4 w-4 transition-all duration-500 group-hover:translate-x-1 group-hover:text-black" />
                </Link>
              </Magnetic>
            </motion.div>
          </motion.div>

          {/* ---------- foto ---------- */}
          <div className="hero-photo">
            <motion.div
              aria-hidden
              style={{
                position: "absolute",
                inset: "14%",
                borderRadius: "9999px",
                background: "rgba(108,99,255,0.45)",
                filter: "blur(56px)",
              }}
              animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0.85, 0.5] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            />

            {status === "ready" && photoSrc && (
              <motion.div
                style={{ x: photoX, y: photoY, scale: photoScale, zIndex: 2 }}
                className="absolute inset-0 origin-bottom"
                onPointerEnter={() => {
                  // disorot → foto langsung diam di posisinya
                  photoFrozen.current = true;
                  spx.stop();
                  spy.stop();
                }}
                onPointerLeave={() => {
                  photoFrozen.current = false;
                }}
              >
                <motion.div
                  className="absolute inset-0"
                  initial={{ clipPath: "circle(0% at 50% 100%)", y: 60 }}
                  animate={{ clipPath: "circle(150% at 50% 100%)", y: 0 }}
                  transition={{ duration: 1.4, delay: 0.2, ease: EASE }}
                >
                  <Image
                    key={photoSrc}
                    src={photoSrc}
                    alt={`Foto profesional ${nama}`}
                    fill
                    priority
                    sizes="(min-width:1024px) 520px, 100vw"
                    // foto dari Supabase Storage dilewati dari optimizer, jadi tidak perlu mengatur remotePatterns
                    unoptimized={photoSrc.startsWith("http")}
                    onError={() => setPhotoSrc(null)}
                    className="object-contain object-bottom"
                  />
                </motion.div>
              </motion.div>
            )}

            {/* pudar ke latar di bawah foto (mobile) agar nama terbaca */}
            <div aria-hidden className="hero-fade hero-hide-lg" />

            {/* 4 ikon: kiri atas, kiri bawah, kanan atas, kanan bawah (simetris) */}
            <Float sx={sx} sy={sy} depth={22} delay={0} item={heroIcons[0]} cls="hero-fl-kb" rot={-8} />
            <Float sx={sx} sy={sy} depth={22} delay={0.3} item={heroIcons[1]} cls="hero-fl-pal" rot={8} />
            <Float sx={sx} sy={sy} depth={22} delay={0.6} item={heroIcons[2]} cls="hero-fl-cam" rot={-8} />
            <Float sx={sx} sy={sy} depth={22} delay={0.9} item={heroIcons[3]} cls="hero-fl-gfx" rot={8} />
          </div>

          {/* ---------- role ---------- */}
          <ul className="hero-roles">
            {roles.map((r, i) => (
              <motion.li
                key={r.label}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", stiffness: 120, damping: 16, delay: 1.2 + i * 0.15 }}
              >
                <Link
                  href={r.href}
                  className="hero-role-card group relative overflow-hidden rounded-xl bg-[#2B2B2B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6C63FF]"
                >
                  <span
                    aria-hidden
                    className="absolute inset-0 origin-left scale-x-0 transition-transform duration-500 ease-out group-hover:scale-x-100 group-active:scale-x-100"
                    style={{ backgroundColor: r.color }}
                  />
                  <span
                    aria-hidden
                    className="hero-sheen hero-hide-lg absolute inset-y-0 left-0 w-1/4 bg-white/10"
                    style={{ animationDelay: `${i * 0.9}s` }}
                  />
                  <span
                    className="hero-role-ico relative grid shrink-0 place-items-center rounded-lg text-black transition-transform duration-500 group-hover:-rotate-12 group-hover:scale-110"
                    style={{ backgroundColor: r.color }}
                  >
                    {typeof r.icon === "string" ? (
                      <Icon name={r.icon} className="h-6 w-6" />
                    ) : (
                      <r.icon aria-hidden className="h-6 w-6" />
                    )}
                  </span>
                  <span
                    className={`${mono.className} hero-role-label relative font-semibold transition-colors duration-500 group-hover:[color:var(--hc)] group-active:[color:var(--hc)]`}
                    style={{ "--hc": r.text } as CSSProperties}
                  >
                    {r.label}
                  </span>
                  <Icon
                    name="arrow"
                    className="hero-show-lg relative h-5 w-5 -translate-x-3 opacity-0 transition-all duration-500 group-hover:translate-x-0 group-hover:opacity-100"
                  />
                </Link>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>

      {/* ---------- pita berjalan (mobile / tablet) ---------- */}
      <div
        aria-hidden
        className="hero-hide-lg mt-6 overflow-hidden border-y border-white/10 bg-black/30 py-3 [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]"
      >
        <div className="hero-mq">
          {bandItems.map((r, i) => (
            <span key={i} className={`${mono.className} mr-8 shrink-0 text-sm uppercase tracking-widest text-white/70`}>
              {r.label} <span className="ml-8 text-[#FFC857]">✦</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}