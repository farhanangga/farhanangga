"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { MotionConfig } from "framer-motion";
import { SIDEBAR_COOKIE } from "./shared";

type ShellCtx = {
  collapsed: boolean;
  toggleCollapsed: () => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
};

const Ctx = createContext<ShellCtx | null>(null);

export function useShell() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useShell harus dipakai di dalam <ShellProvider>");
  return v;
}

/** State bersama sidebar (ciut/lebar, drawer mobile), topbar, dan area konten. */
export function ShellProvider({
  initialCollapsed,
  children,
}: {
  initialCollapsed: boolean;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleCollapsed = useCallback(() => setCollapsed((c) => !c), []);

  // simpan pilihan agar server merender ukuran yang sama saat reload
  useEffect(() => {
    document.cookie = `${SIDEBAR_COOKIE}=${collapsed ? "collapsed" : "expanded"}; path=/; max-age=31536000; samesite=lax`;
  }, [collapsed]);

  // Ctrl/Cmd + B untuk ciut/lebar
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "b") return;
      const t = e.target as HTMLElement;
      if (/^(INPUT|TEXTAREA)$/.test(t.tagName) || t.isContentEditable) return;
      e.preventDefault();
      toggleCollapsed();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleCollapsed]);

  const value = useMemo(
    () => ({ collapsed, toggleCollapsed, mobileOpen, setMobileOpen }),
    [collapsed, toggleCollapsed, mobileOpen],
  );

  return (
    <Ctx.Provider value={value}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </Ctx.Provider>
  );
}

/** Area konten: padding kiri mengikuti lebar sidebar. */
export function ShellMain({ children }: { children: React.ReactNode }) {
  const { collapsed } = useShell();
  return (
    <main
      className={`relative transition-[padding] duration-300 ease-out motion-reduce:transition-none ${
        collapsed ? "lg:pl-[6.5rem]" : "lg:pl-[17rem]"
      }`}
    >
      <div className="mx-auto max-w-[1240px] px-4 pb-16 pt-[6.5rem] sm:px-8 lg:px-6">{children}</div>
    </main>
  );
}