"use client";

// components/landingPage/experienceEditor.tsx
// Editor daftar: pengalaman kerja, organisasi, dan sertifikat/penghargaan.
// Konsep: daftar kartu ringkas (geser untuk mengatur urutan) + bottom sheet untuk edit isi.
// Semua perubahan baru dikirim ke api/landingPage/experience/edit saat tombol "Simpan" diklik.

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Award,
  Briefcase,
  CircleAlert,
  CircleCheck,
  GripVertical,
  LoaderCircle,
  Plus,
  RotateCcw,
  Trash2,
  Users,
  X,
  type LucideIcon,
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
const ACCENT = "linear-gradient(135deg,#5A64D8 0%,#8A6BF0 100%)";

const TIPE_OPTIONS = [
  { value: "fulltime", label: "Full-time" },
  { value: "internship", label: "Internship" },
  { value: "freelance", label: "Freelance" },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const fmtMonth = (s: string) => {
  const [y, m] = s.split("-");
  return `${MONTHS[Number(m) - 1] ?? ""} ${y ?? ""}`.trim();
};
const pad = (n: number) => String(n).padStart(2, "0");
const todayStr = (min?: string) => {
  const t = new Date();
  const s = `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
  return min && min > s ? min : s;
};

const muted = "text-[color:var(--fg-muted)]";
const focus = "outline-none focus-visible:ring-2 focus-visible:ring-[#5A64D8]";
// text-base di mobile mencegah iOS memperbesar layar saat input difokus
const field =
  "w-full rounded-2xl bg-[color:var(--card)] text-base text-[color:var(--fg)] outline-none ring-1 ring-transparent transition placeholder:text-[color:var(--fg-muted)] focus:ring-2 focus:ring-[#5A64D8] sm:text-sm";
const inputCls = `${field} h-12 px-4 sm:h-11`;
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

function Segmented({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium">{label}</p>
      <div
        role="radiogroup"
        aria-label={label}
        className="grid gap-1 rounded-2xl bg-[color:var(--card)] p-1"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map((o) => {
          const on = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(o.value)}
              className={`h-10 rounded-xl text-sm font-medium transition ${focus} ${
                on ? "text-white shadow" : `${muted} hover:text-[color:var(--fg)]`
              }`}
              style={on ? { background: ACCENT } : undefined}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex w-full items-center justify-between gap-3 rounded-2xl bg-[color:var(--card)] px-4 py-3 text-left ${focus}`}
    >
      <span className="text-sm font-medium">{label}</span>
      <span
        aria-hidden
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "" : "bg-[color:var(--chip)]"}`}
        style={checked ? { background: ACCENT } : undefined}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            checked ? "left-[1.375rem]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

/** Input tag: ketik lalu Enter / koma untuk menambah, tekan x untuk menghapus. */
function TagInput({
  id,
  tags,
  onChange,
  max,
  placeholder,
}: {
  id: string;
  tags: string[];
  onChange: (t: string[]) => void;
  max: number;
  placeholder: string;
}) {
  const [text, setText] = useState("");

  const commit = (raw: string) => {
    const parts = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length) onChange(Array.from(new Set([...tags, ...parts])).slice(0, max));
    setText("");
  };

  return (
    <div
      className={`${field} flex min-h-12 flex-wrap items-center gap-1.5 p-2 focus-within:ring-2 focus-within:ring-[#5A64D8]`}
    >
      {tags.map((t) => (
        <span
          key={t}
          className="inline-flex h-8 items-center gap-1 rounded-xl bg-[#5A64D8]/15 pl-3 pr-1 text-sm font-medium text-[#5A64D8]"
        >
          {t}
          <button
            type="button"
            aria-label={`Hapus ${t}`}
            onClick={() => onChange(tags.filter((x) => x !== t))}
            className={`grid h-6 w-6 place-items-center rounded-lg hover:bg-[#5A64D8]/20 ${focus}`}
          >
            <X size={13} />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={text}
        disabled={tags.length >= max}
        onChange={(e) => {
          const v = e.target.value;
          if (v.includes(",")) commit(v);
          else setText(v);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit(text);
          } else if (e.key === "Backspace" && !text && tags.length) {
            onChange(tags.slice(0, -1));
          }
        }}
        onBlur={() => commit(text)}
        placeholder={tags.length ? "Tambah lagi…" : placeholder}
        enterKeyHint="done"
        className="min-w-[7rem] flex-1 bg-transparent px-2 py-1.5 text-base outline-none placeholder:text-[color:var(--fg-muted)] disabled:opacity-40 sm:text-sm"
      />
    </div>
  );
}

/** Lembar bawah (bottom sheet) di HP, dialog di tengah di layar lebar. */
function Sheet({
  title,
  subtitle,
  Icon,
  onClose,
  footer,
  children,
}: {
  title: string;
  subtitle?: string;
  Icon: LucideIcon;
  onClose: () => void;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(id);
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="presentation">
      <button
        type="button"
        aria-label="Tutup"
        tabIndex={-1}
        onClick={onClose}
        className={`absolute inset-0 cursor-default bg-black/60 backdrop-blur-[2px] transition-opacity duration-200 ${
          shown ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative flex h-[92dvh] w-full flex-col overflow-hidden rounded-t-[1.75rem] bg-[color:var(--card-hi)] shadow-2xl transition-transform duration-300 ease-out sm:h-auto sm:max-h-[88dvh] sm:max-w-xl sm:rounded-3xl sm:transition-none ${
          shown ? "translate-y-0" : "translate-y-full sm:translate-y-0"
        }`}
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-[color:var(--chip)] sm:hidden" />

        <div className="flex shrink-0 items-center gap-3 px-5 pb-3 pt-3 sm:pt-5">
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-white"
            style={{ background: ACCENT }}
          >
            <Icon size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold">{title}</h3>
            {subtitle && <p className={`truncate text-xs ${muted}`}>{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[color:var(--chip)] ${focus}`}
          >
            <X size={17} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain border-t border-[color:var(--chip)] px-5 py-5">
          {children}
        </div>

        <div className="flex shrink-0 items-center gap-3 border-t border-[color:var(--chip)] px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
          {footer}
        </div>
      </div>
    </div>
  );
}

/* ── kartu ringkas ─────────────────────────────────────────────────── */

type Badge = { text: string; tone?: "accent" | "green" };
type CardInfo = { title: string; sub: string; meta?: string; badges?: Badge[]; tags?: string[] };

const toneCls = {
  accent: "bg-[#5A64D8]/15 text-[#5A64D8]",
  green: "bg-emerald-500/15 text-emerald-600",
  plain: "bg-[color:var(--chip)] text-[color:var(--fg-muted)]",
};

function CardFace({ Icon, index, info }: { Icon: LucideIcon; index: number; info: CardInfo }) {
  const tags = info.tags ?? [];
  return (
    <span className="grid w-full grid-cols-[2.75rem_minmax(0,1fr)] items-center gap-x-3 gap-y-3">
      <span
        className="grid h-11 w-11 place-items-center rounded-2xl text-white"
        style={{ background: ACCENT }}
      >
        <Icon size={19} />
      </span>

      <span className="min-w-0">
        <span className="block truncate text-[15px] font-semibold leading-snug">{info.title}</span>
        {info.sub && <span className={`block truncate text-sm ${muted}`}>{info.sub}</span>}
      </span>

      <span className="col-span-2 flex flex-wrap items-center gap-1.5">
        <span className={`text-xs font-semibold tabular-nums ${muted}`}>#{index + 1}</span>
        {info.badges?.map((b) => (
          <span
            key={b.text}
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${toneCls[b.tone ?? "plain"]}`}
          >
            {b.text}
          </span>
        ))}
        {info.meta && <span className={`text-xs tabular-nums ${muted}`}>{info.meta}</span>}
      </span>

      {tags.length > 0 && (
        <span className="col-span-2 flex flex-wrap gap-1.5">
          {tags.slice(0, 5).map((t) => (
            <span key={t} className="rounded-lg bg-[color:var(--chip)] px-2.5 py-1 text-xs font-medium">
              {t}
            </span>
          ))}
          {tags.length > 5 && (
            <span className={`rounded-lg px-1.5 py-1 text-xs font-medium ${muted}`}>+{tags.length - 5}</span>
          )}
        </span>
      )}
    </span>
  );
}

/** Cari elemen yang bisa di-scroll (bisa saja bukan window pada layout dashboard). */
function scrollParent(el: HTMLElement | null): HTMLElement | Window {
  let node = el?.parentElement ?? null;
  while (node) {
    const oy = getComputedStyle(node).overflowY;
    if ((oy === "auto" || oy === "scroll") && node.scrollHeight > node.clientHeight) return node;
    node = node.parentElement;
  }
  return window;
}

/* ── komponen daftar generik ───────────────────────────────────────── */

type Base = { key: string; id?: string };

type SectionConfig<T extends Base, R extends { id: string }> = {
  section: "experience" | "organization" | "award";
  title: string;
  desc: string;
  noun: string; // dipakai di label tombol & pesan, mis. "Pengalaman"
  addLabel: string;
  saveLabel: string;
  icon: LucideIcon;
  initial: R[];
  toDraft: (r: R) => T;
  blank: () => T;
  /** baris baru yang masih kosong semua diabaikan saat simpan */
  isEmpty: (d: T) => boolean;
  /** pesan error (tanpa nomor baris) atau null bila valid */
  validate: (d: T) => string | null;
  toPayload: (d: T) => Record<string, unknown>;
  card: (d: T) => CardInfo;
  fields: (p: { d: T; set: (patch: Partial<T>) => void; uid: string }) => React.ReactNode;
  onStats?: (s: { count: number; dirty: boolean }) => void;
};

let seq = 0;
const newKey = () => `new-${++seq}`;

function ListSection<T extends Base, R extends { id: string }>(cfg: SectionConfig<T, R>) {
  const router = useRouter();
  const [saved, setSaved] = useState<T[]>(() => cfg.initial.map(cfg.toDraft));
  const [items, setItems] = useState<T[]>(saved);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [rowError, setRowError] = useState<{ key: string; text: string } | null>(null);

  const itemsRef = useRef(items);
  itemsRef.current = items;
  const rowRefs = useRef<Map<string, HTMLElement>>(new Map());
  const dragCleanup = useRef<(() => void) | null>(null);
  const [drag, setDrag] = useState<{ key: string; y: number; oy: number; left: number; w: number } | null>(null);

  const dirty = JSON.stringify(items) !== JSON.stringify(saved);

  const { onStats } = cfg;
  useEffect(() => {
    onStats?.({ count: items.length, dirty });
  }, [items.length, dirty, onStats]);

  useEffect(() => () => dragCleanup.current?.(), []);

  const patch = (key: string, p: Partial<T>) => {
    setItems((a) => a.map((d) => (d.key === key ? { ...d, ...p } : d)));
    setRowError((e) => (e?.key === key ? null : e));
    setStatus(null);
  };

  const moveTo = (key: string, to: number) =>
    setItems((a) => {
      const from = a.findIndex((d) => d.key === key);
      if (from < 0 || to < 0 || to >= a.length || from === to) return a;
      const c = [...a];
      const [x] = c.splice(from, 1);
      c.splice(to, 0, x);
      return c;
    });

  const moveBy = (key: string, dir: -1 | 1) => {
    const i = itemsRef.current.findIndex((d) => d.key === key);
    if (i >= 0) moveTo(key, i + dir);
  };

  const remove = (key: string) => {
    setItems((a) => a.filter((d) => d.key !== key));
    setStatus(null);
  };

  const add = () => {
    const d = cfg.blank();
    setItems((a) => [...a, d]);
    setConfirmDel(false);
    setEditing(d.key);
  };

  const reset = () => {
    setItems(saved);
    setStatus(null);
    setRowError(null);
  };

  const openRow = (key: string) => {
    setConfirmDel(false);
    setEditing(key);
  };

  const closeSheet = () => {
    const d = items.find((x) => x.key === editing);
    if (d && !d.id && cfg.isEmpty(d)) remove(d.key); // baris baru yang tidak diisi: buang
    setEditing(null);
    setConfirmDel(false);
  };

  /* drag & drop lewat gagang (grip): bekerja untuk mouse & sentuh */
  const startDrag = (e: React.PointerEvent<HTMLElement>, key: string) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const el = rowRefs.current.get(key);
    if (!el || dragCleanup.current) return;
    e.preventDefault();

    const pid = e.pointerId;
    const r = el.getBoundingClientRect();
    const scroller = scrollParent(el);
    let lastY = e.clientY;
    let raf = 0;

    const hit = (y: number) => {
      const list = itemsRef.current;
      const from = list.findIndex((d) => d.key === key);
      if (from < 0) return;
      let to = from;
      for (let i = from + 1; i < list.length; i++) {
        const rc = rowRefs.current.get(list[i].key)?.getBoundingClientRect();
        if (rc && y > rc.top + rc.height / 2) to = i;
      }
      for (let i = from - 1; i >= 0; i--) {
        const rc = rowRefs.current.get(list[i].key)?.getBoundingClientRect();
        if (rc && y < rc.top + rc.height / 2) to = i;
      }
      if (to !== from) moveTo(key, to);
    };

    const tick = () => {
      const top = scroller instanceof Window ? 0 : scroller.getBoundingClientRect().top;
      const bottom = scroller instanceof Window ? window.innerHeight : scroller.getBoundingClientRect().bottom;
      if (lastY < top + 80) scroller.scrollBy(0, -12);
      else if (lastY > bottom - 80) scroller.scrollBy(0, 12);
      hit(lastY);
      raf = requestAnimationFrame(tick);
    };

    const finish = () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      dragCleanup.current = null;
      setDrag(null);
    };
    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pid) return;
      lastY = ev.clientY;
      setDrag((d) => (d ? { ...d, y: ev.clientY } : d));
      hit(ev.clientY);
    };
    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId === pid) finish();
    };

    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(12);
    setDrag({ key, y: e.clientY, oy: e.clientY - r.top, left: r.left, w: r.width });
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    dragCleanup.current = finish;
    raf = requestAnimationFrame(tick);
  };

  async function save() {
    setStatus(null);
    setRowError(null);

    const rows = items.filter((d) => d.id || !cfg.isEmpty(d));
    for (const d of rows) {
      const msg = cfg.validate(d);
      if (msg) {
        const n = items.findIndex((x) => x.key === d.key) + 1;
        const text = `${cfg.noun} #${n}: ${msg}`;
        setStatus({ ok: false, text });
        setRowError({ key: d.key, text: msg });
        openRow(d.key);
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

  const Icon = cfg.icon;
  const editingItem = editing ? items.find((d) => d.key === editing) : undefined;
  const editingIndex = editingItem ? items.findIndex((d) => d.key === editingItem.key) : -1;
  const dragItem = drag ? items.find((d) => d.key === drag.key) : undefined;
  const dragIndex = dragItem ? items.findIndex((d) => d.key === dragItem.key) : -1;

  return (
    <section aria-label={cfg.title}>
      <div className="mb-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="min-w-0 text-lg font-semibold leading-tight">
            {cfg.title}{" "}
            <span className="ml-1 inline-block rounded-full bg-[color:var(--chip)] px-2.5 py-0.5 align-middle text-xs font-medium tabular-nums">
              {items.length}
            </span>
          </h2>
          <button
            type="button"
            onClick={add}
            className={`inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-2xl px-4 text-sm font-semibold text-white transition active:scale-95 hover:brightness-110 ${focus}`}
            style={{ background: ACCENT }}
          >
            <Plus size={16} />
            Tambah
          </button>
        </div>
        <p className={`mt-2 text-sm leading-relaxed ${muted}`}>{cfg.desc}</p>
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

      {items.length > 1 && (
        <p className={`mb-3 text-xs ${muted}`}>
          Ketuk kartu untuk mengedit. Tahan ikon <GripVertical size={12} className="-mt-0.5 inline" /> lalu geser untuk
          mengatur urutan.
        </p>
      )}

      <ul className="space-y-3">
        {items.length === 0 && (
          <li>
            <button
              type="button"
              onClick={add}
              className={`flex w-full flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-[color:var(--chip)] px-4 py-10 text-center transition hover:bg-[color:var(--card-hi)] ${focus}`}
            >
              <span
                className="grid h-14 w-14 place-items-center rounded-2xl text-white"
                style={{ background: ACCENT }}
              >
                <Icon size={24} />
              </span>
              <span>
                <span className="block text-sm font-semibold">Belum ada data</span>
                <span className={`block text-sm ${muted}`}>Ketuk di sini untuk {cfg.addLabel.toLowerCase()}.</span>
              </span>
            </button>
          </li>
        )}

        {items.map((d, i) => {
          const info = cfg.card(d);
          const isNew = !d.id;
          const withNew: CardInfo = isNew
            ? { ...info, badges: [{ text: "Baru", tone: "accent" }, ...(info.badges ?? [])] }
            : info;
          return (
            <li
              key={d.key}
              ref={(el) => {
                if (el) rowRefs.current.set(d.key, el);
                else rowRefs.current.delete(d.key);
              }}
              className={`flex items-stretch rounded-2xl bg-[color:var(--card-hi)] transition-opacity ${
                drag?.key === d.key ? "opacity-30" : ""
              }`}
            >
              <button
                type="button"
                onClick={() => openRow(d.key)}
                aria-label={`Edit ${cfg.noun} #${i + 1}: ${info.title}`}
                className={`block min-w-0 flex-1 rounded-l-2xl p-3.5 text-left transition hover:bg-white/[0.03] ${focus}`}
              >
                <CardFace Icon={Icon} index={i} info={withNew} />
              </button>

              <button
                type="button"
                aria-label={`Atur urutan ${cfg.noun} #${i + 1}. Tahan lalu geser, atau tekan panah atas/bawah.`}
                title="Tahan & geser"
                onPointerDown={(e) => startDrag(e, d.key)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    moveBy(d.key, -1);
                  } else if (e.key === "ArrowDown") {
                    e.preventDefault();
                    moveBy(d.key, 1);
                  }
                }}
                onContextMenu={(e) => e.preventDefault()}
                className={`grid w-11 shrink-0 cursor-grab touch-none select-none place-items-center rounded-r-2xl border-l border-[color:var(--chip)] ${muted} transition hover:bg-[color:var(--chip)] hover:text-[color:var(--fg)] active:cursor-grabbing ${focus}`}
              >
                <GripVertical size={20} />
              </button>
            </li>
          );
        })}
      </ul>

      {items.length > 0 && (
        <button
          type="button"
          onClick={add}
          className={`mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[color:var(--chip)] text-sm font-medium transition hover:bg-[color:var(--card-hi)] ${focus}`}
        >
          <Plus size={16} />
          {cfg.addLabel}
        </button>
      )}

      {/* bilah simpan: menempel di bawah layar selama ada perubahan */}
      {dirty && (
        <div className="sticky bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 mt-5">
          <div className="flex items-center gap-2 rounded-2xl border border-[color:var(--chip)] bg-[color:var(--card-hi)]/95 p-2.5 shadow-xl backdrop-blur">
            <p aria-live="polite" className="min-w-0 flex-1 truncate pl-2 text-sm font-medium text-[#C98A00]">
              Belum disimpan
            </p>
            <button
              type="button"
              onClick={reset}
              disabled={busy}
              className={`inline-flex h-11 items-center gap-2 rounded-xl px-3.5 text-sm font-medium transition hover:bg-[color:var(--chip)] disabled:opacity-50 ${focus}`}
            >
              <RotateCcw size={15} />
              Batalkan
            </button>
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className={`inline-flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 ${focus}`}
              style={{ background: ACCENT }}
            >
              {busy && <LoaderCircle size={16} className="animate-spin" />}
              {busy ? "Menyimpan…" : cfg.saveLabel}
            </button>
          </div>
        </div>
      )}

      {/* kartu yang sedang digeser, mengikuti jari/kursor */}
      {drag && dragItem && (
        <div
          aria-hidden
          className="pointer-events-none fixed z-[60] rounded-2xl bg-[color:var(--card-hi)] p-3.5 shadow-2xl ring-2 ring-[#5A64D8]"
          style={{
            left: drag.left,
            top: drag.y - drag.oy,
            width: drag.w,
            transform: "scale(1.03) rotate(1deg)",
          }}
        >
          <CardFace Icon={Icon} index={dragIndex} info={cfg.card(dragItem)} />
        </div>
      )}

      {/* editor isi (bottom sheet) */}
      {editingItem && (
        <Sheet
          Icon={Icon}
          title={`${editingItem.id ? "Edit" : "Tambah"} ${cfg.noun.toLowerCase()}`}
          subtitle={editingItem.id ? `#${editingIndex + 1} dari ${items.length}` : "Data baru"}
          onClose={closeSheet}
          footer={
            <>
              {confirmDel ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      remove(editingItem.key);
                      setEditing(null);
                      setConfirmDel(false);
                    }}
                    className={`inline-flex h-12 items-center gap-2 rounded-2xl bg-[#E85B53] px-4 text-sm font-semibold text-white ${focus}`}
                  >
                    <Trash2 size={16} />
                    Ya, hapus
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDel(false)}
                    className={`h-12 rounded-2xl px-3 text-sm font-medium hover:bg-[color:var(--chip)] ${focus}`}
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => (editingItem.id || !cfg.isEmpty(editingItem) ? setConfirmDel(true) : closeSheet())}
                  aria-label="Hapus"
                  className={`inline-flex h-12 items-center gap-2 rounded-2xl px-4 text-sm font-medium text-[#E85B53] transition hover:bg-[#E85B53]/10 ${focus}`}
                >
                  <Trash2 size={16} />
                  Hapus
                </button>
              )}
              {!confirmDel && (
                <button
                  type="button"
                  onClick={closeSheet}
                  className={`ml-auto inline-flex h-12 min-w-28 items-center justify-center rounded-2xl px-6 text-sm font-semibold text-white transition hover:brightness-110 ${focus}`}
                  style={{ background: ACCENT }}
                >
                  Selesai
                </button>
              )}
            </>
          }
        >
          {rowError?.key === editingItem.key && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-2xl border border-[#E85B53]/30 bg-[#E85B53]/10 px-4 py-3 text-sm font-medium text-[#E85B53]"
            >
              <CircleAlert size={18} className="mt-px shrink-0" />
              {rowError.text}
            </div>
          )}
          <RowFields cfg={cfg} d={editingItem} onPatch={(p) => patch(editingItem.key, p)} />
          {confirmDel && (
            <p className={`text-sm ${muted}`}>
              Data akan dihapus dari daftar. Penghapusan baru berlaku setelah Anda klik Simpan.
            </p>
          )}
        </Sheet>
      )}
    </section>
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
  selesai: string; // kosong = masih aktif
  deskripsi: string; // satu poin per baris
  teknologi: string; // dipisah koma
};

const expConfig: Omit<SectionConfig<ExpDraft, ExpRow>, "initial"> = {
  section: "experience",
  title: "Pengalaman kerja",
  desc: "Tampil sebagai timeline di website.",
  noun: "Pengalaman",
  addLabel: "Tambah pengalaman",
  saveLabel: "Simpan",
  icon: Briefcase,
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
  card: (d) => {
    const tipe = TIPE_OPTIONS.find((o) => o.value === d.tipe)?.label;
    const badges: Badge[] = [];
    if (tipe) badges.push({ text: tipe });
    if (d.mulai && !d.selesai) badges.push({ text: "Aktif", tone: "green" });
    return {
      title: d.jabatan.trim() || "Pengalaman baru",
      sub: [d.perusahaan.trim(), d.lokasi.trim()].filter(Boolean).join(" · "),
      meta: d.mulai ? `${fmtMonth(d.mulai)} – ${d.selesai ? fmtMonth(d.selesai) : "Sekarang"}` : undefined,
      badges,
      tags: csv(d.teknologi),
    };
  },
  fields: ({ d, set, uid }) => {
    const poin = lines(d.deskripsi).length;
    const aktif = d.selesai === "";
    return (
      <>
        <Field label="Jabatan" htmlFor={`${uid}-jabatan`} required>
          <input id={`${uid}-jabatan`} maxLength={120} value={d.jabatan} onChange={(e) => set({ jabatan: e.target.value })} className={inputCls} placeholder="Frontend Developer" />
        </Field>
        <Field label="Perusahaan" htmlFor={`${uid}-perusahaan`} required>
          <input id={`${uid}-perusahaan`} maxLength={120} value={d.perusahaan} onChange={(e) => set({ perusahaan: e.target.value })} className={inputCls} placeholder="PT Contoh Teknologi" />
        </Field>
        <Field label="Lokasi" htmlFor={`${uid}-lokasi`} required>
          <input id={`${uid}-lokasi`} maxLength={120} value={d.lokasi} onChange={(e) => set({ lokasi: e.target.value })} className={inputCls} placeholder="Bandung, Indonesia" />
        </Field>

        <Segmented label="Tipe" value={d.tipe} options={TIPE_OPTIONS} onChange={(v) => set({ tipe: v })} />

        <Field label="Mulai" htmlFor={`${uid}-mulai`} required>
          <input id={`${uid}-mulai`} type="date" value={d.mulai} onChange={(e) => set({ mulai: e.target.value })} className={inputCls} />
        </Field>

        <Switch
          checked={aktif}
          onChange={(on) => set({ selesai: on ? "" : todayStr(d.mulai) })}
          label="Masih bekerja di sini"
        />

        {!aktif && (
          <Field label="Selesai" htmlFor={`${uid}-selesai`} required>
            <input id={`${uid}-selesai`} type="date" min={d.mulai || undefined} value={d.selesai} onChange={(e) => set({ selesai: e.target.value })} className={inputCls} />
          </Field>
        )}

        <Field
          label="Deskripsi"
          htmlFor={`${uid}-deskripsi`}
          hint={`Satu poin per baris. ${poin}/12 poin.`}
        >
          <textarea
            id={`${uid}-deskripsi`}
            rows={6}
            value={d.deskripsi}
            onChange={(e) => set({ deskripsi: e.target.value })}
            className={areaCls}
            placeholder={"Membangun halaman dengan Next.js\nMenghubungkan REST API"}
          />
        </Field>

        <Field
          label="Teknologi"
          htmlFor={`${uid}-teknologi`}
          hint="Ketik lalu tekan Enter atau koma. Maksimal 20."
        >
          <TagInput
            id={`${uid}-teknologi`}
            tags={csv(d.teknologi)}
            onChange={(t) => set({ teknologi: t.join(", ") })}
            max={20}
            placeholder="React.js, Next.js, TypeScript"
          />
        </Field>
      </>
    );
  },
};

/* ── konfigurasi: organisasi ───────────────────────────────────────── */

type OrgDraft = Base & { jabatan: string; lembaga: string; periode: string };

const orgConfig: Omit<SectionConfig<OrgDraft, OrgRow>, "initial"> = {
  section: "organization",
  title: "Organisasi",
  desc: "Pengalaman berorganisasi yang tampil di website.",
  noun: "Organisasi",
  addLabel: "Tambah organisasi",
  saveLabel: "Simpan",
  icon: Users,
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
  card: (d) => ({
    title: d.jabatan.trim() || "Organisasi baru",
    sub: d.lembaga.trim(),
    badges: d.periode.trim() ? [{ text: d.periode.trim() }] : undefined,
  }),
  fields: ({ d, set, uid }) => (
    <>
      <Field label="Jabatan" htmlFor={`${uid}-jabatan`} required>
        <input id={`${uid}-jabatan`} maxLength={120} value={d.jabatan} onChange={(e) => set({ jabatan: e.target.value })} className={inputCls} placeholder="Staf Divisi Kominfo" />
      </Field>
      <Field label="Lembaga" htmlFor={`${uid}-lembaga`} required>
        <input id={`${uid}-lembaga`} maxLength={120} value={d.lembaga} onChange={(e) => set({ lembaga: e.target.value })} className={inputCls} placeholder="DPM UPI Cibiru" />
      </Field>
      <Field label="Periode" htmlFor={`${uid}-periode`} required>
        <input id={`${uid}-periode`} maxLength={40} value={d.periode} onChange={(e) => set({ periode: e.target.value })} className={inputCls} placeholder="2024 – 2025" />
      </Field>
    </>
  ),
};

/* ── konfigurasi: sertifikat & penghargaan ─────────────────────────── */

type AwardDraft = Base & { judul: string; penerbit: string; tahun: string };

const awardConfig: Omit<SectionConfig<AwardDraft, AwardRow>, "initial"> = {
  section: "award",
  title: "Sertifikat dan penghargaan",
  desc: "Sertifikat, lencana, dan penghargaan yang tampil di website.",
  noun: "Penghargaan",
  addLabel: "Tambah sertifikat / penghargaan",
  saveLabel: "Simpan",
  icon: Award,
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
  card: (d) => ({
    title: d.judul.trim() || "Sertifikat / penghargaan baru",
    sub: d.penerbit.trim(),
    badges: d.tahun.trim() ? [{ text: d.tahun.trim() }] : undefined,
  }),
  fields: ({ d, set, uid }) => (
    <>
      <Field label="Judul" htmlFor={`${uid}-judul`} required>
        <input id={`${uid}-judul`} maxLength={160} value={d.judul} onChange={(e) => set({ judul: e.target.value })} className={inputCls} placeholder="Belajar Dasar AI" />
      </Field>
      <Field label="Penerbit" htmlFor={`${uid}-penerbit`} required>
        <input id={`${uid}-penerbit`} maxLength={120} value={d.penerbit} onChange={(e) => set({ penerbit: e.target.value })} className={inputCls} placeholder="Dicoding" />
      </Field>
      <Field label="Tahun" htmlFor={`${uid}-tahun`} required>
        <input id={`${uid}-tahun`} inputMode="numeric" maxLength={20} value={d.tahun} onChange={(e) => set({ tahun: e.target.value })} className={inputCls} placeholder="2025" />
      </Field>
    </>
  ),
};

/* ── komponen utama ────────────────────────────────────────────────── */

type SectionId = "experience" | "organization" | "award";
type Stat = { count: number; dirty: boolean };

const TABS: { id: SectionId; label: string; Icon: LucideIcon }[] = [
  { id: "experience", label: "Pengalaman", Icon: Briefcase },
  { id: "organization", label: "Organisasi", Icon: Users },
  { id: "award", label: "Penghargaan", Icon: Award },
];

export function ExperienceEditor({ initial }: { initial: ExperienceData }) {
  const [tab, setTab] = useState<SectionId>("experience");
  const [stats, setStats] = useState<Record<SectionId, Stat>>({
    experience: { count: initial.experiences.length, dirty: false },
    organization: { count: initial.orgs.length, dirty: false },
    award: { count: initial.awards.length, dirty: false },
  });

  // callback stabil per bagian supaya efek di ListSection tidak berulang
  const statCb = useRef<Partial<Record<SectionId, (s: Stat) => void>>>({});
  const cbFor = (id: SectionId) =>
    (statCb.current[id] ??= (s: Stat) =>
      setStats((prev) =>
        prev[id].count === s.count && prev[id].dirty === s.dirty ? prev : { ...prev, [id]: s },
      ));

  return (
    <div className="mt-5">
      <div
        role="tablist"
        aria-label="Bagian pengalaman"
        className="grid grid-cols-3 gap-1 rounded-2xl bg-[color:var(--card)] p-1"
      >
        {TABS.map(({ id, label, Icon }) => {
          const on = id === tab;
          const s = stats[id];
          return (
            <button
              key={id}
              type="button"
              role="tab"
              id={`exp-tab-${id}`}
              aria-selected={on}
              aria-controls={`exp-panel-${id}`}
              onClick={() => setTab(id)}
              className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-2 text-xs font-medium transition sm:min-h-12 sm:flex-row sm:gap-2 sm:text-sm ${focus} ${
                on ? "text-white shadow" : `${muted} hover:text-[color:var(--fg)]`
              }`}
              style={on ? { background: ACCENT } : undefined}
            >
              <Icon size={17} />
              <span className="flex items-center gap-1.5">
                {label}
                <span
                  className={`rounded-full px-1.5 text-[11px] tabular-nums ${
                    on ? "bg-white/20" : "bg-[color:var(--chip)]"
                  }`}
                >
                  {s.count}
                </span>
              </span>
              {s.dirty && (
                <span
                  aria-label="Ada perubahan belum disimpan"
                  className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#F5B301] ring-2 ring-[color:var(--card)]"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* semua bagian tetap dirender (hanya disembunyikan) agar perubahan belum tersimpan tidak hilang saat pindah tab */}
      <div className="mt-5 rounded-3xl bg-[color:var(--card)] p-4 sm:p-6">
        <div id="exp-panel-experience" role="tabpanel" aria-labelledby="exp-tab-experience" hidden={tab !== "experience"}>
          <ListSection<ExpDraft, ExpRow> {...expConfig} initial={initial.experiences} onStats={cbFor("experience")} />
        </div>
        <div id="exp-panel-organization" role="tabpanel" aria-labelledby="exp-tab-organization" hidden={tab !== "organization"}>
          <ListSection<OrgDraft, OrgRow> {...orgConfig} initial={initial.orgs} onStats={cbFor("organization")} />
        </div>
        <div id="exp-panel-award" role="tabpanel" aria-labelledby="exp-tab-award" hidden={tab !== "award"}>
          <ListSection<AwardDraft, AwardRow> {...awardConfig} initial={initial.awards} onStats={cbFor("award")} />
        </div>
      </div>
    </div>
  );
}