import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { ToolsEditor, type ToolsEditData } from "@/components/dashboard/toolsEditor";
// Tabel: tool_groups dan tools. Dibaca lewat GET; disimpan oleh ToolsEditor (POST JSON ke route yang sama).
import { GET as getToolsRoute } from "@/app/api/landingPage/tools/edit/route";
import { ErrorAlert, SectionShell } from "./shared";

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
    <SectionShell
      id="tools"
      title="Tools"
      desc="Atur grup tools dan isinya yang tampil di bagian “Tools yang saya kuasai”. Perubahan baru tersimpan setelah klik Simpan."
    >
      {children}
    </SectionShell>
  );
}

export async function ToolsSection() {
  if (!(await getSession())) redirect("/admin");

  const data = await fetchToolsData();

  if (!data) {
    return (
      <ToolsShell>
        <ErrorAlert>
          Data tools gagal dimuat. Pastikan tabel tool_groups dan tools sudah ada dan SUPABASE_SECRET_KEY sudah diset,
          lalu muat ulang halaman.
        </ErrorAlert>
      </ToolsShell>
    );
  }

  return (
    <ToolsShell>
      <ToolsEditor initial={data} />
    </ToolsShell>
  );
}
