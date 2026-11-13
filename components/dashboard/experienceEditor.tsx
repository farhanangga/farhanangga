"use client";

// components/landingPage/experienceEditor.tsx
// Editor daftar: pengalaman kerja, organisasi, dan sertifikat/penghargaan.
// Tiap kartu bisa: edit isi, tambah baris, hapus baris, dan atur urutan (naik/turun).
// Semua perubahan baru dikirim ke api/landingPage/experience/edit saat tombol "Simpan" diklik.

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";

/* ── tipe data (dipakai juga oleh page.tsx dan route.ts) ───────────── */

export type ExpRow = {
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
export type OrgRow = { id: string; position: number; jabatan: string; lembaga: string; periode: string };
export type AwardRow = { id: string; position: number; judul: string; penerbit: string; tahun: string };
export type ExperienceData = { experiences: ExpRow[]; orgs: OrgRow[]; awards: AwardRow[] };

/* ── konstanta & gaya (token tema sama dengan dashboard) ───────────── */

const API = "/api/landingPage/experience/edit";

const TIPE_OPTIONS = [
  { value: "fulltime", label: "Full-time" },
  { value: "internship", label: "Internship" },
  { value: "freelance", label: "Freelance" },
];

const muted = "text-[color:var(--fg-muted)]";
const focus = "outline-none focus-visible:ring-2 focus-visible:ring-[#5A64D8]";
const field =
  "w-full rounded-2xl bg-[color:var(--card)] text-sm text-[color:var(--fg)] outline-none ring-1 ring-transparent transition placeholder:text-[color:var(--fg-muted)] focus:ring-2 focus:ring-[#5A64D8]";
const inputCls = `${field} h-11 px-4`;
const areaCls = `${field} resize-y px-4 py-3`;

/* ── potongan UI kecil ─────────────────────────────────────────────── */

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

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl transition disabled:pointer-events-none disabled:opacity-30 ${
        danger
          ? "text-[#E85B53] hover:bg-[#E85B53]/10"
          : `${muted} hover:bg-[color:var(--chip)] hover:text-[color:var(--fg)]`
      } ${focus}`}
    >
      {children}
    </button>
  );
}

/** Satu baris daftar: ringkasan yang bisa dibuka + tombol naik/turun/hapus. */
function Row({
  noun,
  index,
  total,
  isNew,
  title,
  sub,
  onUp,
  onDown,
  onRemove,
  children,
}: {
  noun: string;
  index: number;
  total: number;
  isNew: boolean;
  title: string;
  sub: string;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(isNew);
  const panelId = useId();

  return (
    <div className="rounded-2xl bg-[color:var(--card-hi)]">
      <div className="flex items-center gap-1 px-2 py-2">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
          className={`flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-1.5 text-left ${focus}`}
        >
          <ChevronDown size={18} className={`shrink-0 transition-transform ${muted} ${open ? "rotate-180" : ""}`} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{title}</span>
            {sub && <span className={`block truncate text-xs ${muted}`}>{sub}</span>}
          </span>
          {isNew && (
            <span className="shrink-0 rounded-full bg-[#5A64D8]/15 px-2 py-0.5 text-xs font-medium text-[#5A64D8]">
              Baru
            </span>
          )}
          <span className={`hidden shrink-0 text-xs sm:block ${muted}`}>#{index + 1}</span>
        </button>

        <IconButton label={`Naikkan ${noun} #${index + 1}`} onClick={onUp} disabled={index === 0}>
          <ArrowUp size={16} />
        </IconButton>
        <IconButton label={`Turunkan ${noun} #${index + 1}`} onClick={onDown} disabled={index === total - 1}>
          <ArrowDown size={16} />
        </IconButton>
        <IconButton label={`Hapus ${noun} #${index + 1}`} onClick={onRemove} danger>
          <Trash2 size={16} />
        </IconButton>
      </div>

      {open && (
        <div id={panelId} className="space-y-4 border-t border-[color:var(--chip)] px-4 py-4">
          {children}
        </div>
      )}
    </div>
  );
}

/* ── komponen daftar generik ───────────────────────────────────────── */

type Base = { key: string; id?: string };

type SectionConfig<T extends Base, R extends { id: string }> = {
  section: "experience" | "organization" | "award";
  title: string;
  desc: string;
  noun: string; // dipakai di label tombol & pesan, mis. "pengalaman"
  addLabel: string;
  saveLabel: string;
  initial: R[];
  toDraft: (r: R) => T;
  blank: () => T;
  /** baris baru yang masih kosong semua diabaikan saat simpan */
  isEmpty: (d: T) => boolean;
  /** pesan error (tanpa nomor baris) atau null bila valid */
  validate: (d: T) => string | null;
  toPayload: (d: T) => Record<string, unknown>;
  rowTitle: (d: T) => string;
  rowSub: (d: T) => string;
  fields: (p: { d: T; set: (patch: Partial<T>) => void; uid: string }) => React.ReactNode;
};

let seq = 0;
const newKey = () => `new-${++seq}`;

function ListSection<T extends Base, R extends { id: string }>(cfg: SectionConfig<T, R>) {
  const router = useRouter();
  const [saved, setSaved] = useState<T[]>(() => cfg.initial.map(cfg.toDraft));
  const [items, setItems] = useState<T[]>(saved);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  const dirty = JSON.stringify(items) !== JSON.stringify(saved);

  const patch = (key: string, p: Partial<T>) =>
    setItems((a) => a.map((d) => (d.key === key ? { ...d, ...p } : d)));

  const move = (i: number, dir: -1 | 1) =>
    setItems((a) => {
      const j = i + dir;
      if (j < 0 || j >= a.length) return a;
      const c = [...a];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });

  const remove = (key: string) => setItems((a) => a.filter((d) => d.key !== key));
  const add = () => setItems((a) => [...a, cfg.blank()]);
  const reset = () => {
    setItems(saved);
    setStatus(null);
  };

  async function save() {
    setStatus(null);

    const rows = items.filter((d) => d.id || !cfg.isEmpty(d));
    for (let i = 0; i < rows.length; i++) {
      const msg = cfg.validate(rows[i]);
      if (msg) {
        setStatus({ ok: false, text: `${cfg.noun} #${i + 1}: ${msg}` });
        return;
      }
    }

    setBusy(true);
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: cfg.section,
          items: rows.map((d) => ({ ...cfg.toPayload(d), id: d.id })),
        }),
      });

      if (res.status === 401) {
        router.push("/admin");
        return;
      }

      const json = (await res.json().catch(() => null)) as {
        data?: { items?: R[] };
        message?: string;
      } | null;

      if (!res.ok || !json?.data?.items) {
        setStatus({ ok: false, text: json?.message ?? "Gagal menyimpan. Periksa isian lalu coba lagi." });
        return;
      }

      const next = json.data.items.map(cfg.toDraft);
      setSaved(next);
      setItems(next);
      setStatus({ ok: true, text: `${cfg.title} berhasil disimpan. Perubahan langsung tampil di website.` });
      router.refresh();
    } catch {
      setStatus({ ok: false, text: "Koneksi bermasalah. Coba lagi." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-3xl bg-[color:var(--card)] p-6">
      <div className="mb-5">
        <h2 className="font-semibold">
          {cfg.title} ({items.length})
        </h2>
        <p className={`mt-0.5 text-sm ${muted}`}>{cfg.desc}</p>
      </div>

      {status && (
        <div
          role={status.ok ? "status" : "alert"}
          className={`mb-4 flex items-start gap-3 rounded-2xl px-4 py-3 text-sm font-medium ${
            status.ok
              ? "bg-emerald-500/10 text-emerald-600"
              : "border border-[#E85B53]/30 bg-[#E85B53]/10 text-[#E85B53]"
          }`}
        >
          {status.ok ? (
            <CircleCheck size={18} className="mt-px shrink-0" />
          ) : (
            <CircleAlert size={18} className="mt-px shrink-0" />
          )}
          {status.text}
        </div>
      )}

      <div className="space-y-3">
        {items.length === 0 && (
          <p className={`rounded-2xl border border-dashed border-[color:var(--chip)] px-4 py-6 text-center text-sm ${muted}`}>
            Belum ada data. Klik &ldquo;{cfg.addLabel}&rdquo; untuk menambah.
          </p>
        )}

        {items.map((d, i) => (
          <Row
            key={d.key}
            noun={cfg.noun}
            index={i}
            total={items.length}
            isNew={!d.id}
            title={cfg.rowTitle(d)}
            sub={cfg.rowSub(d)}
            onUp={() => move(i, -1)}
            onDown={() => move(i, 1)}
            onRemove={() => remove(d.key)}
          >
            <RowFields cfg={cfg} d={d} onPatch={(p) => patch(d.key, p)} />
          </Row>
        ))}

        <button
          type="button"
          onClick={add}
          className={`flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[color:var(--chip)] px-4 py-3 text-sm font-medium transition hover:bg-[color:var(--card-hi)] ${focus}`}
        >
          <Plus size={16} />
          {cfg.addLabel}
        </button>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--chip)] pt-5">
        <p aria-live="polite" className={`text-sm ${dirty ? "text-[#C98A00]" : muted}`}>
          {dirty
            ? "Ada perubahan yang belum disimpan."
            : "Tambah, hapus, dan urutan baru diterapkan setelah klik Simpan."}
        </p>
        <div className="ml-auto flex items-center gap-2">
          {dirty && (
            <button
              type="button"
              onClick={reset}
              disabled={busy}
              className={`inline-flex h-11 items-center gap-2 rounded-2xl px-4 text-sm font-medium transition hover:bg-[color:var(--chip)] disabled:opacity-50 ${focus}`}
            >
              <RotateCcw size={16} />
              Batalkan
            </button>
          )}
          <button
            type="button"
            onClick={save}
            disabled={!dirty || busy}
            className={`inline-flex h-11 items-center rounded-2xl bg-[#5A64D8] px-5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 ${focus}`}
          >
            {busy ? "Menyimpan…" : cfg.saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Membungkus fields() supaya useId dipanggil di dalam komponen (bukan di callback). */
function RowFields<T extends Base, R extends { id: string }>({
  cfg,
  d,
  onPatch,
}: {
  cfg: SectionConfig<T, R>;
  d: T;
  onPatch: (p: Partial<T>) => void;
}) {
  const uid = useId();
  return <>{cfg.fields({ d, set: onPatch, uid })}</>;
}

/* ── helper bentuk data ────────────────────────────────────────────── */

const lines = (s: string) =>
  s
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
const csv = (s: string) => Array.from(new Set(s.split(",").map((x) => x.trim()).filter(Boolean)));

/* ── konfigurasi: pengalaman kerja ─────────────────────────────────── */

type ExpDraft = Base & {
  jabatan: string;
  perusahaan: string;
  lokasi: string;
  tipe: string;
  mulai: string;
  selesai: string;
  deskripsi: string; // satu poin per baris
  teknologi: string; // dipisah koma
};

const expConfig: Omit<SectionConfig<ExpDraft, ExpRow>, "initial"> = {
  section: "experience",
  title: "Pengalaman kerja",
  desc: "Tersimpan di tabel landing_experience. Tampil sebagai timeline di website.",
  noun: "Pengalaman",
  addLabel: "Tambah pengalaman",
  saveLabel: "Simpan pengalaman",
  toDraft: (r) => ({
    key: r.id,
    id: r.id,
    jabatan: r.jabatan,
    perusahaan: r.perusahaan,
    lokasi: r.lokasi,
    tipe: r.tipe ?? "fulltime",
    mulai: r.mulai,
    selesai: r.selesai ?? "",
    deskripsi: r.deskripsi.join("\n"),
    teknologi: r.teknologi.join(", "),
  }),
  blank: () => ({
    key: newKey(),
    jabatan: "",
    perusahaan: "",
    lokasi: "",
    tipe: "fulltime",
    mulai: "",
    selesai: "",
    deskripsi: "",
    teknologi: "",
  }),
  isEmpty: (d) =>
    ![d.jabatan, d.perusahaan, d.lokasi, d.mulai, d.selesai, d.deskripsi, d.teknologi].some((v) => v.trim()),
  validate: (d) => {
    if (!d.jabatan.trim()) return "jabatan wajib diisi.";
    if (!d.perusahaan.trim()) return "perusahaan wajib diisi.";
    if (!d.lokasi.trim()) return "lokasi wajib diisi.";
    if (!d.mulai) return "tanggal mulai wajib diisi.";
    if (d.selesai && d.selesai < d.mulai) return "tanggal selesai tidak boleh sebelum tanggal mulai.";
    if (lines(d.deskripsi).length > 12) return "deskripsi maksimal 12 poin.";
    if (csv(d.teknologi).length > 20) return "teknologi maksimal 20.";
    return null;
  },
  toPayload: (d) => ({
    jabatan: d.jabatan.trim(),
    perusahaan: d.perusahaan.trim(),
    lokasi: d.lokasi.trim(),
    tipe: d.tipe,
    mulai: d.mulai,
    selesai: d.selesai || null,
    deskripsi: lines(d.deskripsi),
    teknologi: csv(d.teknologi),
  }),
  rowTitle: (d) => d.jabatan.trim() || "Pengalaman baru",
  rowSub: (d) => [d.perusahaan.trim(), d.lokasi.trim()].filter(Boolean).join(" · "),
  fields: ({ d, set, uid }) => (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Jabatan" htmlFor={`${uid}-jabatan`} required>
          <input id={`${uid}-jabatan`} maxLength={120} value={d.jabatan} onChange={(e) => set({ jabatan: e.target.value })} className={inputCls} placeholder="Frontend Developer" />
        </Field>
        <Field label="Perusahaan" htmlFor={`${uid}-perusahaan`} required>
          <input id={`${uid}-perusahaan`} maxLength={120} value={d.perusahaan} onChange={(e) => set({ perusahaan: e.target.value })} className={inputCls} placeholder="PT Contoh Teknologi" />
        </Field>
        <Field label="Lokasi" htmlFor={`${uid}-lokasi`} required>
          <input id={`${uid}-lokasi`} maxLength={120} value={d.lokasi} onChange={(e) => set({ lokasi: e.target.value })} className={inputCls} placeholder="Bandung, Indonesia" />
        </Field>
        <Field label="Tipe" htmlFor={`${uid}-tipe`} required>
          <select id={`${uid}-tipe`} value={d.tipe} onChange={(e) => set({ tipe: e.target.value })} className={inputCls}>
            {TIPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Mulai" htmlFor={`${uid}-mulai`} required>
          <input id={`${uid}-mulai`} type="date" value={d.mulai} onChange={(e) => set({ mulai: e.target.value })} className={inputCls} />
        </Field>
        <Field label="Selesai" htmlFor={`${uid}-selesai`} hint="Kosongkan bila masih aktif.">
          <input id={`${uid}-selesai`} type="date" value={d.selesai} onChange={(e) => set({ selesai: e.target.value })} className={inputCls} />
        </Field>
      </div>

      <Field label="Deskripsi" htmlFor={`${uid}-deskripsi`} hint="Satu poin per baris. Maksimal 12 poin.">
        <textarea
          id={`${uid}-deskripsi`}
          rows={5}
          value={d.deskripsi}
          onChange={(e) => set({ deskripsi: e.target.value })}
          className={areaCls}
          placeholder={"Membangun halaman dengan Next.js\nMenghubungkan REST API"}
        />
      </Field>

      <Field label="Teknologi" htmlFor={`${uid}-teknologi`} hint="Pisahkan dengan koma. Maksimal 20.">
        <input id={`${uid}-teknologi`} value={d.teknologi} onChange={(e) => set({ teknologi: e.target.value })} className={inputCls} placeholder="React.js, Next.js, TypeScript" />
      </Field>
    </>
  ),
};

/* ── konfigurasi: organisasi ───────────────────────────────────────── */

type OrgDraft = Base & { jabatan: string; lembaga: string; periode: string };

const orgConfig: Omit<SectionConfig<OrgDraft, OrgRow>, "initial"> = {
  section: "organization",
  title: "Organisasi",
  desc: "Tersimpan di tabel landing_organization.",
  noun: "Organisasi",
  addLabel: "Tambah organisasi",
  saveLabel: "Simpan organisasi",
  toDraft: (r) => ({ key: r.id, id: r.id, jabatan: r.jabatan, lembaga: r.lembaga, periode: r.periode }),
  blank: () => ({ key: newKey(), jabatan: "", lembaga: "", periode: "" }),
  isEmpty: (d) => ![d.jabatan, d.lembaga, d.periode].some((v) => v.trim()),
  validate: (d) => {
    if (!d.jabatan.trim()) return "jabatan wajib diisi.";
    if (!d.lembaga.trim()) return "lembaga wajib diisi.";
    if (!d.periode.trim()) return "periode wajib diisi.";
    return null;
  },
  toPayload: (d) => ({ jabatan: d.jabatan.trim(), lembaga: d.lembaga.trim(), periode: d.periode.trim() }),
  rowTitle: (d) => d.jabatan.trim() || "Organisasi baru",
  rowSub: (d) => [d.lembaga.trim(), d.periode.trim()].filter(Boolean).join(" · "),
  fields: ({ d, set, uid }) => (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Jabatan" htmlFor={`${uid}-jabatan`} required>
        <input id={`${uid}-jabatan`} maxLength={120} value={d.jabatan} onChange={(e) => set({ jabatan: e.target.value })} className={inputCls} placeholder="Staf Divisi Kominfo" />
      </Field>
      <Field label="Lembaga" htmlFor={`${uid}-lembaga`} required>
        <input id={`${uid}-lembaga`} maxLength={120} value={d.lembaga} onChange={(e) => set({ lembaga: e.target.value })} className={inputCls} placeholder="DPM UPI Cibiru" />
      </Field>
      <Field label="Periode" htmlFor={`${uid}-periode`} required>
        <input id={`${uid}-periode`} maxLength={40} value={d.periode} onChange={(e) => set({ periode: e.target.value })} className={inputCls} placeholder="2024 – 2025" />
      </Field>
    </div>
  ),
};

/* ── konfigurasi: sertifikat & penghargaan ─────────────────────────── */

type AwardDraft = Base & { judul: string; penerbit: string; tahun: string };

const awardConfig: Omit<SectionConfig<AwardDraft, AwardRow>, "initial"> = {
  section: "award",
  title: "Sertifikat dan penghargaan",
  desc: "Tersimpan di tabel landing_award.",
  noun: "Penghargaan",
  addLabel: "Tambah sertifikat / penghargaan",
  saveLabel: "Simpan penghargaan",
  toDraft: (r) => ({ key: r.id, id: r.id, judul: r.judul, penerbit: r.penerbit, tahun: r.tahun }),
  blank: () => ({ key: newKey(), judul: "", penerbit: "", tahun: "" }),
  isEmpty: (d) => ![d.judul, d.penerbit, d.tahun].some((v) => v.trim()),
  validate: (d) => {
    if (!d.judul.trim()) return "judul wajib diisi.";
    if (!d.penerbit.trim()) return "penerbit wajib diisi.";
    if (!d.tahun.trim()) return "tahun wajib diisi.";
    return null;
  },
  toPayload: (d) => ({ judul: d.judul.trim(), penerbit: d.penerbit.trim(), tahun: d.tahun.trim() }),
  rowTitle: (d) => d.judul.trim() || "Sertifikat / penghargaan baru",
  rowSub: (d) => [d.penerbit.trim(), d.tahun.trim()].filter(Boolean).join(" · "),
  fields: ({ d, set, uid }) => (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Field label="Judul" htmlFor={`${uid}-judul`} required>
          <input id={`${uid}-judul`} maxLength={160} value={d.judul} onChange={(e) => set({ judul: e.target.value })} className={inputCls} placeholder="Belajar Dasar AI" />
        </Field>
      </div>
      <Field label="Penerbit" htmlFor={`${uid}-penerbit`} required>
        <input id={`${uid}-penerbit`} maxLength={120} value={d.penerbit} onChange={(e) => set({ penerbit: e.target.value })} className={inputCls} placeholder="Dicoding" />
      </Field>
      <Field label="Tahun" htmlFor={`${uid}-tahun`} required>
        <input id={`${uid}-tahun`} maxLength={20} value={d.tahun} onChange={(e) => set({ tahun: e.target.value })} className={inputCls} placeholder="2025" />
      </Field>
    </div>
  ),
};

/* ── komponen utama ────────────────────────────────────────────────── */

export function ExperienceEditor({ initial }: { initial: ExperienceData }) {
  return (
    <div className="mt-5 space-y-4">
      <ListSection<ExpDraft, ExpRow> {...expConfig} initial={initial.experiences} />
      <ListSection<OrgDraft, OrgRow> {...orgConfig} initial={initial.orgs} />
      <ListSection<AwardDraft, AwardRow> {...awardConfig} initial={initial.awards} />
    </div>
  );
}