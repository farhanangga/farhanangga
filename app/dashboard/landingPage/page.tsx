import { Suspense } from "react";
import { redirect } from "next/navigation";
import {
  AlignLeft,
  CircleAlert,
  CircleCheck,
  Database,
  ExternalLink,
  ImageIcon,
  Info,
  User,
} from "lucide-react";
import { getSession } from "@/lib/session";
import { profile } from "@/lib/data";
import { ACCENT_GLOW, ACCENT_GRADIENT, Card } from "@/components/dashboard/shared";
import { SubmitButton } from "@/components/dashboard/imageDropzone";
// Satu-satunya pintu data: handler GET di route ini. Penyimpanan lewat action form ke route yang sama (POST).
import { GET as getHeroRoute } from "@/app/api/landingPage/hero/edit/route";

type HeroRow = { namaLengkap: string; deskripsi: string; urlFoto: string | null };
type Params = { saved?: string; error?: string };

const API = "/api/landingPage/hero/edit";
const DEFAULT_PHOTO = "/assets/hero/person.png";
const MAX_DESC = 300;

/** Isi bawaan (sama dengan yang dipakai komponen Hero bila tabel masih kosong). */
const DEFAULTS: HeroRow = {
  namaLengkap: [profile.firstName, profile.accent, profile.lastName].join(" "),
  deskripsi: profile.tagline,
  urlFoto: null,
};

const errorMsg: Record<string, string> = {
  invalid:
    "Isian belum lengkap atau tidak valid. Nama maksimal 80 karakter, deskripsi maksimal 300 karakter, dan URL foto harus diawali http:// atau https://.",
  photo_type: "Hanya file gambar yang diterima.",
  photo_size: "Ukuran foto maksimal 5 MB.",
  upload: "Foto gagal diunggah ke bucket. Periksa bucket landingImages dan service role key.",
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
      {error && (
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

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* form edit */}
        <Card className="p-6">
          <CardHead title="Edit hero" desc="Data disimpan ke tabel landing_hero dan langsung dipakai di website." />

          <form action={API} method="post" encType="multipart/form-data" autoComplete="off" className="space-y-5">
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
                rows={4}
                required
                maxLength={MAX_DESC}
                autoComplete="off"
                defaultValue={hero.deskripsi}
                className={areaCls}
                placeholder="Kalimat singkat tentang kamu"
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Unggah foto baru" htmlFor="foto" hint="PNG transparan disarankan, rasio sekitar 4:5. Maksimal 5 MB.">
                <input
                  id="foto"
                  name="foto"
                  type="file"
                  accept="image/*"
                  className={`block w-full text-sm ${muted} file:mr-3 file:cursor-pointer file:rounded-xl file:border-0 file:bg-[color:var(--chip)] file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-[color:var(--fg)] hover:file:brightness-110`}
                />
              </Field>

              <Field
                label="URL foto"
                htmlFor="url_foto"
                hint="Kosongkan untuk memakai foto bawaan. Foto yang diunggah menggantikan isian ini."
              >
                <input
                  id="url_foto"
                  name="url_foto"
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  defaultValue={hero.urlFoto ?? ""}
                  className={inputCls}
                  placeholder="https://…/landingImages/person.png"
                />
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

        {/* pratinjau data tersimpan */}
        <Card className="p-6">
          <CardHead title="Pratinjau" desc="Tampilan singkat dari data yang tersimpan." />

          <div
            className="overflow-hidden rounded-2xl p-5 text-white ring-1 ring-white/10"
            style={{ background: "radial-gradient(ellipse at top, #0A0A6B 0%, #02020F 62%)" }}
          >
            <p className="font-mono text-sm italic text-white/80">Hello, I’am</p>
            <p className="mt-1 break-words font-mono text-2xl font-bold leading-[1.05]">
              {lines.map((l) => (
                <span key={l.text} className={`block ${l.accent ? "text-[#FFC857]" : ""}`}>
                  {l.text}
                </span>
              ))}
            </p>
            <p className="mt-3 text-xs leading-relaxed text-white/70">{hero.deskripsi}</p>

            <div className="mt-4 flex h-52 items-end justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo} alt="Foto hero saat ini" className="h-full w-auto max-w-full object-contain object-bottom" />
            </div>
          </div>

          <p className={`mt-3 text-xs ${muted}`}>
            Foto: <span className="font-medium text-[color:var(--fg)]">{photoSource}</span>
          </p>
        </Card>
      </div>
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
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="h-96 rounded-3xl bg-[color:var(--card)]" />
        <div className="h-96 rounded-3xl bg-[color:var(--card)]" />
      </div>
    </div>
  );
}

export default function LandingPageDashboard({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <Suspense fallback={<Skeleton />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}