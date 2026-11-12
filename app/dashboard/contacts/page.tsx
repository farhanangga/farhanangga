import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ExternalLink, Link2, Pencil, Plus, Trash2, TriangleAlert } from "lucide-react";
import { getSession } from "@/lib/session";
import { ACCENT_GLOW, ACCENT_GRADIENT, Card } from "@/components/dashboard/shared";
// Pintu data baca: handler GET di route ini. Hapus lewat POST ke /api/contacts/[id]/delete.
import { GET as getContactsRoute } from "@/app/api/contacts/route";

type Contact = {
  id: string;
  platform: string;
  icon: string;
  handle: string;
  href: string;
  desc: string;
  position: number;
};
type Params = { delete?: string; error?: string };

const BASE = "/dashboard/contacts";
const API = "/api/contacts";

const errorMsg: Record<string, string> = {
  invalid:
    "Isian belum lengkap atau tidak valid. Periksa platform, ikon, handle, tautan (http, https, mailto, atau tel), deskripsi, dan urutan.",
  delete: "Kontak gagal dihapus. Pastikan teks konfirmasi benar, lalu coba lagi.",
  notfound: "Kontak tidak ditemukan. Mungkin sudah dihapus.",
  default: "Perubahan gagal disimpan. Periksa isian form lalu coba lagi.",
};

/** Aman terhadap query seperti ?error=constructor / ?error=toString. */
const getErrorMsg = (key?: string) =>
  key && Object.prototype.hasOwnProperty.call(errorMsg, key) ? errorMsg[key] : errorMsg.default;

/** null = gagal memuat (beda dengan [] = memang kosong). */
async function fetchContacts(): Promise<Contact[] | null> {
  try {
    const res = await getContactsRoute();
    if (process.env.NODE_ENV !== "production") {
      console.log("[contacts page] status:", res.status);
    }
    if (!res.ok) {
      console.error(`[contacts page] route gagal: ${res.status}`);
      return null;
    }
    const json = (await res.json()) as { data?: Contact[] };
    return Array.isArray(json.data) ? json.data : null;
  } catch (err) {
    console.error("[contacts page]", err);
    return null;
  }
}

/* token tema (lihat THEME_CSS di shared.tsx) */
const muted = "text-[color:var(--fg-muted)]";
const focus = "outline-none focus-visible:ring-2 focus-visible:ring-[#5A64D8]";
const iconBtn = `grid h-9 w-9 place-items-center rounded-xl bg-[color:var(--chip)] ${muted} transition hover:text-[color:var(--fg)] ${focus}`;
const dangerBtn = `grid h-9 w-9 place-items-center rounded-xl bg-[color:var(--chip)] ${muted} transition hover:bg-red-500/15 hover:text-red-500 outline-none focus-visible:ring-2 focus-visible:ring-red-500`;
/** Escape karakter khusus regex agar nama platform aman dipakai di atribut pattern */
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");

/* stretched link: seluruh baris bisa diklik untuk edit */
const stretch = "after:absolute after:inset-0 after:content-['']";

const COLS = "lg:grid lg:grid-cols-[3rem_minmax(0,2fr)_minmax(0,2.4fr)_8rem] lg:items-center lg:gap-5";

/* ── daftar ────────────────────────────────────────────── */

function ListView({ rows }: { rows: Contact[] }) {
  return (
    <Card className="mt-4 overflow-hidden">
      <div className={`hidden px-5 py-3 text-xs font-medium ${muted} border-b border-[color:var(--chip)] ${COLS}`}>
        <span>Urutan</span>
        <span>Kontak</span>
        <span>Deskripsi</span>
        <span className="text-right">Aksi</span>
      </div>

      <ul className="divide-y divide-[color:var(--chip)]">
        {rows.map((c) => (
          <li
            key={c.id}
            className={`relative flex flex-col gap-3 px-5 py-4 transition-colors focus-within:bg-[color:var(--card-hi)] hover:bg-[color:var(--card-hi)] ${COLS}`}
          >
            <span className={`hidden text-sm tabular-nums lg:block ${muted}`}>{c.position}</span>

            <div className="flex min-w-0 items-center gap-4">
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[color:var(--chip)] ${muted}`}>
                <Link2 size={18} />
              </span>
              <div className="min-w-0">
                <Link
                  href={`${BASE}/${encodeURIComponent(c.id)}/edit`}
                  className={`block truncate font-semibold outline-none ${stretch}`}
                >
                  {c.platform}
                </Link>
                <p className={`mt-0.5 truncate text-sm ${muted}`}>{c.handle}</p>
              </div>
            </div>

            <p className={`line-clamp-2 text-sm ${muted}`}>{c.desc}</p>

            <div className="relative z-10 flex items-center justify-between gap-3 lg:justify-end">
              <span className={`rounded-full bg-[color:var(--chip)] px-2.5 py-1 text-xs lg:hidden ${muted}`}>
                #{c.position} · {c.icon}
              </span>
              <div className="flex items-center gap-1.5">
                <a
                  href={c.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Buka tautan ${c.platform}`}
                  title="Buka tautan"
                  className={iconBtn}
                >
                  <ExternalLink size={15} />
                </a>
                <Link
                  href={`${BASE}/${encodeURIComponent(c.id)}/edit`}
                  aria-label={`Edit ${c.platform}`}
                  title="Edit"
                  className={iconBtn}
                >
                  <Pencil size={15} />
                </Link>
                <Link
                  href={`${BASE}?delete=${encodeURIComponent(c.id)}`}
                  scroll={false}
                  aria-label={`Hapus ${c.platform}`}
                  title="Hapus"
                  className={dangerBtn}
                >
                  <Trash2 size={15} />
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ── modal konfirmasi hapus (server-rendered, via ?delete=<id>) ── */

function DeleteModal({ item }: { item: Contact }) {
  const phrase = `delete ${item.platform}`;
  const pattern = escapeRegex(phrase);

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="del-title" className="fixed inset-0 z-50 grid place-items-center p-4">
      <Link href={BASE} scroll={false} aria-label="Tutup" className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative w-full max-w-md rounded-3xl bg-[color:var(--card)] p-6 text-[color:var(--fg)] shadow-2xl ring-1 ring-[color:var(--line)]">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-red-500/15 text-red-500">
          <TriangleAlert size={20} />
        </span>
        <h2 id="del-title" className="mt-4 text-lg font-semibold">
          Hapus kontak?
        </h2>
        <p className={`mt-1 text-sm ${muted}`}>
          Kontak <strong className="text-[color:var(--fg)]">{item.platform}</strong> akan dihapus permanen dan tidak
          bisa dikembalikan.
        </p>

        <form method="POST" action={`${API}/${encodeURIComponent(item.id)}/delete`} className="mt-5">

          <label htmlFor="confirm" className="text-sm">
            Ketik{" "}
            <code className="select-all rounded-md bg-[color:var(--chip)] px-1.5 py-0.5 text-xs font-semibold">{phrase}</code>{" "}
            untuk melanjutkan
          </label>
          <input
            id="confirm"
            name="confirm"
            required
            autoFocus
            autoComplete="off"
            spellCheck={false}
            pattern={pattern}
            title={`Ketik persis: ${phrase}`}
            placeholder={phrase}
            className="mt-2 h-11 w-full rounded-2xl bg-[color:var(--card-hi)] px-3.5 text-sm text-[color:var(--fg)] outline-none ring-1 ring-transparent transition placeholder:text-[color:var(--fg-muted)] focus:ring-2 focus:ring-red-500"
          />

          <div className="mt-5 flex justify-end gap-2">
            <Link
              href={BASE}
              scroll={false}
              className={`inline-flex h-10 items-center rounded-xl bg-[color:var(--chip)] px-4 text-sm font-medium ${focus}`}
            >
              Batal
            </Link>
            <button
              type="submit"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-500 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-red-400 outline-none"
            >
              <Trash2 size={15} /> Hapus permanen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── halaman ───────────────────────────────────────────── */

async function Content({ searchParams }: { searchParams: Promise<Params> }) {
  // halaman juga dijaga, bukan hanya route-nya
  if (!(await getSession())) redirect("/admin");

  const { delete: delId, error } = await searchParams;
  const data = await fetchContacts();
  const rows = data ?? [];
  const loadFailed = data === null;

  const deleting = delId ? rows.find((c) => c.id === delId) : undefined;

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className={`text-sm ${muted}`}>Kelola tautan kontak yang tampil di website portfolio.</p>
        <Link
          href={`${BASE}/new`}
          className={`inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.98] ${focus}`}
          style={{ background: ACCENT_GRADIENT, boxShadow: ACCENT_GLOW }}
        >
          <Plus size={16} /> Tambah kontak
        </Link>
      </div>

      {loadFailed && (
        <p role="alert" className="mt-5 rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-500">
          Data kontak gagal dimuat. Lihat log terminal untuk detailnya, lalu muat ulang halaman.
        </p>
      )}

      {error && !deleting && (
        <p role="alert" className="mt-5 rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-500">
          {getErrorMsg(error)}
        </p>
      )}

      {rows.length > 0 && <p className={`mt-6 px-1 text-sm ${muted}`}>{rows.length} kontak</p>}

      {rows.length === 0 ? (
        <Card className="mt-4 px-6 py-16 text-center">
          <span className={`mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[color:var(--chip)] ${muted}`}>
            <Link2 size={20} />
          </span>
          <p className="mt-4 font-medium">Belum ada kontak</p>
          <p className={`mt-1 text-sm ${muted}`}>Tambahkan kontak pertama untuk ditampilkan di website.</p>
          <Link
            href={`${BASE}/new`}
          className="mt-4 inline-block text-sm font-medium text-[#5A64D8] underline underline-offset-4"
          >
            Tambah kontak pertama
          </Link>
        </Card>
      ) : (
        <ListView rows={rows} />
      )}

      {deleting && <DeleteModal item={deleting} />}
    </>
  );
}

function Skeleton() {
  return (
    <div aria-busy="true" aria-label="Memuat kontak" className="animate-pulse motion-reduce:animate-none">
      <div className="h-5 w-72 max-w-full rounded-lg bg-[color:var(--chip)]" />
      <div className="mt-9 divide-y divide-[color:var(--chip)] overflow-hidden rounded-3xl bg-[color:var(--card)]">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4">
            <div className="h-11 w-11 rounded-xl bg-[color:var(--chip)]" />
            <div className="space-y-2">
              <div className="h-4 w-40 rounded bg-[color:var(--chip)]" />
              <div className="h-3 w-56 rounded bg-[color:var(--chip)]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ContactsDashboardPage({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <Suspense fallback={<Skeleton />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}