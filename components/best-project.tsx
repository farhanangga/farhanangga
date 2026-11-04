"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { bestProject, otherProjects } from "../lib/data";
import { mono } from "./fonts";
import { EASE, Heading, Icon, Tilt } from "./ui";

export function BestProject() {
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
