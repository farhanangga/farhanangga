"use client";

import { useEffect, useId } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, ChevronLeft, FolderKanban, LayoutDashboard, Mail, Settings, X } from "lucide-react";
import { ACCENT_GLOW, ACCENT_GRADIENT, Avatar, EASE, SIDEBAR_BG } from "./shared";
import { useShell } from "./shell";

const NAV = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/dashboard/projects", label: "Projects", Icon: FolderKanban },
  { href: "/dashboard/activities", label: "Activities", Icon: Activity },
  { href: "/dashboard/contact", label: "Contact", Icon: Mail },
  { href: "/dashboard/settings", label: "Settings", Icon: Settings },
];

/* teks memudar saat sidebar menciut; muncul sedikit terlambat saat melebar */
const fade = (collapsed: boolean) =>
  `whitespace-nowrap transition-opacity duration-200 ${collapsed ? "opacity-0" : "opacity-100 delay-150"}`;

/* ── brand ─────────────────────────────────────────────── */
function Brand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="grid h-6 w-6 shrink-0 place-items-center rounded-md"
        style={{ background: ACCENT_GRADIENT, boxShadow: ACCENT_GLOW }}
      >
        <span className="h-2.5 w-2.5 rounded-[3px] bg-[#1B1B1F]" />
      </span>
      <p className={`text-[15px] font-bold tracking-tight text-white ${fade(collapsed)}`}>
        Portofolio <span className="font-medium text-white/40">Admin</span>
      </p>
    </div>
  );
}

/* ── nav ───────────────────────────────────────────────── */
function NavList({
  pathname,
  collapsed = false,
  onNavigate,
}: {
  pathname: string;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const uid = useId();
  return (
    <nav aria-label="Menu dashboard" className="mt-9 flex flex-col gap-1.5">
      {NAV.map(({ href, label, Icon }) => {
        const on = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={on ? "page" : undefined}
            aria-label={label}
            title={collapsed ? label : undefined}
            className={`relative z-0 flex h-12 items-center gap-3.5 rounded-xl px-4 text-[15px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/60 ${
              on ? "text-white" : "text-white/70 hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            {on && (
              <motion.span
                layoutId={`nav-pill-${uid}`}
                transition={{ type: "spring", stiffness: 380, damping: 34 }}
                className="absolute inset-0 -z-10 rounded-xl"
                style={{ background: ACCENT_GRADIENT, boxShadow: ACCENT_GLOW }}
              />
            )}
            <Icon size={20} strokeWidth={on ? 2 : 1.75} className="shrink-0" />
            <span className={fade(collapsed)}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function UserCard({ name, role }: { name: string; role: string }) {
  return (
    <div className="mt-auto flex items-center gap-3 rounded-2xl bg-white/[0.05] p-3">
      <Avatar name={name} size={38} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{name}</span>
        <span className="block text-xs capitalize text-white/50">{role}</span>
      </span>
    </div>
  );
}

/* ── sidebar ───────────────────────────────────────────── */
export function Sidebar({ name, role }: { name: string; role: string }) {
  const pathname = usePathname();
  const { collapsed, toggleCollapsed, mobileOpen, setMobileOpen } = useShell();

  // tutup drawer saat pindah halaman
  useEffect(() => setMobileOpen(false), [pathname, setMobileOpen]);

  // Escape menutup drawer
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen, setMobileOpen]);

  return (
    <>
      {/* desktop */}
      <aside
        className={`fixed bottom-4 left-4 top-4 z-40 hidden flex-col rounded-3xl p-3 pt-6 text-white shadow-[0_24px_60px_-24px_rgba(0,0,0,0.8)] ring-1 ring-white/[0.05] transition-[width] duration-300 ease-out motion-reduce:transition-none lg:flex ${
          collapsed ? "w-[4.75rem]" : "w-60"
        }`}
        style={{ background: SIDEBAR_BG }}
      >
        <div className="px-4">
          <Brand collapsed={collapsed} />
        </div>
        <NavList pathname={pathname} collapsed={collapsed} />

        {/* tombol ciut / lebar di tepi sidebar */}
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
          aria-expanded={!collapsed}
          title={collapsed ? "Perluas (Ctrl+B)" : "Ciutkan (Ctrl+B)"}
          className="absolute -right-3.5 top-8 grid h-7 w-7 place-items-center rounded-full border-4 border-[color:var(--bg)] text-white outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-[#5A64D8] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg)] box-content"
          style={{ background: ACCENT_GRADIENT }}
        >
          <ChevronLeft
            size={14}
            strokeWidth={2.5}
            className={`transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
          />
        </button>
      </aside>

      {/* mobile: drawer (dibuka dari tombol di Topbar) */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="Menu dashboard"
              className="absolute inset-y-3 left-3 flex w-72 max-w-[85%] flex-col rounded-3xl p-5 text-white ring-1 ring-white/[0.06]"
              style={{ background: SIDEBAR_BG }}
              initial={{ x: "-110%" }}
              animate={{ x: 0 }}
              exit={{ x: "-110%" }}
              transition={{ duration: 0.4, ease: EASE }}
            >
              <div className="flex items-center justify-between pt-1">
                <Brand />
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Tutup menu"
                  className="grid h-9 w-9 place-items-center rounded-full bg-white/10 outline-none transition-colors hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  <X size={16} />
                </button>
              </div>
              <NavList pathname={pathname} onNavigate={() => setMobileOpen(false)} />
              <UserCard name={name} role={role} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}