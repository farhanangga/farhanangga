import { redirect } from "next/navigation";
import { CircleAlert, CircleCheck, Info } from "lucide-react";
import { getSession } from "@/lib/session";
import { Card } from "@/components/dashboard/shared";
import { SubmitButton } from "@/components/dashboard/imageDropzone";
// Satu-satunya pintu data: handler GET di route ini. Penyimpanan lewat action form ke route yang sama (POST).
import { GET as getExperienceRoute } from "@/app/api/landingPage/experience/edit/route";

/* ══════════════════════════════════════════════════════════
 * PENGALAMAN KERJA, ORGANISASI, SERTIFIKAT & PENGHARGAAN
 * Tiga tabel: landing_experience, landing_organization, landing_award.
 * Data dibaca lewat GET api/landingPage/experience/edit; tiap kartu punya form sendiri
 * yang di-POST ke route yang sama (field "section").
 * - Edit : buka sebuah baris, ubah isinya, lalu simpan.
 * - Tambah: isi baris "Tambah ... baru" di paling bawah tiap kartu.
 * - Hapus : centang "Hapus baris ini saat disimpan", lalu simpan.
 * - Urutan tampil mengikuti angka "Urutan" (kecil di atas).
 * ══════════════════════════════════════════════════════════ */

export type ExperienceParams = { saved?: string; error?: string };

type ExpRow = {
  id: string;
  position: number;
  jabatan: string;
  perusahaan: string;
  lokasi: string;
  tipe: string | null;
  mulai: string;
  selesai: string | null;
  deskripsi: string[];
  teknologi: string[];
};
type OrgRow = { id: string; position: number; jabatan: string; lembaga: string; periode: string };
type AwardRow = { id: string; position: number; judul: string; penerbit: string; tahun: string };
type ExperienceData = { experiences: ExpRow[]; orgs: OrgRow[]; awards: AwardRow[] };

const API_EXPERIENCE = "/api/landingPage/experience/edit";
const NEW_ROWS = 2; // jumlah baris kosong untuk menambah data baru per kartu

const TIPE_OPTIONS = [
  { value: "fulltime", label: "Full-time" },
  { value: "internship", label: "Internship" },
  { value: "freelance", label: "Freelance" },
];

const SAVED_LABEL: Record<string, string> = {
  experience: "Pengalaman kerja",
  organization: "Organisasi",
  award: "Sertifikat dan penghargaan",
};

const errorMsg: Record<string, string> = {
  experience_invalid:
    "Isian pengalaman kerja belum valid. Jabatan, perusahaan, lokasi, tipe, dan tanggal mulai wajib diisi; tanggal selesai tidak boleh sebelum mulai.",
  experience_save: "Pengalaman kerja gagal disimpan. Periksa tabel landing_experience dan service role key.",
  org_invalid: "Isian organisasi belum valid. Jabatan, lembaga, dan periode wajib diisi.",
  org_save: "Organisasi gagal disimpan. Periksa tabel landing_organization dan service role key.",
  award_invalid: "Isian penghargaan belum valid. Judul, penerbit, dan tahun wajib diisi.",
  award_save: "Penghargaan gagal disimpan. Periksa tabel landing_award dan service role key.",
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

/* ── potongan UI kecil ─────────────────────────────────── */

function CardHead({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="mb-5">
      <h2 className="font-semibold">{title}</h2>
      {desc && <p className={`mt-0.5 text-sm ${muted}`}>{desc}</p>}
    </div>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 flex items-center gap-1 text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && <p className={`mt-1.5 text-xs ${muted}`}>{hint}</p>}
    </div>
  );
}

/* ── data ──────────────────────────────────────────────── */

/** jsonb bisa datang sebagai array, string JSON, atau kosong → selalu string[]. */
function toArr(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === "string") {
    try {
      const p = JSON.parse(v);
      return Array.isArray(p) ? p.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** null = gagal memuat. */
async function fetchExperienceData(): Promise<ExperienceData | null> {
  try {
    const res = await getExperienceRoute();
    if (!res.ok) {
      console.error(`[experience dashboard] route gagal: ${res.status}`);
      return null;
    }
    const json = (await res.json()) as {
      data?: { experiences?: Record<string, unknown>[]; orgs?: OrgRow[]; awards?: AwardRow[] };
    };
    const s = (v: unknown) => (v == null ? "" : String(v));
    return {
      // dinormalkan di sini juga, supaya halaman tidak error bila bentuk data dari route berbeda
      experiences: (json.data?.experiences ?? []).map((r) => ({
        id: s(r.id),
        position: Number(r.position) || 0,
        jabatan: s(r.jabatan),
        perusahaan: s(r.perusahaan),
        lokasi: s(r.lokasi),
        tipe: r.tipe ? s(r.tipe) : null,
        mulai: s(r.mulai).slice(0, 10),
        selesai: r.selesai ? s(r.selesai).slice(0, 10) : null,
        deskripsi: toArr(r.deskripsi),
        teknologi: toArr(r.teknologi),
      })),
      orgs: json.data?.orgs ?? [],
      awards: json.data?.awards ?? [],
    };
  } catch (err) {
    console.error("[experience dashboard]", err);
    return null;
  }
}

/* ── baris form ────────────────────────────────────────── */

/** Pembungkus satu baris: ringkasan yang bisa dibuka, field id/urutan, dan kotak hapus. */
function RowShell({
  prefix,
  i,
  row,
  title,
  sub,
  children,
}: {
  prefix: string;
  i: number;
  row?: { id: string; position: number };
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  const key = `${prefix}.${i}`;
  return (
    <details className="group rounded-2xl bg-[color:var(--card-hi)]">
      <summary
        className={`flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm [&::-webkit-details-marker]:hidden ${focus}`}
      >
        <span className="min-w-0">
          <span className="block truncate font-medium">{title}</span>
          {sub && <span className={`block truncate text-xs ${muted}`}>{sub}</span>}
        </span>
        <span className={`shrink-0 text-xs ${muted}`}>{row ? `#${row.position}` : "Baru"}</span>
      </summary>

      <div className="space-y-4 border-t border-[color:var(--chip)] px-4 py-4">
        {row && <input type="hidden" name={`${key}.id`} value={row.id} />}
        {children}

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="w-28">
            <Field label="Urutan" htmlFor={`${key}-urutan`} hint="Kecil tampil di atas.">
              <input
                id={`${key}-urutan`}
                name={`${key}.urutan`}
                type="number"
                min={1}
                max={999}
                defaultValue={row?.position}
                className={inputCls}
                placeholder="Akhir"
              />
            </Field>
          </div>
          {row && (
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[#E85B53]">
              <input type="checkbox" name={`${key}.hapus`} value="1" className="h-4 w-4 accent-[#E85B53]" />
              Hapus baris ini saat disimpan
            </label>
          )}
        </div>
      </div>
    </details>
  );
}

function ExpFields({ i, row }: { i: number; row?: ExpRow }) {
  const k = `exp.${i}`;
  return (
    <RowShell
      prefix="exp"
      i={i}
      row={row}
      title={row ? row.jabatan : "Tambah pengalaman baru"}
      sub={row ? `${row.perusahaan} · ${row.lokasi}` : "Kosongkan semua isian bila tidak ingin menambah."}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Jabatan" htmlFor={`${k}-jabatan`}>
          <input id={`${k}-jabatan`} name={`${k}.jabatan`} maxLength={120} defaultValue={row?.jabatan} className={inputCls} placeholder="Frontend Developer" />
        </Field>
        <Field label="Perusahaan" htmlFor={`${k}-perusahaan`}>
          <input id={`${k}-perusahaan`} name={`${k}.perusahaan`} maxLength={120} defaultValue={row?.perusahaan} className={inputCls} placeholder="PT Contoh Teknologi" />
        </Field>
        <Field label="Lokasi" htmlFor={`${k}-lokasi`}>
          <input id={`${k}-lokasi`} name={`${k}.lokasi`} maxLength={120} defaultValue={row?.lokasi} className={inputCls} placeholder="Bandung, Indonesia" />
        </Field>
        <Field label="Tipe" htmlFor={`${k}-tipe`}>
          <select id={`${k}-tipe`} name={`${k}.tipe`} defaultValue={row?.tipe ?? "fulltime"} className={inputCls}>
            {TIPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Mulai" htmlFor={`${k}-mulai`}>
          <input id={`${k}-mulai`} name={`${k}.mulai`} type="date" defaultValue={row?.mulai} className={inputCls} />
        </Field>
        <Field label="Selesai" htmlFor={`${k}-selesai`} hint="Kosongkan bila masih aktif.">
          <input id={`${k}-selesai`} name={`${k}.selesai`} type="date" defaultValue={row?.selesai ?? ""} className={inputCls} />
        </Field>
      </div>

      <Field label="Deskripsi" htmlFor={`${k}-deskripsi`} hint="Satu poin per baris. Maksimal 12 poin.">
        <textarea
          id={`${k}-deskripsi`}
          name={`${k}.deskripsi`}
          rows={5}
          defaultValue={row?.deskripsi.join("\n")}
          className={areaCls}
          placeholder={"Membangun halaman dengan Next.js\nMenghubungkan REST API"}
        />
      </Field>

      <Field label="Teknologi" htmlFor={`${k}-teknologi`} hint="Pisahkan dengan koma. Maksimal 20.">
        <input id={`${k}-teknologi`} name={`${k}.teknologi`} defaultValue={row?.teknologi.join(", ")} className={inputCls} placeholder="React.js, Next.js, TypeScript" />
      </Field>
    </RowShell>
  );
}

function OrgFields({ i, row }: { i: number; row?: OrgRow }) {
  const k = `org.${i}`;
  return (
    <RowShell
      prefix="org"
      i={i}
      row={row}
      title={row ? row.jabatan : "Tambah organisasi baru"}
      sub={row ? `${row.lembaga} · ${row.periode}` : "Kosongkan semua isian bila tidak ingin menambah."}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Jabatan" htmlFor={`${k}-jabatan`}>
          <input id={`${k}-jabatan`} name={`${k}.jabatan`} maxLength={120} defaultValue={row?.jabatan} className={inputCls} placeholder="Staf Divisi Kominfo" />
        </Field>
        <Field label="Lembaga" htmlFor={`${k}-lembaga`}>
          <input id={`${k}-lembaga`} name={`${k}.lembaga`} maxLength={120} defaultValue={row?.lembaga} className={inputCls} placeholder="DPM UPI Cibiru" />
        </Field>
        <Field label="Periode" htmlFor={`${k}-periode`}>
          <input id={`${k}-periode`} name={`${k}.periode`} maxLength={40} defaultValue={row?.periode} className={inputCls} placeholder="2024 – 2025" />
        </Field>
      </div>
    </RowShell>
  );
}

function AwardFields({ i, row }: { i: number; row?: AwardRow }) {
  const k = `awd.${i}`;
  return (
    <RowShell
      prefix="awd"
      i={i}
      row={row}
      title={row ? row.judul : "Tambah sertifikat / penghargaan baru"}
      sub={row ? `${row.penerbit} · ${row.tahun}` : "Kosongkan semua isian bila tidak ingin menambah."}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Judul" htmlFor={`${k}-judul`}>
            <input id={`${k}-judul`} name={`${k}.judul`} maxLength={160} defaultValue={row?.judul} className={inputCls} placeholder="Belajar Dasar AI" />
          </Field>
        </div>
        <Field label="Penerbit" htmlFor={`${k}-penerbit`}>
          <input id={`${k}-penerbit`} name={`${k}.penerbit`} maxLength={120} defaultValue={row?.penerbit} className={inputCls} placeholder="Dicoding" />
        </Field>
        <Field label="Tahun" htmlFor={`${k}-tahun`}>
          <input id={`${k}-tahun`} name={`${k}.tahun`} maxLength={20} defaultValue={row?.tahun} className={inputCls} placeholder="2025" />
        </Field>
      </div>
    </RowShell>
  );
}

/** Satu kartu form: daftar baris + baris kosong untuk tambah + tombol simpan. */
function ListCard({
  section,
  title,
  desc,
  buttonLabel,
  children,
}: {
  section: string;
  title: string;
  desc: string;
  buttonLabel: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="mt-4 p-6">
      <CardHead title={title} desc={desc} />
      <form action={API_EXPERIENCE} method="post" autoComplete="off" className="space-y-3">
        <input type="hidden" name="section" value={section} />
        {children}
        <div className="flex items-center justify-between gap-3 border-t border-[color:var(--chip)] pt-5">
          <p className={`hidden items-center gap-2 text-sm sm:flex ${muted}`}>
            <Info size={16} className="shrink-0" />
            Klik baris untuk mengedit. Tambah lewat baris &ldquo;Baru&rdquo;, hapus lewat kotak centang.
          </p>
          <div className="ml-auto">
            <SubmitButton>{buttonLabel}</SubmitButton>
          </div>
        </div>
      </form>
    </Card>
  );
}

/* ── komponen utama ────────────────────────────────────── */

export async function ExperiencePanel({ searchParams }: { searchParams: Promise<ExperienceParams> }) {
  // halaman juga dijaga, bukan hanya route-nya
  if (!(await getSession())) redirect("/admin");

  const { saved, error } = await searchParams;
  const data = await fetchExperienceData();

  if (!data) {
    return (
      <div
        role="alert"
        className="mt-5 flex items-start gap-3 rounded-2xl border border-[#E85B53]/30 bg-[#E85B53]/10 px-4 py-3 text-sm font-medium text-[#E85B53]"
      >
        <CircleAlert size={18} className="mt-px shrink-0" />
        Data pengalaman gagal dimuat. Pastikan tabel landing_experience, landing_organization, dan landing_award sudah
        dibuat, lalu muat ulang halaman.
      </div>
    );
  }

  const { experiences, orgs, awards } = data;
  const savedLabel = saved && Object.prototype.hasOwnProperty.call(SAVED_LABEL, saved) ? SAVED_LABEL[saved] : undefined;

  return (
    <>
      {savedLabel && (
        <div role="status" className="mt-5 flex items-start gap-3 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-600">
          <CircleCheck size={18} className="mt-px shrink-0" />
          {savedLabel} berhasil disimpan. Perubahan langsung tampil di website.
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="mt-5 flex items-start gap-3 rounded-2xl border border-[#E85B53]/30 bg-[#E85B53]/10 px-4 py-3 text-sm font-medium text-[#E85B53]"
        >
          <CircleAlert size={18} className="mt-px shrink-0" />
          {getErrorMsg(error)}
        </div>
      )}

      <ListCard
        section="experience"
        title={`Pengalaman kerja (${experiences.length})`}
        desc="Tersimpan di tabel landing_experience. Tampil sebagai timeline di website."
        buttonLabel="Simpan pengalaman"
      >
        {experiences.map((r, i) => (
          <ExpFields key={r.id} i={i} row={r} />
        ))}
        {Array.from({ length: NEW_ROWS }).map((_, n) => (
          <ExpFields key={`new-${n}`} i={experiences.length + n} />
        ))}
      </ListCard>

      <ListCard
        section="organization"
        title={`Organisasi (${orgs.length})`}
        desc="Tersimpan di tabel landing_organization."
        buttonLabel="Simpan organisasi"
      >
        {orgs.map((r, i) => (
          <OrgFields key={r.id} i={i} row={r} />
        ))}
        {Array.from({ length: NEW_ROWS }).map((_, n) => (
          <OrgFields key={`new-${n}`} i={orgs.length + n} />
        ))}
      </ListCard>

      <ListCard
        section="award"
        title={`Sertifikat dan penghargaan (${awards.length})`}
        desc="Tersimpan di tabel landing_award."
        buttonLabel="Simpan penghargaan"
      >
        {awards.map((r, i) => (
          <AwardFields key={r.id} i={i} row={r} />
        ))}
        {Array.from({ length: NEW_ROWS }).map((_, n) => (
          <AwardFields key={`new-${n}`} i={awards.length + n} />
        ))}
      </ListCard>
    </>
  );
}

export function ExperienceSkeleton() {
  const pulse = "animate-pulse motion-reduce:animate-none";
  return (
    <div role="status" aria-busy="true" aria-label="Memuat pengalaman kerja" className={pulse}>
      <div className="mt-5 h-96 rounded-3xl bg-[color:var(--card)]" />
      <div className="mt-4 h-48 rounded-3xl bg-[color:var(--card)]" />
      <div className="mt-4 h-48 rounded-3xl bg-[color:var(--card)]" />
    </div>
  );
}