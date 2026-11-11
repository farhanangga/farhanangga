"use client";

import { MotionConfig, motion } from "framer-motion";
import { ACCENT, EASE, mono } from "./shared";

export function PageHeader({
  section,
  title,
  text,
}: {
  section: string;
  title: string;
  text: string;
}) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className={`${mono.className} text-sm text-white/50`}
      >
        Dashboard <span className="text-white/25">/</span>{" "}
        <span style={{ color: ACCENT.hex }}>{section}</span>
      </motion.p>
      <h1 className={`${mono.className} mt-3 overflow-hidden pb-2 text-3xl font-bold leading-[1.05] sm:text-5xl`}>
        <motion.span
          className="block"
          initial={{ y: "115%" }}
          animate={{ y: 0 }}
          transition={{ duration: 0.8, ease: EASE }}
        >
          {title}
        </motion.span>
      </h1>
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15, ease: EASE }}
        className="mt-3 max-w-[56ch] leading-relaxed text-white/70"
      >
        {text}
      </motion.p>
    </MotionConfig>
  );
}

/** Membungkus elemen agar muncul bertahap (fade + naik). */
export function Reveal({
  children,
  index = 0,
  className,
}: {
  children: React.ReactNode;
  index?: number;
  className?: string;
}) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: EASE, delay: 0.2 + Math.min(index, 8) * 0.05 }}
        className={className}
      >
        {children}
      </motion.div>
    </MotionConfig>
  );
}