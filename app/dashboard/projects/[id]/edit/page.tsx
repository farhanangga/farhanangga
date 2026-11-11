import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { ChevronDown, CircleAlert, GitBranch, Globe, Info } from "lucide-react";
import { getSession } from "@/lib/session";
import { Card } from "@/components/dashboard/shared";
import { ImageDropzone, SubmitButton } from "@/components/dashboard/image-dropzone";
import { ImageOrganizer } from "@/components/dashboard/imageOrganizer";
import { TagInput } from "@/components/dashboard/tagInput";

/* Bar aksi tanpa hook / "use client":
 * - mobile  : fixed menempel di dasar layar, selebar layar
 * - desktop : sticky di dalam kolom konten, otomatis mengikuti lebar sidebar */
function BottomBar({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* ruang kosong di mobile agar konten terakhir tidak tertutup bar fixed */}
      <div aria-hidden className="h-24 lg:hidden" />

      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-[color:var(--chip)] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-16px_40px_-20px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:px-8 lg:sticky lg:inset-x-auto lg:bottom-3 lg:mb-3 lg:mt-6 lg:rounded-2xl lg:border lg:px-6 lg:py-3"
        style={{ background: "color-mix(in srgb, var(--card) 90%, transparent)" }}
      >
        <div className="flex items-center justify-between gap-3">{children}</div>
      </div>
    </>
  );
}

type Project = {
  id: string;
  type?: string;
  role?: string;
  title?: string;
  tools?: string[];
  desc?: string;
  highlights?: string[];
  url?: string;
  repo?: string;
  images?: string[];
};

type Tab = {
  id: string;
  label: string;
  projects: Project[];
};

const BASE = "/dashboard/projects";
const editPath = (id: string) => `${BASE}/${encodeURIComponent(id)}/edit`;

const IMG_DIGITS = 8;
const MAX_IMAGES = 10;
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB per gambar
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "projectsImages";

const errorMsg: Record<string, string> = {
  limit: `Maksimal ${MAX_IMAGES} gambar per project (gambar lama yang dipertahankan ikut dihitung).`,
  type: "Hanya file gambar yang diterima.",
  size: "Ukuran tiap gambar maksimal 5 MB.",
  invalid: "Isian belum lengkap atau tidak valid. Periksa judul, kategori, jenis, peran, deskripsi, dan tautan.",
  upload: "Gambar gagal diunggah ke bucket. Periksa nama bucket dan secret key.",
  default: "Perubahan gagal disimpan. Periksa isian form lalu coba lagi.",
};

/** Aman terhadap query seperti ?error=constructor / ?error=toString. */
const getErrorMsg = (key?: string) =>
  key && Object.prototype.hasOwnProperty.call(errorMsg, key) ? errorMsg[key] : errorMsg.default;

/* token tema (lihat THEME_CSS di shared.tsx) */
const muted = "text-[color:var(--fg-muted)]";
const focus = "outline-none focus-visible:ring-2 focus-visible:ring-[#5A64D8]";
const field =
  "w-full rounded-2xl bg-[color:var(--card-hi)] text-sm text-[color:var(--fg)] outline-none ring-1 ring-transparent transition placeholder:text-[color:var(--fg-muted)] focus:ring-2 focus:ring-[#5A64D8]";
const inputCls = `${field} h-11 px-4`;
const areaCls = `${field} resize-y px-4 py-3`;

const lines = (v: FormDataEntryValue | null) =>
  String(v ?? "").split("\n").map((s) => s.trim()).filter(Boolean);
const csv = (v: FormDataEntryValue | null) =>
  String(v ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const text = (v: FormDataEntryValue | null) => String(v ?? "").trim();

/** URL opsional: kosong = valid, selain itu harus http(s). */
function isOptionalHttpUrl(v: string) {
  if (!v) return true;
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/* ── Supabase ──────────────────────────────────────────── */

// Client untuk membaca (publishable key, tunduk pada RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  { auth: { persistSession: false } }
);

// Client untuk menulis (secret key, hanya di server, melewati RLS)
function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SECRET_KEY belum di-set di .env.local");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/* ── data ──────────────────────────────────────────────── */

async function getTabs(): Promise<Tab[]> {
  try {
    const [tabsRes, projectsRes, imagesRes] = await Promise.all([
      supabase.from("project_tabs").select("id, label").order("sort_order"),
      supabase.from("projects").select("*").order("position"),
      supabase.from("project_images").select("project_id, position, src").order("position"),
    ]);
    if (tabsRes.error || projectsRes.error || imagesRes.error) {
      console.error(
        "[edit project] getTabs:",
        tabsRes.error?.message ?? projectsRes.error?.message ?? imagesRes.error?.message
      );
      return [];
    }

    // Kelompokkan gambar per proyek (maks 10, sudah terurut dari query)
    const imagesByProject = new Map<string, string[]>();
    for (const img of imagesRes.data ?? []) {
      const list = imagesByProject.get(img.project_id) ?? [];
      if (list.length < MAX_IMAGES) list.push(img.src);
      imagesByProject.set(img.project_id, list);
    }

    return (tabsRes.data ?? []).map((t) => ({
      id: t.id,
      label: t.label,
      projects: (projectsRes.data ?? [])
        .filter((r) => r.category === t.id)
        .map((r) => ({
          id: r.id,
          type: r.type,
          role: r.role,
          title: r.title,
          tools: r.tools ?? [],
          desc: r.desc,
          highlights: r.highlights ?? [],
          url: r.url ?? undefined,
          repo: r.repo ?? undefined,
          images: imagesByProject.get(r.id) ?? [],
        })),
    }));
  } catch (e) {
    console.error("[edit project] getTabs:", e);
    return [];
  }
}

/* ── penyimpanan gambar ────────────────────────────────── */

function bucket() {
  return adminClient().storage.from(BUCKET);
}

const extOf = (f: File) => {
  const dot = f.name.lastIndexOf(".");
  const raw = dot > -1 ? f.name.slice(dot + 1) : (f.type.split("/")[1] ?? "");
  return raw.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
};

/** Nomor gambar berikutnya: angka 8 digit tertinggi di root bucket + 1. */
async function nextImageNumber(store: ReturnType<typeof bucket>): Promise<number> {
  const { data, error } = await store.list("", { limit: 1000, sortBy: { column: "name", order: "desc" } });
  if (error) throw error;
  let max = 0;
  for (const f of data ?? []) {
    const m = new RegExp(`^(\\d{${IMG_DIGITS}})\\.`).exec(f.name);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

type Uploaded = { urls: string[]; paths: string[] };

/** Unggah berurutan (00000001.jpg, 00000002.png, …). Bentrok nama → nomor dinaikkan lalu dicoba lagi. */
async function uploadImages(files: File[]): Promise<Uploaded> {
  const urls: string[] = [];
  const paths: string[] = [];
  if (files.length === 0) return { urls, paths };

  const store = bucket();
  try {
    let n = await nextImageNumber(store);
    for (const file of files) {
      let saved = false;
      for (let attempt = 0; attempt < 5 && !saved; attempt++) {
        const path = `${String(n).padStart(IMG_DIGITS, "0")}.${extOf(file)}`;
        const { error } = await store.upload(path, file, { contentType: file.type, upsert: false });
        if (!error) {
          paths.push(path);
          urls.push(store.getPublicUrl(path).data.publicUrl);
          saved = true;
        } else if (/already exists|duplicate/i.test(error.message) || (error as { statusCode?: string }).statusCode === "409") {
          // dipakai pihak lain di saat yang sama → coba nomor berikutnya
        } else {
          throw error;
        }
        n++;
      }
      if (!saved) throw new Error("Nomor gambar bentrok terus-menerus");
    }
    return { urls, paths };
  } catch (e) {
    if (paths.length) await store.remove(paths).catch(() => {});
    throw e;
  }
}

/** URL publik → path di bucket. Hanya untuk file di bucket ini; selain itu null (tidak disentuh). */
function pathFromUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const i = url.indexOf(marker);
  if (i === -1) return null;
  try {
    return decodeURIComponent(url.slice(i + marker.length).split("?")[0]);
  } catch {
    return null;
  }
}

/* ── server action ─────────────────────────────────────── */

async function updateProject(formData: FormData) {
  "use server";
  const session = await getSession();
  if (!session) redirect("/admin");

  const id = text(formData.get("id"));
  if (!id) redirect(BASE);
  const back = editPath(id);

  /* 1. validasi file (murah, tanpa I/O) */
  const files = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > MAX_IMAGES) redirect(`${back}?error=limit`);
  if (files.some((f) => !f.type.startsWith("image/"))) redirect(`${back}?error=type`);
  if (files.some((f) => f.size > MAX_SIZE)) redirect(`${back}?error=size`);

  /* 2. project harus ada; gambar lama diambil dari server, bukan dari form */
  const tabs = await getTabs();
  const current = tabs.flatMap((t) => t.projects).find((p) => p.id === id);
  if (!current) redirect(BASE);

  /* 3. validasi isian di server */
  const fields = {
    title: text(formData.get("title")),
    category: text(formData.get("category")),
    type: text(formData.get("type")),
    role: text(formData.get("role")),
    desc: text(formData.get("desc")),
    url: text(formData.get("url")),
    repo: text(formData.get("repo")),
  };
  const valid =
    fields.title &&
    fields.type &&
    fields.role &&
    fields.desc &&
    tabs.some((t) => t.id === fields.category) &&
    isOptionalHttpUrl(fields.url) &&
    isOptionalHttpUrl(fields.repo);
  if (!valid) redirect(`${back}?error=invalid`);

  /* 4. gambar yang dipertahankan, sesuai urutan dari form.
   *    Hanya URL yang memang milik project ini yang diterima; sisanya (yang tidak dikirim) dianggap dihapus.
   *    Tanpa penanda `imagesManaged` (form tidak lengkap) semua gambar lama dipertahankan apa adanya. */
  const oldImages = current.images ?? [];
  let kept = oldImages;
  if (formData.has("imagesManaged")) {
    const known = new Set(oldImages);
    const seen = new Set<string>();
    kept = [];
    for (const v of formData.getAll("imageOrder")) {
      const src = String(v);
      if (known.has(src) && !seen.has(src)) {
        seen.add(src);
        kept.push(src);
      }
    }
  }
  const keptSet = new Set(kept);
  const removedUrls = oldImages.filter((src) => !keptSet.has(src));
  if (kept.length + files.length > MAX_IMAGES) redirect(`${back}?error=limit`);

  /* 5. unggah gambar baru */
  let uploaded: Uploaded;
  try {
    uploaded = await uploadImages(files);
  } catch (e) {
    console.error("[updateProject] upload gagal:", e);
    redirect(`${back}?error=upload`);
  }

  /* 6. simpan langsung ke database */
  const images = [...kept, ...uploaded.urls];
  let ok = false;
  try {
    const db = adminClient();

    // update baris project (position tidak diubah)
    const upd = await db
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
        repo: fields.repo || null,
      })
      .eq("id", id)
      .select("id");
    if (upd.error) throw upd.error;
    if (!upd.data || upd.data.length === 0) throw new Error("Project tidak ditemukan");

    // ganti seluruh gambar project (simpan salinan lama untuk pemulihan)
    const old = await db.from("project_images").select("id, project_id, position, src").eq("project_id", id);
    if (old.error) throw old.error;

    const del = await db.from("project_images").delete().eq("project_id", id);
    if (del.error) throw del.error;

    if (images.length > 0) {
      const rows = images.map((src, i) => ({ id: `${id}-${i + 1}`, project_id: id, position: i + 1, src }));
      const ins = await db.from("project_images").insert(rows);
      if (ins.error) {
        // kembalikan gambar lama agar project tidak kehilangan gambarnya
        if (old.data && old.data.length > 0) await db.from("project_images").insert(old.data);
        throw ins.error;
      }
    }
    ok = true;
  } catch (e) {
    console.error(`[updateProject] simpan project ${id} gagal:`, e);
  }

  if (!ok) {
    // gagal: buang gambar baru agar tidak jadi yatim di bucket
    if (uploaded.paths.length) await bucket().remove(uploaded.paths).catch(() => {});
    redirect(`${back}?error=1`);
  }

  /* 7. berhasil: hapus file gambar lama yang dibuang (hanya yang ada di bucket ini) */
  const stale = removedUrls.map(pathFromUrl).filter((p): p is string => !!p);
  if (stale.length) await bucket().remove(stale).catch(() => {});

  revalidatePath(BASE);
  redirect(BASE);
}

/* ── potongan UI ───────────────────────────────────────── */

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <Card className="p-6">
      <div className="mb-5">
        <h2 className="font-semibold">{title}</h2>
        {desc && <p className={`mt-0.5 text-sm ${muted}`}>{desc}</p>}
      </div>
      <div className="space-y-5">{children}</div>
    </Card>
  );
}

function Field({
  label,
  htmlFor,
  required,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 flex items-center gap-1 text-sm font-medium">
        {label}
        {required && (
          <span aria-hidden className="text-[#E85B53]">
            *
          </span>
        )}
      </label>
      {children}
      {hint && <p className={`mt-1.5 text-xs ${muted}`}>{hint}</p>}
    </div>
  );
}

/* ── halaman ───────────────────────────────────────────── */

async function Content({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  if (!(await getSession())) redirect("/admin");

  const { id } = await params;
  const { error } = await searchParams;
  const tabs = await getTabs();

  const all = tabs.flatMap((t) => t.projects);
  const project = all.find((p) => p.id === id);
  if (!project) notFound();

  const types = Array.from(new Set(all.map((p) => p.type).filter(Boolean))) as string[];
  const roles = Array.from(new Set(all.map((p) => p.role).filter(Boolean))) as string[];
  const category = tabs.find((t) => t.projects.some((p) => p.id === id))?.id ?? "";
  const images = project.images ?? [];

  return (
    <>
      <h1 className="mt-0 text-center text-xl font-semibold tracking-tight sm:text-2xl lg:mt-4 lg:text-left">Edit project</h1>
      <p className={`mt-1 hidden text-sm lg:block ${muted}`}>Ubah detail project yang tampil di website portfolio.</p>

      {error && (
        <div
          role="alert"
          className="mt-6 flex items-start gap-3 rounded-2xl border border-[#E85B53]/30 bg-[#E85B53]/10 px-4 py-3 text-sm font-medium text-[#E85B53]"
        >
          <CircleAlert size={18} className="mt-px shrink-0" />
          {getErrorMsg(error)}
        </div>
      )}

      <form action={updateProject} className="mt-4 lg:mt-8">
        <input type="hidden" name="id" value={id} />

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* kolom kiri: isi utama */}
          <div className="space-y-4">
            <Section title="Informasi dasar" desc="Identitas project di daftar dan halaman portfolio.">
              <Field label="Judul" htmlFor="title" required>
                <input id="title" name="title" required autoComplete="off" defaultValue={project.title ?? ""} className={inputCls} placeholder="Nama project" />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Kategori" htmlFor="category" required>
                  <div className="relative">
                    <select id="category" name="category" required defaultValue={category} className={`${inputCls} appearance-none pr-10`}>
                      <option value="" disabled>
                        Pilih kategori
                      </option>
                      {tabs.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} className={`pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 ${muted}`} />
                  </div>
                </Field>

                <Field label="Jenis" htmlFor="type" required>
                  <input id="type" name="type" required list="type-options" autoComplete="off" defaultValue={project.type ?? ""} className={inputCls} placeholder="Website, Aplikasi mobile…" />
                </Field>
              </div>

              <Field label="Peran" htmlFor="role" required>
                <input id="role" name="role" required list="role-options" autoComplete="off" defaultValue={project.role ?? ""} className={inputCls} placeholder="Front-end developer" />
              </Field>

              <datalist id="type-options">
                {types.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
              <datalist id="role-options">
                {roles.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </Section>

            <Section title="Cerita project" desc="Ringkasan dan poin yang ingin ditonjolkan.">
              <Field label="Deskripsi" htmlFor="desc" required>
                <textarea id="desc" name="desc" rows={5} required defaultValue={project.desc ?? ""} className={areaCls} placeholder="Ceritakan singkat tentang project ini" />
              </Field>
              <Field label="Highlight" htmlFor="highlights" hint="Satu poin per baris.">
                <textarea id="highlights" name="highlights" rows={4} defaultValue={(project.highlights ?? []).join("\n")} className={areaCls} placeholder={"Login dengan Google\nDashboard real-time"} />
              </Field>
            </Section>

            <Section title="Tech stack" desc="Tools dan teknologi yang dipakai.">
              <Field label="Tools" htmlFor="tools" hint="Tekan Enter atau koma untuk menambah.">
                <TagInput name="tools" defaultValue={project.tools ?? []} placeholder="Next.js, Tailwind CSS, Supabase" />
              </Field>
            </Section>
          </div>

          {/* kolom kanan: media & tautan */}
          <div className="space-y-4">
            <Section title="Gambar" desc="Atur urutan gambar. Yang pertama jadi cover.">
              <ImageOrganizer images={images} />
              <div>
                {images.length > 0 && <p className="mb-2 text-sm font-medium">Tambah gambar baru</p>}
                <ImageDropzone max={MAX_IMAGES} maxSize={MAX_SIZE} />
                {images.length > 0 && (
                  <p className={`mt-2 text-xs ${muted}`}>
                    Gambar baru ditambahkan di urutan akhir. Simpan dulu, lalu buka halaman edit lagi untuk mengubah urutannya.
                  </p>
                )}
              </div>
            </Section>

            <Section title="Tautan" desc="Opsional.">
              <Field label="Live URL" htmlFor="url">
                <div className="relative">
                  <Globe size={16} className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 ${muted}`} />
                  <input id="url" name="url" type="url" defaultValue={project.url ?? ""} className={`${inputCls} pl-10`} placeholder="https://" />
                </div>
              </Field>
              <Field label="Repository" htmlFor="repo">
                <div className="relative">
                  <GitBranch size={16} className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 ${muted}`} />
                  <input id="repo" name="repo" type="url" defaultValue={project.repo ?? ""} className={`${inputCls} pl-10`} placeholder="https://github.com/…" />
                </div>
              </Field>
            </Section>
          </div>
        </div>

        {/* aksi: bottom bar tetap di bawah layar */}
        <BottomBar>
          <p className={`hidden items-center gap-2.5 text-sm sm:flex ${muted}`}>
            <Info size={16} className="shrink-0" />
            <span>
              ID project: <strong className="font-semibold tabular-nums text-[color:var(--fg)]">{id}</strong>
            </span>
          </p>
          <div className="flex w-full gap-3 sm:w-auto">
            <Link
              href={BASE}
              className={`grid h-12 shrink-0 place-items-center rounded-2xl bg-[color:var(--card-hi)] px-6 text-sm font-medium ${muted} transition hover:text-[color:var(--fg)] ${focus}`}
            >
              Batal
            </Link>
            <div className="flex flex-1 sm:flex-none [&>button]:flex-1">
              <SubmitButton>Simpan perubahan</SubmitButton>
            </div>
          </div>
        </BottomBar>
      </form>
    </>
  );
}

function Skeleton() {
  const pulse = "animate-pulse motion-reduce:animate-none";
  return (
    <div role="status" aria-busy="true" aria-label="Memuat form" className={pulse}>
      <div className="h-5 w-48 rounded bg-[color:var(--chip)]" />
      <div className="mt-4 h-9 w-56 rounded-xl bg-[color:var(--chip)]" />
      <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <div className="h-80 rounded-3xl bg-[color:var(--card)]" />
          <div className="h-72 rounded-3xl bg-[color:var(--card)]" />
        </div>
        <div className="space-y-4">
          <div className="h-64 rounded-3xl bg-[color:var(--card)]" />
          <div className="h-48 rounded-3xl bg-[color:var(--card)]" />
        </div>
      </div>
    </div>
  );
}

export default function EditProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <Suspense fallback={<Skeleton />}>
      <Content params={params} searchParams={searchParams} />
    </Suspense>
  );
}