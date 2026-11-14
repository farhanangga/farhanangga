import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { ExperienceEditor, type ExperienceData } from "@/components/dashboard/experienceEditor";
// Data dibaca lewat handler GET; penyimpanan oleh ExperienceEditor (fetch JSON ke route yang sama).
import { GET as getExperienceRoute } from "@/app/api/landingPage/experience/edit/route";
import { ErrorAlert, SectionShell } from "./shared";

/* Tiga tabel: landing_experience, landing_organization, landing_award. */

async function fetchExperienceData(): Promise<ExperienceData | null> {
  try {
    const res = await getExperienceRoute();
    if (!res.ok) {
      console.error(`[landing dashboard] route experience gagal: ${res.status}`);
      return null;
    }
    const json = (await res.json()) as { data?: Partial<ExperienceData> };
    return {
      experiences: json.data?.experiences ?? [],
      orgs: json.data?.orgs ?? [],
      awards: json.data?.awards ?? [],
    };
  } catch (err) {
    console.error("[landing dashboard] experience", err);
    return null;
  }
}

function ExperienceShell({ children }: { children: React.ReactNode }) {
  return (
    <SectionShell
      id="experience"
      title="Pengalaman kerja"
      desc="Atur timeline pengalaman, organisasi, serta sertifikat dan penghargaan di landing page. Tambah, edit, hapus, dan ubah urutan lewat tiap kartu; perubahan baru tersimpan setelah klik Simpan."
    >
      {children}
    </SectionShell>
  );
}

export async function ExperienceSection() {
  if (!(await getSession())) redirect("/admin");

  const data = await fetchExperienceData();

  if (!data) {
    return (
      <ExperienceShell>
        <ErrorAlert>
          Data pengalaman gagal dimuat. Pastikan tabel landing_experience, landing_organization, dan landing_award
          sudah dibuat, lalu muat ulang halaman.
        </ErrorAlert>
      </ExperienceShell>
    );
  }

  return (
    <ExperienceShell>
      <ExperienceEditor initial={data} />
    </ExperienceShell>
  );
}
