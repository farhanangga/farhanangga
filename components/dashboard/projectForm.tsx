import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { ChevronDown, CircleAlert, GitBranch, Globe, Info } from "lucide-react";
import { getSession } from "@/lib/session";
import { Card } from "@/components/dashboard/shared";
import { ImageDropzone, SubmitButton } from "@/components/dashboard/imageDropzone";
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

type Tab = {
  id: string;
  label: string;
  projects: { id: string; type?: string; role?: string }[];
};

const BASE = "/dashboard/projects";

/* ── aturan penamaan ───────────────────────────────────────
 * ID project : 4 digit, mulai 0001  (0001, 0002, …)
 * File gambar: 8 digit, mulai 00000001, berurutan di seluruh bucket
 */
const ID_DIGITS = 4;
const IMG_DIGITS = 8;

const MAX_IMAGES = 10;
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB per gambar
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "projectsImages";

const errorMsg: Record<string, string> = {
  limit: `Maksimal ${MAX_IMAGES} gambar per project.`,
  type: "Hanya file gambar yang diterima.",
  size: "Ukuran tiap gambar maksimal 5 MB.",
  invalid: "Isian belum lengkap atau tidak valid. Periksa judul, kategori, jenis, peran, deskripsi, dan tautan.",
  upload: "Gambar gagal diunggah ke bucket. Periksa nama bucket dan service role key.",
  default: "Project gagal disimpan. Periksa isian form lalu coba lagi.",
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

/** Kategori "Software Engineer" (cocok pada id maupun label: software engineer / software-engineer / software_engineer). */
const SE_PATTERN = /software[\s_-]*engineer/i;
const isSoftwareEngineer = (t?: { id: string; label: string }) =>
  !!t && SE_PATTERN.test(`${t.id} ${t.label}`);

/* ── CSS khusus halaman ────────────────────────────────────
 * 1. Field repository tersembunyi, muncul bila opsi kategori ber-atribut
 *    data-repo sedang terpilih (memakai :has(), tanpa JavaScript).
 * 2. Dropdown kategori: select native di-upgrade dengan `appearance: base-select`
 *    (Chrome/Edge 135+). Browser lain tetap memakai select native yang sudah
 *    mengikuti warna tema.
 */
const PAGE_CSS = `
.project-form .repo-field { display: none; }
.project-form:has(#category option[data-repo]:checked) .repo-field { display: block; animation: repo-in .18s ease-out; }
@keyframes repo-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }

.cat-select { color-scheme: light dark; cursor: pointer; border: 0; }
.cat-select:has(option[value=""]:checked) { color: var(--fg-muted); }
.cat-select option { background: var(--card); color: var(--fg); }
.cat-select:open ~ .cat-chevron { transform: translateY(-50%) rotate(180deg); }

@supports (appearance: base-select) {
  .cat-select,
  .cat-select::picker(select) { appearance: base-select; }

  .cat-select {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    text-align: left;
    border: 0;
    box-sizing: border-box;
  }

  .cat-select::picker-icon { display: none; }

  .cat-select::picker(select) {
    box-sizing: border-box;
    width: anchor-size(width);
    margin-top: 6px;
    padding: 6px;
    border: 1px solid var(--chip);
    border-radius: 16px;
    background: var(--card);
    box-shadow: 0 20px 40px -16px rgba(0, 0, 0, 0.4);
    max-height: 16rem;
    overflow-y: auto;
    opacity: 0;
    transform: translateY(-6px);
    transition: opacity .16s ease, transform .16s ease, overlay .16s allow-discrete, display .16s allow-discrete;
  }
  .cat-select::picker(select):popover-open { opacity: 1; transform: none; }
  @starting-style {
    .cat-select::picker(select):popover-open { opacity: 0; transform: translateY(-6px); }
  }

  .cat-select option {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 12px;
    min-height: 40px;
    border-radius: 10px;
    font-size: 0.875rem;
    line-height: 1.25rem;
    background: transparent;
    color: var(--fg);
    cursor: pointer;
    transition: background-color .12s ease;
  }
  .cat-select option + option { margin-top: 2px; }
  .cat-select option[value=""] { display: none; }
  .cat-select option:hover,
  .cat-select option:focus-visible { background: var(--card-hi); outline: none; }
  .cat-select option:checked { background: color-mix(in srgb, #5A64D8 16%, transparent); font-weight: 600; }
  .cat-select option::checkmark { order: 1; margin-left: auto; color: #5A64D8; }
}
`;

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
    const [tabsRes, projectsRes] = await Promise.all([
      supabase.from("project_tabs").select("id, label").order("sort_order"),
      supabase.from("projects").select("id, category, type, role").order("position"),
    ]);
    if (tabsRes.error || projectsRes.error) {
      console.error("[new project] getTabs:", tabsRes.error?.message ?? projectsRes.error?.message);
      return [];
    }
    return (tabsRes.data ?? []).map((t) => ({
      id: t.id,
      label: t.label,
      projects: (projectsRes.data ?? [])
        .filter((p) => p.category === t.id)
        .map((p) => ({ id: p.id, type: p.type, role: p.role })),
    }));
  } catch (e) {
    console.error("[new project] getTabs:", e);
    return [];
  }
}

/** ID berikutnya: angka tertinggi yang sudah ada + 1, dipad 4 digit. */
function nextProjectId(tabs: Tab[]): string {
  const max = tabs
    .flatMap((t) => t.projects)
    .reduce((m, p) => (/^\d+$/.test(p.id) ? Math.max(m, Number(p.id)) : m), 0);
  return String(max + 1).padStart(ID_DIGITS, "0");
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

/* ── server action ─────────────────────────────────────── */

async function createProject(formData: FormData) {
  "use server";
  const session = await getSession();
  if (!session) redirect("/admin");

  /* 1. validasi file (murah, tanpa I/O) */
  const files = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > MAX_IMAGES) redirect(`${BASE}/new?error=limit`);
  if (files.some((f) => !f.type.startsWith("image/"))) redirect(`${BASE}/new?error=type`);
  if (files.some((f) => f.size > MAX_SIZE)) redirect(`${BASE}/new?error=size`);

  /* 2. validasi isian di server (atribut `required` di browser bisa dilewati) */
  const tabs = await getTabs();
  const fields = {
    title: text(formData.get("title")),
    category: text(formData.get("category")),
    type: text(formData.get("type")),
    role: text(formData.get("role")),
    desc: text(formData.get("desc")),
    url: text(formData.get("url")),
    repo: text(formData.get("repo")),
  };

  const selectedTab = tabs.find((t) => t.id === fields.category);
  // repository hanya berlaku untuk kategori Software Engineer
  const repo = isSoftwareEngineer(selectedTab) ? fields.repo : "";

  const valid =
    fields.title &&
    fields.type &&
    fields.role &&
    fields.desc &&
    selectedTab &&
    isOptionalHttpUrl(fields.url) &&
    isOptionalHttpUrl(repo);
  if (!valid) redirect(`${BASE}/new?error=invalid`);

  const id = nextProjectId(tabs);

  /* 3. unggah gambar — baru setelah semua isian valid, supaya tidak ada upload sia-sia */
  let uploaded: Uploaded;
  try {
    uploaded = await uploadImages(files);
  } catch (e) {
    console.error("[createProject] upload gagal:", e);
    redirect(`${BASE}/new?error=upload`);
  }

  /* 4. simpan langsung ke database */
  let ok = false;
  try {
    const db = adminClient();

    // kolom `position` NOT NULL → taruh di urutan paling akhir
    const last = await db.from("projects").select("position").order("position", { ascending: false }).limit(1);
    if (last.error) throw last.error;
    const position = (last.data?.[0]?.position ?? 0) + 1;

    const ins = await db.from("projects").insert({
      id,
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
    if (ins.error) throw ins.error;

    if (uploaded.urls.length > 0) {
      const rows = uploaded.urls.map((src, i) => ({
        id: `${id}-${i + 1}`,
        project_id: id,
        position: i + 1,
        src,
      }));
      const imgIns = await db.from("project_images").insert(rows);
      if (imgIns.error) {
        // jangan tinggalkan project tanpa gambar-gambarnya
        await db.from("projects").delete().eq("id", id);
        throw imgIns.error;
      }
    }
    ok = true;
  } catch (e) {
    console.error("[createProject] simpan gagal:", e);
  }

  if (!ok) {
    // jangan tinggalkan gambar yatim di bucket
    if (uploaded.paths.length) await bucket().remove(uploaded.paths).catch(() => {});
    redirect(`${BASE}/new?error=1`);
  }
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
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
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

async function Content({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  // halaman juga dijaga, bukan hanya server action-nya
  if (!(await getSession())) redirect("/admin");

  const { error } = await searchParams;
  const tabs = await getTabs();
  const nextId = nextProjectId(tabs);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PAGE_CSS }} />

      <h1 className="mt-0 text-center text-xl font-semibold tracking-tight sm:text-2xl lg:mt-4 lg:text-left">Tambah project</h1>
      <p className={`mt-1 hidden text-sm lg:block ${muted}`}>Isi detail project yang akan tampil di website portfolio.</p>

      {error && (
        <div
          role="alert"
          className="mt-6 flex items-start gap-3 rounded-2xl border border-[#E85B53]/30 bg-[#E85B53]/10 px-4 py-3 text-sm font-medium text-[#E85B53]"
        >
          <CircleAlert size={18} className="mt-px shrink-0" />
          {getErrorMsg(error)}
        </div>
      )}

      <form action={createProject} autoComplete="off" className="project-form mt-4 lg:mt-8">
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* kolom kiri: isi utama */}
          <div className="space-y-4">
            <Section title="Informasi dasar" desc="Identitas project di daftar dan halaman portfolio.">
              <Field label="Judul" htmlFor="title" required>
                <input id="title" name="title" required autoComplete="off" className={inputCls} placeholder="Nama project" />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Kategori"
                  htmlFor="category"
                  required
                  hint={tabs.length === 0 ? "Kategori gagal dimuat dari database." : undefined}
                >
                  <div className="relative">
                    <select
                      id="category"
                      name="category"
                      required
                      autoComplete="off"
                      defaultValue=""
                      className={`cat-select ${inputCls} appearance-none pr-10`}
                    >
                      <option value="" disabled>
                        Pilih kategori
                      </option>
                      {tabs.map((t) => (
                        <option key={t.id} value={t.id} data-repo={isSoftwareEngineer(t) ? "" : undefined}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={16}
                      className={`cat-chevron pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 transition-transform duration-200 ${muted}`}
                    />
                  </div>
                </Field>

                <Field label="Jenis" htmlFor="type" required>
                  <input id="type" name="type" required autoComplete="off" className={inputCls} placeholder="Website, Aplikasi mobile…" />
                </Field>
              </div>

              <Field label="Peran" htmlFor="role" required>
                <input id="role" name="role" required autoComplete="off" className={inputCls} placeholder="Front-end developer" />
              </Field>
            </Section>

            <Section title="Cerita project" desc="Ringkasan dan poin yang ingin ditonjolkan.">
              <Field label="Deskripsi" htmlFor="desc" required>
                <textarea id="desc" name="desc" rows={5} required autoComplete="off" className={areaCls} placeholder="Ceritakan singkat tentang project ini" />
              </Field>
              <Field label="Highlight" htmlFor="highlights" hint="Satu poin per baris.">
                <textarea id="highlights" name="highlights" rows={4} autoComplete="off" className={areaCls} placeholder={"Login dengan Google\nDashboard real-time"} />
              </Field>
            </Section>

            <Section title="Tech stack" desc="Tools dan teknologi yang dipakai.">
              <Field label="Tools" htmlFor="tools" hint="Tekan Enter atau koma untuk menambah.">
                <TagInput name="tools" placeholder="Next.js, Tailwind CSS, Supabase" />
              </Field>
            </Section>
          </div>

          {/* kolom kanan: media & tautan */}
          <div className="space-y-4">
            <Section title="Gambar" desc="Gambar pertama jadi cover.">
              <ImageDropzone max={MAX_IMAGES} maxSize={MAX_SIZE} />
            </Section>

            <Section title="Tautan" desc="Opsional.">
              <Field label="Live URL" htmlFor="url">
                <div className="relative">
                  <Globe size={16} className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 ${muted}`} />
                  <input id="url" name="url" type="url" autoComplete="off" className={`${inputCls} pl-10`} placeholder="https://" />
                </div>
              </Field>

              {/* hanya tampil jika kategori = Software Engineer (lihat PAGE_CSS) */}
              <Field
                label="URL Repositori"
                htmlFor="repo"
                className="repo-field"
                hint="Tautan GitHub / GitLab project ini."
              >
                <div className="relative">
                  <GitBranch size={16} className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 ${muted}`} />
                  <input
                    id="repo"
                    name="repo"
                    type="text"
                    inputMode="url"
                    autoComplete="off"
                    className={`${inputCls} pl-10`}
                    placeholder="https://github.com/…"
                  />
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
              ID dibuat otomatis: <strong className="font-semibold tabular-nums text-[color:var(--fg)]">{nextId}</strong>
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
              <SubmitButton>Simpan project</SubmitButton>
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

export default function NewProjectPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return (
    <Suspense fallback={<Skeleton />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}