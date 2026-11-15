"use client";

import { useState, useTransition } from "react";
import { MotionConfig, motion } from "framer-motion";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Layers,
  Loader2,
  LogIn,
  Lock,
  Mail,
  PanelsTopLeft,
  User,
  Activity,
} from "lucide-react";
import { Poppins } from "next/font/google";
import { loginAction } from "./action";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const EASE = [0.22, 1, 0.36, 1] as const;

/* warna mengikuti dashboard: sidebar navy, latar lavender, aksen indigo */
const C = {
  page: "#E8EAF6",
  navy: "#2E2F52",
  ink: "#1F1B3A",
  muted: "#7A7D99",
  field: "#EEF0F9",
  accent: "#6870E8",
  accentDeep: "#4F57C7",
};

function Brand({ dark = false }: { dark?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="grid h-8 w-8 place-items-center rounded-lg"
        style={{ background: `linear-gradient(135deg, ${C.accent}, ${C.accentDeep})` }}
        aria-hidden
      >
        <span className="h-3 w-3 rounded-[3px] bg-white" />
      </span>
      <span className={`text-[15px] font-semibold ${dark ? "text-white" : ""}`} style={dark ? undefined : { color: C.ink }}>
        Portofolio <span className={dark ? "text-white/50" : ""} style={dark ? undefined : { color: C.muted }}>Admin</span>
      </span>
    </div>
  );
}

export function LoginView() {
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const res = await loginAction(fd);
      if (res?.error) setError(res.error);
    });
  }

  const inputCls =
    "w-full rounded-full bg-[#EEF0F9] py-3.5 pl-12 pr-4 text-sm text-[#1F1B3A] placeholder:text-[#9A9DB8] outline-none ring-2 ring-transparent transition focus:bg-white focus:ring-[#6870E8]/60 disabled:opacity-60";

  return (
    <MotionConfig reducedMotion="user">
      <main
        className={`${poppins.className} flex min-h-screen items-center justify-center px-5 py-12`}
        style={{ background: `linear-gradient(160deg, ${C.page} 0%, #F4F5FC 100%)`, color: C.ink }}
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="grid w-full max-w-[920px] overflow-hidden rounded-[2rem] bg-white shadow-[0_24px_60px_-24px_rgba(46,47,82,0.35)] md:grid-cols-[0.9fr_1.1fr]"
        >
          {/* panel navy, mirip sidebar dashboard */}
          <aside
            className="relative hidden flex-col justify-between p-10 md:flex"
            style={{ background: C.navy }}
          >
            <Brand dark />

            <div>
              <h2 className="text-3xl font-semibold leading-tight text-white">
                Kelola portofolio dalam satu tempat
              </h2>
              <p className="mt-3 max-w-[32ch] text-sm leading-relaxed text-white/60">
                Perbarui konten yang tampil di website portofolio langsung dari dashboard.
              </p>

            </div>

            <p className="text-xs text-white/40">Khusus admin</p>
          </aside>

          {/* form */}
          <section className="p-7 sm:p-10">
            <div className="mb-8 md:hidden">
              <Brand />
            </div>

            <h1 className="text-3xl font-semibold leading-tight sm:text-[2rem]">Selamat datang</h1>
            <p className="mt-2 text-sm" style={{ color: C.muted }}>
              Masuk untuk mengelola dashboard Anda.
            </p>

            <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
              <div>
                <label htmlFor="username" className="mb-2 block text-sm font-medium text-[#4A4D6A]">
                  Username
                </label>
                <div className="relative">
                  <User size={17} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[#9A9DB8]" />
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    placeholder="Masukkan username"
                    disabled={pending}
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-[#4A4D6A]">
                  Kata sandi
                </label>
                <div className="relative">
                  <Lock size={17} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[#9A9DB8]" />
                  <input
                    id="password"
                    name="password"
                    type={showPw ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Masukkan kata sandi"
                    disabled={pending}
                    className={`${inputCls} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                    className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-[#9A9DB8] outline-none transition-colors hover:bg-[#E3E6F6] hover:text-[#4F57C7] focus-visible:ring-2 focus-visible:ring-[#6870E8]/60"
                  >
                    {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <div aria-live="polite">
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, ease: EASE }}
                    className="flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600"
                  >
                    <AlertCircle size={16} className="shrink-0" /> {error}
                  </motion.p>
                )}
              </div>

              <motion.button
                type="submit"
                disabled={pending}
                whileHover={{ scale: pending ? 1 : 1.015 }}
                whileTap={{ scale: pending ? 1 : 0.98 }}
                className="flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_-10px_rgba(79,87,199,0.7)] outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-[#6870E8]/60 focus-visible:ring-offset-2 disabled:opacity-70"
                style={{ background: `linear-gradient(135deg, ${C.accent}, ${C.accentDeep})` }}
              >
                {pending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Memproses…
                  </>
                ) : (
                  <>
                    <LogIn size={16} /> Masuk
                  </>
                )}
              </motion.button>
            </form>
          </section>
        </motion.div>
      </main>
    </MotionConfig>
  );
}