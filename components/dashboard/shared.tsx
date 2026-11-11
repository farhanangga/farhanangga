import type { ReactNode } from "react";
import { JetBrains_Mono, Poppins } from "next/font/google";

/* ── fonts ─────────────────────────────────────────────── */
export const sans = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
export const mono = JetBrains_Mono({ subsets: ["latin"] });

/* ── motion ────────────────────────────────────────────── */
export const EASE = [0.22, 1, 0.36, 1] as const;

/* ── tokens statis ─────────────────────────────────────── */
export const ACCENT = { hex: "#5A64D8", ink: "#FFFFFF", rgb: "90,100,216" };
export const ACCENT_GRADIENT = "linear-gradient(135deg,#6F78EA 0%,#4C55C2 100%)";
export const ACCENT_GLOW = `0 10px 28px -10px rgba(${ACCENT.rgb},0.85)`;

/** Warna sidebar: SAMA di dark & light mode. */
export const SIDEBAR_BG = "#2F3147";

export const THEME = {
  up: "#79C96B",
  upInk: "#10260C",
  down: "#E85B53",
} as const;

/* ── tema dark / light ─────────────────────────────────────
 * Warna yang berubah mengikuti tema dipakai lewat CSS variable:
 *   bg-[color:var(--card)]  text-[color:var(--fg)]  dst.
 */
/** Nama cookie penyimpan tema; dibaca di server agar tidak berkedip. */
export const THEME_KEY = "dashboard-theme";
export type Theme = "dark" | "light";

/** Cookie status sidebar ("collapsed" | "expanded"), dibaca di server. */
export const SIDEBAR_COOKIE = "dashboard-sidebar";

export const THEME_CSS = `
:root{
  --bg:#1B1B1F; --card:#2F3147; --card-hi:#383A55;
  --fg:#FFFFFF; --fg-muted:rgba(255,255,255,.55);
  --line:rgba(255,255,255,.05); --chip:rgba(255,255,255,.10);
  --shadow:none; color-scheme:dark;
}
[data-theme="light"]{
  --bg:#E9EBF6; --card:#FFFFFF; --card-hi:#F3F4FB;
  --fg:#1E2038; --fg-muted:rgba(30,32,56,.55);
  --line:rgba(30,32,56,.06); --chip:rgba(30,32,56,.08);
  --shadow:0 10px 30px -18px rgba(30,32,56,.35); color-scheme:light;
}`;

/* ── primitives untuk halaman dashboard ────────────────── */

/** Kartu dasar. `active` = outline indigo seperti kartu Revenue. */
export function Card({
  children,
  className = "",
  active = false,
}: {
  children: ReactNode;
  className?: string;
  active?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl bg-[color:var(--card)] transition-colors duration-300 ${
        active
          ? "ring-2 ring-[#5A64D8] shadow-[0_0_0_5px_rgba(90,100,216,0.16)]"
          : "ring-1 ring-[color:var(--line)]"
      } ${className}`}
      style={active ? undefined : { boxShadow: "var(--shadow)" }}
    >
      {children}
    </div>
  );
}

/** Pill growth: hijau (+) / merah (−). */
export function Delta({ value, tone }: { value: string; tone?: "up" | "down" }) {
  const t = tone ?? (value.trim().startsWith("-") || value.trim().startsWith("−") ? "down" : "up");
  return (
    <span
      className="inline-block rounded-md px-1.5 py-0.5 text-[10px] font-semibold leading-none tabular-nums"
      style={
        t === "up"
          ? { background: THEME.up, color: THEME.upInk }
          : { background: THEME.down, color: "#fff" }
      }
    >
      {value}
    </span>
  );
}

export function Avatar({ name, size = 48 }: { name: string; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full text-sm font-bold text-white ring-2 ring-[color:var(--chip)]"
      style={{ width: size, height: size, background: ACCENT_GRADIENT }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}