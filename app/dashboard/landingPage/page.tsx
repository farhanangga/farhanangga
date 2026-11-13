import { Suspense } from "react";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
import { CircleAlert, CircleCheck, Info } from "lucide-react";
import { getSession } from "@/lib/session";
import { Card } from "@/components/dashboard/shared";
import { SubmitButton } from "@/components/dashboard/imageDropzone";
import { BestProjectPicker, type PickTab } from "@/components/dashboard/bestProjectPicker";
import { EditHero, EditHeroSkeleton } from "@/components/dashboard/editHero";
import { EditAbout, EditAboutSkeleton } from "@/components/dashboard/editAbout";
import { ExperienceEditor, type ExperienceData } from "@/components/dashboard/experienceEditor";
// Satu-satunya pintu data: handler GET di route ini. Penyimpanan best project lewat action form (POST);
// pengalaman kerja disimpan oleh ExperienceEditor lewat fetch JSON ke api/landingPage/experience/edit.
import { GET as getBestRoute } from "@/app/api/landingPage/best/edit/route";
import { GET as getExperienceRoute } from "@/app/api/landingPage/experience/edit/route";
import { GET as getProjectsRoute } from "@/app/api/projects/route";
import { ToolsEditor, type ToolsEditData } from "@/components/dashboard/toolsEditor";
import { GET as getToolsRoute } from "@/app/api/landingPage/tools/edit/route";

type Params = { saved?: string; error?: string };

const errorMsg: Record<string, string> = {
  best_invalid: "Pilihan best project tidak valid. Ada proyek yang tidak ditemukan atau terduplikasi.",
  best_max: "Maksimal 6 best project per bidang. Kurangi pilihan di bidang yang melebihi batas.",
  best_save:
    "Best project gagal disimpan. Pastikan fungsi replace_best_projects sudah dibuat (jalankan best_projects_admin.sql).",
  default: "Perubahan gagal disimpan. Periksa isian form lalu coba lagi.",
};

/** Aman terhadap query seperti ?error=constructor / ?error=toString. */
const getErrorMsg = (key?: string) =>
  key && Object.prototype.hasOwnProperty.call(errorMsg, key) ? errorMsg[key] : errorMsg.default;

/* token tema (lihat THEME_CSS di shared.tsx) */
const muted = "text-[color:var(--fg-muted)]";

/* ── potongan UI kecil ─────────────────────────────────── */

function CardHead({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="mb-5">
      <h2 className="font-semibold">{title}</h2>
      {desc && <p className={`mt-0.5 text-sm ${muted}`}>{desc}</p>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
 * BAGIAN "BEST PROJECT" (di bawah Tentang saya)
 * Menentukan proyek mana yang tampil sebagai "Proyek terbaik" di website.
 * Tab/bidang dan daftar proyek dari api/projects; pilihan disimpan di tabel best_projects
 * lewat route api/landingPage/bestProject/edit. Maksimal 6 proyek per bidang.
 * ══════════════════════════════════════════════════════════ */

const API_BEST = "/api/landingPage/best/edit";
const MAX_BEST = 6;

/** Semua bidang + proyeknya dari api/projects (hanya field yang dipakai untuk memilih). */
async function fetchPickTabs(): Promise<PickTab[] | null> {
  try {
    const call = getProjectsRoute as unknown as (req: NextRequest) => Promise<Response>;
    const res = await call(new NextRequest("http://localhost/api/projects"));
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: unknown };
    if (!Array.isArray(json.data)) return null;

    return json.data.map((t) => {
      const tab = t as { id?: unknown; label?: unknown; short?: unknown; projects?: unknown };
      const projects = Array.isArray(tab.projects) ? tab.projects : [];
      return {
        id: String(tab.id),
        label: String(tab.label ?? tab.id),
        short: String(tab.short ?? tab.label ?? tab.id),
        projects: projects.map((p) => {
          const x = p as { id?: unknown; title?: unknown; type?: unknown; images?: unknown };
          const cover = Array.isArray(x.images) && typeof x.images[0] === "string" ? x.images[0] : null;
          return { id: String(x.id), title: String(x.title ?? ""), type: String(x.type ?? ""), cover };
        }),
      };
    });
  } catch (err) {
    console.error("[landing dashboard] api/projects (best)", err);
    return null;
  }
}

/** project_id best project saat ini, urut menurut position. null = gagal dimuat. */
async function fetchBestIds(): Promise<string[] | null> {
  try {
    const res = await getBestRoute();
    if (!res.ok) {
      console.error(`[landing dashboard] route best gagal: ${res.status}`);
      return null;
    }
    const json = (await res.json()) as { data?: { ids?: string[] } };
    return json.data?.ids ?? [];
  } catch (err) {
    console.error("[landing dashboard] best", err);
    return null;
  }
}

function BestShell({ children }: { children: React.ReactNode }) {
  return (
    <section id="best" className="mt-12 scroll-mt-6 border-t border-[color:var(--chip)] pt-8">
      <h2 className="text-lg font-semibold">Best project</h2>
      <p className={`mt-0.5 text-sm ${muted}`}>
        Tentukan proyek terbaik yang tampil di website. Maksimal {MAX_BEST} proyek per bidang; boleh kurang dari {MAX_BEST}.
      </p>
      {children}
    </section>
  );
}

async function BestSection({ searchParams }: { searchParams: Promise<Params> }) {
  if (!(await getSession())) redirect("/admin");

  const { saved, error } = await searchParams;
  const [tabs, ids] = await Promise.all([fetchPickTabs(), fetchBestIds()]);

  if (!tabs || !ids) {
    return (
      <BestShell>
        <div
          role="alert"
          className="mt-5 flex items-start gap-3 rounded-2xl border border-[#E85B53]/30 bg-[#E85B53]/10 px-4 py-3 text-sm font-medium text-[#E85B53]"
        >
          <CircleAlert size={18} className="mt-px shrink-0" />
          Data best project gagal dimuat. Periksa api/projects dan tabel best_projects, lalu muat ulang halaman.
        </div>
      </BestShell>
    );
  }

  const bestError = error?.startsWith("best_") ? error : undefined;

  return (
    <BestShell>
      {saved === "best" && (
        <div role="status" className="mt-5 flex items-start gap-3 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-600">
          <CircleCheck size={18} className="mt-px shrink-0" />
          Best project berhasil disimpan. Perubahan langsung tampil di website.
        </div>
      )}
      {bestError && (
        <div
          role="alert"
          className="mt-5 flex items-start gap-3 rounded-2xl border border-[#E85B53]/30 bg-[#E85B53]/10 px-4 py-3 text-sm font-medium text-[#E85B53]"
        >
          <CircleAlert size={18} className="mt-px shrink-0" />
          {getErrorMsg(bestError)}
        </div>
      )}

      <Card className="mt-5 p-6">
        <CardHead
          title="Pilih proyek terbaik"
          desc="Pilih bidang, tambahkan proyek, lalu atur urutannya. Bidang tanpa pilihan tampil kosong di website."
        />

        <form action={API_BEST} method="post" className="space-y-5">
          <BestProjectPicker tabs={tabs} initial={ids} max={MAX_BEST} />

          <div className="flex items-center justify-between gap-3 border-t border-[color:var(--chip)] pt-5">
            <p className={`hidden items-center gap-2 text-sm sm:flex ${muted}`}>
              <Info size={16} className="shrink-0" />
              Semua bidang disimpan sekaligus.
            </p>
            <div className="ml-auto">
              <SubmitButton>Simpan best project</SubmitButton>
            </div>
          </div>
        </form>
      </Card>
    </BestShell>
  );
}

function BestSkeleton() {
  const pulse = "animate-pulse motion-reduce:animate-none";
  return (
    <div role="status" aria-busy="true" aria-label="Memuat best project" className={`mt-12 ${pulse}`}>
      <div className="h-6 w-44 rounded-lg bg-[color:var(--chip)]" />
      <div className="mt-5 h-96 rounded-3xl bg-[color:var(--card)]" />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
 * BAGIAN "PENGALAMAN KERJA" (di bawah Best project)
 * Tiga tabel: landing_experience, landing_organization, landing_award.
 * Data dibaca lewat GET api/landingPage/experience/edit, lalu diedit di
 * components/landingPage/experienceEditor.tsx (edit, tambah, hapus, atur urutan).
 * Penyimpanan: POST JSON ke route yang sama, per kartu.
 * ══════════════════════════════════════════════════════════ */

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
    <section id="experience" className="mt-12 scroll-mt-6 border-t border-[color:var(--chip)] pt-8">
      <h2 className="text-lg font-semibold">Pengalaman kerja</h2>
      <p className={`mt-0.5 text-sm ${muted}`}>
        Atur timeline pengalaman, organisasi, serta sertifikat dan penghargaan di landing page. Tambah, edit, hapus, dan
        ubah urutan lewat tiap kartu; perubahan baru tersimpan setelah klik Simpan.
      </p>
      {children}
    </section>
  );
}

async function ExperienceSection() {
  if (!(await getSession())) redirect("/admin");

  const data = await fetchExperienceData();

  if (!data) {
    return (
      <ExperienceShell>
        <div
          role="alert"
          className="mt-5 flex items-start gap-3 rounded-2xl border border-[#E85B53]/30 bg-[#E85B53]/10 px-4 py-3 text-sm font-medium text-[#E85B53]"
        >
          <CircleAlert size={18} className="mt-px shrink-0" />
          Data pengalaman gagal dimuat. Pastikan tabel landing_experience, landing_organization, dan landing_award sudah
          dibuat, lalu muat ulang halaman.
        </div>
      </ExperienceShell>
    );
  }

  return (
    <ExperienceShell>
      <ExperienceEditor initial={data} />
    </ExperienceShell>
  );
}

function ExperienceSkeleton() {
  const pulse = "animate-pulse motion-reduce:animate-none";
  return (
    <div role="status" aria-busy="true" aria-label="Memuat pengalaman kerja" className={`mt-12 ${pulse}`}>
      <div className="h-6 w-44 rounded-lg bg-[color:var(--chip)]" />
      <div className="mt-5 h-96 rounded-3xl bg-[color:var(--card)]" />
    </div>
  );
}

/* ── halaman ───────────────────────────────────────────── */

/* ══════════════════════════════════════════════════════════
 * BAGIAN "TOOLS" (di bawah Pengalaman kerja)
 * Tabel: tool_groups dan tools. Dibaca lewat GET api/landingPage/tools/edit,
 * disimpan oleh ToolsEditor lewat POST JSON ke route yang sama.
 * ══════════════════════════════════════════════════════════ */

async function fetchToolsData(): Promise<ToolsEditData | null> {
  try {
    const res = await getToolsRoute();
    if (!res.ok) {
      console.error(`[landing dashboard] route tools gagal: ${res.status}`);
      return null;
    }
    const json = (await res.json()) as { data?: Partial<ToolsEditData> };
    return { groups: json.data?.groups ?? [] };
  } catch (err) {
    console.error("[landing dashboard] tools", err);
    return null;
  }
}

function ToolsShell({ children }: { children: React.ReactNode }) {
  return (
    <section id="tools" className="mt-12 scroll-mt-6 border-t border-[color:var(--chip)] pt-8">
      <h2 className="text-lg font-semibold">Tools</h2>
      <p className={`mt-0.5 text-sm ${muted}`}>
        Atur grup tools dan isinya yang tampil di bagian &ldquo;Tools yang saya kuasai&rdquo;. Perubahan baru tersimpan
        setelah klik Simpan.
      </p>
      {children}
    </section>
  );
}

async function ToolsSection() {
  if (!(await getSession())) redirect("/admin");

  const data = await fetchToolsData();

  if (!data) {
    return (
      <ToolsShell>
        <div
          role="alert"
          className="mt-5 flex items-start gap-3 rounded-2xl border border-[#E85B53]/30 bg-[#E85B53]/10 px-4 py-3 text-sm font-medium text-[#E85B53]"
        >
          <CircleAlert size={18} className="mt-px shrink-0" />
          Data tools gagal dimuat. Pastikan tabel tool_groups dan tools sudah ada dan SUPABASE_SECRET_KEY sudah diset,
          lalu muat ulang halaman.
        </div>
      </ToolsShell>
    );
  }

  return (
    <ToolsShell>
      <ToolsEditor initial={data} />
    </ToolsShell>
  );
}

function ToolsSkeleton() {
  const pulse = "animate-pulse motion-reduce:animate-none";
  return (
    <div role="status" aria-busy="true" aria-label="Memuat tools" className={`mt-12 ${pulse}`}>
      <div className="h-6 w-44 rounded-lg bg-[color:var(--chip)]" />
      <div className="mt-5 h-96 rounded-3xl bg-[color:var(--card)]" />
    </div>
  );
}

export default function LandingPageDashboard({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <>
      <Suspense fallback={<EditHeroSkeleton />}>
        <EditHero searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<EditAboutSkeleton />}>
        <EditAbout searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<BestSkeleton />}>
        <BestSection searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<ExperienceSkeleton />}>
        <ExperienceSection />
      </Suspense>
      <Suspense fallback={<ToolsSkeleton />}>
        <ToolsSection />
      </Suspense>
    </>
  );
}