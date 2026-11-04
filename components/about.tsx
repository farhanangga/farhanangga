"use client";

import { motion } from "framer-motion";
import { profile } from "../lib/data";
import { mono } from "./fonts";
import { CountUp, EASE, Heading, Tilt } from "@/components/ui";

export function About() {
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
