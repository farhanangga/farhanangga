"use client";

import { useState, useTransition } from "react";
import { MotionConfig, motion } from "framer-motion";
import { AlertCircle, Eye, EyeOff, Loader2, LogIn, Lock, User } from "lucide-react";
import { JetBrains_Mono } from "next/font/google";
import { loginAction } from "./action";

const mono = JetBrains_Mono({ subsets: ["latin"] });
const EASE = [0.22, 1, 0.36, 1] as const;

/* warna aksen */
const ACCENT = { hex: "#7C6CFF", ink: "#0B0B24", rgb: "124,108,255" };

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
    "w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-11 pr-4 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-white/20";

  return (
    <MotionConfig reducedMotion="user">
      <main
        className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0B0B24] px-5 py-16 text-white"
        style={{ ["--accent" as string]: ACCENT.hex }}
      >
        {/* dot grid */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)",
            backgroundSize: "26px 26px",
            maskImage: "radial-gradient(ellipse 75% 55% at 50% 40%, black, transparent)",
            WebkitMaskImage: "radial-gradient(ellipse 75% 55% at 50% 40%, black, transparent)",
          }}
        />
        {/* blob cahaya */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -left-32 top-16 h-[380px] w-[380px] rounded-full opacity-25 blur-[120px]"
          style={{ backgroundColor: ACCENT.hex }}
          animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -right-32 bottom-10 h-[340px] w-[340px] rounded-full opacity-15 blur-[120px]"
          style={{ backgroundColor: ACCENT.hex }}
          animate={{ x: [0, -40, 0], y: [0, -40, 0] }}
          transition={{ duration: 17, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative w-full max-w-[440px]">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className={`${mono.className} text-sm text-white/50`}
          >
            Portofolio <span className="text-white/25">/</span>{" "}
            <span style={{ color: ACCENT.hex }}>Masuk</span>
          </motion.p>

          <h1 className={`${mono.className} mt-3 overflow-hidden pb-2 text-4xl font-bold leading-[1.05] sm:text-5xl`}>
            <motion.span
              className="block"
              initial={{ y: "115%" }}
              animate={{ y: 0 }}
              transition={{ duration: 0.8, ease: EASE }}
            >
              Selamat Datang
            </motion.span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: EASE }}
            className="mt-3 max-w-[40ch] leading-relaxed text-white/70"
          >
            Masuk untuk mengelola dashboard Anda.
          </motion.p>

          <motion.form
            onSubmit={onSubmit}
            noValidate
            initial={{ opacity: 0, y: 32, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.2 }}
            className="mt-8 rounded-xl bg-[#14142B] p-6 sm:p-7"
          >
            <div className="space-y-5">
              <div>
                <label htmlFor="username" className="mb-2 block text-sm text-white/70">
                  Username
                </label>
                <div className="relative">
                  <User size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
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
                <label htmlFor="password" className="mb-2 block text-sm text-white/70">
                  Kata sandi
                </label>
                <div className="relative">
                  <Lock size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
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
                    className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-white/50 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white/60"
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div aria-live="polite">
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, ease: EASE }}
                    className="flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300"
                  >
                    <AlertCircle size={16} className="shrink-0" /> {error}
                  </motion.p>
                )}
              </div>

              <motion.button
                type="submit"
                disabled={pending}
                whileHover={{ scale: pending ? 1 : 1.02 }}
                whileTap={{ scale: pending ? 1 : 0.98 }}
                className="flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-70"
                style={{ background: ACCENT.hex, color: ACCENT.ink }}
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
            </div>
          </motion.form>
        </div>
      </main>
    </MotionConfig>
  );
}