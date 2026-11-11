import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/session";

const BASE = "/dashboard/projects";
const ID_DIGITS = 4;
const IMG_DIGITS = 8;
const MAX_IMAGES = 10;
const MAX_SIZE = 5 * 1024 * 1024;
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "projectsImages";

type Tab = {
  id: string;
  label: string;
};

type Uploaded = {
  urls: string[];
  paths: string[];
};

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error("Konfigurasi Supabase server belum lengkap.");
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

function text(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function csv(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function lines(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isOptionalHttpUrl(value: string) {
  if (!value) return true;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isSoftwareEngineer(tab?: Tab) {
  return !!tab && /software[\s_-]*engineer/i.test(`${tab.id} ${tab.label}`);
}

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url), 303);
}

async function getTabs(db: ReturnType<typeof adminClient>) {
  const [tabsRes, projectsRes] = await Promise.all([
    db.from("project_tabs").select("id, label").order("sort_order"),
    db.from("projects").select("id").order("position"),
  ]);

  if (tabsRes.error) throw tabsRes.error;
  if (projectsRes.error) throw projectsRes.error;

  return {
    tabs: (tabsRes.data ?? []) as Tab[],
    projects: (projectsRes.data ?? []) as { id: string }[],
  };
}

/** ID berikutnya: angka tertinggi yang sudah ada + 1, dipad 4 digit. */
function nextProjectId(projects: { id: string }[]) {
  const max = projects.reduce(
    (maximum, project) =>
      /^\d+$/.test(project.id) ? Math.max(maximum, Number(project.id)) : maximum,
    0
  );

  return String(max + 1).padStart(ID_DIGITS, "0");
}

function extOf(file: File) {
  const dot = file.name.lastIndexOf(".");
  const raw =
    dot > -1 ? file.name.slice(dot + 1) : file.type.split("/")[1] ?? "";

  return raw.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
}

/** Unggah berurutan (00000001.jpg, 00000002.png, …). Bentrok nama → nomor dinaikkan lalu dicoba lagi. */
async function uploadImages(
  db: ReturnType<typeof adminClient>,
  files: File[]
): Promise<Uploaded> {
  const urls: string[] = [];
  const paths: string[] = [];

  if (files.length === 0) return { urls, paths };

  const store = db.storage.from(BUCKET);

  try {
    const { data, error } = await store.list("", {
      limit: 1000,
      sortBy: { column: "name", order: "desc" },
    });

    if (error) throw error;

    let max = 0;

    for (const file of data ?? []) {
      const match = new RegExp(`^(\\d{${IMG_DIGITS}})\\.`).exec(file.name);
      if (match) max = Math.max(max, Number(match[1]));
    }

    let number = max + 1;

    for (const file of files) {
      let saved = false;

      for (let attempt = 0; attempt < 5 && !saved; attempt++) {
        const path = `${String(number).padStart(IMG_DIGITS, "0")}.${extOf(file)}`;

        const { error: uploadError } = await store.upload(path, file, {
          contentType: file.type,
          upsert: false,
        });

        if (!uploadError) {
          paths.push(path);
          urls.push(store.getPublicUrl(path).data.publicUrl);
          saved = true;
        } else if (
          /already exists|duplicate/i.test(uploadError.message) ||
          (uploadError as { statusCode?: string }).statusCode === "409"
        ) {
          // Nomor sudah dipakai pihak lain, coba nomor berikutnya.
        } else {
          throw uploadError;
        }

        number++;
      }

      if (!saved) {
        throw new Error("Nomor gambar bentrok terus-menerus.");
      }
    }

    return { urls, paths };
  } catch (error) {
    if (paths.length) {
      await store.remove(paths).catch(() => {});
    }
    throw error;
  }
}

/* ── GET: data untuk form (kategori + ID berikutnya) ───── */

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = adminClient();
    const { tabs, projects } = await getTabs(db);

    return NextResponse.json({
      data: { tabs, nextId: nextProjectId(projects) },
    });
  } catch (error) {
    console.error("[create project] GET error:", error);
    return NextResponse.json(
      { error: "Gagal memuat data form." },
      { status: 500 }
    );
  }
}

/* ── POST: simpan project baru ─────────────────────────── */

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return redirectTo(request, "/admin");
  }

  let uploaded: Uploaded = { urls: [], paths: [] };
  let projectId = "";

  try {
    const formData = await request.formData();

    // 1. Validasi gambar
    const files = formData
      .getAll("images")
      .filter((file): file is File => file instanceof File && file.size > 0);

    if (files.length > MAX_IMAGES) {
      return redirectTo(request, `${BASE}/new?error=limit`);
    }

    if (files.some((file) => !file.type.startsWith("image/"))) {
      return redirectTo(request, `${BASE}/new?error=type`);
    }

    if (files.some((file) => file.size > MAX_SIZE)) {
      return redirectTo(request, `${BASE}/new?error=size`);
    }

    // 2. Koneksi database + data referensi
    const db = adminClient();
    const { tabs, projects } = await getTabs(db);

    // 3. Ambil data form
    const fields = {
      title: text(formData.get("title")),
      category: text(formData.get("category")),
      type: text(formData.get("type")),
      role: text(formData.get("role")),
      desc: text(formData.get("desc")),
      url: text(formData.get("url")),
      repo: text(formData.get("repo")),
    };

    const selectedTab = tabs.find((tab) => tab.id === fields.category);

    // repository hanya berlaku untuk kategori Software Engineer
    const repo = isSoftwareEngineer(selectedTab) ? fields.repo : "";

    // 4. Validasi isian
    const valid =
      fields.title &&
      fields.category &&
      fields.type &&
      fields.role &&
      fields.desc &&
      selectedTab &&
      isOptionalHttpUrl(fields.url) &&
      isOptionalHttpUrl(repo);

    if (!valid) {
      return redirectTo(request, `${BASE}/new?error=invalid`);
    }

    // 5. Generate ID project
    projectId = nextProjectId(projects);

    // 6. Upload gambar (setelah semua isian valid, supaya tidak ada upload sia-sia)
    try {
      uploaded = await uploadImages(db, files);
    } catch (error) {
      console.error("[create project] Upload error:", error);
      return redirectTo(request, `${BASE}/new?error=upload`);
    }

    // 7. Posisi project: paling akhir
    const last = await db
      .from("projects")
      .select("position")
      .order("position", { ascending: false })
      .limit(1);

    if (last.error) throw last.error;

    const position = (last.data?.[0]?.position ?? 0) + 1;

    // 8. Simpan project
    const insertProject = await db.from("projects").insert({
      id: projectId,
      category: fields.category,
      title: fields.title,
      type: fields.type,
      role: fields.role,
      tools: csv(formData.get("tools")),
      desc: fields.desc,
      highlights: lines(formData.get("highlights")),
      url: fields.url || null,
      repo: repo || null,
      position,
    });

    if (insertProject.error) throw insertProject.error;

    // 9. Simpan gambar
    if (uploaded.urls.length > 0) {
      const rows = uploaded.urls.map((src, index) => ({
        id: `${projectId}-${index + 1}`,
        project_id: projectId,
        position: index + 1,
        src,
      }));

      const insertImages = await db.from("project_images").insert(rows);

      if (insertImages.error) {
        // jangan tinggalkan project tanpa gambar-gambarnya
        await db.from("projects").delete().eq("id", projectId);
        throw insertImages.error;
      }
    }

    // 10. Berhasil
    revalidatePath(BASE);
    return redirectTo(request, BASE);
  } catch (error) {
    console.error("[create project] Error:", error);

    // jangan tinggalkan gambar yatim di bucket
    if (uploaded.paths.length) {
      try {
        await adminClient().storage.from(BUCKET).remove(uploaded.paths);
      } catch (cleanupError) {
        console.error("[create project] Cleanup error:", cleanupError);
      }
    }

    return redirectTo(request, `${BASE}/new?error=1`);
  }
}