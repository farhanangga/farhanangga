import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  CalendarDays,
  CircleAlert,
  CircleCheck,
  ExternalLink,
  FolderKanban,
  ImageIcon,
  Link2,
  Plus,
} from "lucide-react";
import { getSession } from "@/lib/session";
import { ACCENT_GLOW, ACCENT_GRADIENT, Card } from "@/components/dashboard/shared";
// Satu-satunya pintu data: handler GET di route ini.
import { GET as getDashboardRoute } from "@/app/api/dashboard/route";

type DashboardData = {
  totals: { projects: number; activities: number; contacts: number; projectImages: number; activityImages: number };
  projects: {
    byCategory: { id: string; label: string; count: number }[];
    topTools: { name: string; count: number }[];
    withUrl: number;
    withRepo: number;
    withoutImages: number;
    withoutUrl: number;
    latest: { id: string; title: string; category: string; type: string; role: string; images: number; cover: string | null }[];
  };
  activities: {
    byYear: { year: number | null; count: number }[];
    withoutYear: number;
    withoutImages: number;
    withJobdesc: number;
    latest: { id: string; nama: string; tahun: number | null; role: string; images: number; cover: string | null }[];
  };
  contacts: { id: string; platform: string; icon: string; handle: string; href: string }[];
};

async function fetchDashboard(): Promise<DashboardData | null> {
  try {
    const res = await getDashboardRoute();
    if (!res.ok) {
      console.error(`[dashboard page] route gagal: ${res.status}`);
      return null;
    }
    const json = (await res.json()) as { data?: DashboardData };
    return json.data ?? null;
  } catch (err) {
    console.error("[dashboard page]", err);
    return null;
  }
}

/* token tema (lihat THEME_CSS di shared.tsx) */
const muted = "text-[color:var(--fg-muted)]";
const focus = "outline-none focus-visible:ring-2 focus-visible:ring-[#5A64D8]";
const linkBtn = `inline-flex h-10 items-center gap-2 rounded-xl bg-[color:var(--chip)] px-4 text-sm font-medium transition hover:brightness-110 active:scale-[0.98] ${focus}`;

/* ── potongan UI kecil ─────────────────────────────────── */

function CardHead({ title, desc, href, hrefLabel }: { title: string; desc?: string; href?: string; hrefLabel?: string }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {desc && <p className={`mt-0.5 text-sm ${muted}`}>{desc}</p>}
      </div>
      {href && (
        <Link href={href} className={`inline-flex shrink-0 items-center gap-1 text-sm font-medium text-[#5A64D8] ${focus} rounded-lg`}>
          {hrefLabel ?? "Kelola"} <ArrowUpRight size={14} />
        </Link>
      )}
    </div>
  );
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.max(value > 0 ? 4 : 0, Math.round((value / max) * 100)) : 0;
  return (
    <li className="grid grid-cols-[minmax(0,8rem)_1fr_2rem] items-center gap-3 text-sm sm:grid-cols-[minmax(0,11rem)_1fr_2rem]">
      <span className="truncate" title={label}>
        {label}
      </span>
      <span className="h-2.5 overflow-hidden rounded-full bg-[color:var(--chip)]">
        <span
          className="block h-full rounded-full"
          style={{ width: `${pct}%`, background: ACCENT_GRADIENT }}
        />
      </span>
      <span className="text-right font-semibold tabular-nums">{value}</span>
    </li>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className={`py-6 text-center text-sm ${muted}`}>{children}</p>;
}

function Cover({ src, className = "" }: { src: string | null; className?: string }) {
  return (
    <div className={`shrink-0 overflow-hidden bg-[color:var(--chip)] ${className}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <div className={`grid h-full w-full place-items-center ${muted}`}>
          <ImageIcon size={18} />
        </div>
      )}
    </div>
  );
}

/* ── halaman ───────────────────────────────────────────── */

async function Content() {
  // halaman juga dijaga, bukan hanya route-nya
  if (!(await getSession())) redirect("/admin");

  const data = await fetchDashboard();

  if (!data) {
    return (
      <div
        role="alert"
        className="mt-2 flex items-start gap-3 rounded-2xl border border-[#E85B53]/30 bg-[#E85B53]/10 px-4 py-3 text-sm font-medium text-[#E85B53]"
      >
        <CircleAlert size={18} className="mt-px shrink-0" />
        Ringkasan dashboard gagal dimuat. Lihat log terminal untuk detailnya, lalu muat ulang halaman.
      </div>
    );
  }

  const { totals, projects, activities, contacts } = data;
  const totalImages = totals.projectImages + totals.activityImages;

  const stats = [
    {
      label: "Total project",
      value: totals.projects,
      sub: `${projects.byCategory.filter((c) => c.count > 0).length} kategori terisi`,
      icon: FolderKanban,
      hero: true,
    },
    {
      label: "Total kegiatan",
      value: totals.activities,
      sub: `${activities.byYear.filter((y) => y.year !== null).length} tahun berbeda`,
      icon: CalendarDays,
    },
    { label: "Total kontak", value: totals.contacts, sub: "tautan di website", icon: Link2 },
    {
      label: "Total gambar",
      value: totalImages,
      sub: `${totals.projectImages} project · ${totals.activityImages} kegiatan`,
      icon: ImageIcon,
    },
  ];

  const attention = [
    { label: "Project tanpa gambar", count: projects.withoutImages, href: "/dashboard/projects" },
    { label: "Project tanpa live URL", count: projects.withoutUrl, href: "/dashboard/projects" },
    { label: "Kegiatan tanpa gambar", count: activities.withoutImages, href: "/dashboard/activities" },
    { label: "Kegiatan tanpa tahun", count: activities.withoutYear, href: "/dashboard/activities" },
  ].filter((a) => a.count > 0);

  const maxCat = Math.max(0, ...projects.byCategory.map((c) => c.count));
  const maxYear = Math.max(0, ...activities.byYear.map((y) => y.count));
  const maxTool = Math.max(0, ...projects.topTools.map((t) => t.count));

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className={`text-sm ${muted}`}>Ringkasan semua data yang tampil di website portfolio.</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/projects/new" className={linkBtn}>
            <Plus size={15} /> Project
          </Link>
          <Link href="/dashboard/activities/new" className={linkBtn}>
            <Plus size={15} /> Kegiatan
          </Link>
          <Link href="/dashboard/contacts/new" className={linkBtn}>
            <Plus size={15} /> Kontak
          </Link>
        </div>
      </div>

      {/* statistik utama */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => {
          const body = (
            <>
              <div className="flex items-center justify-between">
                <span className={`text-sm ${s.hero ? "text-white/75" : muted}`}>{s.label}</span>
                <s.icon size={16} className={s.hero ? "text-white/75" : muted} />
              </div>
              <p className={`mt-3 text-3xl font-semibold tabular-nums ${s.hero ? "text-white" : ""}`}>{s.value}</p>
              <p className={`mt-1 text-xs ${s.hero ? "text-white/70" : muted}`}>{s.sub}</p>
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

      {/* grafik: kategori + tahun */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <CardHead title="Project per kategori" desc="Sebaran project di tiap kategori." href="/dashboard/projects" />
          {projects.byCategory.length === 0 ? (
            <Empty>Belum ada kategori.</Empty>
          ) : (
            <ul className="space-y-3.5">
              {projects.byCategory.map((c) => (
                <Bar key={c.id} label={c.label} value={c.count} max={maxCat} />
              ))}
            </ul>
          )}
          <div className="mt-5 flex flex-wrap gap-2 border-t border-[color:var(--chip)] pt-4 text-xs">
            <span className="rounded-full bg-[color:var(--chip)] px-2.5 py-1">{projects.withUrl} punya live URL</span>
            <span className="rounded-full bg-[color:var(--chip)] px-2.5 py-1">{projects.withRepo} punya repository</span>
          </div>
        </Card>

        <Card className="p-6">
          <CardHead title="Kegiatan per tahun" desc="Jumlah kegiatan dan kepanitiaan tiap tahun." href="/dashboard/activities" />
          {activities.byYear.length === 0 ? (
            <Empty>Belum ada kegiatan.</Empty>
          ) : (
            <ul className="space-y-3.5">
              {activities.byYear.map((y) => (
                <Bar key={String(y.year)} label={y.year === null ? "Tanpa tahun" : String(y.year)} value={y.count} max={maxYear} />
              ))}
            </ul>
          )}
          <div className="mt-5 flex flex-wrap gap-2 border-t border-[color:var(--chip)] pt-4 text-xs">
            <span className="rounded-full bg-[color:var(--chip)] px-2.5 py-1">
              {activities.withJobdesc} punya tanggung jawab
            </span>
          </div>
        </Card>
      </div>

      {/* tools terpopuler + perlu dilengkapi */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <CardHead title="Tools terpopuler" desc="Teknologi yang paling sering dipakai di project." />
          {projects.topTools.length === 0 ? (
            <Empty>Belum ada data tools.</Empty>
          ) : (
            <ul className="space-y-3.5">
              {projects.topTools.map((t) => (
                <Bar key={t.name} label={t.name} value={t.count} max={maxTool} />
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-6">
          <CardHead title="Perlu dilengkapi" desc="Data yang masih kosong dan sebaiknya diisi." />
          {attention.length === 0 ? (
            <div className="flex items-center gap-3 rounded-2xl bg-emerald-500/10 px-4 py-4 text-sm text-emerald-600">
              <CircleCheck size={18} className="shrink-0" />
              Semua data sudah lengkap.
            </div>
          ) : (
            <ul className="space-y-2">
              {attention.map((a) => (
                <li key={a.label}>
                  <Link
                    href={a.href}
                    className={`flex items-center justify-between gap-3 rounded-2xl bg-[color:var(--card-hi)] px-4 py-3 text-sm transition hover:brightness-105 ${focus}`}
                  >
                    <span>{a.label}</span>
                    <span className="flex items-center gap-2">
                      <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-amber-600">
                        {a.count}
                      </span>
                      <ArrowUpRight size={14} className={muted} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* terbaru */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <CardHead title="Project terbaru" href="/dashboard/projects" />
          {projects.latest.length === 0 ? (
            <Empty>Belum ada project.</Empty>
          ) : (
            <ul className="divide-y divide-[color:var(--chip)]">
              {projects.latest.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/dashboard/projects/${encodeURIComponent(p.id)}/edit`}
                    className={`flex items-center gap-4 py-3 transition hover:opacity-80 ${focus} rounded-xl`}
                  >
                    <Cover src={p.cover} className="h-12 w-[4.5rem] rounded-xl ring-1 ring-[color:var(--line)]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{p.title}</p>
                      <p className={`truncate text-sm ${muted}`}>
                        {p.category} · {p.type}
                      </p>
                    </div>
                    <span className={`shrink-0 text-xs tabular-nums ${muted}`}>{p.images} gambar</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-6">
          <CardHead title="Kegiatan terbaru" href="/dashboard/activities" />
          {activities.latest.length === 0 ? (
            <Empty>Belum ada kegiatan.</Empty>
          ) : (
            <ul className="divide-y divide-[color:var(--chip)]">
              {activities.latest.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/dashboard/activities/${encodeURIComponent(a.id)}/edit`}
                    className={`flex items-center gap-4 py-3 transition hover:opacity-80 ${focus} rounded-xl`}
                  >
                    <Cover src={a.cover} className="h-12 w-[4.5rem] rounded-xl ring-1 ring-[color:var(--line)]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{a.nama}</p>
                      <p className={`truncate text-sm ${muted}`}>{a.role}</p>
                    </div>
                    <span className={`shrink-0 rounded-full bg-[color:var(--chip)] px-2.5 py-1 text-xs tabular-nums ${muted}`}>
                      {a.tahun ?? "Tanpa tahun"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* kontak */}
      <Card className="mt-4 p-6">
        <CardHead title="Kontak" desc="Tautan yang tampil di bagian kontak website." href="/dashboard/contacts" />
        {contacts.length === 0 ? (
          <Empty>Belum ada kontak.</Empty>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {contacts.map((c) => (
              <li key={c.id}>
                <a
                  href={c.href}
                  target="_blank"
                  rel="noreferrer"
                  className={`flex items-center gap-3 rounded-2xl bg-[color:var(--card-hi)] px-4 py-3 transition hover:brightness-105 ${focus}`}
                >
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[color:var(--chip)] ${muted}`}>
                    <Link2 size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{c.platform}</span>
                    <span className={`block truncate text-xs ${muted}`}>{c.handle}</span>
                  </span>
                  <ExternalLink size={14} className={`shrink-0 ${muted}`} />
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

function Skeleton() {
  const pulse = "animate-pulse motion-reduce:animate-none";
  return (
    <div role="status" aria-busy="true" aria-label="Memuat dashboard" className={pulse}>
      <div className="h-5 w-72 max-w-full rounded-lg bg-[color:var(--chip)]" />
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 rounded-3xl bg-[color:var(--card)]" />
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="h-72 rounded-3xl bg-[color:var(--card)]" />
        <div className="h-72 rounded-3xl bg-[color:var(--card)]" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="h-64 rounded-3xl bg-[color:var(--card)]" />
        <div className="h-64 rounded-3xl bg-[color:var(--card)]" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<Skeleton />}>
      <Content />
    </Suspense>
  );
}