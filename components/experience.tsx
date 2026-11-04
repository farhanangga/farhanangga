"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useScroll, useSpring } from "framer-motion";
import { certs, experiences, orgs } from "../lib/data";
import { mono } from "./fonts";
import { EASE, Heading, Icon, Tilt } from "./ui";

export function Experience() {
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
