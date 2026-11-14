import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
import { CircleCheck, Info } from "lucide-react";
import { getSession } from "@/lib/session";
import { Card } from "@/components/dashboard/shared";
import { SubmitButton } from "@/components/dashboard/imageDropzone";
import { BestProjectPicker, type PickTab } from "@/components/dashboard/bestProjectPicker";
// Satu-satunya pintu data: handler GET di route ini. Penyimpanan best project lewat action form (POST).
import { GET as getBestRoute } from "@/app/api/landingPage/best/edit/route";
import { GET as getProjectsRoute } from "@/app/api/projects/route";
import { CardHead, ErrorAlert, SectionShell, muted, type Params } from "./shared";

const API_BEST = "/api/landingPage/best/edit";
const MAX_BEST = 6;

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
    <SectionShell
      id="best"
      title="Best project"
      desc={`Tentukan proyek terbaik yang tampil di website. Maksimal ${MAX_BEST} proyek per bidang; boleh kurang dari ${MAX_BEST}.`}
    >
      {children}
    </SectionShell>
  );
}

export async function BestSection({ searchParams }: { searchParams: Promise<Params> }) {
  if (!(await getSession())) redirect("/admin");

  const { saved, error } = await searchParams;
  const [tabs, ids] = await Promise.all([fetchPickTabs(), fetchBestIds()]);

  if (!tabs || !ids) {
    return (
      <BestShell>
        <ErrorAlert>
          Data best project gagal dimuat. Periksa api/projects dan tabel best_projects, lalu muat ulang halaman.
        </ErrorAlert>
      </BestShell>
    );
  }

  const bestError = error?.startsWith("best_") ? error : undefined;

  return (
    <BestShell>
      {saved === "best" && (
        <div
          role="status"
          className="mt-5 flex items-start gap-3 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-600"
        >
          <CircleCheck size={18} className="mt-px shrink-0" />
          Best project berhasil disimpan. Perubahan langsung tampil di website.
        </div>
      )}
      {bestError && <ErrorAlert>{getErrorMsg(bestError)}</ErrorAlert>}

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
