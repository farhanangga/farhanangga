import { createClient } from "@supabase/supabase-js";
import { projects, gambarProject, bestProject, tabMeta } from "./data";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY belum diisi");

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  // 1. project_tabs (harus pertama, karena projects.category mereferensikannya)
  const tabRows = tabMeta.map((t, i) => ({
    id: t.id,
    label: t.label,
    short: t.short,
    type_label: t.typeLabel,
    tools_label: t.toolsLabel,
    link_label: t.linkLabel ?? null,
    sort_order: i + 1,
  }));
  const r0 = await supabase.from("project_tabs").upsert(tabRows, { onConflict: "id" });
  if (r0.error) throw new Error(`project_tabs: ${r0.error.message}`);
  console.log(`project_tabs   : ${tabRows.length} baris`);

  // 2. projects
  const projectRows = projects.map((p, i) => ({
    id: p.id,
    category: p.category,
    title: p.title,
    type: p.type,
    role: p.role,
    tools: p.tools,
    desc: p.desc,
    highlights: p.highlights,
    url: p.url ?? null,
    repo: p.repo ?? null,
    position: i + 1,
  }));
  const r1 = await supabase.from("projects").upsert(projectRows, { onConflict: "id" });
  if (r1.error) throw new Error(`projects: ${r1.error.message}`);
  console.log(`projects       : ${projectRows.length} baris`);

  // 3. project_images
  const imageRows = gambarProject.map((g) => ({
    id: g.idPicture,
    project_id: g.idProject,
    position: g.order,
    src: g.src,
  }));
  const r2 = await supabase.from("project_images").upsert(imageRows, { onConflict: "id" });
  if (r2.error) throw new Error(`project_images: ${r2.error.message}`);
  console.log(`project_images : ${imageRows.length} baris`);

  // 4. best_projects
  const bestRows = bestProject.map((b) => ({ position: b.order, project_id: b.idProject }));
  const r3 = await supabase.from("best_projects").upsert(bestRows, { onConflict: "position" });
  if (r3.error) throw new Error(`best_projects: ${r3.error.message}`);
  console.log(`best_projects  : ${bestRows.length} baris`);

  console.log("Selesai.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});