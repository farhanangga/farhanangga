"use client";

import { motion } from "framer-motion";
import { contacts, profile } from "../lib/data";
import { mono } from "./fonts";
import { EASE, Icon } from "./ui";

export function Footer() {
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
          <p className="text-sm text-white/50">© 2026 Farhan Angga Riyanto</p>
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
