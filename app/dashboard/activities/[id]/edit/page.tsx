import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { CalendarDays, CircleAlert, Info } from "lucide-react";
import { getSession } from "@/lib/session";
import { Card } from "@/components/dashboard/shared";
import { ImageDropzone, SubmitButton } from "@/components/dashboard/imageDropzone";
import { ExistingImages } from "@/components/dashboard/existingImages";
// Satu-satunya pintu data: handler GET (baca) dan POST (simpan, lewat action form) di route ini.
import { GET as getEditRoute } from "@/app/api/activities/[id]/edit/route";

/* Bar aksi tanpa hook / "use client":
 * - mobile  : fixed menempel di dasar layar, selebar layar
 * - desktop : sticky di dalam kolom konten, otomatis mengikuti lebar sidebar */
function BottomBar({ children }: { children: React.ReactNode }) {
  return (
    <>
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

type ActivityImage = { id: string; src: string; position: number };
type EditActivity = {
  id: string;
  nama_kegiatan: string;
  tahun: number | null;
  role: string;
  jobdesc: string;
  deskripsi: string;
  images: ActivityImage[];
};
type EditData = { activity: EditActivity };

const BASE = "/dashboard/activities";

// Batas ini hanya untuk komponen dropzone di browser. Validasi sebenarnya ada di route.
const MAX_IMAGES = 10;
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB per gambar

const errorMsg: Record<string, string> = {
  limit: `Total gambar (yang dipertahankan + yang baru) maksimal ${MAX_IMAGES} per activity.`,
  type: "Hanya file gambar yang diterima.",
  size: "Ukuran tiap gambar maksimal 5 MB.",
  invalid: "Isian belum lengkap atau tidak valid. Periksa nama kegiatan, tahun (1900–2100), role, jobdesc, dan deskripsi.",
  upload: "Gambar gagal diunggah ke bucket. Periksa nama bucket dan service role key.",
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

/* ── data: hanya lewat handler GET di route ────────────── */

async function fetchEditData(id: string): Promise<EditData | null> {
  try {
    const res = await getEditRoute(new Request("http://localhost"), {
      params: Promise.resolve({ id }),
    });

    if (res.status === 404) notFound();
    if (!res.ok) {
      console.error(`[edit activity] route gagal: ${res.status}`);
      return null;
    }

    const json = (await res.json()) as { data?: EditData };
    return json.data && json.data.activity ? json.data : null;
  } catch (e) {
    // notFound() melempar error khusus Next.js, jangan ditelan
    if (typeof e === "object" && e && "digest" in e) throw e;
    console.error("[edit activity] gagal memuat data:", e);
    return null;
  }
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

async function Content({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  // halaman juga dijaga, bukan hanya route-nya
  if (!(await getSession())) redirect("/admin");

  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const data = await fetchEditData(id);

  if (!data) {
    return (
      <div className="mt-8 rounded-2xl bg-[color:var(--card)] px-6 py-14 text-center text-sm text-[color:var(--fg-muted)]">
        Data activity belum bisa dimuat. Muat ulang halaman beberapa saat lagi.
      </div>
    );
  }

  const { activity } = data;
  const submitUrl = `/api/activities/${encodeURIComponent(activity.id)}/edit`;

  return (
    <>
      <h1 className="mt-0 text-center text-xl font-semibold tracking-tight sm:text-2xl lg:mt-4 lg:text-left">Edit activity</h1>
      <p className={`mt-1 hidden text-sm lg:block ${muted}`}>Ubah detail activity yang tampil di website portfolio.</p>

      {error && (
        <div
          role="alert"
          className="mt-6 flex items-start gap-3 rounded-2xl border border-[#E85B53]/30 bg-[#E85B53]/10 px-4 py-3 text-sm font-medium text-[#E85B53]"
        >
          <CircleAlert size={18} className="mt-px shrink-0" />
          {getErrorMsg(error)}
        </div>
      )}

      {/* Form dikirim langsung ke route POST (multipart), tanpa server action */}
      <form
        action={submitUrl}
        method="post"
        encType="multipart/form-data"
        autoComplete="off"
        className="activity-form mt-4 lg:mt-8"
      >
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* kolom kiri: isi utama */}
          <div className="space-y-4">
            <Section title="Informasi dasar" desc="Identitas activity di daftar dan halaman portfolio.">
              <Field label="Nama kegiatan" htmlFor="nama_kegiatan" required>
                <input
                  id="nama_kegiatan"
                  name="nama_kegiatan"
                  required
                  autoComplete="off"
                  defaultValue={activity.nama_kegiatan}
                  className={inputCls}
                  placeholder="Nama kegiatan"
                />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Role" htmlFor="role" required>
                  <input
                    id="role"
                    name="role"
                    required
                    autoComplete="off"
                    defaultValue={activity.role}
                    className={inputCls}
                    placeholder="Panitia, Anggota, Ketua…"
                  />
                </Field>

                <Field label="Tahun" htmlFor="tahun" hint="Opsional.">
                  <div className="relative">
                    <CalendarDays size={16} className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 ${muted}`} />
                    <input
                      id="tahun"
                      name="tahun"
                      type="number"
                      inputMode="numeric"
                      min={1900}
                      max={2100}
                      step={1}
                      autoComplete="off"
                      defaultValue={activity.tahun ?? ""}
                      className={`${inputCls} pl-10`}
                      placeholder="2025"
                    />
                  </div>
                </Field>
              </div>
            </Section>

            <Section title="Cerita activity" desc="Tugas dan ringkasan kegiatan.">
              <Field label="Jobdesc" htmlFor="jobdesc" required>
                <textarea
                  id="jobdesc"
                  name="jobdesc"
                  rows={4}
                  required
                  autoComplete="off"
                  defaultValue={activity.jobdesc}
                  className={areaCls}
                  placeholder="Tugas dan tanggung jawab kamu di kegiatan ini"
                />
              </Field>
              <Field label="Deskripsi" htmlFor="deskripsi" required>
                <textarea
                  id="deskripsi"
                  name="deskripsi"
                  rows={6}
                  required
                  autoComplete="off"
                  defaultValue={activity.deskripsi}
                  className={areaCls}
                  placeholder="Ceritakan singkat tentang kegiatan ini"
                />
              </Field>
            </Section>
          </div>

          {/* kolom kanan: media */}
          <div className="space-y-4">
            <Section
              title="Gambar"
              desc={`Gambar pertama jadi cover. Maksimal ${MAX_IMAGES} gambar per activity.`}
            >
              {activity.images.length > 0 && <ExistingImages images={activity.images} />}

              <div>
                {activity.images.length > 0 && <p className="mb-2 text-sm font-medium">Tambah gambar baru</p>}
                <ImageDropzone max={MAX_IMAGES} maxSize={MAX_SIZE} />
              </div>
            </Section>
          </div>
        </div>

        {/* aksi: bottom bar tetap di bawah layar */}
        <BottomBar>
          <p className={`hidden items-center gap-2.5 text-sm sm:flex ${muted}`}>
            <Info size={16} className="shrink-0" />
            <span>
              ID activity: <strong className="font-semibold tabular-nums text-[color:var(--fg)]">{activity.id}</strong>
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
          <div className="h-64 rounded-3xl bg-[color:var(--card)]" />
          <div className="h-56 rounded-3xl bg-[color:var(--card)]" />
        </div>
        <div className="space-y-4">
          <div className="h-64 rounded-3xl bg-[color:var(--card)]" />
        </div>
      </div>
    </div>
  );
}

export default function EditActivityPage({
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