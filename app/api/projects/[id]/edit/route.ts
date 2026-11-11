import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/session";

const BASE = "/dashboard/projects";
const IMG_DIGITS = 8;
const MAX_IMAGES = 10;
const MAX_SIZE = 5 * 1024 * 1024;
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "projectsImages";

type Ctx = { params: Promise<{ id: string }> };

type Tab = { id: string; label: string };
type ImageRow = { id: string; src: string; position: number };
type ProjectRow = {
  id: string;
  category: string;
  title: string;
  type: string;
  role: string;
  tools: string[] | null;
  desc: string;
  highlights: string[] | null;
  url: string | null;
  repo: string | null;
};
type Uploaded = { urls: string[]; paths: string[] };

const PROJECT_COLUMNS = "id, category, title, type, role, tools, desc, highlights, url, repo";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error("Konfigurasi Supabase server belum lengkap.");
  }

  return createClient(url, key, { auth: { persistSession: false } });
}

type Db = ReturnType<typeof adminClient>;

const text = (value: FormDataEntryValue | null) => String(value ?? "").trim();

const csv = (value: FormDataEntryValue | null) =>
  String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const lines = (value: FormDataEntryValue | null) =>
  String(value ?? "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

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

function extOf(file: File) {
  const dot = file.name.lastIndexOf(".");
  const raw = dot > -1 ? file.name.slice(dot + 1) : file.type.split("/")[1] ?? "";
  return raw.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
}

/** Path file di bucket dari public URL. Null jika bukan file milik bucket ini. */
function storagePathFromUrl(src: string) {
  const marker = `/${BUCKET}/`;
  const i = src.indexOf(marker);
  if (i === -1) return null;
  const path = decodeURIComponent(src.slice(i + marker.length).split("?")[0]);
  return path || null;
}

async function getProject(db: Db, id: string) {
  const { data, error } = await db
    .from("projects")
    .select(PROJECT_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as ProjectRow | null) ?? null;
}

async function getImages(db: Db, id: string) {
  const { data, error } = await db
    .from("project_images")
    .select("id, src, position")
    .eq("project_id", id)
    .order("position");
  if (error) throw error;
  return (data ?? []) as ImageRow[];
}

async function getTabs(db: Db) {
  const { data, error } = await db.from("project_tabs").select("id, label").order("sort_order");
  if (error) throw error;
  return (data ?? []) as Tab[];
}

/** Unggah berurutan (00000001.jpg, 00000002.png, …). Bentrok nama → nomor dinaikkan lalu dicoba lagi. */
async function uploadImages(db: Db, files: File[]): Promise<Uploaded> {
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

      if (!saved) throw new Error("Nomor gambar bentrok terus-menerus.");
    }

    return { urls, paths };
  } catch (error) {
    if (paths.length) await store.remove(paths).catch(() => {});
    throw error;
  }
}

/* ── GET: data untuk form edit (project + gambar + kategori) ── */

export async function GET(_request: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const db = adminClient();
    const [project, images, tabs] = await Promise.all([
      getProject(db, id),
      getImages(db, id),
      getTabs(db),
    ]);

    if (!project) {
      return NextResponse.json({ error: "Project tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ data: { tabs, project: { ...project, images } } });
  } catch (error) {
    console.error("[edit project] GET error:", error);
    return NextResponse.json({ error: "Gagal memuat data project." }, { status: 500 });
  }
}

/* ── POST: simpan perubahan ────────────────────────────── */

export async function POST(request: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session) return redirectTo(request, "/admin");

  const { id } = await params;
  const editUrl = `${BASE}/${encodeURIComponent(id)}/edit`;

  let uploaded: Uploaded = { urls: [], paths: [] };
  let backup: ProjectRow | null = null;
  let projectUpdated = false;

  try {
    const formData = await request.formData();
    const db = adminClient();

    // 1. Project harus ada
    const [project, oldImages, tabs] = await Promise.all([
      getProject(db, id),
      getImages(db, id),
      getTabs(db),
    ]);
    if (!project) return redirectTo(request, `${BASE}?error=notfound`);
    backup = project;

    // 2. Gambar: yang dihapus, yang dipertahankan (sesuai urutan dari form), dan yang baru
    const removeIds = new Set(formData.getAll("remove").map(String));
    const orderIds = formData.getAll("order").map(String);
    const rank = new Map(orderIds.map((value, index) => [value, index] as const));

    const keptOriginal = oldImages.filter((img) => !removeIds.has(img.id));
    // id yang tidak ada di `order` (seharusnya tidak terjadi) ditaruh di belakang, urutan lama dipertahankan
    const kept = [...keptOriginal].sort(
      (a, b) =>
        (rank.get(a.id) ?? 1_000_000 + a.position) - (rank.get(b.id) ?? 1_000_000 + b.position)
    );
    const removed = oldImages.filter((img) => removeIds.has(img.id));
    const reordered = kept.some((img, index) => img.id !== keptOriginal[index].id);

    const files = formData
      .getAll("images")
      .filter((file): file is File => file instanceof File && file.size > 0);

    if (kept.length + files.length > MAX_IMAGES) {
      return redirectTo(request, `${editUrl}?error=limit`);
    }
    if (files.some((file) => !file.type.startsWith("image/"))) {
      return redirectTo(request, `${editUrl}?error=type`);
    }
    if (files.some((file) => file.size > MAX_SIZE)) {
      return redirectTo(request, `${editUrl}?error=size`);
    }

    // 3. Isian
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

    const valid =
      fields.title &&
      fields.category &&
      fields.type &&
      fields.role &&
      fields.desc &&
      selectedTab &&
      isOptionalHttpUrl(fields.url) &&
      isOptionalHttpUrl(repo);

    if (!valid) return redirectTo(request, `${editUrl}?error=invalid`);

    // 4. Unggah gambar baru (setelah semua isian valid)
    try {
      uploaded = await uploadImages(db, files);
    } catch (error) {
      console.error("[edit project] Upload error:", error);
      return redirectTo(request, `${editUrl}?error=upload`);
    }

    // 5. Perbarui data project (posisi urutan project tidak diubah)
    const update = await db
      .from("projects")
      .update({
        category: fields.category,
        title: fields.title,
        type: fields.type,
        role: fields.role,
        tools: csv(formData.get("tools")),
        desc: fields.desc,
        highlights: lines(formData.get("highlights")),
        url: fields.url || null,
        repo: repo || null,
      })
      .eq("id", id);
    if (update.error) throw update.error;
    projectUpdated = true;

    // 6. Susun ulang gambar bila ada yang dihapus, ditambah, atau diurutkan ulang
    const imagesChanged = removed.length > 0 || uploaded.urls.length > 0 || reordered;

    if (imagesChanged) {
      const finalSrcs = [...kept.map((img) => img.src), ...uploaded.urls];
      const rows = finalSrcs.map((src, index) => ({
        id: `${id}-${index + 1}`,
        project_id: id,
        position: index + 1,
        src,
      }));

      const del = await db.from("project_images").delete().eq("project_id", id);
      if (del.error) throw del.error;

      if (rows.length > 0) {
        const ins = await db.from("project_images").insert(rows);
        if (ins.error) {
          // kembalikan baris gambar lama supaya project tidak kehilangan gambar
          const restore = await db.from("project_images").insert(
            oldImages.map((img) => ({
              id: img.id,
              project_id: id,
              position: img.position,
              src: img.src,
            }))
          );
          if (restore.error) {
            console.error("[edit project] Restore gambar gagal:", restore.error);
          }
          throw ins.error;
        }
      }
    }

    // 7. Hapus file gambar yang dibuang dari bucket (terbaik-usaha, tidak membatalkan simpan)
    if (removed.length > 0) {
      try {
        const paths = removed
          .map((img) => storagePathFromUrl(img.src))
          .filter((p): p is string => !!p);
        if (paths.length) await db.storage.from(BUCKET).remove(paths);
      } catch (cleanupError) {
        console.error("[edit project] Hapus file lama gagal:", cleanupError);
      }
    }

    revalidatePath(BASE);
    revalidatePath(editUrl);
    revalidatePath("/projects");
    revalidatePath("/");
    return redirectTo(request, BASE);
  } catch (error) {
    console.error("[edit project] Error:", error);

    try {
      const db = adminClient();

      // batalkan perubahan data project
      if (projectUpdated && backup) {
        const { id: _id, ...original } = backup;
        await db.from("projects").update(original).eq("id", id);
      }

      // jangan tinggalkan gambar baru yatim di bucket
      if (uploaded.paths.length) {
        await db.storage.from(BUCKET).remove(uploaded.paths);
      }
    } catch (cleanupError) {
      console.error("[edit project] Cleanup error:", cleanupError);
    }

    return redirectTo(request, `${editUrl}?error=1`);
  }
}