"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { motion, MotionConfig, type Variants } from "framer-motion";
import { Lock } from "lucide-react";
import { contacts, navLinks } from "../../lib/data";
import { mono } from "../fonts";
import { EASE, Icon } from "../ui";

/* ---------------------------- Hamburger icon ---------------------------- */
function Burger({ open }: { open: boolean }) {
  const t = { duration: 0.45, ease: EASE };
  const bar = "absolute left-0 block h-[2px] w-6 rounded-full bg-white";
  return (
    <span className="relative block h-[18px] w-6" aria-hidden>
      <motion.span className={`${bar} top-0`} animate={open ? { y: 8, rotate: 45 } : { y: 0, rotate: 0 }} transition={t} />
      <motion.span
        className={`${bar} top-[8px] origin-right`}
        animate={open ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
        transition={t}
      />
      <motion.span className={`${bar} top-4`} animate={open ? { y: -8, rotate: -45 } : { y: 0, rotate: 0 }} transition={t} />
    </span>
  );
}

/* ------------------------------- Variants ------------------------------- */
/* All of them use the "open" / "closed" state inherited from the panel. */
const curtainV: Variants = {
  closed: {
    y: "-100%",
    transition: { duration: 0.7, delay: 0.08, ease: EASE },
    transitionEnd: { visibility: "hidden" },
  },
  open: { y: 0, visibility: "visible", transition: { duration: 0.7, ease: EASE } },
};

const panelV: Variants = {
  closed: {
    y: "-100%",
    transition: { duration: 0.6, ease: EASE },
    transitionEnd: { visibility: "hidden" },
  },
  open: { y: 0, visibility: "visible", transition: { duration: 0.7, delay: 0.1, ease: EASE } },
};

const group: Variants = {
  closed: { transition: { staggerChildren: 0.03, staggerDirection: -1 } },
  open: { transition: { staggerChildren: 0.08, delayChildren: 0.4 } },
};

const item: Variants = {
  closed: { y: 20, opacity: 0, filter: "blur(10px)", transition: { duration: 0.2 } },
  open: { y: 0, opacity: 1, filter: "blur(0px)", transition: { duration: 0.7, ease: EASE } },
};

/* -------------------------------- Navbar -------------------------------- */
function NavbarInner() {
  const [hovered, setHovered] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const search = useSearchParams();
  const role = search.get("role");

  /**
   * Active link: the path must match. If the href has ?role=..., the role in the
   * URL must match too. If the href has no query, the URL must not have ?role.
   */
  const isActive = (href: string) => {
    const [path, qs] = href.split("?");
    if (path !== pathname) return false;
    const want = new URLSearchParams(qs ?? "").get("role");
    return want ? want === role : !role;
  };

  // close the menu when navigating to another page / changing the filter
  useEffect(() => {
    setOpen(false);
  }, [pathname, role]);

  // lock scroll, close with Escape, close automatically when the screen widens to desktop
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onResize = () => {
      if (window.innerWidth >= 768) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  return (
    <MotionConfig reducedMotion="user">
      <motion.header
        initial={{ y: -90, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.9, ease: EASE }}
        className="fixed inset-x-0 top-0 z-[9999] px-4 pt-4 sm:px-8 sm:pt-6"
      >
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 max-md:rounded-full max-md:border max-md:border-white/10 max-md:bg-black/50 max-md:py-1.5 max-md:pl-6 max-md:pr-1.5 max-md:backdrop-blur-md">
          {/* logo: the file is at public/assets/icon.png */}
          <Link
            href="/"
            aria-label="Home"
            className="block shrink-0 transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6C63FF]"
          >
            <Image
              src="/assets/icon.png"
              alt="FA logo"
              width={44}
              height={44}
              priority
              className="h-9 w-9 object-contain sm:h-11 sm:w-11"
            />
          </Link>

          {/* ---------------- Desktop nav ---------------- */}
          <nav
            aria-label="Main navigation"
            onMouseLeave={() => setHovered(null)}
            className="hidden items-center rounded-full border border-white/10 bg-black/50 p-1.5 backdrop-blur-md md:flex"
          >
            {navLinks.map((l) => {
              const showPill = !l.locked && (hovered === l.label || (hovered === null && isActive(l.href)));
              return (
                <motion.div key={l.label} whileHover={l.locked ? { x: [0, -3, 3, -3, 0] } : undefined} transition={{ duration: 0.35 }}>
                  <Link
                    href={l.locked ? "#" : l.href}
                    aria-disabled={l.locked}
                    aria-current={!l.locked && isActive(l.href) ? "page" : undefined}
                    title={l.locked ? "This page is not available yet" : undefined}
                    onClick={(e) => {
                      if (l.locked) e.preventDefault(); // don't jump to the top of the page
                    }}
                    onMouseEnter={() => setHovered(l.label)}
                    className={`relative flex items-center gap-1.5 rounded-full px-6 py-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6C63FF] ${
                      l.locked ? "cursor-not-allowed text-white/40" : "text-white"
                    }`}
                  >
                    {showPill && (
                      <motion.span
                        layoutId="nav-pill"
                        className="absolute inset-0 rounded-full bg-[#6C63FF]"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">{l.label}</span>
                    {l.locked && <Lock className="relative z-10 h-3.5 w-3.5" aria-hidden />}
                  </Link>
                </motion.div>
              );
            })}
          </nav>

          {/* ---------------- Contacts (desktop only) ---------------- */}
          <div className="hidden items-center gap-1 rounded-full border border-white/10 bg-black/50 p-1.5 backdrop-blur-md md:flex">
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

          {/* ---------------- Hamburger (mobile only) ---------------- */}
          <motion.button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((o) => !o)}
            whileTap={{ scale: 0.88 }}
            animate={{ backgroundColor: open ? "rgba(108,99,255,1)" : "rgba(108,99,255,0)" }}
            transition={{ duration: 0.4 }}
            className="grid h-11 w-11 place-items-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6C63FF] md:hidden"
          >
            <Burger open={open} />
          </motion.button>
        </div>
      </motion.header>

      {/* ---------------- Mobile menu ----------------
          Always mounted (no AnimatePresence). A single `open` state drives
          everything, so rapid open/close stays consistent. */}
      <motion.div
        aria-hidden
        variants={curtainV}
        initial="closed"
        animate={open ? "open" : "closed"}
        className="invisible fixed inset-x-0 top-0 z-[9997] h-dvh rounded-b-[2rem] bg-[#6C63FF] md:hidden"
      />

      <motion.aside
        id="mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        aria-hidden={!open}
        variants={panelV}
        initial="closed"
        animate={open ? "open" : "closed"}
        className="invisible fixed inset-x-0 top-0 z-[9998] flex h-[calc(100dvh-0.75rem)] flex-col overflow-y-auto overflow-x-hidden rounded-b-[2rem] bg-[#0B0B16] px-6 pb-8 pt-28 md:hidden"
      >
        {/* glow decorations */}
        <div aria-hidden className="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-[#6C63FF]/30 blur-[90px]" />
        <div aria-hidden className="pointer-events-none absolute -left-24 bottom-10 h-64 w-64 rounded-full bg-[#FFC857]/10 blur-[90px]" />

        <motion.p
          variants={item}
          className={`${mono.className} relative mb-2 text-xs uppercase tracking-[0.25em] text-white/40`}
        >
          Menu
        </motion.p>

        <motion.ul variants={group} className="relative">
          {navLinks.map((l, i) => {
            const active = !l.locked && isActive(l.href);
            return (
              <motion.li key={l.label} variants={item} className="border-b border-white/10">
                <Link
                  href={l.locked ? "#" : l.href}
                  aria-disabled={l.locked}
                  aria-current={active ? "page" : undefined}
                  onClick={(e) => {
                    if (l.locked) e.preventDefault();
                    else setOpen(false);
                  }}
                  className="group flex items-center gap-4 py-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6C63FF]"
                >
                  <span className={`${mono.className} w-7 text-xs text-[#6C63FF]`}>{String(i + 1).padStart(2, "0")}</span>

                  <motion.span
                    whileTap={l.locked ? { x: [0, -8, 8, -8, 0] } : { x: 8 }}
                    transition={{ duration: 0.35 }}
                    className={`flex-1 text-[2rem] font-bold leading-none tracking-tight ${
                      l.locked ? "text-white/30" : active ? "text-white" : "text-white/75"
                    }`}
                  >
                    {l.label}
                  </motion.span>

                  {l.locked ? (
                    <span className={`${mono.className} flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-white/40`}>
                      <Lock className="h-3 w-3" aria-hidden />
                      Soon
                    </span>
                  ) : active ? (
                    <span className="h-2.5 w-2.5 rounded-full bg-[#6C63FF] shadow-[0_0_14px_3px_#6C63FF]" />
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5 -translate-x-1 text-white/40 transition-transform group-active:translate-x-1"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  )}
                </Link>
              </motion.li>
            );
          })}
        </motion.ul>

        {/* contacts */}
        <motion.div variants={group} className="relative mt-auto pt-10">
          <motion.p variants={item} className={`${mono.className} mb-4 text-xs uppercase tracking-[0.25em] text-white/40`}>
            Find me on
          </motion.p>
          <div className="flex flex-wrap gap-3">
            {contacts.map((c) => (
              <motion.a
                key={c.platform}
                variants={item}
                href={c.href}
                target="_blank"
                rel="noreferrer"
                aria-label={c.platform}
                whileTap={{ scale: 0.88, backgroundColor: "#6C63FF" }}
                className="grid h-14 w-14 place-items-center rounded-full border border-white/10 bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6C63FF]"
              >
                <Icon name={c.icon} className="h-6 w-6" />
              </motion.a>
            ))}
          </div>
        </motion.div>
      </motion.aside>
    </MotionConfig>
  );
}

/** useSearchParams must be wrapped in Suspense. */
export function Navbar() {
  return (
    <Suspense fallback={null}>
      <NavbarInner />
    </Suspense>
  );
}