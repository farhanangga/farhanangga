import type { CSSProperties } from "react";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
import { CircleAlert, CircleCheck, Info, Mail, MapPin } from "lucide-react";
import { getSession } from "@/lib/session";
import { Card } from "@/components/dashboard/shared";
import { SubmitButton } from "@/components/dashboard/imageDropzone";
// Satu-satunya pintu data: handler GET di route ini. Penyimpanan lewat action form ke route yang sama (POST).
import { GET as getAboutRoute } from "@/app/api/landingPage/about/edit/route";
// Jumlah "Proyek dikerjakan" diambil dari sini, tidak disimpan di tabel about.
import { GET as getProjectsRoute } from "@/app/api/projects/route";

/* ══════════════════════════════════════════════════════════
 * BAGIAN "TENTANG SAYA" (di bawah hero)
 * Data: tabel landing_about lewat route api/landingPage/about/edit.
 * "Proyek dikerjakan": dihitung dari api/projects, tidak bisa diedit di sini.
 * ══════════════════════════════════════════════════════════ */

type Params = { saved?: string; error?: string };

type AboutRow = {
  lokasi: string;
  email: string;
  deskripsi: string;
  sorotan: string[];
  kampus: string;
  programStudi: string;
  tahunMasuk: number;
  tahunLulus: number;
  ipk: number;
  peran: string[];
};

const API_ABOUT = "/api/landingPage/about/edit";
const MAX_ABOUT = 600;

const errorMsg: Record<string, string> = {
  about_invalid:
    "Isian Tentang saya belum valid. Periksa email, tahun (lulus tidak boleh sebelum masuk), IPK 0–4, dan batas karakter.",
  about_save: "Tentang saya gagal disimpan. Periksa tabel landing_about dan service role key.",
  default: "Perubahan gagal disimpan. Periksa isian form lalu coba lagi.",
};

/** Aman terhadap query seperti ?error=constructor / ?error=toString. */
const getErrorMsg = (key?: string) =>
  key && Object.prototype.hasOwnProperty.call(errorMsg, key) ? errorMsg[key] : errorMsg.default;

/* token tema (lihat THEME_CSS di shared.tsx) */
const muted = "text-[color:var(--fg-muted)]";
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

/** Isi bawaan bila tabel landing_about masih kosong (sama dengan data awal di SQL). */
const DEFAULTS_ABOUT: AboutRow = {
  lokasi: "Cirebon, Indonesia",
  email: "farhanangga8900@gmail.com",
  deskripsi:
    "Software Engineer yang berpengalaman membangun aplikasi web responsif dengan React.js, Next.js, TypeScript, dan Tailwind CSS. Saya terbiasa menerjemahkan desain Figma menjadi antarmuka yang berfungsi, membuat komponen yang bisa dipakai ulang, menghubungkan REST API, dan bekerja bersama desainer UI/UX maupun tim pengembang.",
  sorotan: ["responsif", "React.js", "Next.js", "TypeScript", "Tailwind CSS", "Figma", "komponen", "REST API"],
  kampus: "Universitas Pendidikan Indonesia",
  programStudi: "S1 Rekayasa Perangkat Lunak",
  tahunMasuk: 2022,
  tahunLulus: 2026,
  ipk: 3.83,
  peran: ["Software Engineer", "UI/UX Designer", "Photography"],
};

async function fetchAbout(): Promise<{ row: AboutRow | null } | null> {
  try {
    const res = await getAboutRoute();
    if (!res.ok) {
      console.error(`[landing dashboard] route about gagal: ${res.status}`);
      return null;
    }
    const json = (await res.json()) as { data?: AboutRow | null };
    return { row: json.data ?? null };
  } catch (err) {
    console.error("[landing dashboard] about", err);
    return null;
  }
}

/** Ambil jumlah dari bentuk respons yang umum: [..], {data:[..]}, {projects:[..]}, {total}. */
function countOf(json: unknown): number | null {
  if (Array.isArray(json)) return json.length;
  if (json && typeof json === "object") {
    const o = json as Record<string, unknown>;
    // bentuk api/projects: data = daftar kategori, tiap kategori punya array `projects` → jumlahkan semuanya
    if (
      Array.isArray(o.data) &&
      o.data.length > 0 &&
      o.data.every((g) => g && typeof g === "object" && Array.isArray((g as Record<string, unknown>).projects))
    ) {
      return (o.data as { projects: unknown[] }[]).reduce((n, g) => n + g.projects.length, 0);
    }
    // total/count dari server didahulukan: bila respons dipaginasi, panjang array hanya satu halaman
    if (typeof o.total === "number") return o.total;
    if (typeof o.count === "number") return o.count;
    for (const k of ["data", "projects", "items"]) {
      if (Array.isArray(o[k])) return (o[k] as unknown[]).length;
    }
  }
  return null;
}

/** null = tidak bisa dihitung (route gagal / bentuk respons tidak dikenali). */
async function fetchProjectCount(): Promise<number | null> {
  try {
    const call = getProjectsRoute as unknown as (req: NextRequest) => Promise<Response>;
    const res = await call(new NextRequest("http://localhost/api/projects"));
    if (!res.ok) return null;
    return countOf(await res.json());
  } catch (err) {
    console.error("[landing dashboard] api/projects", err);
    return null;
  }
}

/* ── pratinjau ─────────────────────────────────────────── */

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const highlightStyle: CSSProperties = {
  backgroundImage: "linear-gradient(90deg,#8B8FFF,#FFC857)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
};

/** Kata di `words` diberi warna gradasi; sisanya teks biasa. */
function Highlighted({ text, words }: { text: string; words: string[] }) {
  const list = words.map((w) => w.trim()).filter(Boolean).sort((a, b) => b.length - a.length);
  if (list.length === 0) return <>{text}</>;
  const re = new RegExp(`(${list.map(escapeRe).join("|")})`, "gi");
  return (
    <>
      {text.split(re).map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} style={highlightStyle}>
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

const CHIP_COLORS = [
  { bg: "#6366F1", fg: "#fff" },
  { bg: "#F25C5C", fg: "#000" },
  { bg: "#FFC857", fg: "#000" },
  { bg: "#34D399", fg: "#000" },
];

/** Semua ukuran memakai cqw, jadi tata letaknya sama dengan bagian Tentang saya di website. */
function AboutPreview({ about, projectCount }: { about: AboutRow; projectCount: number | null }) {
  const cardStyle: CSSProperties = {
    background: "#0F0F26",
    border: "1px solid rgba(255,255,255,.07)",
    borderRadius: "1.3cqw",
    padding: "1.6cqw 1.9cqw",
  };
  const label: CSSProperties = { fontSize: "1.05cqw", color: "rgba(255,255,255,.6)" };
  const big: CSSProperties = { fontSize: "4cqw", lineHeight: 1.1, color: "#FFC857", marginTop: "0.5cqw" };
  const pill: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.6cqw",
    background: "rgba(255,255,255,.07)",
    borderRadius: "9999px",
    padding: "0.55cqw 1.3cqw",
    fontSize: "1.05cqw",
    color: "rgba(255,255,255,.85)",
  };
  const ico: CSSProperties = { width: "1.2cqw", height: "1.2cqw" };

  return (
    <div className="overflow-hidden rounded-2xl ring-1 ring-white/10" style={{ containerType: "inline-size", background: "#02020F" }}>
      <div
        className="grid items-start text-white"
        style={{ gridTemplateColumns: "minmax(0,1.25fr) minmax(0,1fr)", gap: "5cqw", padding: "6cqw 9cqw" }}
      >
        <div>
          <h3 className="font-mono font-bold" style={{ fontSize: "3.6cqw", lineHeight: 1.1 }}>
            Tentang saya
          </h3>

          <div className="flex flex-wrap" style={{ gap: "0.8cqw", marginTop: "1.6cqw" }}>
            <span style={pill}>
              <MapPin aria-hidden style={ico} /> {about.lokasi}
            </span>
            <span style={pill}>
              <Mail aria-hidden style={ico} /> {about.email}
            </span>
          </div>

          <p style={{ fontSize: "1.3cqw", lineHeight: 1.85, color: "rgba(255,255,255,.88)", marginTop: "2.2cqw" }}>
            <Highlighted text={about.deskripsi} words={about.sorotan} />
          </p>

          <div className="flex flex-wrap" style={{ gap: "0.8cqw", marginTop: "2.2cqw" }}>
            {about.peran.map((p, i) => {
              const c = CHIP_COLORS[i % CHIP_COLORS.length];
              return (
                <span
                  key={`${i}-${p}`}
                  className="font-semibold"
                  style={{ background: c.bg, color: c.fg, borderRadius: "9999px", padding: "0.7cqw 1.7cqw", fontSize: "1.1cqw" }}
                >
                  {p}
                </span>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col" style={{ gap: "1.3cqw" }}>
          <div style={cardStyle}>
            <p style={label}>Lulusan dari</p>
            <p className="font-mono font-bold" style={{ fontSize: "1.7cqw", marginTop: "0.5cqw", lineHeight: 1.3 }}>
              {about.kampus}
            </p>
            <p style={{ ...label, marginTop: "0.4cqw" }}>
              {about.programStudi}, {about.tahunMasuk} – {about.tahunLulus}
            </p>
          </div>
          <div style={cardStyle}>
            <p style={label}>IPK</p>
            <p className="font-mono font-bold" style={big}>
              {about.ipk.toFixed(2)}
            </p>
          </div>
          <div style={cardStyle}>
            <p style={label}>Proyek dikerjakan</p>
            <p className="font-mono font-bold" style={big}>
              {projectCount === null ? "—" : `${projectCount}+`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── section ───────────────────────────────────────────── */

function AboutShell({ children }: { children: React.ReactNode }) {
  return (
    <section id="about" className="mt-12 scroll-mt-6 border-t border-[color:var(--chip)] pt-8">
      <h2 className="text-lg font-semibold">Tentang saya</h2>
      <p className={`mt-0.5 text-sm ${muted}`}>
        Atur bagian Tentang saya di landing page. Jumlah proyek diambil otomatis dari api/projects.
      </p>
      {children}
    </section>
  );
}

export async function EditAbout({ searchParams }: { searchParams: Promise<Params> }) {
  if (!(await getSession())) redirect("/admin");

  const { saved, error } = await searchParams;
  const [result, projectCount] = await Promise.all([fetchAbout(), fetchProjectCount()]);

  if (!result) {
    return (
      <AboutShell>
        <div
          role="alert"
          className="mt-5 flex items-start gap-3 rounded-2xl border border-[#E85B53]/30 bg-[#E85B53]/10 px-4 py-3 text-sm font-medium text-[#E85B53]"
        >
          <CircleAlert size={18} className="mt-px shrink-0" />
          Data Tentang saya gagal dimuat. Pastikan tabel landing_about sudah dibuat, lalu muat ulang halaman.
        </div>
      </AboutShell>
    );
  }

  const about = result.row ?? DEFAULTS_ABOUT;
  const aboutError = error?.startsWith("about_") ? error : undefined;

  return (
    <AboutShell>
      {saved === "about" && (
        <div role="status" className="mt-5 flex items-start gap-3 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-600">
          <CircleCheck size={18} className="mt-px shrink-0" />
          Tentang saya berhasil disimpan.
        </div>
      )}
      {aboutError && (
        <div
          role="alert"
          className="mt-5 flex items-start gap-3 rounded-2xl border border-[#E85B53]/30 bg-[#E85B53]/10 px-4 py-3 text-sm font-medium text-[#E85B53]"
        >
          <CircleAlert size={18} className="mt-px shrink-0" />
          {getErrorMsg(aboutError)}
        </div>
      )}

      <Card className="mt-5 p-6">
        <CardHead title="Pratinjau" desc="Tampilan bagian Tentang saya, dari data yang tersimpan." />
        <AboutPreview about={about} projectCount={projectCount} />
      </Card>

      <Card className="mt-4 p-6">
        <CardHead
          title="Edit Tentang saya"
          desc={result.row ? "Data disimpan ke tabel landing_about." : "Tabel masih kosong. Isi bawaan ditampilkan; simpan untuk membuat datanya."}
        />

        <form action={API_ABOUT} method="post" autoComplete="off" className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Lokasi" htmlFor="lokasi" required>
              <input id="lokasi" name="lokasi" required maxLength={80} defaultValue={about.lokasi} className={inputCls} placeholder="Cirebon, Indonesia" />
            </Field>
            <Field label="Email" htmlFor="email" required>
              <input id="email" name="email" type="email" required maxLength={120} defaultValue={about.email} className={inputCls} placeholder="nama@email.com" />
            </Field>
          </div>

          <Field label="Deskripsi" htmlFor="about_deskripsi" required hint={`Maksimal ${MAX_ABOUT} karakter.`}>
            <textarea
              id="about_deskripsi"
              name="deskripsi"
              rows={6}
              required
              maxLength={MAX_ABOUT}
              defaultValue={about.deskripsi}
              className={areaCls}
              placeholder="Ceritakan singkat tentang kamu"
            />
          </Field>

          <Field
            label="Kata yang disorot"
            htmlFor="sorotan"
            hint="Pisahkan dengan koma. Harus sama persis dengan kata di deskripsi; kata ini tampil berwarna."
          >
            <input id="sorotan" name="sorotan" defaultValue={about.sorotan.join(", ")} className={inputCls} placeholder="React.js, Next.js, TypeScript" />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Kampus" htmlFor="kampus" required>
              <input id="kampus" name="kampus" required maxLength={100} defaultValue={about.kampus} className={inputCls} />
            </Field>
            <Field label="Program studi" htmlFor="program_studi" required>
              <input id="program_studi" name="program_studi" required maxLength={100} defaultValue={about.programStudi} className={inputCls} />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Tahun masuk" htmlFor="tahun_masuk" required>
              <input id="tahun_masuk" name="tahun_masuk" type="number" required min={1990} max={2100} defaultValue={about.tahunMasuk} className={inputCls} />
            </Field>
            <Field label="Tahun lulus" htmlFor="tahun_lulus" required>
              <input id="tahun_lulus" name="tahun_lulus" type="number" required min={1990} max={2100} defaultValue={about.tahunLulus} className={inputCls} />
            </Field>
            <Field label="IPK" htmlFor="ipk" required hint="Skala 0–4, contoh 3.83.">
              <input id="ipk" name="ipk" inputMode="decimal" required defaultValue={about.ipk.toFixed(2)} className={inputCls} />
            </Field>
          </div>

          <Field label="Peran (chip)" htmlFor="peran" required hint="Pisahkan dengan koma. Maksimal 8 peran.">
            <input id="peran" name="peran" required defaultValue={about.peran.join(", ")} className={inputCls} placeholder="Software Engineer, UI/UX Designer, Photography" />
          </Field>

          <div className={`flex items-center gap-2 rounded-2xl bg-[color:var(--card-hi)] px-4 py-3 text-sm ${muted}`}>
            <Info size={16} className="shrink-0" />
            Proyek dikerjakan:{" "}
            <span className="font-medium text-[color:var(--fg)]">{projectCount === null ? "tidak terbaca" : projectCount}</span>
            <span>(otomatis dari api/projects, tidak diedit di sini)</span>
          </div>

          <div className="flex items-center justify-end border-t border-[color:var(--chip)] pt-5">
            <SubmitButton>Simpan Tentang saya</SubmitButton>
          </div>
        </form>
      </Card>
    </AboutShell>
  );
}

export function EditAboutSkeleton() {
  const pulse = "animate-pulse motion-reduce:animate-none";
  return (
    <div role="status" aria-busy="true" aria-label="Memuat Tentang saya" className={`mt-12 ${pulse}`}>
      <div className="h-6 w-44 rounded-lg bg-[color:var(--chip)]" />
      <div className="mt-5 h-96 rounded-3xl bg-[color:var(--card)]" />
      <div className="mt-4 h-96 rounded-3xl bg-[color:var(--card)]" />
    </div>
  );
}