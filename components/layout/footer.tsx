"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Mail, MapPin, MessageCircle } from "lucide-react";
import { contacts, navLinks, profile } from "@/lib/data";
import { mono } from "@/components/fonts";
import { EASE, Icon } from "@/components/ui";

/* ───────────── Pengaturan (sesuaikan) ───────────── */

// Nomor WhatsApp: pakai profile.phone jika ada di data, jika tidak pakai nilai di bawah.
// Format wa.me: kode negara tanpa "+" dan tanpa 0 di depan (contoh 62812xxxxxxx).
const WA_DIGITS = (
  (profile as { phone?: string }).phone ?? "6289515837340"
).replace(/\D/g, "");
const WA_DISPLAY = `+${WA_DIGITS.slice(0, 2)} ${WA_DIGITS.slice(2, 5)}-${WA_DIGITS.slice(
  5,
  9
)}-${WA_DIGITS.slice(9)}`;
const WA_HREF = `https://wa.me/${WA_DIGITS}?text=${encodeURIComponent(
  "Halo Angga, saya ingin berdiskusi tentang proyek."
)}`;

/* ───────────── Komponen kecil ───────────── */

const linkFocus =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6C63FF]";

function ColTitle({ children }: { children: string }) {
  return (
    <h3 className={`${mono.className} mb-4 text-xs uppercase tracking-[0.2em] text-[#FFC857]`}>
      {children}
    </h3>
  );
}

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" },
  transition: { duration: 0.7, delay, ease: EASE },
});

/* ───────────── Footer ───────────── */

export function Footer() {
  const words = "Mari bekerja sama".split(" ");

  return (
    <footer className="relative overflow-hidden border-t border-white/10">
      {/* cahaya latar */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 left-1/2 h-[320px] w-[520px] -translate-x-1/2 rounded-full bg-[#6C63FF]/15 blur-[120px]"
      />

      <div className="relative mx-auto max-w-[1200px] px-5 pb-8 pt-16 sm:px-10 sm:pt-20">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr_1fr] lg:gap-10">
          {/* ── Kolom 1: ajakan ── */}
          <div>
            <h2
              className={`${mono.className} mt-5 text-4xl font-bold leading-[1.1] sm:text-5xl lg:text-6xl`}
              aria-label="Mari bekerja sama"
            >
              {words.map((w, wi) => (
                <span key={wi} aria-hidden className="mr-[0.25em] inline-block whitespace-nowrap">
                  {w.split("").map((c, ci) => (
                    <motion.span
                      key={ci}
                      className="inline-block"
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: (wi * 6 + ci) * 0.03, ease: EASE }}
                      whileHover={{
                        y: -10,
                        color: "#FFC857",
                        transition: { type: "spring", stiffness: 500, damping: 12 },
                      }}
                    >
                      {c}
                    </motion.span>
                  ))}
                </span>
              ))}
            </h2>

            <motion.p
              {...fade(0.1)}
              className="mt-5 max-w-md text-sm leading-relaxed text-white/60 sm:text-base"
            >
              Punya ide website, aplikasi, atau desain antarmuka? Ceritakan kebutuhan Anda, saya
              siap membantu mewujudkannya.
            </motion.p>

            <motion.div {...fade(0.2)} className="mt-7 flex flex-col gap-3 sm:flex-row">
              <a
                href={WA_HREF}
                target="_blank"
                rel="noreferrer"
                className={`group inline-flex items-center justify-center gap-2 rounded-full bg-[#6C63FF] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#6C63FF]/30 transition hover:bg-[#7f77ff] ${linkFocus}`}
              >
                <MessageCircle size={18} />
                Chat via WhatsApp
                <ArrowUpRight
                  size={16}
                  className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </a>
              <a
                href={`mailto:${profile.email}`}
                className={`inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-6 py-3 text-sm font-semibold text-white/90 transition hover:border-[#FFC857]/60 hover:text-[#FFC857] ${linkFocus}`}
              >
                <Mail size={18} />
                Kirim email
              </a>
            </motion.div>
          </div>

          {/* ── Kolom 2 & 3 ── */}
          <div className="grid gap-10 sm:grid-cols-2 lg:contents">
            {/* navigasi (dari navLinks di lib/data.ts) */}
            <motion.nav {...fade(0.1)} aria-label="Navigasi footer">
              <ColTitle>Navigasi</ColTitle>
              <ul className="space-y-1">
                {navLinks.map((n) => (
                  <li key={n.href}>
                    {n.locked ? (
                      <span
                        aria-disabled="true"
                        className="flex cursor-not-allowed items-center justify-between rounded-lg border-b border-white/5 py-2.5 text-white/30"
                      >
                        <span>{n.label}</span>
                        <span
                          className={`${mono.className} rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/40`}
                        >
                          Segera
                        </span>
                      </span>
                    ) : (
                      <Link
                        href={n.href}
                        className={`group flex items-center justify-between rounded-lg border-b border-white/5 py-2.5 text-white/70 transition hover:text-white ${linkFocus}`}
                      >
                        <span className="transition-transform group-hover:translate-x-1">
                          {n.label}
                        </span>
                        <ArrowUpRight
                          size={15}
                          className="text-white/30 transition group-hover:text-[#FFC857]"
                        />
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </motion.nav>

            {/* kontak */}
            <motion.div {...fade(0.2)}>
              <ColTitle>Kontak</ColTitle>
              <ul className="space-y-4 text-sm">
                <li>
                  <a
                    href={`mailto:${profile.email}`}
                    className={`group flex items-start gap-3 text-white/70 transition hover:text-white ${linkFocus}`}
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/5 text-[#FFC857]">
                      <Mail size={16} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs text-white/40">Email</span>
                      <span className="block break-all">{profile.email}</span>
                    </span>
                  </a>
                </li>
                <li>
                  <a
                    href={WA_HREF}
                    target="_blank"
                    rel="noreferrer"
                    className={`group flex items-start gap-3 text-white/70 transition hover:text-white ${linkFocus}`}
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/5 text-emerald-300">
                      <MessageCircle size={16} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs text-white/40">WhatsApp</span>
                      <span className={`${mono.className} block`}>{WA_DISPLAY}</span>
                    </span>
                  </a>
                </li>
                <li className="flex items-start gap-3 text-white/70">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/5 text-[#F25C5C]">
                    <MapPin size={16} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs text-white/40">Lokasi</span>
                    <span className="block">{profile.location}</span>
                  </span>
                </li>
              </ul>
            </motion.div>
          </div>
        </div>

        {/* ── Bar bawah ── */}
        <div className="mt-14 flex flex-col items-center gap-5 border-t border-white/10 pt-8 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="order-2 text-xs text-white/50 sm:order-1 sm:text-sm">
            © 2026 Farhan Angga Riyanto. Semua hak dilindungi.
          </p>

          <div className="order-1 flex gap-2 sm:order-2">
            {contacts.map((c, i) => (
              <motion.a
                key={c.platform}
                href={c.href}
                target="_blank"
                rel="noreferrer"
                aria-label={c.platform}
                whileHover={{ y: -5, rotate: i % 2 ? 10 : -10, backgroundColor: "#6C63FF" }}
                whileTap={{ scale: 0.9 }}
                className={`grid h-11 w-11 place-items-center rounded-full bg-white/5 ${linkFocus}`}
              >
                <Icon name={c.icon} className="h-5 w-5" />
              </motion.a>
            ))}
          </div>
        </div>
      </div>

      <motion.button
        type="button"
        aria-label="Kembali ke atas"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        whileHover={{ y: -4, scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        className="fixed bottom-5 right-5 z-50 grid h-12 w-12 place-items-center rounded-full bg-[#6C63FF] shadow-lg shadow-[#6C63FF]/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white sm:bottom-6 sm:right-6"
      >
        <Icon name="up" className="h-5 w-5" />
      </motion.button>
    </footer>
  );
}