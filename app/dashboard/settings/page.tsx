import { redirect } from "next/navigation";
import { LogOut, Server, ShieldCheck } from "lucide-react";
import { getSession } from "@/lib/session";
import { ACCENT_GLOW, ACCENT_GRADIENT, Card } from "@/components/dashboard/shared";
import pkg from "../../../package.json"; // butuh "resolveJsonModule": true di tsconfig (default Next.js sudah aktif)

const muted = "text-[color:var(--fg-muted)]";
const focus = "outline-none focus-visible:ring-2 focus-visible:ring-[#5A64D8]";

const LOGOUT_API = "/api/logout";

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5">
      <dt className={`text-sm ${muted}`}>{label}</dt>
      <dd className={`min-w-0 truncate text-sm font-medium ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}

function Section({ icon, title, desc, children }: { icon: React.ReactNode; title: string; desc: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <div className="flex items-center gap-3 px-1">
        <span className={`grid h-9 w-9 place-items-center rounded-xl bg-[color:var(--chip)] ${muted}`}>{icon}</span>
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p className={`text-xs ${muted}`}>{desc}</p>
        </div>
      </div>
      <Card className="mt-3 overflow-hidden">{children}</Card>
    </section>
  );
}

export default async function SettingsPage() {
  // halaman juga dijaga, bukan hanya route-nya
  if (!(await getSession())) redirect("/admin");

  const deps = pkg.dependencies as Record<string, string>;
  const clean = (v?: string) => (v ? v.replace(/^[\^~]/, "") : "-");
  const commit = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.NEXT_PUBLIC_COMMIT_SHA;
  const env = process.env.NODE_ENV === "production" ? "Production" : "Development";

  return (
    <>
      <p className={`text-sm ${muted}`}>Informasi website dan pengaturan akun dashboard.</p>

      <Section icon={<Server size={18} />} title="Informasi website" desc="Versi dan lingkungan aplikasi yang sedang berjalan.">
        <dl className="divide-y divide-[color:var(--chip)]">
          <Row label="Nama aplikasi" value={pkg.name} />
          <Row label="Versi website" value={`v${pkg.version}`} />
          <Row label="Lingkungan" value={env} />
          <Row label="Next.js" value={clean(deps.next)} />
          <Row label="React" value={clean(deps.react)} />
          <Row label="Node.js" value={process.version} />
          {commit && <Row label="Commit" value={commit.slice(0, 7)} mono />}
        </dl>
      </Section>

      <Section icon={<ShieldCheck size={18} />} title="Akun" desc="Keluar dari sesi admin di perangkat ini.">
        <form action={LOGOUT_API} method="POST" className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Keluar dari dashboard</p>
            <p className={`mt-0.5 text-xs ${muted}`}>Sesi akan diakhiri dan Anda perlu login ulang untuk masuk kembali.</p>
          </div>
          <button
            type="submit"
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.98] ${focus}`}
            style={{ background: ACCENT_GRADIENT, boxShadow: ACCENT_GLOW }}
          >
            <LogOut size={16} /> Logout
          </button>
        </form>
      </Section>
    </>
  );
}