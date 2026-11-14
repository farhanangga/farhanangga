"use client";

// components/dashboard/toolsEditor.tsx
// Editor grup tools + isinya: tambah, ubah nama grup, hapus, dan atur urutan grup.
// Konsep: daftar kartu grup (geser untuk mengatur urutan) + bottom sheet untuk edit isi.
// Semua perubahan baru dikirim ke api/landingPage/tools/edit saat tombol "Simpan" diklik.

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CircleAlert,
  CircleCheck,
  GripVertical,
  Layers,
  LoaderCircle,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";

/* ── tipe data (dipakai juga oleh page.tsx) ────────────────────────── */

export type ToolItem = { id: number; name: string };
export type ToolGroupRow = { id: number; title: string; items: ToolItem[] };
export type ToolsEditData = { groups: ToolGroupRow[] };

type ToolDraft = { key: string; id?: number; name: string };
type GroupDraft = { key: string; id?: number; title: string; tools: ToolDraft[] };

/* ── konstanta & gaya ──────────────────────────────────────────────── */

const API = "/api/landingPage/tools/edit";
const MAX_TITLE = 60;
const MAX_NAME = 40;
const ACCENT = "linear-gradient(135deg,#5A64D8 0%,#8A6BF0 100%)";

const muted = "text-[color:var(--fg-muted)]";
const focus = "outline-none focus-visible:ring-2 focus-visible:ring-[#5A64D8]";
// text-base di mobile mencegah iOS memperbesar layar saat input difokus
const field =
  "w-full rounded-2xl bg-[color:var(--card)] text-base text-[color:var(--fg)] outline-none ring-1 ring-transparent transition placeholder:text-[color:var(--fg-muted)] focus:ring-2 focus:ring-[#5A64D8] sm:text-sm";
const inputCls = `${field} h-12 px-4 sm:h-11`;

let seq = 0;
const newKey = () => `new-${++seq}`;

const toDraft = (g: ToolGroupRow): GroupDraft => ({
  key: `g-${g.id}`,
  id: g.id,
  title: g.title,
  tools: g.items.map((t) => ({ key: `t-${t.id}`, id: t.id, name: t.name })),
});

/** "React, Next.js\nFigma" -> ["React", "Next.js", "Figma"] */
const splitNames = (s: string) => s.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);

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

/* ── input tag: ketik → Enter → tercetak di bawah, input kosong lagi ─ */

function ToolTags({
  id,
  tools,
  onChange,
}: {
  id: string;
  tools: ToolDraft[];
  onChange: (t: ToolDraft[]) => void;
}) {
  const [draft, setDraft] = useState("");

  const commit = (raw: string) => {
    const incoming = splitNames(raw);
    if (incoming.length === 0) {
      setDraft("");
      return;
    }
    const seen = new Set(tools.map((t) => t.name.toLowerCase()));
    const next = [...tools];
    for (const n of incoming) {
      const name = n.slice(0, MAX_NAME);
      const k = name.toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        next.push({ key: newKey(), name });
      }
    }
    if (next.length !== tools.length) onChange(next);
    setDraft("");
  };

  return (
    <div>
      {/* kolom input: selalu kosong setelah Enter */}
      <input
        id={id}
        value={draft}
        placeholder="Ketik nama tool, lalu Enter"
        aria-label="Tambah tool"
        autoComplete="off"
        autoCapitalize="off"
        enterKeyHint="enter"
        maxLength={MAX_NAME * 4}
        onChange={(e) => {
          const v = e.target.value;
          if (v.includes(",")) commit(v);
          else setDraft(v);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault(); // jangan submit form
            commit(draft);
          }
        }}
        onBlur={() => commit(draft)}
        className={inputCls}
      />

      {/* hasil: tercetak di bawah input */}
      {tools.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Daftar tool">
          {tools.map((t) => (
            <li
              key={t.key}
              className="inline-flex items-center gap-1 rounded-lg bg-[color:var(--chip)] py-1 pl-3 pr-1 text-xs font-medium"
            >
              {t.name}
              <button
                type="button"
                aria-label={`Hapus ${t.name}`}
                onClick={() => onChange(tools.filter((x) => x.key !== t.key))}
                className="grid h-6 w-6 place-items-center rounded-md text-[color:var(--fg-muted)] outline-none transition hover:bg-[#E85B53] hover:text-white focus-visible:ring-2 focus-visible:ring-[#5A64D8]"
              >
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── lembar bawah (bottom sheet) di HP, dialog di layar lebar ──────── */

function Sheet({
  title,
  subtitle,
  onClose,
  footer,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true));
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
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
        className={`relative flex max-h-[92dvh] min-h-[60dvh] w-full flex-col overflow-hidden rounded-t-[1.75rem] bg-[color:var(--card-hi)] shadow-2xl transition-transform duration-300 ease-out sm:min-h-0 sm:max-h-[88dvh] sm:max-w-xl sm:rounded-3xl sm:transition-none ${
          shown ? "translate-y-0" : "translate-y-full sm:translate-y-0"
        }`}
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-[color:var(--chip)] sm:hidden" />

        <div className="flex shrink-0 items-center gap-3 px-5 pb-3 pt-3 sm:pt-5">
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-white"
            style={{ background: ACCENT }}
          >
            <Layers size={18} />
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

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain border-t border-[color:var(--chip)] px-5 py-5">
          {children}
        </div>

        <div className="flex shrink-0 items-center gap-3 border-t border-[color:var(--chip)] px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
          {footer}
        </div>
      </div>
    </div>
  );
}

/* ── isi kartu ringkas ─────────────────────────────────────────────── */

function CardFace({ index, g }: { index: number; g: GroupDraft }) {
  const names = g.tools.map((t) => t.name);
  const MAX_SHOWN = 6;
  return (
    <span className="grid w-full grid-cols-[2.75rem_minmax(0,1fr)] items-center gap-x-3 gap-y-3">
      <span
        className="grid h-11 w-11 place-items-center rounded-2xl text-white"
        style={{ background: ACCENT }}
      >
        <Layers size={19} />
      </span>

      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span className="block truncate text-[15px] font-semibold leading-snug">
            {g.title.trim() || "Grup baru"}
          </span>
          {!g.id && (
            <span className="shrink-0 rounded-full bg-[#5A64D8]/15 px-2 py-0.5 text-[11px] font-semibold text-[#5A64D8]">
              Baru
            </span>
          )}
        </span>
        <span className={`block text-xs tabular-nums ${muted}`}>
          Grup #{index + 1} · {names.length === 0 ? "belum ada tool" : `${names.length} tools`}
        </span>
      </span>

      {names.length > 0 && (
        <span className="col-span-2 flex flex-wrap gap-1.5">
          {names.slice(0, MAX_SHOWN).map((n) => (
            <span key={n} className="rounded-lg bg-[color:var(--chip)] px-2.5 py-1 text-xs font-medium">
              {n}
            </span>
          ))}
          {names.length > MAX_SHOWN && (
            <span className={`rounded-lg px-1.5 py-1 text-xs font-medium ${muted}`}>
              +{names.length - MAX_SHOWN}
            </span>
          )}
        </span>
      )}
    </span>
  );
}

/* ── komponen utama ────────────────────────────────────────────────── */

export function ToolsEditor({ initial }: { initial: ToolsEditData }) {
  const router = useRouter();
  const uid = useId();
  const [saved, setSaved] = useState<GroupDraft[]>(() => initial.groups.map(toDraft));
  const [groups, setGroups] = useState<GroupDraft[]>(saved);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [rowError, setRowError] = useState<{ key: string; text: string } | null>(null);

  const groupsRef = useRef(groups);
  groupsRef.current = groups;
  const rowRefs = useRef<Map<string, HTMLElement>>(new Map());
  const dragCleanup = useRef<(() => void) | null>(null);
  const [drag, setDrag] = useState<{ key: string; y: number; oy: number; left: number; w: number } | null>(null);

  useEffect(() => () => dragCleanup.current?.(), []);

  const dirty = JSON.stringify(groups) !== JSON.stringify(saved);
  const toolCount = groups.reduce((n, g) => n + g.tools.length, 0);

  const patch = (key: string, p: Partial<GroupDraft>) => {
    setGroups((a) => a.map((g) => (g.key === key ? { ...g, ...p } : g)));
    setRowError((e) => (e?.key === key ? null : e));
    setStatus(null);
  };

  const moveTo = (key: string, to: number) =>
    setGroups((a) => {
      const from = a.findIndex((g) => g.key === key);
      if (from < 0 || to < 0 || to >= a.length || from === to) return a;
      const c = [...a];
      const [x] = c.splice(from, 1);
      c.splice(to, 0, x);
      return c;
    });

  const moveBy = (key: string, dir: -1 | 1) => {
    const i = groupsRef.current.findIndex((g) => g.key === key);
    if (i >= 0) moveTo(key, i + dir);
  };

  const remove = (key: string) => {
    setGroups((a) => a.filter((g) => g.key !== key));
    setStatus(null);
  };

  const add = () => {
    const g: GroupDraft = { key: newKey(), title: "", tools: [] };
    setGroups((a) => [...a, g]);
    setConfirmDel(false);
    setEditing(g.key);
  };

  const reset = () => {
    setGroups(saved);
    setStatus(null);
    setRowError(null);
  };

  const openRow = (key: string) => {
    setConfirmDel(false);
    setEditing(key);
  };

  const isEmpty = (g: GroupDraft) => !g.title.trim() && g.tools.length === 0;

  const closeSheet = () => {
    const g = groups.find((x) => x.key === editing);
    if (g && !g.id && isEmpty(g)) remove(g.key); // grup baru yang tidak diisi: buang
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
      const list = groupsRef.current;
      const from = list.findIndex((g) => g.key === key);
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

    // grup baru yang masih kosong total diabaikan
    const rows = groups.filter((g) => g.id || !isEmpty(g));

    for (const g of rows) {
      const n = groups.findIndex((x) => x.key === g.key) + 1;
      let msg: string | null = null;
      if (!g.title.trim()) {
        msg = "nama grup wajib diisi.";
      } else {
        const names = g.tools.map((t) => t.name.trim().toLowerCase());
        if (names.some((x) => !x)) msg = "nama tool tidak boleh kosong.";
        else if (new Set(names).size !== names.length) msg = "ada tool dengan nama yang sama.";
      }
      if (msg) {
        setStatus({ ok: false, text: `Grup #${n}: ${msg}` });
        setRowError({ key: g.key, text: msg });
        openRow(g.key);
        return;
      }
    }

    setBusy(true);
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groups: rows.map((g) => ({
            id: g.id,
            title: g.title.trim(),
            items: g.tools.map((t) => ({ id: t.id, name: t.name.trim() })),
          })),
        }),
      });

      if (res.status === 401) {
        router.push("/admin");
        return;
      }

      const json = (await res.json().catch(() => null)) as {
        data?: { groups?: ToolGroupRow[] };
        message?: string;
      } | null;

      if (!res.ok || !json?.data?.groups) {
        setStatus({ ok: false, text: json?.message ?? "Gagal menyimpan. Periksa isian lalu coba lagi." });
        return;
      }

      const next = json.data.groups.map(toDraft);
      setSaved(next);
      setGroups(next);
      setStatus({ ok: true, text: "Tools berhasil disimpan. Perubahan langsung tampil di website." });
      router.refresh();
    } catch {
      setStatus({ ok: false, text: "Koneksi bermasalah. Coba lagi." });
    } finally {
      setBusy(false);
    }
  }

  const editingGroup = editing ? groups.find((g) => g.key === editing) : undefined;
  const editingIndex = editingGroup ? groups.findIndex((g) => g.key === editingGroup.key) : -1;
  const dragGroup = drag ? groups.find((g) => g.key === drag.key) : undefined;
  const dragIndex = dragGroup ? groups.findIndex((g) => g.key === dragGroup.key) : -1;

  return (
    <div className="mt-5 rounded-3xl bg-[color:var(--card)] p-4 sm:p-6">
      <div className="mb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold leading-tight">Grup tools</h2>
            <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs font-medium tabular-nums">
              <span className="rounded-full bg-[color:var(--chip)] px-2.5 py-0.5">{groups.length} grup</span>
              <span className="rounded-full bg-[color:var(--chip)] px-2.5 py-0.5">{toolCount} tools</span>
            </p>
          </div>
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
        <p className={`mt-3 text-sm leading-relaxed ${muted}`}>
          Marquee di website otomatis berisi semua tool tanpa duplikat. Logo tampil otomatis bila nama dikenali (mis.
          React, Figma); selain itu tampil huruf awal.
        </p>
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

      {groups.length > 1 && (
        <p className={`mb-3 text-xs ${muted}`}>
          Ketuk kartu untuk mengedit. Tahan ikon <GripVertical size={12} className="-mt-0.5 inline" /> lalu geser untuk
          mengatur urutan grup.
        </p>
      )}

      <ul className="space-y-3">
        {groups.length === 0 && (
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
                <Layers size={24} />
              </span>
              <span>
                <span className="block text-sm font-semibold">Belum ada grup</span>
                <span className={`block text-sm ${muted}`}>Ketuk di sini untuk menambah grup tools.</span>
              </span>
            </button>
          </li>
        )}

        {groups.map((g, i) => (
          <li
            key={g.key}
            ref={(el) => {
              if (el) rowRefs.current.set(g.key, el);
              else rowRefs.current.delete(g.key);
            }}
            className={`flex items-stretch rounded-2xl bg-[color:var(--card-hi)] transition-opacity ${
              drag?.key === g.key ? "opacity-30" : ""
            }`}
          >
            <button
              type="button"
              onClick={() => openRow(g.key)}
              aria-label={`Edit grup #${i + 1}: ${g.title.trim() || "Grup baru"}`}
              className={`block min-w-0 flex-1 rounded-l-2xl p-3.5 text-left transition hover:bg-white/[0.03] ${focus}`}
            >
              <CardFace index={i} g={g} />
            </button>

            <button
              type="button"
              aria-label={`Atur urutan grup #${i + 1}. Tahan lalu geser, atau tekan panah atas/bawah.`}
              title="Tahan & geser"
              onPointerDown={(e) => startDrag(e, g.key)}
              onKeyDown={(e) => {
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  moveBy(g.key, -1);
                } else if (e.key === "ArrowDown") {
                  e.preventDefault();
                  moveBy(g.key, 1);
                }
              }}
              onContextMenu={(e) => e.preventDefault()}
              className={`grid w-11 shrink-0 cursor-grab touch-none select-none place-items-center rounded-r-2xl border-l border-[color:var(--chip)] ${muted} transition hover:bg-[color:var(--chip)] hover:text-[color:var(--fg)] active:cursor-grabbing ${focus}`}
            >
              <GripVertical size={20} />
            </button>
          </li>
        ))}
      </ul>

      {groups.length > 0 && (
        <button
          type="button"
          onClick={add}
          className={`mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[color:var(--chip)] text-sm font-medium transition hover:bg-[color:var(--card-hi)] ${focus}`}
        >
          <Plus size={16} />
          Tambah grup
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
              {busy ? "Menyimpan…" : "Simpan tools"}
            </button>
          </div>
        </div>
      )}

      {/* kartu yang sedang digeser, mengikuti jari/kursor */}
      {drag && dragGroup && (
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
          <CardFace index={dragIndex} g={dragGroup} />
        </div>
      )}

      {/* editor isi grup (bottom sheet) */}
      {editingGroup && (
        <Sheet
          title={editingGroup.id ? "Edit grup" : "Tambah grup"}
          subtitle={editingGroup.id ? `#${editingIndex + 1} dari ${groups.length}` : "Data baru"}
          onClose={closeSheet}
          footer={
            <>
              {confirmDel ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      remove(editingGroup.key);
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
                  onClick={() => (editingGroup.id || !isEmpty(editingGroup) ? setConfirmDel(true) : closeSheet())}
                  className={`inline-flex h-12 items-center gap-2 rounded-2xl px-4 text-sm font-medium text-[#E85B53] transition hover:bg-[#E85B53]/10 ${focus}`}
                >
                  <Trash2 size={16} />
                  Hapus grup
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
          {rowError?.key === editingGroup.key && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-2xl border border-[#E85B53]/30 bg-[#E85B53]/10 px-4 py-3 text-sm font-medium text-[#E85B53]"
            >
              <CircleAlert size={18} className="mt-px shrink-0" />
              {rowError.text}
            </div>
          )}

          <div>
            <label htmlFor={`${uid}-title`} className="mb-1.5 flex items-center gap-1 text-sm font-medium">
              Nama grup
              <span aria-hidden className="text-[#E85B53]">
                *
              </span>
            </label>
            <input
              id={`${uid}-title`}
              maxLength={MAX_TITLE}
              value={editingGroup.title}
              onChange={(e) => patch(editingGroup.key, { title: e.target.value })}
              className={inputCls}
              placeholder="Frontend"
            />
          </div>

          <div>
            <label htmlFor={`${uid}-tools`} className="mb-1.5 flex items-center gap-1 text-sm font-medium">
              Tools{" "}
              <span className={`font-normal tabular-nums ${muted}`}>({editingGroup.tools.length})</span>
            </label>
            <ToolTags
              id={`${uid}-tools`}
              tools={editingGroup.tools}
              onChange={(tools) => patch(editingGroup.key, { tools })}
            />
            <p className={`mt-2 text-xs ${muted}`}>
              Tekan Enter untuk menambah. Boleh beberapa sekaligus, pisahkan dengan koma. Untuk mengganti nama tool,
              hapus lalu tambahkan lagi.
            </p>
          </div>

          {confirmDel && (
            <p className={`text-sm ${muted}`}>
              Grup beserta tools-nya akan dihapus dari daftar. Penghapusan baru berlaku setelah Anda klik Simpan.
            </p>
          )}
        </Sheet>
      )}
    </div>
  );
}