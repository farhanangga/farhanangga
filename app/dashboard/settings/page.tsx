import type { Metadata } from "next";
import { getSession } from "../../../lib/session";
import { LogoutButton } from "@/components/dashboard/logoutButton";
import { PageHeader, Reveal } from "@/components/dashboard/pageHeader";
import { mono } from "@/components/dashboard/shared";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await getSession();

  return (
    <>
      <PageHeader
        section="Settings"
        title="Settings"
        text="Informasi akun yang sedang masuk dan pengaturan sesi."
      />

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        <Reveal index={0} className="rounded-xl bg-[#14142B] p-6">
          <h2 className="text-lg font-semibold">Akun</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-white/10 pb-3">
              <dt className="text-white/60">Nama</dt>
              <dd>{session?.name}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-white/10 pb-3">
              <dt className="text-white/60">Username</dt>
              <dd className={mono.className}>{session?.username}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/60">Peran</dt>
              <dd className="capitalize">{session?.role}</dd>
            </div>
          </dl>
        </Reveal>

        <Reveal index={1} className="rounded-xl bg-[#14142B] p-6">
          <h2 className="text-lg font-semibold">Keluar</h2>
          <p className="mt-2 text-sm leading-relaxed text-white/70">
            Akhiri sesi Anda di perangkat ini. Anda perlu masuk lagi untuk membuka dashboard.
          </p>
          <div className="mt-5">
            <LogoutButton />
          </div>
        </Reveal>
      </div>
    </>
  );
}