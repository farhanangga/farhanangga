"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { contacts, navLinks } from "../lib/data";
import { mono } from "./fonts";
import { EASE, Icon } from "./ui";

export function Navbar() {
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
