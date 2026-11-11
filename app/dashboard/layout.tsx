import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { ShellMain, ShellProvider } from "@/components/dashboard/shell";
import {
  ACCENT,
  SIDEBAR_BG,
  SIDEBAR_COOKIE,
  THEME_CSS,
  THEME_KEY,
  sans,
  type Theme,
} from "@/components/dashboard/shared";

/* Pembungkus bertema: data-theme menentukan CSS variable (lihat THEME_CSS). */
function Frame({ theme, children }: { theme: Theme; children: React.ReactNode }) {
  return (
    <div
      data-theme={theme}
      className={`${sans.className} relative min-h-screen overflow-hidden bg-[color:var(--bg)] text-[color:var(--fg)] antialiased transition-colors duration-300`}
    >
      {/* cahaya indigo halus di pojok kanan atas */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 -top-32 h-[420px] w-[420px] rounded-full opacity-[0.14] blur-[140px]"
        style={{ backgroundColor: ACCENT.hex }}
      />
      {children}
    </div>
  );
}

/* Semua yang membaca cookies() ada di sini, di dalam <Suspense>. */
async function SessionShell({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/admin");

  const jar = await cookies();
  const theme: Theme = jar.get(THEME_KEY)?.value === "light" ? "light" : "dark";
  const collapsed = jar.get(SIDEBAR_COOKIE)?.value === "collapsed";

  return (
    <Frame theme={theme}>
      <ShellProvider initialCollapsed={collapsed}>
        <Sidebar name={session.name} role={session.role} />
        <Topbar name={session.name} theme={theme} />
        <ShellMain>{children}</ShellMain>
      </ShellProvider>
    </Frame>
  );
}

function ShellFallback() {
  const pulse = "animate-pulse motion-reduce:animate-none";
  return (
    <Frame theme="dark">
      <aside
        aria-hidden
        className={`fixed bottom-4 left-4 top-4 z-40 hidden w-60 rounded-3xl p-3 pt-6 lg:block ${pulse}`}
        style={{ background: SIDEBAR_BG }}
      >
        <div className="mx-4 h-6 w-32 rounded-md bg-white/10" />
        <div className="mt-9 flex flex-col gap-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 rounded-xl bg-white/[0.05]" />
          ))}
        </div>
      </aside>

      <header className="fixed inset-x-0 top-0 z-30 border-b border-[color:var(--line)] lg:left-[17rem]">
        <div aria-hidden className={`mx-auto flex max-w-[1240px] items-center gap-3 px-4 py-4 sm:px-8 lg:px-6 ${pulse}`}>
          <div className="h-12 w-12 rounded-2xl lg:hidden" style={{ background: SIDEBAR_BG }} />
          <div className="h-12 flex-1 rounded-2xl bg-[color:var(--card)]" />
          <div className="h-11 w-20 rounded-full bg-[color:var(--card)]" />
          <div className="h-12 w-12 rounded-full bg-[color:var(--card)]" />
        </div>
      </header>

      <main className="relative lg:pl-[17rem]">
        <div className="mx-auto max-w-[1240px] px-4 pb-16 pt-[6.5rem] sm:px-8 lg:px-6" />
      </main>
    </Frame>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: THEME_CSS }} />
      <Suspense fallback={<ShellFallback />}>
        <SessionShell>{children}</SessionShell>
      </Suspense>
    </>
  );
}