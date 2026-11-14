import type { CSSProperties } from "react";
import { redirect } from "next/navigation";
import {
  Camera,
  CircleAlert,
  CircleCheck,
  ExternalLink,
  Info,
  Palette,
  PenTool,
  Terminal,
  type LucideIcon,
} from "lucide-react";
import { getSession } from "@/lib/session";
import { profile } from "@/lib/data";
import { Card } from "@/components/dashboard/shared";
import { ImageDropzone, SubmitButton } from "@/components/dashboard/imageDropzone";
// Satu-satunya pintu data: handler GET di route ini. Penyimpanan lewat action form ke route yang sama (POST).
import { GET as getHeroRoute } from "@/app/api/landingPage/hero/edit/route";

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

/* ── section ───────────────────────────────────────────── */

export async function EditHero({ searchParams }: { searchParams: Promise<Params> }) {
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

  const hero = result.row ?? DEFAULTS;
  const photo = hero.urlFoto || DEFAULT_PHOTO;

  return (
    <>
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

      {/* pratinjau: replika hero desktop dari data tersimpan */}
      <Card className="mt-6 p-6">
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

export function EditHeroSkeleton() {
  const pulse = "animate-pulse motion-reduce:animate-none";
  return (
    <div role="status" aria-busy="true" aria-label="Memuat hero" className={pulse}>
      <div className="h-5 w-72 max-w-full rounded-lg bg-[color:var(--chip)]" />
      <div className="mt-6 h-96 rounded-3xl bg-[color:var(--card)]" />
      <div className="mt-4 h-96 rounded-3xl bg-[color:var(--card)]" />
    </div>
  );
}