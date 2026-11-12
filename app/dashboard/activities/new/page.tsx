import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { CircleAlert, Info } from "lucide-react";
import { getSession } from "@/lib/session";
import { Card } from "@/components/dashboard/shared";
import { ImageDropzone, SubmitButton } from "@/components/dashboard/imageDropzone";
// Satu-satunya pintu data: handler GET (baca) dan POST (simpan, lewat action form) di route ini.
import { GET as getFormDataRoute } from "@/app/api/activities/create/route";

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

type FormData_ = { nextId: string };

const BASE = "/dashboard/activities";
const SUBMIT_URL = "/api/activities/create";

// Batas ini hanya untuk komponen dropzone di browser. Validasi sebenarnya ada di route.
const MAX_IMAGES = 10;
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB per gambar

const errorMsg: Record<string, string> = {
  limit: `Maksimal ${MAX_IMAGES} gambar per kegiatan.`,
  type: "Hanya file gambar yang diterima.",
  size: "Ukuran tiap gambar maksimal 5 MB.",
  invalid: "Isian belum lengkap atau tidak valid. Periksa nama kegiatan, tahun (4 digit), peran, dan deskripsi.",
  upload: "Gambar gagal diunggah ke bucket. Periksa nama bucket dan service role key.",
  default: "Kegiatan gagal disimpan. Periksa isian form lalu coba lagi.",
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

async function fetchFormData(): Promise<FormData_ | null> {
  try {
    const res = await getFormDataRoute();
    if (!res.ok) {
      console.error(`[new activity] route gagal: ${res.status}`);
      return null;
    }
    const json = (await res.json()) as { data?: FormData_ };
    return json.data && typeof json.data.nextId === "string" ? json.data : null;
  } catch (e) {
    console.error("[new activity] gagal memuat data form:", e);
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

async function Content({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  // halaman juga dijaga, bukan hanya route-nya
  if (!(await getSession())) redirect("/admin");

  const { error } = await searchParams;
  const data = await fetchFormData();
  const nextId = data?.nextId ?? "-";

  return (
    <>
      <h1 className="mt-0 text-center text-xl font-semibold tracking-tight sm:text-2xl lg:mt-4 lg:text-left">Tambah kegiatan</h1>
      <p className={`mt-1 hidden text-sm lg:block ${muted}`}>
        Isi detail kegiatan atau kepanitiaan yang akan tampil di website portfolio.
      </p>

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
        action={SUBMIT_URL}
        method="post"
        encType="multipart/form-data"
        autoComplete="off"
        className="mt-4 lg:mt-8"
      >
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* kolom kiri: isi utama */}
          <div className="space-y-4">
            <Section title="Informasi dasar" desc="Identitas kegiatan di daftar dan halaman portfolio.">
              <Field label="Nama kegiatan" htmlFor="nama_kegiatan" required>
                <input
                  id="nama_kegiatan"
                  name="nama_kegiatan"
                  required
                  autoComplete="off"
                  className={inputCls}
                  placeholder="Nama kegiatan atau kepanitiaan"
                />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Peran" htmlFor="role" required>
                  <input id="role" name="role" required autoComplete="off" className={inputCls} placeholder="Operator, Ketua pelaksana…" />
                </Field>

                <Field label="Tahun" htmlFor="tahun" hint="Opsional. Tanpa tahun, kegiatan tampil paling bawah.">
                  <input
                    id="tahun"
                    name="tahun"
                    type="text"
                    inputMode="numeric"
                    pattern="\d{4}"
                    maxLength={4}
                    autoComplete="off"
                    className={inputCls}
                    placeholder="2025"
                    title="Tahun 4 digit, contoh 2025"
                  />
                </Field>
              </div>
            </Section>

            <Section title="Cerita kegiatan" desc="Ringkasan dan tanggung jawab yang ingin ditonjolkan.">
              <Field label="Deskripsi" htmlFor="deskripsi" required>
                <textarea
                  id="deskripsi"
                  name="deskripsi"
                  rows={5}
                  required
                  autoComplete="off"
                  className={areaCls}
                  placeholder="Ceritakan singkat tentang kegiatan ini"
                />
              </Field>
              <Field label="Tanggung jawab" htmlFor="jobdesc" hint="Satu poin per baris.">
                <textarea
                  id="jobdesc"
                  name="jobdesc"
                  rows={5}
                  autoComplete="off"
                  className={areaCls}
                  placeholder={"Mengoperasikan perangkat presentasi\nMemastikan materi sesuai rundown"}
                />
              </Field>
            </Section>
          </div>

          {/* kolom kanan: gambar */}
          <div className="space-y-4">
            <Section title="Gambar" desc="Gambar pertama jadi cover.">
              <ImageDropzone max={MAX_IMAGES} maxSize={MAX_SIZE} />
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
              <SubmitButton>Simpan kegiatan</SubmitButton>
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
          <div className="h-80 rounded-3xl bg-[color:var(--card)]" />
        </div>
        <div className="h-64 rounded-3xl bg-[color:var(--card)]" />
      </div>
    </div>
  );
}

export default function NewActivityPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return (
    <Suspense fallback={<Skeleton />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}