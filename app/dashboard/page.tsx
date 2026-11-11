import type { Metadata } from "next";
import { FolderKanban, Eye, Mail, Activity } from "lucide-react";
import { getSession } from "@/lib/session";
import { PageHeader, Reveal } from "@/components/dashboard/pageHeader";
import { ACCENT, mono } from "@/components/dashboard/shared";

export const metadata: Metadata = { title: "Dashboard" };

const STATS = [
  { label: "Total proyek", value: "12", Icon: FolderKanban },
  { label: "Pengunjung bulan ini", value: "1.284", Icon: Eye },
  { label: "Pesan masuk", value: "8", Icon: Mail },
  { label: "Aktivitas hari ini", value: "5", Icon: Activity },
];

export default async function DashboardPage() {
  const session = await getSession();

  return (
    <>
      <PageHeader
        section="Ringkasan"
        title={`Halo, ${session?.name ?? "Admin"}`}
        text="Ringkasan singkat tentang proyek, pengunjung, dan pesan yang masuk ke website portofolio Anda."
      />

      <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map(({ label, value, Icon }, i) => (
          <li key={label}>
            <Reveal index={i} className="h-full rounded-xl bg-[#14142B] p-5">
              <span
                className="grid h-10 w-10 place-items-center rounded-full"
                style={{ background: `rgba(${ACCENT.rgb},0.15)`, color: ACCENT.hex }}
              >
                <Icon size={18} />
              </span>
              <p className={`${mono.className} mt-4 text-3xl font-bold`}>{value}</p>
              <p className="mt-1 text-sm text-white/60">{label}</p>
            </Reveal>
          </li>
        ))}
      </ul>

      <Reveal index={4} className="mt-5 rounded-xl bg-[#14142B] p-6">
        <h2 className="text-lg font-semibold">Selamat datang kembali</h2>
        <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-white/70">
          Gunakan menu di samping untuk mengelola proyek, melihat aktivitas terbaru, membaca pesan, dan mengatur akun
          Anda. Angka di atas masih berupa contoh, sambungkan ke data asli Anda kapan saja.
        </p>
      </Reveal>
    </>
  );
}