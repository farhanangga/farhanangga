import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  ExternalLink,
  FolderKanban,
  GitBranch,
  Globe,
  Layers,
  LayoutGrid,
  LayoutList,
  Pencil,
  Plus,
  Search,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { ACCENT_GLOW, ACCENT_GRADIENT, Card } from "@/components/dashboard/shared";

type Project = {
  id: string;
  category: string;
  title: string;
  type: string;
  role: string;
  tools: string[];
  desc: string;
  highlights: string[];
  url?: string;
  repo?: string;
  images?: string[];
  tabLabel: string;
};

type Params = { q?: string; cat?: string; view?: string; delete?: string; error?: string };
type DelHref = (id: string) => string;

const BASE = "/dashboard/projects";
const MAX_IMAGES = 10;

// Client Supabase untuk membaca (publishable key, tunduk pada RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  { auth: { persistSession: false } }
);

async function getProjects(): Promise<Project[]> {
  try {
    const [tabsRes, projectsRes, imagesRes] = await Promise.all([
      supabase.from("project_tabs").select("id, label").order("sort_order"),
      supabase.from("projects").select("*").order("position"),
      supabase.from("project_images").select("project_id, position, src").order("position"),
    ]);

    if (tabsRes.error || projectsRes.error || imagesRes.error) {
      console.error(
        "[projects page]",
        tabsRes.error?.message ?? projectsRes.error?.message ?? imagesRes.error?.message
      );
      return [];
    }

    const imagesByProject = new Map<string, string[]>();
    for (const img of imagesRes.data ?? []) {
      const list = imagesByProject.get(img.project_id) ?? [];
      if (list.length < MAX_IMAGES) list.push(img.src);
      imagesByProject.set(img.project_id, list);
    }

    return (tabsRes.data ?? []).flatMap((t) =>
      (projectsRes.data ?? [])
        .filter((r) => r.category === t.id)
        .map((r) => ({
          id: r.id,
          category: r.category,
          title: r.title,
          type: r.type,
          role: r.role,
          tools: r.tools ?? [],
          desc: r.desc,
          highlights: r.highlights ?? [],
          url: r.url ?? undefined,
          repo: r.repo ?? undefined,
          images: imagesByProject.get(r.id) ?? [],
          tabLabel: t.label,
        }))
    );
  } catch (err) {
    console.error("[projects page]", err);
    return [];
  }
}

/* token tema (lihat THEME_CSS di shared.tsx) */
const muted = "text-[color:var(--fg-muted)]";
const focus = "outline-none focus-visible:ring-2 focus-visible:ring-[#5A64D8]";
const iconBtn = `grid h-9 w-9 place-items-center rounded-xl bg-[color:var(--chip)] ${muted} transition hover:text-[color:var(--fg)] ${focus}`;
const dangerBtn = `grid h-9 w-9 place-items-center rounded-xl bg-[color:var(--chip)] ${muted} transition hover:bg-red-500/15 hover:text-red-500 outline-none focus-visible:ring-2 focus-visible:ring-red-500`;

/** Escape karakter khusus regex agar judul project aman dipakai di atribut pattern */
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");

/* ── potongan UI kecil ─────────────────────────────────── */

function Thumb({ p, className = "" }: { p: Project; className?: string }) {
  const src = p.images?.[0];
  return (
    <div className={`overflow-hidden bg-[color:var(--chip)] ${className}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <div className={`grid h-full w-full place-items-center ${muted}`}>
          <FolderKanban size={20} />
        </div>
      )}
    </div>
  );
}

function Tools({ tools }: { tools: string[] }) {
  if (tools.length === 0) return <span className={`text-xs ${muted}`}>—</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tools.slice(0, 3).map((t) => (
        <span key={t} className="rounded-lg bg-[color:var(--chip)] px-2 py-1 text-xs font-medium">
          {t}
        </span>
      ))}
      {tools.length > 3 && (
        <span className={`rounded-lg px-1.5 py-1 text-xs ${muted}`} title={tools.slice(3).join(", ")}>
          +{tools.length - 3}
        </span>
      )}
    </div>
  );
}

function Actions({ p, delHref }: { p: Project; delHref: DelHref }) {
  return (
    <div className="relative z-10 flex items-center justify-end gap-1.5">
      {p.url && (
        <a href={p.url} target="_blank" rel="noreferrer" aria-label={`Buka live ${p.title}`} title="Buka live URL" className={iconBtn}>
          <ExternalLink size={15} />
        </a>
      )}
      {p.repo && (
        <a href={p.repo} target="_blank" rel="noreferrer" aria-label={`Buka repository ${p.title}`} title="Buka repository" className={iconBtn}>
          <GitBranch size={15} />
        </a>
      )}
      <Link href={`${BASE}/${p.id}/edit`} aria-label={`Edit ${p.title}`} title="Edit" className={iconBtn}>
        <Pencil size={15} />
      </Link>
      <Link href={delHref(p.id)} scroll={false} aria-label={`Hapus ${p.title}`} title="Hapus" className={dangerBtn}>
        <Trash2 size={15} />
      </Link>
    </div>
  );
}

/* stretched link: seluruh baris/kartu bisa diklik untuk edit */
const stretch = "after:absolute after:inset-0 after:content-['']";

/* ── tampilan daftar ───────────────────────────────────── */
const COLS = "lg:grid lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1.6fr)_8.5rem_10rem] lg:items-center lg:gap-5";

function ListView({ rows, delHref }: { rows: Project[]; delHref: DelHref }) {
  return (
    <Card className="mt-4 overflow-hidden">
      <div className={`hidden px-5 py-3 text-xs font-medium ${muted} border-b border-[color:var(--chip)] ${COLS}`}>
        <span>Project</span>
        <span>Tools</span>
        <span>Kategori</span>
        <span className="text-right">Aksi</span>
      </div>

      <ul className="divide-y divide-[color:var(--chip)]">
        {rows.map((p) => (
          <li
            key={p.id}
            className={`relative flex flex-col gap-3 px-5 py-4 transition-colors focus-within:bg-[color:var(--card-hi)] hover:bg-[color:var(--card-hi)] ${COLS}`}
          >
            <div className="flex min-w-0 items-center gap-4">
              <Thumb p={p} className="h-14 w-[5.5rem] shrink-0 rounded-xl ring-1 ring-[color:var(--line)]" />
              <div className="min-w-0">
                <Link href={`${BASE}/${p.id}/edit`} className={`block truncate font-semibold outline-none ${stretch}`}>
                  {p.title}
                </Link>
                <p className={`mt-0.5 truncate text-sm ${muted}`}>
                  {p.role} · {p.type}
                </p>
              </div>
            </div>

            <Tools tools={p.tools ?? []} />

            <div className="flex items-center justify-between gap-3 lg:contents">
              <span className={`w-fit truncate rounded-full bg-[color:var(--chip)] px-2.5 py-1 text-xs ${muted}`}>{p.tabLabel}</span>
              <Actions p={p} delHref={delHref} />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ── tampilan kartu ────────────────────────────────────── */
/** tallCover: cover 4/5 (dipakai saat filter Photographer aktif); selain itu 16/10. */
function GridView({
  rows,
  delHref,
  tallCover = false,
}: {
  rows: Project[];
  delHref: DelHref;
  tallCover?: boolean;
}) {
  return (
    <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((p) => (
        <li key={p.id} className="contents">
          <Card className="group relative flex flex-col overflow-hidden">
            <div className="relative">
              <Thumb
                p={p}
                className={`${
                  tallCover ? "aspect-[4/5]" : "aspect-[16/10]"
                } w-full [&_img]:transition-transform [&_img]:duration-500 group-hover:[&_img]:scale-[1.04] motion-reduce:[&_img]:transition-none`}
              />
              <span className="absolute left-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
                {p.tabLabel}
              </span>
            </div>

            <div className="flex flex-1 flex-col p-5">
              <Link href={`${BASE}/${p.id}/edit`} className={`truncate font-semibold outline-none ${stretch}`}>
                {p.title}
              </Link>
              <p className={`mt-0.5 truncate text-sm ${muted}`}>
                {p.role} · {p.type}
              </p>
              <div className="mt-3">
                <Tools tools={p.tools ?? []} />
              </div>
              <div className="mt-auto pt-5">
                <Actions p={p} delHref={delHref} />
              </div>
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}

/* ── modal konfirmasi hapus (server-rendered, via ?delete=<id>) ── */
function DeleteModal({ project, closeHref }: { project: Project; closeHref: string }) {
  const phrase = `delete ${project.title}`;
  const pattern = escapeRegex(phrase);

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="del-title" className="fixed inset-0 z-50 grid place-items-center p-4">
      {/* backdrop: klik untuk menutup */}
      <Link href={closeHref} scroll={false} aria-label="Tutup" className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative w-full max-w-md rounded-3xl bg-[color:var(--card)] p-6 text-[color:var(--fg)] shadow-2xl ring-1 ring-[color:var(--line)]">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-red-500/15 text-red-500">
          <TriangleAlert size={20} />
        </span>
        <h2 id="del-title" className="mt-4 text-lg font-semibold">
          Hapus project?
        </h2>
        <p className={`mt-1 text-sm ${muted}`}>
          Project <strong className="text-[color:var(--fg)]">{project.title}</strong> beserta gambarnya akan dihapus
          permanen dan tidak bisa dikembalikan.
        </p>

        <form method="POST" action={`/api/projects/${project.id}/delete`} className="mt-5">
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
              href={closeHref}
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
  const { q = "", cat = "all", view, delete: delId, error } = await searchParams;
  const v: "list" | "grid" = view === "grid" ? "grid" : "list";
  const all = await getProjects();

  const categories = Array.from(new Map(all.map((p) => [p.category, p.tabLabel] as [string, string])).entries());

  // filter Photographer aktif → cover kartu dibuat 4/5 (hanya berlaku di tampilan kartu)
  const photoFilter =
    cat !== "all" &&
    /photo|foto/i.test(`${cat} ${categories.find(([c]) => c === cat)?.[1] ?? ""}`);

  const keyword = q.trim().toLowerCase();
  const rows = all.filter(
    (p) =>
      (cat === "all" || p.category === cat) &&
      (!keyword || [p.title, p.role, p.type, ...(p.tools ?? [])].join(" ").toLowerCase().includes(keyword)),
  );

  const href = (nextCat: string, nextView: string = v, extra?: Record<string, string>) => {
    const sp = new URLSearchParams();
    if (nextCat !== "all") sp.set("cat", nextCat);
    if (q) sp.set("q", q);
    if (nextView !== "list") sp.set("view", nextView);
    for (const [k, val] of Object.entries(extra ?? {})) sp.set(k, val);
    const s = sp.toString();
    return `${BASE}${s ? `?${s}` : ""}`;
  };

  const delHref: DelHref = (id) => href(cat, v, { delete: id });
  const deleting = delId ? all.find((p) => p.id === delId) : undefined;

  const stats = [
    { label: "Total project", value: all.length, icon: FolderKanban, hero: true },
    { label: "Kategori", value: categories.length, icon: Layers },
    { label: "Punya live URL", value: all.filter((p) => p.url).length, icon: Globe },
    { label: "Punya repository", value: all.filter((p) => p.repo).length, icon: GitBranch },
  ];

  const views = [
    { id: "list", label: "Tampilan daftar", Icon: LayoutList },
    { id: "grid", label: "Tampilan kartu", Icon: LayoutGrid },
  ] as const;

  return (
    <>
      {/* header: judul halaman sudah ada di topbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className={`text-sm ${muted}`}>Kelola semua project yang tampil di website portfolio.</p>
        <Link
          href={`${BASE}/new`}
          className={`inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.98] ${focus}`}
          style={{ background: ACCENT_GRADIENT, boxShadow: ACCENT_GLOW }}
        >
          <Plus size={16} /> Tambah project
        </Link>
      </div>

      {error === "delete" && (
        <p role="alert" className="mt-5 rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-500">
          Project gagal dihapus. Pastikan teks konfirmasi benar, lalu coba lagi.
        </p>
      )}

      {/* statistik */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => {
          const body = (
            <>
              <div className="flex items-center justify-between">
                <span className={`text-sm ${s.hero ? "text-white/75" : muted}`}>{s.label}</span>
                <s.icon size={16} className={s.hero ? "text-white/75" : muted} />
              </div>
              <p className={`mt-3 text-3xl font-semibold tabular-nums ${s.hero ? "text-white" : ""}`}>{s.value}</p>
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

      {/* toolbar: filter + pencarian + pilihan tampilan */}
      <Card className="mt-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {([["all", "Semua"], ...categories] as [string, string][]).map(([c, name]) => {
              const active = c === cat;
              return (
                <Link
                  key={c}
                  href={href(c)}
                  aria-current={active ? "true" : undefined}
                  className={`rounded-full px-3.5 py-1.5 text-sm transition ${focus} ${
                    active ? "font-medium text-white" : `bg-[color:var(--card-hi)] ${muted} hover:text-[color:var(--fg)]`
                  }`}
                  style={active ? { background: ACCENT_GRADIENT, boxShadow: ACCENT_GLOW } : undefined}
                >
                  {name}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <form action={BASE} className="relative min-w-0 flex-1 lg:w-72 lg:flex-none">
              {cat !== "all" && <input type="hidden" name="cat" value={cat} />}
              {v !== "list" && <input type="hidden" name="view" value={v} />}
              <Search size={16} className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 ${muted}`} />
              <input
                name="q"
                defaultValue={q}
                placeholder="Cari judul, role, atau tools"
                aria-label="Cari project"
                className="h-11 w-full rounded-2xl bg-[color:var(--card-hi)] pl-10 pr-3 text-sm text-[color:var(--fg)] outline-none ring-1 ring-transparent transition placeholder:text-[color:var(--fg-muted)] focus:ring-2 focus:ring-[#5A64D8]"
              />
            </form>

            <div role="group" aria-label="Pilih tampilan" className="flex shrink-0 rounded-2xl bg-[color:var(--card-hi)] p-1">
              {views.map(({ id, label, Icon }) => {
                const active = id === v;
                return (
                  <Link
                    key={id}
                    href={href(cat, id)}
                    aria-label={label}
                    title={label}
                    aria-current={active ? "true" : undefined}
                    className={`grid h-9 w-9 place-items-center rounded-xl transition ${focus} ${
                      active ? "text-white" : `${muted} hover:text-[color:var(--fg)]`
                    }`}
                    style={active ? { background: ACCENT_GRADIENT, boxShadow: ACCENT_GLOW } : undefined}
                  >
                    <Icon size={16} />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {rows.length > 0 && (
        <p className={`mt-5 px-1 text-sm ${muted}`}>
          Menampilkan {rows.length} dari {all.length} project
        </p>
      )}

      {/* hasil */}
      {rows.length === 0 ? (
        <Card className="mt-4 px-6 py-16 text-center">
          <span className={`mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[color:var(--chip)] ${muted}`}>
            <FolderKanban size={20} />
          </span>
          <p className="mt-4 font-medium">{all.length === 0 ? "Belum ada project" : "Tidak ada yang cocok"}</p>
          <p className={`mt-1 text-sm ${muted}`}>
            {all.length === 0
              ? "Belum ada project atau data gagal dimuat."
              : "Coba ubah kata kunci atau pilih kategori lain."}
          </p>
          {all.length === 0 ? (
            <Link href={`${BASE}/new`} className="mt-4 inline-block text-sm font-medium text-[#5A64D8] underline underline-offset-4">
              Tambah project pertama
            </Link>
          ) : (
            <Link href={BASE} className="mt-4 inline-block text-sm font-medium text-[#5A64D8] underline underline-offset-4">
              Reset filter
            </Link>
          )}
        </Card>
      ) : v === "grid" ? (
        <GridView rows={rows} delHref={delHref} tallCover={photoFilter} />
      ) : (
        <ListView rows={rows} delHref={delHref} />
      )}

      {deleting && <DeleteModal project={deleting} closeHref={href(cat, v)} />}
    </>
  );
}

function Skeleton() {
  const pulse = "animate-pulse motion-reduce:animate-none";
  return (
    <div aria-busy="true" aria-label="Memuat project" className={pulse}>
      <div className="h-5 w-72 max-w-full rounded-lg bg-[color:var(--chip)]" />
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-3xl bg-[color:var(--card)]" />
        ))}
      </div>
      <div className="mt-4 h-[4.5rem] rounded-3xl bg-[color:var(--card)]" />
      <div className="mt-9 divide-y divide-[color:var(--chip)] overflow-hidden rounded-3xl bg-[color:var(--card)]">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4">
            <div className="h-14 w-[5.5rem] rounded-xl bg-[color:var(--chip)]" />
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

export default function ProjectPage({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <Suspense fallback={<Skeleton />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}