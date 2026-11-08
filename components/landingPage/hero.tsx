"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type CSSProperties } from "react";
import {
  MotionValue,
  motion,
  useMotionTemplate,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { dummyPhoto, profile, roles } from "../../lib/data";
import { mono } from "../fonts";
import { EASE, Icon, Magnetic } from "../ui";

/* ------------------------------------------------------------------ */
/* GAMBAR HERO: ubah folder di sini kalau lokasi file-nya berbeda.     */
/* File ada di  public/assets/hero/  →  dipanggil sebagai  /assets/hero */
/* (jangan tulis "public" dan jangan pakai "@/").                      */
/* ------------------------------------------------------------------ */
const ASSET_DIR = "/assets/hero";
const PHOTO_SRC = `${ASSET_DIR}/person.png`;

const heroIcons = [
  { key: "keyboard", src: `${ASSET_DIR}/keyboard.png`, label: "Keyboard", fallback: "⌨️" },
  { key: "palette", src: `${ASSET_DIR}/palette.png`, label: "Palet warna", fallback: "🎨" },
  { key: "camera", src: `${ASSET_DIR}/camera.png`, label: "Kamera", fallback: "📷" },
];

type HeroIconData = (typeof heroIcons)[number];

/* ------------------------------------------------------------------ */
/* CSS khusus hero (tidak bergantung pada class Tailwind).              */
/*   < 1024px  : susunan poster → foto, nama menimpa bawah foto,        */
/*               tagline + tombol, 3 kartu role, pita berjalan.         */
/*   ≥ 1024px  : 3 kolom (nama | foto | role).                          */
/* ------------------------------------------------------------------ */
const heroCss = `
/* ---------- dasar (mobile & tablet) ---------- */
.hero-inner{display:flex;flex:1;width:100%;max-width:1600px;margin-inline:auto;padding:5.5rem 1.5rem 0}
.hero-grid{display:grid;width:100%;gap:1.5rem;align-content:start}
.hero-photo{order:1;position:relative;margin-inline:auto;aspect-ratio:4/5;width:min(100%,400px)}
.hero-side{order:2;position:relative;z-index:5;text-align:center;margin-top:calc(clamp(120px,40vw,190px) * -1)}
.hero-roles{order:3;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.65rem;padding-bottom:.5rem}
.hero-hello{font-size:clamp(1.25rem,4.6vw,1.75rem)}
.hero-name{font-size:clamp(2.75rem,15.5vw,5.75rem);line-height:.95}
.hero-tagline{max-width:40ch;margin:1.1rem auto 0;font-size:.95rem;line-height:1.6;color:rgba(255,255,255,.72)}
.hero-fl-kb{left:-3%;top:15%;width:31%}
.hero-fl-pal{right:-3%;top:25%;width:28%}
.hero-fl-cam{left:10%;bottom:43%;width:28%}
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
@keyframes heromq{to{transform:translateX(-50%)}}
@keyframes herosheen{0%{transform:translateX(-160%) skewX(-20deg)}55%,100%{transform:translateX(700%) skewX(-20deg)}}
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
  .hero-fl-kb{left:-9%;top:17%;width:32%}
  .hero-fl-pal{right:-7%;top:27%;width:29%}
  .hero-fl-cam{left:13%;bottom:24%;width:29%}
  .hero-roles{grid-template-columns:1fr;gap:1rem;padding-bottom:3svh;align-self:center}
  .hero-role-card{gap:1rem;padding:.75rem 1.25rem .75rem .75rem;transition:transform .3s}
  .hero-role-card:hover{transform:translateX(-.5rem)}
  .hero-role-ico{width:clamp(48px,4.2vw,64px);height:clamp(48px,4.2vw,64px)}
  .hero-role-label{flex:1 1 0%;font-size:clamp(.95rem,1.4vw,1.5rem);text-align:center}
}
@media (min-width:1536px){.hero-inner{padding-inline:3rem}}
@media (prefers-reduced-motion:reduce){.hero-mq,.hero-sheen{animation:none}}
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
          {c}
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
      <span role="img" aria-label={item.label} className="hero-ico-fluid grid place-items-center text-5xl">
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
        sizes="140px"
        onError={() => setFailed(true)}
        className="object-contain drop-shadow-[0_12px_24px_rgba(99,102,241,0.55)]"
      />
    </span>
  );
}

/**
 * Ikon melayang di DEPAN foto (mobile & desktop).
 * - bergerak pelan terus-menerus (naik-turun + goyang sedikit)
 * - saat di-hover / disentuh: membesar dan miring sedikit
 * - desktop: ikut bergeser sedikit mengikuti kursor (efek kedalaman)
 */
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
        whileHover={{ scale: 1.12, rotate: 8, y: -8 }}
        whileTap={{ scale: 1.08, rotate: -8 }}
        transition={{ type: "spring", stiffness: 300, damping: 14 }}
      >
        <motion.span
          className="block"
          initial={{ scale: 0, rotate: rot - 30 }}
          animate={{ scale: 1, rotate: [rot - 3, rot + 3, rot - 3], y: [0, -8, 0] }}
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

/* ------------------------------------------------------------------ */
/* HERO                                                                */
/* ------------------------------------------------------------------ */

export function Hero() {
  const [photoSrc, setPhotoSrc] = useState(PHOTO_SRC);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 15 });
  const sy = useSpring(my, { stiffness: 60, damping: 15 });
  const photoX = useTransform(sx, [-0.5, 0.5], [-16, 16]);
  const photoY = useTransform(sy, [-0.5, 0.5], [-10, 10]);

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
        mx.set((e.clientX - r.left) / r.width - 0.5);
        my.set((e.clientY - r.top) / r.height - 0.5);
      }}
      className="relative isolate flex flex-col overflow-hidden bg-[radial-gradient(ellipse_at_top,#0A0A6B_0%,#02020F_55%)]"
      style={{ minHeight: "100svh" }}
    >
      <style>{heroCss}</style>

      {/* latar */}
      <motion.div aria-hidden style={{ backgroundImage: cursorGlow }} className="pointer-events-none absolute inset-0 -z-10" />
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
        FARHAN
      </motion.span>

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
            <h1 className={`${mono.className} hero-name mt-1 font-bold`}>
              <SplitLine text={profile.firstName} delay={0.45} />
              <SplitLine text={profile.accent} delay={0.75} className="text-[#FFC857]" />
              <SplitLine text={profile.lastName} delay={1.0} />
            </h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.5 }}
              className="hero-tagline"
            >
              {profile.tagline}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.7 }}
              style={{ marginTop: "1.5rem" }}
            >
              <Magnetic>
                <Link
                  href="/apps"
                  className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-[#6C63FF] px-7 py-3.5 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <span aria-hidden className="absolute inset-0 -translate-x-full bg-[#FFC857] transition-transform duration-500 ease-out group-hover:translate-x-0 group-active:translate-x-0" />
                  <span className="relative z-10 transition-colors duration-500 group-hover:text-black group-active:text-black">Lihat proyek saya</span>
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
            <motion.div style={{ x: photoX, y: photoY, scale: photoScale, zIndex: 2 }} className="absolute inset-0 origin-bottom">
              <motion.div
                className="absolute inset-0"
                initial={{ clipPath: "circle(0% at 50% 100%)", y: 60 }}
                animate={{ clipPath: "circle(150% at 50% 100%)", y: 0 }}
                transition={{ duration: 1.4, delay: 0.2, ease: EASE }}
              >
                <Image
                  src={photoSrc}
                  alt="Foto profesional Farhan Angga Riyanto"
                  fill
                  priority
                  sizes="(min-width:1024px) 520px, 100vw"
                  onError={() => setPhotoSrc(dummyPhoto)}
                  className="object-contain object-bottom"
                />
              </motion.div>
            </motion.div>

            {/* pudar ke latar di bawah foto (mobile) agar nama terbaca */}
            <div aria-hidden className="hero-fade hero-hide-lg" />

            <Float sx={sx} sy={sy} depth={50} delay={0} item={heroIcons[0]} cls="hero-fl-kb" rot={-12} />
            <Float sx={sx} sy={sy} depth={35} delay={0.3} item={heroIcons[1]} cls="hero-fl-pal" rot={12} />
            <Float sx={sx} sy={sy} depth={60} delay={0.6} item={heroIcons[2]} cls="hero-fl-cam" rot={-6} />
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
                    <Icon name={r.icon} className="h-6 w-6" />
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