import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronDown, CircleAlert, Info, Link2 } from "lucide-react";
import { getSession } from "@/lib/session";
import { Card } from "@/components/dashboard/shared";
import { SubmitButton } from "@/components/dashboard/imageDropzone";

const BASE = "/dashboard/contacts";
const SUBMIT_URL = "/api/contacts/create";

// Samakan dengan ICONS di app/api/contacts/create/route.ts. Sesuaikan dengan ikon yang didukung komponen Contact di portfolio.
const ICONS = [
  { value: "linkedin", label: "LinkedIn" },
  { value: "github", label: "GitHub" },
  { value: "instagram", label: "Instagram" },
  { value: "email", label: "Email" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "twitter", label: "X / Twitter" },
  { value: "youtube", label: "YouTube" },
  { value: "tiktok", label: "TikTok" },
  { value: "facebook", label: "Facebook" },
];

const errorMsg: Record<string, string> = {
  invalid:
    "Isian belum lengkap atau tidak valid. Periksa platform, ikon, handle, tautan (http, https, mailto, atau tel), deskripsi, dan urutan.",
  default: "Kontak gagal disimpan. Periksa isian form lalu coba lagi.",
};

/** Aman terhadap query seperti ?error=constructor / ?error=toString. */
const getErrorMsg = (key?: string) =>
  key && Object.prototype.hasOwnProperty.call(errorMsg, key) ? errorMsg[key] : errorMsg.default;

/* ── CSS khusus halaman ────────────────────────────────────
 * Dropdown ikon memakai `appearance: base-select` bila didukung browser
 * (daftar pilihan bisa di-style penuh). Browser lain tetap memakai <select> biasa. */
const PAGE_CSS = `
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

/* token tema (lihat THEME_CSS di shared.tsx) */
const muted = "text-[color:var(--fg-muted)]";
const focus = "outline-none focus-visible:ring-2 focus-visible:ring-[#5A64D8]";
const field =
  "w-full rounded-2xl bg-[color:var(--card-hi)] text-sm text-[color:var(--fg)] outline-none ring-1 ring-transparent transition placeholder:text-[color:var(--fg-muted)] focus:ring-2 focus:ring-[#5A64D8]";
const inputCls = `${field} h-11 px-4`;
const areaCls = `${field} resize-y px-4 py-3`;

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

export default async function NewContactPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  // halaman juga dijaga, bukan hanya route-nya
  if (!(await getSession())) redirect("/admin");

  const { error } = await searchParams;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: PAGE_CSS }} />
      <p className={`mt-1 hidden text-sm lg:block ${muted}`}>Tambahkan tautan kontak baru untuk website portfolio.</p>

      {error && (
        <div
          role="alert"
          className="mt-6 flex items-start gap-3 rounded-2xl border border-[#E85B53]/30 bg-[#E85B53]/10 px-4 py-3 text-sm font-medium text-[#E85B53]"
        >
          <CircleAlert size={18} className="mt-px shrink-0" />
          {getErrorMsg(error)}
        </div>
      )}

      <form action={SUBMIT_URL} method="post" autoComplete="off" className="mt-4 lg:mt-8">
        <div className="space-y-4">
          <Section title="Informasi kontak" desc="Platform dan tautan yang tampil di bagian kontak portfolio.">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Platform" htmlFor="platform" required>
                <input
                  id="platform"
                  name="platform"
                  required
                  autoFocus
                  autoComplete="off"
                  className={inputCls}
                  placeholder="LinkedIn"
                />
              </Field>

              <Field label="Ikon" htmlFor="icon" required>
                <div className="relative">
                  <select
                    id="icon"
                    name="icon"
                    required
                    autoComplete="off"
                    defaultValue=""
                    className={`cat-select ${inputCls} appearance-none pr-10`}
                  >
                    <option value="" disabled>
                      Pilih ikon
                    </option>
                    {ICONS.map((i) => (
                      <option key={i.value} value={i.value}>
                        {i.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className={`cat-chevron pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 transition-transform duration-200 ${muted}`}
                  />
                </div>
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Handle" htmlFor="handle" required hint="Nama atau username yang ditampilkan.">
              <input
                id="handle"
                name="handle"
                required
                autoComplete="off"
                className={inputCls}
                placeholder="@username"
              />
            </Field>

            <Field label="Tautan" htmlFor="href" required hint="Boleh https://…, mailto:… atau tel:…">
              <div className="relative">
                <Link2 size={16} className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 ${muted}`} />
                <input
                  id="href"
                  name="href"
                  required
                  inputMode="url"
                  autoComplete="off"
                  className={`${inputCls} pl-10`}
                  placeholder="https://"
                />
              </div>
            </Field>
            </div>
          </Section>

          <Section title="Deskripsi" desc="Kalimat singkat di bawah nama platform.">
            <Field label="Deskripsi" htmlFor="desc" required>
              <textarea
                id="desc"
                name="desc"
                rows={3}
                required
                autoComplete="off"
                className={areaCls}
                placeholder="Untuk tawaran kerja, kolaborasi, dan koneksi profesional."
              />
            </Field>

            <Field
              label="Urutan"
              htmlFor="position"
              hint="Angka kecil tampil lebih dulu. Kosongkan untuk menaruh di paling akhir."
            >
              <input
                id="position"
                name="position"
                type="number"
                inputMode="numeric"
                min={1}
                max={9999}
                step={1}
                autoComplete="off"
                className={`${inputCls} sm:max-w-[10rem]`}
                placeholder="1"
              />
            </Field>
          </Section>
        </div>

        {/* aksi: bottom bar tetap di bawah layar */}
        <BottomBar>
          <p className={`hidden items-center gap-2.5 text-sm sm:flex ${muted}`}>
            <Info size={16} className="shrink-0" />
            <span>Kontak tampil di website setelah disimpan.</span>
          </p>
          <div className="flex w-full gap-3 sm:w-auto">
            <Link
              href={BASE}
              className={`grid h-12 shrink-0 place-items-center rounded-2xl bg-[color:var(--card-hi)] px-6 text-sm font-medium ${muted} transition hover:text-[color:var(--fg)] ${focus}`}
            >
              Batal
            </Link>
            <div className="flex flex-1 sm:flex-none [&>button]:flex-1">
              <SubmitButton>Simpan kontak</SubmitButton>
            </div>
          </div>
        </BottomBar>
      </form>
    </>
  );
}