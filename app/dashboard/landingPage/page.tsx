import { Suspense, type CSSProperties } from "react";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
import {
  AlignLeft,
  Camera,
  CircleAlert,
  CircleCheck,
  Database,
  ExternalLink,
  ImageIcon,
  Info,
  Mail,
  MapPin,
  Palette,
  PenTool,
  Terminal,
  User,
  type LucideIcon,
} from "lucide-react";
import { getSession } from "@/lib/session";
import { profile } from "@/lib/data";
import { ACCENT_GLOW, ACCENT_GRADIENT, Card } from "@/components/dashboard/shared";
import { ImageDropzone, SubmitButton } from "@/components/dashboard/imageDropzone";
import { BestProjectPicker, type PickTab } from "@/components/dashboard/bestProjectPicker";
// Satu-satunya pintu data: handler GET di route ini. Penyimpanan lewat action form ke route yang sama (POST).
import { GET as getHeroRoute } from "@/app/api/landingPage/hero/edit/route";
import { GET as getAboutRoute } from "@/app/api/landingPage/about/edit/route";
import { GET as getBestRoute } from "@/app/api/landingPage/best/edit/route";
import { GET as getExperienceRoute } from "@/app/api/landingPage/experience/edit/route";
// Jumlah "Proyek dikerjakan" diambil dari sini, tidak disimpan di tabel about.
import { GET as getProjectsRoute } from "@/app/api/projects/route";

type HeroRow = { namaLengkap: string; deskripsi: string; urlFoto: string | null };
type Params = { saved?: string; error?: string };

const API = "/api/landingPage/hero/edit";
const DEFAULT_PHOTO = "/assets/hero/person.png";
const MAX_DESC = 300;
const MAX_PHOTO = 5 * 1024 * 1024;

/** Isi bawaan (sama dengan yang dipakai komponen Hero bila tabel masih kosong). */
const DEFAULTS: HeroRow = {
  namaLengkap: [profile.firstName, profile.accent, profile.lastName].join(" "),
  deskripsi: profile.tagline,
  urlFoto: null,
};

const errorMsg: Record<string, string> = {
  invalid:
    "Isian belum lengkap atau tidak valid. Nama maksimal 80 karakter dan deskripsi maksimal 300 karakter.",
  photo_type: "Hanya file gambar yang diterima.",
  photo_size: "Ukuran foto maksimal 5 MB.",
  upload: "Foto gagal diunggah ke bucket. Periksa bucket landingImages dan service role key.",
  about_invalid:
    "Isian Tentang saya belum valid. Periksa email, tahun (lulus tidak boleh sebelum masuk), IPK 0–4, dan batas karakter.",
  about_save: "Tentang saya gagal disimpan. Periksa tabel landing_about dan service role key.",
  best_invalid: "Pilihan best project tidak valid. Ada proyek yang tidak ditemukan atau terduplikasi.",
  best_max: "Maksimal 6 best project per bidang. Kurangi pilihan di bidang yang melebihi batas.",
  best_save:
    "Best project gagal disimpan. Pastikan fungsi replace_best_projects sudah dibuat (jalankan best_projects_admin.sql).",
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

/** Sama dengan pemecahan nama di komponen Hero. */
function nameLines(full: string): { text: string; accent: boolean }[] {
  const parts = full.trim().split(/\s+/).filter(Boolean).map((w) => w.toUpperCase());
  if (parts.length === 0) return [];
  if (parts.length === 1) return [{ text: parts[0], accent: false }];
  if (parts.length === 2) return [{ text: parts[0], accent: false }, { text: parts[1], accent: true }];
  return [
    { text: parts[0], accent: false },
    { text: parts.slice(1, -1).join(" "), accent: true },
    { text: parts[parts.length - 1], accent: false },
  ];
}

/** null = gagal memuat. Baris kosong di tabel → { row: null }. */
async function fetchHero(): Promise<{ row: HeroRow | null } | null> {
  try {
    const res = await getHeroRoute();
    if (!res.ok) {
      console.error(`[landing dashboard] route gagal: ${res.status}`);
      return null;
    }
    const json = (await res.json()) as { data?: HeroRow | null };
    return { row: json.data ?? null };
  } catch (err) {
    console.error("[landing dashboard]", err);
    return null;
  }
}

/* token tema (lihat THEME_CSS di shared.tsx) */
const muted = "text-[color:var(--fg-muted)]";
const focus = "outline-none focus-visible:ring-2 focus-visible:ring-[#5A64D8]";
const linkBtn = `inline-flex h-10 items-center gap-2 rounded-xl bg-[color:var(--chip)] px-4 text-sm font-medium transition hover:brightness-110 active:scale-[0.98] ${focus}`;
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

/* ── pratinjau hero (replika tampilan desktop) ─────────── */

const PREVIEW_ROLES: { label: string; color: string; icon: LucideIcon }[] = [
  { label: "Software Engineer", color: "#6366F1", icon: Terminal },
  { label: "UI/UX Designer", color: "#F25C5C", icon: Palette },
  { label: "Photography", color: "#FFC857", icon: Camera },
  { label: "Graphic Designer", color: "#34D399", icon: PenTool },
];

/** Posisi & ukuran ikon sama dengan .hero-fl-* di Hero (desktop). */
const PREVIEW_ICONS: { src: string; style: CSSProperties }[] = [
  { src: "/assets/hero/keyboard.png", style: { left: "-9%", top: "14%" } },
  { src: "/assets/hero/palette.png", style: { right: "-9%", top: "14%" } },
  { src: "/assets/hero/camera.png", style: { left: "-9%", top: "48%" } },
  { src: "/assets/hero/graphic.png", style: { right: "-9%", top: "48%" } },
];

/** Semua ukuran memakai cqw (persen lebar kartu), jadi tata letaknya selalu skala penuh dan sama dengan hero asli. */
function HeroPreview({ hero, photo }: { hero: HeroRow; photo: string }) {
  const lines = nameLines(hero.namaLengkap);
  const white72 = "rgba(255,255,255,.72)";

  return (
    <div
      className="overflow-hidden rounded-2xl ring-1 ring-white/10"
      style={{ containerType: "inline-size", background: "radial-gradient(ellipse at top, #0A0A6B 0%, #02020F 55%)" }}
    >
      <div className="relative font-mono text-white" style={{ aspectRatio: "21 / 10" }}>
        <div
          className="absolute inset-0 grid items-end"
          style={{ gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr)", gap: "2cqw", padding: "5cqw 3cqw 0" }}
        >
          {/* nama */}
          <div style={{ alignSelf: "center", paddingBottom: "3cqw" }}>
            <p className="italic" style={{ fontSize: "1.8cqw", color: "rgba(255,255,255,.9)" }}>
              Hello, I’am
            </p>
            <p className="font-bold" style={{ fontSize: "5cqw", lineHeight: 0.95, marginTop: "0.3cqw" }}>
              {lines.map((l, i) => (
                <span key={`${i}-${l.text}`} className="block break-words" style={l.accent ? { color: "#FFC857" } : undefined}>
                  {l.text}
                </span>
              ))}
            </p>
            <p
              className="font-sans"
              style={{ fontSize: "1.05cqw", lineHeight: 1.6, color: white72, marginTop: "1.2cqw", maxWidth: "30cqw" }}
            >
              {hero.deskripsi}
            </p>
            <span
              className="inline-block font-sans font-semibold"
              style={{ marginTop: "1.6cqw", background: "#6C63FF", borderRadius: "9999px", padding: "0.9cqw 2.2cqw", fontSize: "1.05cqw" }}
            >
              Lihat proyek saya →
            </span>
          </div>

          {/* foto + ikon */}
          <div className="relative" style={{ height: "40cqw", aspectRatio: "4 / 5" }}>
            <div
              aria-hidden
              className="absolute rounded-full"
              style={{ inset: "14%", background: "rgba(108,99,255,.45)", filter: "blur(4cqw)" }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo}
              alt="Foto hero saat ini"
              className="absolute inset-0 h-full w-full object-contain object-bottom"
              style={{ zIndex: 2 }}
            />
            {PREVIEW_ICONS.map((ic) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={ic.src}
                src={ic.src}
                alt=""
                aria-hidden
                className="absolute object-contain"
                style={{ ...ic.style, width: "36%", aspectRatio: "1 / 1", zIndex: 4, filter: "drop-shadow(0 .9cqw 1.8cqw rgba(99,102,241,.55))" }}
              />
            ))}
          </div>

          {/* role */}
          <ul className="flex flex-col" style={{ alignSelf: "center", gap: "1.1cqw", paddingBottom: "3cqw" }}>
            {PREVIEW_ROLES.map((r) => (
              <li
                key={r.label}
                className="flex items-center"
                style={{ background: "#2B2B2B", borderRadius: "1cqw", gap: "1cqw", padding: "0.7cqw 1.4cqw 0.7cqw 0.7cqw" }}
              >
                <span
                  className="grid shrink-0 place-items-center text-black"
                  style={{ width: "4.2cqw", height: "4.2cqw", borderRadius: "0.8cqw", background: r.color }}
                >
                  <r.icon aria-hidden style={{ width: "2.2cqw", height: "2.2cqw" }} />
                </span>
                <span className="flex-1 text-center font-semibold" style={{ fontSize: "1.4cqw" }}>
                  {r.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ── halaman ───────────────────────────────────────────── */

async function Content({ searchParams }: { searchParams: Promise<Params> }) {
  // halaman juga dijaga, bukan hanya route-nya
  if (!(await getSession())) redirect("/admin");

  const { saved, error } = await searchParams;
  const result = await fetchHero();

  if (!result) {
    return (
      <div
        role="alert"
        className="mt-2 flex items-start gap-3 rounded-2xl border border-[#E85B53]/30 bg-[#E85B53]/10 px-4 py-3 text-sm font-medium text-[#E85B53]"
      >
        <CircleAlert size={18} className="mt-px shrink-0" />
        Data hero gagal dimuat. Lihat log terminal untuk detailnya, lalu muat ulang halaman.
      </div>
    );
  }

  const fromDb = result.row !== null;
  const hero = result.row ?? DEFAULTS;
  const lines = nameLines(hero.namaLengkap);
  const photo = hero.urlFoto || DEFAULT_PHOTO;
  const photoSource = !hero.urlFoto
    ? "Foto bawaan"
    : hero.urlFoto.includes("/storage/v1/object/public/")
      ? "Supabase Storage"
      : "URL luar";

  const stats = [
    { label: "Baris nama di hero", value: lines.length, sub: hero.namaLengkap, icon: User, hero: true },
    { label: "Panjang deskripsi", value: hero.deskripsi.length, sub: `dari ${MAX_DESC} karakter`, icon: AlignLeft },
    { label: "Sumber foto", value: photoSource, sub: hero.urlFoto ? "url_foto terisi" : "url_foto kosong", icon: ImageIcon },
    {
      label: "Status data",
      value: fromDb ? "Tersimpan" : "Bawaan",
      sub: fromDb ? "dibaca dari tabel landing_hero" : "tabel belum berisi data",
      icon: Database,
    },
  ];

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className={`text-sm ${muted}`}>Atur nama, deskripsi, dan foto di bagian hero landing page.</p>
        <a href="/" target="_blank" rel="noreferrer" className={`${linkBtn} self-start`}>
          <ExternalLink size={15} /> Lihat website
        </a>
      </div>

      {saved === "1" && (
        <div role="status" className="mt-5 flex items-start gap-3 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-600">
          <CircleCheck size={18} className="mt-px shrink-0" />
          Hero berhasil disimpan. Perubahan langsung tampil di website.
        </div>
      )}
      {error && !/^(about|best|experience|org|award)_/.test(error) && (
        <div
          role="alert"
          className="mt-5 flex items-start gap-3 rounded-2xl border border-[#E85B53]/30 bg-[#E85B53]/10 px-4 py-3 text-sm font-medium text-[#E85B53]"
        >
          <CircleAlert size={18} className="mt-px shrink-0" />
          {getErrorMsg(error)}
        </div>
      )}

      {/* ringkasan data saat ini */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => {
          const big = typeof s.value === "number";
          const body = (
            <>
              <div className="flex items-center justify-between">
                <span className={`text-sm ${s.hero ? "text-white/75" : muted}`}>{s.label}</span>
                <s.icon size={16} className={s.hero ? "text-white/75" : muted} />
              </div>
              <p
                className={`mt-3 font-semibold tabular-nums ${big ? "text-3xl" : "text-xl leading-9"} ${s.hero ? "text-white" : ""}`}
              >
                {s.value}
              </p>
              <p className={`mt-1 truncate text-xs ${s.hero ? "text-white/70" : muted}`} title={s.sub}>
                {s.sub}
              </p>
            </>
          );
          return s.hero ? (
            <div key={s.label} className="rounded-3xl p-5" style={{ background: ACCENT_GRADIENT, boxShadow: ACCENT_GLOW }}>
              {body}
            </div>
          ) : (
            <Card key={s.label} className="p-5">
              {body}
            </Card>
          );
        })}
      </div>

      {/* pratinjau: replika hero desktop dari data tersimpan */}
      <Card className="mt-4 p-6">
        <CardHead title="Pratinjau" desc="Tampilan hero di desktop, dari data yang tersimpan." />
        <HeroPreview hero={hero} photo={photo} />
      </Card>

      {/* form edit */}
      <Card className="mt-4 p-6">
        <CardHead title="Edit hero" desc="Data disimpan ke tabel landing_hero dan langsung dipakai di website." />

        <form action={API} method="post" encType="multipart/form-data" autoComplete="off" className="space-y-5">
          {/* foto saat ini tetap dipakai bila tidak ada unggahan baru */}
          <input type="hidden" name="url_foto" defaultValue={hero.urlFoto ?? ""} />

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-5">
              <Field
                label="Nama lengkap"
                htmlFor="nama_lengkap"
                required
                hint="Otomatis huruf kapital. Tiga kata atau lebih: kata tengah tampil kuning."
              >
                <input
                  id="nama_lengkap"
                  name="nama_lengkap"
                  required
                  maxLength={80}
                  autoComplete="off"
                  defaultValue={hero.namaLengkap}
                  className={inputCls}
                  placeholder="Farhan Angga Riyanto"
                />
              </Field>

              <Field label="Deskripsi" htmlFor="deskripsi" required hint={`Maksimal ${MAX_DESC} karakter.`}>
                <textarea
                  id="deskripsi"
                  name="deskripsi"
                  rows={6}
                  required
                  maxLength={MAX_DESC}
                  autoComplete="off"
                  defaultValue={hero.deskripsi}
                  className={areaCls}
                  placeholder="Kalimat singkat tentang kamu"
                />
              </Field>
            </div>

            <Field
              label="Foto"
              htmlFor="foto"
              hint="PNG transparan disarankan, rasio sekitar 4:5. Tanpa unggahan baru, foto saat ini tetap dipakai."
            >
              <ImageDropzone id="foto" name="foto" max={1} maxSize={MAX_PHOTO} />
            </Field>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-[color:var(--chip)] pt-5">
            <p className={`hidden items-center gap-2 text-sm sm:flex ${muted}`}>
              <Info size={16} className="shrink-0" />
              Nama, deskripsi, dan foto disimpan bersamaan.
            </p>
            <div className="ml-auto">
              <SubmitButton>Simpan hero</SubmitButton>
            </div>
          </div>
        </form>
      </Card>
    </>
  );
}

function Skeleton() {
  const pulse = "animate-pulse motion-reduce:animate-none";
  return (
    <div role="status" aria-busy="true" aria-label="Memuat hero" className={pulse}>
      <div className="h-5 w-72 max-w-full rounded-lg bg-[color:var(--chip)]" />
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 rounded-3xl bg-[color:var(--card)]" />
        ))}
      </div>
      <div className="mt-4 h-96 rounded-3xl bg-[color:var(--card)]" />
      <div className="mt-4 h-96 rounded-3xl bg-[color:var(--card)]" />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
 * BAGIAN "TENTANG SAYA" (di bawah hero)
 * Data: tabel landing_about lewat route api/landingPage/about/edit.
 * "Proyek dikerjakan": dihitung dari api/projects, tidak bisa diedit di sini.
 * ══════════════════════════════════════════════════════════ */

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

/* ── bagian halaman ────────────────────────────────────── */

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

async function AboutSection({ searchParams }: { searchParams: Promise<Params> }) {
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

function AboutSkeleton() {
  const pulse = "animate-pulse motion-reduce:animate-none";
  return (
    <div role="status" aria-busy="true" aria-label="Memuat Tentang saya" className={`mt-12 ${pulse}`}>
      <div className="h-6 w-44 rounded-lg bg-[color:var(--chip)]" />
      <div className="mt-5 h-96 rounded-3xl bg-[color:var(--card)]" />
      <div className="mt-4 h-96 rounded-3xl bg-[color:var(--card)]" />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
 * BAGIAN "BEST PROJECT" (di bawah Tentang saya)
 * Menentukan proyek mana yang tampil sebagai "Proyek terbaik" di website.
 * Tab/bidang dan daftar proyek dari api/projects; pilihan disimpan di tabel best_projects
 * lewat route api/landingPage/bestProject/edit. Maksimal 6 proyek per bidang.
 * ══════════════════════════════════════════════════════════ */

const API_BEST = "/api/landingPage/best/edit";
const MAX_BEST = 6;

/** Semua bidang + proyeknya dari api/projects (hanya field yang dipakai untuk memilih). */
async function fetchPickTabs(): Promise<PickTab[] | null> {
  try {
    const call = getProjectsRoute as unknown as (req: NextRequest) => Promise<Response>;
    const res = await call(new NextRequest("http://localhost/api/projects"));
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: unknown };
    if (!Array.isArray(json.data)) return null;

    return json.data.map((t) => {
      const tab = t as { id?: unknown; label?: unknown; short?: unknown; projects?: unknown };
      const projects = Array.isArray(tab.projects) ? tab.projects : [];
      return {
        id: String(tab.id),
        label: String(tab.label ?? tab.id),
        short: String(tab.short ?? tab.label ?? tab.id),
        projects: projects.map((p) => {
          const x = p as { id?: unknown; title?: unknown; type?: unknown; images?: unknown };
          const cover = Array.isArray(x.images) && typeof x.images[0] === "string" ? x.images[0] : null;
          return { id: String(x.id), title: String(x.title ?? ""), type: String(x.type ?? ""), cover };
        }),
      };
    });
  } catch (err) {
    console.error("[landing dashboard] api/projects (best)", err);
    return null;
  }
}

/** project_id best project saat ini, urut menurut position. null = gagal dimuat. */
async function fetchBestIds(): Promise<string[] | null> {
  try {
    const res = await getBestRoute();
    if (!res.ok) {
      console.error(`[landing dashboard] route best gagal: ${res.status}`);
      return null;
    }
    const json = (await res.json()) as { data?: { ids?: string[] } };
    return json.data?.ids ?? [];
  } catch (err) {
    console.error("[landing dashboard] best", err);
    return null;
  }
}

function BestShell({ children }: { children: React.ReactNode }) {
  return (
    <section id="best" className="mt-12 scroll-mt-6 border-t border-[color:var(--chip)] pt-8">
      <h2 className="text-lg font-semibold">Best project</h2>
      <p className={`mt-0.5 text-sm ${muted}`}>
        Tentukan proyek terbaik yang tampil di website. Maksimal {MAX_BEST} proyek per bidang; boleh kurang dari {MAX_BEST}.
      </p>
      {children}
    </section>
  );
}

async function BestSection({ searchParams }: { searchParams: Promise<Params> }) {
  if (!(await getSession())) redirect("/admin");

  const { saved, error } = await searchParams;
  const [tabs, ids] = await Promise.all([fetchPickTabs(), fetchBestIds()]);

  if (!tabs || !ids) {
    return (
      <BestShell>
        <div
          role="alert"
          className="mt-5 flex items-start gap-3 rounded-2xl border border-[#E85B53]/30 bg-[#E85B53]/10 px-4 py-3 text-sm font-medium text-[#E85B53]"
        >
          <CircleAlert size={18} className="mt-px shrink-0" />
          Data best project gagal dimuat. Periksa api/projects dan tabel best_projects, lalu muat ulang halaman.
        </div>
      </BestShell>
    );
  }

  const bestError = error?.startsWith("best_") ? error : undefined;

  return (
    <BestShell>
      {saved === "best" && (
        <div role="status" className="mt-5 flex items-start gap-3 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-600">
          <CircleCheck size={18} className="mt-px shrink-0" />
          Best project berhasil disimpan. Perubahan langsung tampil di website.
        </div>
      )}
      {bestError && (
        <div
          role="alert"
          className="mt-5 flex items-start gap-3 rounded-2xl border border-[#E85B53]/30 bg-[#E85B53]/10 px-4 py-3 text-sm font-medium text-[#E85B53]"
        >
          <CircleAlert size={18} className="mt-px shrink-0" />
          {getErrorMsg(bestError)}
        </div>
      )}

      <Card className="mt-5 p-6">
        <CardHead
          title="Pilih proyek terbaik"
          desc="Pilih bidang, tambahkan proyek, lalu atur urutannya. Bidang tanpa pilihan tampil kosong di website."
        />

        <form action={API_BEST} method="post" className="space-y-5">
          <BestProjectPicker tabs={tabs} initial={ids} max={MAX_BEST} />

          <div className="flex items-center justify-between gap-3 border-t border-[color:var(--chip)] pt-5">
            <p className={`hidden items-center gap-2 text-sm sm:flex ${muted}`}>
              <Info size={16} className="shrink-0" />
              Semua bidang disimpan sekaligus.
            </p>
            <div className="ml-auto">
              <SubmitButton>Simpan best project</SubmitButton>
            </div>
          </div>
        </form>
      </Card>
    </BestShell>
  );
}

function BestSkeleton() {
  const pulse = "animate-pulse motion-reduce:animate-none";
  return (
    <div role="status" aria-busy="true" aria-label="Memuat best project" className={`mt-12 ${pulse}`}>
      <div className="h-6 w-44 rounded-lg bg-[color:var(--chip)]" />
      <div className="mt-5 h-96 rounded-3xl bg-[color:var(--card)]" />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
 * BAGIAN "PENGALAMAN KERJA" (di bawah Best project)
 * Tiga tabel: landing_experience, landing_organization, landing_award.
 * Data dibaca lewat GET api/landingPage/experience/edit; tiap kartu punya form sendiri
 * yang di-POST ke route yang sama (field "section").
 * - Baris lama bisa diedit; centang "Hapus" untuk menghapus.
 * - Baris kosong di paling bawah dipakai untuk menambah data baru.
 * - Urutan tampil mengikuti angka "Urutan" (kecil di atas).
 * ══════════════════════════════════════════════════════════ */

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

async function fetchExperienceData(): Promise<ExperienceData | null> {
  try {
    const res = await getExperienceRoute();
    if (!res.ok) {
      console.error(`[landing dashboard] route experience gagal: ${res.status}`);
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
    console.error("[landing dashboard] experience", err);
    return null;
  }
}

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

function ExperienceShell({ children }: { children: React.ReactNode }) {
  return (
    <section id="experience" className="mt-12 scroll-mt-6 border-t border-[color:var(--chip)] pt-8">
      <h2 className="text-lg font-semibold">Pengalaman kerja</h2>
      <p className={`mt-0.5 text-sm ${muted}`}>
        Atur timeline pengalaman, organisasi, serta sertifikat dan penghargaan di landing page. Tiap kartu disimpan terpisah.
      </p>
      {children}
    </section>
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
            Klik sebuah baris untuk membuka dan mengedit isinya.
          </p>
          <div className="ml-auto">
            <SubmitButton>{buttonLabel}</SubmitButton>
          </div>
        </div>
      </form>
    </Card>
  );
}

async function ExperienceSection({ searchParams }: { searchParams: Promise<Params> }) {
  if (!(await getSession())) redirect("/admin");

  const { saved, error } = await searchParams;
  const data = await fetchExperienceData();

  if (!data) {
    return (
      <ExperienceShell>
        <div
          role="alert"
          className="mt-5 flex items-start gap-3 rounded-2xl border border-[#E85B53]/30 bg-[#E85B53]/10 px-4 py-3 text-sm font-medium text-[#E85B53]"
        >
          <CircleAlert size={18} className="mt-px shrink-0" />
          Data pengalaman gagal dimuat. Pastikan tabel landing_experience, landing_organization, dan landing_award sudah
          dibuat, lalu muat ulang halaman.
        </div>
      </ExperienceShell>
    );
  }

  const { experiences, orgs, awards } = data;
  const savedLabel = saved && Object.prototype.hasOwnProperty.call(SAVED_LABEL, saved) ? SAVED_LABEL[saved] : undefined;
  const sectionError = error && /^(experience|org|award)_/.test(error) ? error : undefined;

  return (
    <ExperienceShell>
      {savedLabel && (
        <div role="status" className="mt-5 flex items-start gap-3 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-600">
          <CircleCheck size={18} className="mt-px shrink-0" />
          {savedLabel} berhasil disimpan. Perubahan langsung tampil di website.
        </div>
      )}
      {sectionError && (
        <div
          role="alert"
          className="mt-5 flex items-start gap-3 rounded-2xl border border-[#E85B53]/30 bg-[#E85B53]/10 px-4 py-3 text-sm font-medium text-[#E85B53]"
        >
          <CircleAlert size={18} className="mt-px shrink-0" />
          {getErrorMsg(sectionError)}
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
    </ExperienceShell>
  );
}

function ExperienceSkeleton() {
  const pulse = "animate-pulse motion-reduce:animate-none";
  return (
    <div role="status" aria-busy="true" aria-label="Memuat pengalaman kerja" className={`mt-12 ${pulse}`}>
      <div className="h-6 w-44 rounded-lg bg-[color:var(--chip)]" />
      <div className="mt-5 h-96 rounded-3xl bg-[color:var(--card)]" />
    </div>
  );
}

export default function LandingPageDashboard({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <>
      <Suspense fallback={<Skeleton />}>
        <Content searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<AboutSkeleton />}>
        <AboutSection searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<BestSkeleton />}>
        <BestSection searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<ExperienceSkeleton />}>
        <ExperienceSection searchParams={searchParams} />
      </Suspense>
    </>
  );
}