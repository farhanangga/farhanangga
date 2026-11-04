"use client";

import { motion } from "framer-motion";
import { marqueeTools, toolGroups } from "../lib/data";
import { mono } from "./fonts";
import { EASE, Heading, Tilt } from "./ui";

function Marquee({ reverse = false }: { reverse?: boolean }) {
  const items = [...marqueeTools, ...marqueeTools];
  return (
    <div className="marquee overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]">
      <div className={`marquee-track ${reverse ? "marquee-rev" : ""}`}>
        {items.map((t, i) => (
          <span key={i} className={`${mono.className} mr-3 shrink-0 rounded-xl bg-[#2B2B2B] px-6 py-3 text-lg font-medium transition-colors hover:bg-[#6C63FF]`}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Tools() {
  return (
    <section className="pb-28">
      <style>{`
        .marquee-track{display:flex;width:max-content;animation:mq 35s linear infinite}
        .marquee-rev{animation-direction:reverse;animation-duration:42s}
        .marquee:hover .marquee-track{animation-play-state:paused}
        @keyframes mq{to{transform:translateX(-50%)}}
        @media (prefers-reduced-motion:reduce){.marquee-track{animation:none}}
      `}</style>
      <div className="mx-auto max-w-[1200px] px-6 sm:px-10"><Heading>Tools yang saya kuasai</Heading></div>

      <div className="mt-10 space-y-3">
        <Marquee />
        <Marquee reverse />
      </div>

      <div className="mx-auto mt-12 grid max-w-[1200px] gap-4 px-6 sm:grid-cols-2 sm:px-10">
        {toolGroups.map((g, gi) => (
          <motion.div
            key={g.title}
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.7, delay: gi * 0.1, ease: EASE }}
          >
            <Tilt className="h-full overflow-hidden rounded-xl bg-[#14142B] p-6">
              <h3 className={`${mono.className} mb-4 text-lg font-semibold`}>{g.title}</h3>
              <ul className="flex flex-wrap gap-2">
                {g.items.map((t) => (
                  <motion.li
                    key={t}
                    whileHover={{ scale: 1.12, y: -3, backgroundColor: "#FFC857", color: "#000" }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    className="cursor-default rounded-full bg-white/10 px-3 py-1 text-sm"
                  >
                    {t}
                  </motion.li>
                ))}
              </ul>
            </Tilt>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
