"use client";

import { useCallback, useState, type FormEvent, type ReactNode } from "react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useMotionTemplate,
  useMotionValue,
  useTransform,
  type Variants,
} from "framer-motion";
import { ArrowUpRight, Check, Copy, MapPin, Send } from "lucide-react";
import { FaGithub, FaInstagram, FaLinkedin } from "react-icons/fa6";
import type { ContactData, ContactIcon, ContactItem } from "../../lib/data";
import { mono } from "../fonts";
import { EASE, Tilt } from "../ui";
import { themeOf } from "@/components/projects/projectModal";

/* ───────────── Konfigurasi ───────────── */

const ICONS: Record<ContactIcon, (props: { size?: number }) => ReactNode> = {
  linkedin: (p) => <FaLinkedin {...p} />,
  github: (p) => <FaGithub {...p} />,
  instagram: (p) => <FaInstagram {...p} />,
};

const TITLE_WORDS = ["My","Contacts"];

const wordsParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};
const wordV: Variants = {
  hidden: { y: "115%" },
  show: { y: 0, transition: { duration: 0.8, ease: EASE } },
};

/** Posisi kursor 0..1 untuk efek cahaya yang mengikuti mouse */
function useSpotlight(rgb: string, radius: number, alpha: number) {
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const gx = useTransform(mx, (v) => `${v * 100}%`);
  const gy = useTransform(my, (v) => `${v * 100}%`);
  const glow = useMotionTemplate`radial-gradient(${radius}px circle at ${gx} ${gy}, rgba(${rgb},${alpha}), transparent 65%)`;
  const handlers = {
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      if (e.pointerType !== "mouse") return;
      const r = e.currentTarget.getBoundingClientRect();
      mx.set((e.clientX - r.left) / r.width);
      my.set((e.clientY - r.top) / r.height);
    },
    onPointerLeave: () => {
      mx.set(0.5);
      my.set(0.5);
    },
  };
  return { glow, handlers };
}

/* ───────────── Card kanal ───────────── */

const cardParent: Variants = { rest: {}, hover: {} };
const iconV: Variants = {
  rest: { rotate: 0, scale: 1 },
  hover: { rotate: [0, -14, 14, 0], scale: 1.12, transition: { duration: 0.6, ease: EASE } },
};

function LinkCard({ item, index }: { item: ContactItem; index: number }) {
  const th = themeOf(null);
  const { glow, handlers } = useSpotlight(th.rgb, 280, 0.22);

  const arrowV: Variants = {
    rest: { rotate: 0, backgroundColor: "rgba(255,255,255,0.08)", color: "#FFFFFF" },
    hover: {
      rotate: 45,
      backgroundColor: th.hex,
      color: th.ink,
      transition: { duration: 0.35, ease: EASE },
    },
  };

  return (
    <motion.li
      initial={{ opacity: 0, y: 32, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.7, ease: EASE, delay: index * 0.1 }}
      className="h-full"
    >
      <motion.div
        className="h-full"
        variants={cardParent}
        initial="rest"
        animate="rest"
        whileHover="hover"
        whileTap={{ scale: 0.985 }}
        {...handlers}
      >
        <Tilt className="h-full overflow-hidden rounded-xl bg-[#14142B]">
          <a
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${item.platform}: ${item.handle} (buka di tab baru)`}
            className="group relative flex h-full min-h-[210px] flex-col p-5 outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:p-6"
          >
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{ background: glow }}
            />

            <motion.span
              variants={iconV}
              className="relative grid h-12 w-12 place-items-center rounded-full"
              style={{ background: `rgba(${th.rgb},0.14)`, color: th.hex }}
            >
              {ICONS[item.icon]({ size: 22 })}
            </motion.span>

            <span className="relative mt-5 text-xl font-semibold leading-snug">{item.platform}</span>
            <span
              className={`${mono.className} relative mt-1 break-all text-sm`}
              style={{ color: th.hex }}
            >
              {item.handle}
            </span>
            <span className="relative mt-3 text-sm leading-relaxed text-white/65">{item.desc}</span>

            <span className="relative mt-auto flex items-center justify-between border-t border-white/10 pt-4 text-sm">
              <span className="text-white/60">Buka profil</span>
              <motion.span variants={arrowV} className="grid h-9 w-9 place-items-center rounded-full">
                <ArrowUpRight size={17} />
              </motion.span>
            </span>
          </a>
        </Tilt>
      </motion.div>
    </motion.li>
  );
}

/* ───────────── Salin email ───────────── */

function CopyEmail({ email }: { email: string }) {
  const th = themeOf(null);
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard diblokir: alamat tetap bisa diklik untuk membuka aplikasi email
    }
  }, [email]);

  return (
    <div className="flex flex-col items-start gap-4 sm:flex-row sm:flex-wrap sm:items-center">
      <a
        href={`mailto:${email}`}
        className={`${mono.className} break-all text-base underline decoration-white/25 underline-offset-4 outline-none transition-colors hover:decoration-white focus-visible:ring-2 focus-visible:ring-white/70 min-[420px]:text-lg sm:text-2xl lg:text-3xl`}
      >
        {email}
      </a>
      <motion.button
        type="button"
        onClick={copy}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.95 }}
        className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/70"
        style={copied ? { color: th.hex, borderColor: th.hex } : undefined}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={copied ? "ok" : "copy"}
            initial={{ opacity: 0, scale: 0.5, rotate: -45 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.18 }}
            className="grid place-items-center"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
          </motion.span>
        </AnimatePresence>
        <span aria-live="polite">{copied ? "Tersalin" : "Salin email"}</span>
      </motion.button>
    </div>
  );
}

/* ───────────── Form: membuka aplikasi email ───────────── */

function MessageForm({ email }: { email: string }) {
  const th = themeOf(null);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [opened, setOpened] = useState(false);

  const send = (e: FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Halo Farhan, saya ${name.trim()}`);
    const body = encodeURIComponent(message.trim());
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    setOpened(true);
    setTimeout(() => setOpened(false), 3000);
  };

  const field =
    "w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition-all duration-300 placeholder:text-white/35 focus:border-white/40 focus:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-white/50";

  return (
    <form onSubmit={send} className="h-full rounded-xl bg-[#14142B] p-5 sm:p-7">
      <h2 className="text-xl font-semibold sm:text-2xl">Tulis pesan</h2>
      <p className="mt-1 text-sm text-white/60">
        Pesan akan dibuka di aplikasi email Anda, lalu tinggal dikirim.
      </p>

      <label htmlFor="contact-name" className="mt-6 block text-sm text-white/70">
        Nama Anda
      </label>
      <input
        id="contact-name"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoComplete="name"
        placeholder="Nama lengkap"
        className={`${field} mt-1.5`}
      />

      <label htmlFor="contact-message" className="mt-4 block text-sm text-white/70">
        Pesan
      </label>
      <textarea
        id="contact-message"
        required
        rows={6}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Ceritakan singkat proyek atau pertanyaan Anda"
        className={`${field} mt-1.5 resize-y`}
      />

      <motion.button
        type="submit"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="relative mt-6 inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-full px-6 py-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:w-auto"
        style={{ background: th.hex, color: th.ink }}
      >
        {/* kilau yang lewat saat hover */}
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/40 to-transparent"
          initial={{ x: "-160%" }}
          whileHover={{ x: "460%", transition: { duration: 0.8, ease: EASE } }}
        />
        <span className="relative inline-flex items-center gap-2" aria-live="polite">
          {opened ? <Check size={16} /> : <Send size={16} />}
          {opened ? "Membuka aplikasi email" : "Buka di aplikasi email"}
        </span>
      </motion.button>
    </form>
  );
}

/* ───────────── Halaman ───────────── */

/** Data datang dari API (/api/contacts) lewat app/contacts/page.tsx */
export function ContactClient({ data }: { data: ContactData }) {
  const theme = themeOf(null);
  const emailFx = useSpotlight(theme.rgb, 420, 0.18);

  return (
    <MotionConfig reducedMotion="user">
      <section className="relative overflow-hidden">
        {/* dot grid + blob cahaya */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)",
            backgroundSize: "26px 26px",
            maskImage: "radial-gradient(ellipse 75% 45% at 50% 20%, black, transparent)",
            WebkitMaskImage: "radial-gradient(ellipse 75% 45% at 50% 20%, black, transparent)",
          }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -left-32 top-24 h-[300px] w-[300px] rounded-full opacity-25 blur-[110px] sm:h-[380px] sm:w-[380px] sm:blur-[120px]"
          style={{ backgroundColor: theme.hex }}
          animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -right-32 top-[45%] h-[280px] w-[280px] rounded-full opacity-15 blur-[110px] sm:h-[340px] sm:w-[340px] sm:blur-[120px]"
          style={{ backgroundColor: theme.hex }}
          animate={{ x: [0, -40, 0], y: [0, -40, 0] }}
          transition={{ duration: 17, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative mx-auto max-w-[1200px] px-5 pb-20 pt-28 sm:px-10 sm:pb-28 sm:pt-40">
          {/* judul */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className={`${mono.className} text-sm text-white/50`}
          >
            Portofolio <span className="text-white/25">/</span>{" "}
            <span style={{ color: theme.hex }}>Kontak</span>
          </motion.p>

          <div className="relative">
            <motion.h1
              variants={wordsParent}
              initial="hidden"
              animate="show"
              className={`${mono.className} mt-3 flex flex-wrap gap-x-4 text-4xl font-bold leading-[1.05] sm:gap-x-6 sm:text-6xl lg:text-7xl`}
            >
              {TITLE_WORDS.map((w) => (
                <span key={w} className="overflow-hidden pb-2">
                  <motion.span variants={wordV} className="block">
                    {w}
                  </motion.span>
                </span>
              ))}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35, ease: EASE }}
              className="mt-4 max-w-[52ch] leading-relaxed text-white/70"
            >
              Punya proyek, tawaran kerja, atau pertanyaan? Kirim email atau hubungi lewat kanal di
              bawah.
            </motion.p>

            {/* simbol @ outline raksasa, melayang pelan */}
            <motion.span
              aria-hidden
              className={`${mono.className} pointer-events-none absolute -top-4 right-0 hidden select-none text-[10rem] font-black leading-none md:block`}
              style={{ color: "transparent", WebkitTextStroke: `1px rgba(${theme.rgb},0.3)` }}
              initial={{ opacity: 0, scale: 0.8, rotate: -8 }}
              animate={{ opacity: 1, scale: 1, rotate: 0, y: [0, -12, 0] }}
              transition={{
                opacity: { duration: 0.8, delay: 0.4 },
                scale: { duration: 0.8, delay: 0.4, ease: EASE },
                rotate: { duration: 0.8, delay: 0.4, ease: EASE },
                y: { duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1.2 },
              }}
            >
              @
            </motion.span>
          </div>

          {/* email utama */}
          <motion.div
            initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.7, delay: 0.45, ease: EASE }}
            className="group relative mt-10 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-5 sm:mt-12 sm:p-7"
            {...emailFx.handlers}
          >
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{ background: emailFx.glow }}
            />
            <div className="relative">
              <p className="text-sm text-white/50">Email</p>
              <div className="mt-2">
                <CopyEmail email={data.email} />
              </div>
              <div className="mt-5 flex flex-col gap-2 text-sm text-white/60 sm:flex-row sm:items-center sm:gap-6">
                <span className="inline-flex items-center gap-2">
                  <MapPin size={15} style={{ color: theme.hex }} /> {data.location}
                </span>
                {data.availability && (
                  <span className="inline-flex items-center gap-2">
                    <span className="relative grid h-2.5 w-2.5 place-items-center" aria-hidden>
                      <motion.span
                        className="absolute inset-0 rounded-full"
                        style={{ background: theme.hex }}
                        animate={{ scale: [1, 2.6], opacity: [0.6, 0] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                      />
                      <span className="h-2 w-2 rounded-full" style={{ background: theme.hex }} />
                    </span>
                    {data.availability}
                  </span>
                )}
              </div>
            </div>
          </motion.div>

          {/* kanal + form */}
          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.1fr]">
            {data.links.length > 0 ? (
              <ul className="grid gap-5 sm:grid-cols-2 sm:max-lg:[&>li:last-child:nth-child(odd)]:col-span-2 lg:grid-cols-1 xl:grid-cols-2 xl:[&>li:last-child:nth-child(odd)]:col-span-2">
                {data.links.map((item, i) => (
                  <LinkCard key={item.platform} item={item} index={i} />
                ))}
              </ul>
            ) : (
              <div className="rounded-xl bg-[#14142B] px-6 py-14 text-center text-white/60">
                Belum ada kanal lain. Silakan gunakan email di atas.
              </div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.7, ease: EASE }}
            >
              <MessageForm email={data.email} />
            </motion.div>
          </div>
        </div>
      </section>
    </MotionConfig>
  );
}