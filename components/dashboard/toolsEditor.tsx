"use client";

// components/dashboard/toolsEditor.tsx
// Editor grup tools + isinya: tambah, ubah nama, hapus, dan atur urutan grup.
// Semua perubahan baru dikirim ke api/landingPage/tools/edit saat tombol "Simpan" diklik.

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  CircleAlert,
  CircleCheck,
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

const muted = "text-[color:var(--fg-muted)]";
const focus = "outline-none focus-visible:ring-2 focus-visible:ring-[#5A64D8]";
const field =
  "w-full rounded-2xl bg-[color:var(--card)] text-sm text-[color:var(--fg)] outline-none ring-1 ring-transparent transition placeholder:text-[color:var(--fg-muted)] focus:ring-2 focus:ring-[#5A64D8]";
const inputCls = `${field} h-11 px-4`;

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

/* ── tombol ikon ───────────────────────────────────────────────────── */

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

/* ── satu grup ─────────────────────────────────────────────────────── */

function GroupCard({
  g,
  index,
  total,
  onChange,
  onUp,
  onDown,
  onRemove,
}: {
  g: GroupDraft;
  index: number;
  total: number;
  onChange: (p: Partial<GroupDraft>) => void;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
}) {
  const uid = useId();
  const [draft, setDraft] = useState("");

  const addTools = () => {
    const have = new Set(g.tools.map((t) => t.name.toLowerCase()));
    const incoming: ToolDraft[] = [];
    for (const name of splitNames(draft)) {
      const k = name.toLowerCase();
      if (have.has(k)) continue;
      have.add(k);
      incoming.push({ key: newKey(), name: name.slice(0, MAX_NAME) });
    }
    if (incoming.length) onChange({ tools: [...g.tools, ...incoming] });
    setDraft("");
  };

  const rename = (key: string, name: string) =>
    onChange({ tools: g.tools.map((t) => (t.key === key ? { ...t, name } : t)) });

  const removeTool = (key: string) => onChange({ tools: g.tools.filter((t) => t.key !== key) });

  return (
    <div className="rounded-2xl bg-[color:var(--card-hi)] p-4">
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor={`${uid}-title`} className="mb-1.5 flex items-center gap-1 text-sm font-medium">
            Nama grup
            <span aria-hidden className="text-[#E85B53]">*</span>
            {!g.id && (
              <span className="ml-1 rounded-full bg-[#5A64D8]/15 px-2 py-0.5 text-xs font-medium text-[#5A64D8]">Baru</span>
            )}
          </label>
          <input
            id={`${uid}-title`}
            maxLength={MAX_TITLE}
            value={g.title}
            onChange={(e) => onChange({ title: e.target.value })}
            className={inputCls}
            placeholder="Frontend"
          />
        </div>
        <IconButton label={`Naikkan grup #${index + 1}`} onClick={onUp} disabled={index === 0}>
          <ArrowUp size={16} />
        </IconButton>
        <IconButton label={`Turunkan grup #${index + 1}`} onClick={onDown} disabled={index === total - 1}>
          <ArrowDown size={16} />
        </IconButton>
        <IconButton label={`Hapus grup #${index + 1}`} onClick={onRemove} danger>
          <Trash2 size={16} />
        </IconButton>
      </div>

      <p className={`mb-1.5 mt-4 text-sm font-medium`}>Tools ({g.tools.length})</p>
      {g.tools.length === 0 ? (
        <p className={`text-sm ${muted}`}>Belum ada tool di grup ini.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {g.tools.map((t) => (
            <li
              key={t.key}
              className="flex items-center rounded-full bg-[color:var(--card)] pl-3 pr-1 ring-1 ring-transparent focus-within:ring-2 focus-within:ring-[#5A64D8]"
            >
              <input
                aria-label={`Nama tool ${t.name}`}
                value={t.name}
                maxLength={MAX_NAME}
                size={Math.max(t.name.length, 3)}
                onChange={(e) => rename(t.key, e.target.value)}
                className="h-8 bg-transparent text-sm text-[color:var(--fg)] outline-none"
              />
              <button
                type="button"
                aria-label={`Hapus ${t.name}`}
                title={`Hapus ${t.name}`}
                onClick={() => removeTool(t.key)}
                className={`grid h-6 w-6 place-items-center rounded-full text-[#E85B53] transition hover:bg-[#E85B53]/10 ${focus}`}
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex gap-2">
        <input
          aria-label="Tambah tool"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTools();
            }
          }}
          className={inputCls}
          placeholder="Ketik nama tool, lalu Enter (boleh beberapa, pisahkan koma)"
        />
        <button
          type="button"
          onClick={addTools}
          disabled={!draft.trim()}
          className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl bg-[color:var(--chip)] px-4 text-sm font-medium transition hover:brightness-110 disabled:opacity-40 ${focus}`}
        >
          <Plus size={16} />
          Tambah
        </button>
      </div>
    </div>
  );
}

/* ── komponen utama ────────────────────────────────────────────────── */

export function ToolsEditor({ initial }: { initial: ToolsEditData }) {
  const router = useRouter();
  const [saved, setSaved] = useState<GroupDraft[]>(() => initial.groups.map(toDraft));
  const [groups, setGroups] = useState<GroupDraft[]>(saved);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  const dirty = JSON.stringify(groups) !== JSON.stringify(saved);
  const toolCount = groups.reduce((n, g) => n + g.tools.length, 0);

  const patch = (key: string, p: Partial<GroupDraft>) =>
    setGroups((a) => a.map((g) => (g.key === key ? { ...g, ...p } : g)));

  const move = (i: number, dir: -1 | 1) =>
    setGroups((a) => {
      const j = i + dir;
      if (j < 0 || j >= a.length) return a;
      const c = [...a];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });

  const remove = (key: string) => setGroups((a) => a.filter((g) => g.key !== key));
  const add = () => setGroups((a) => [...a, { key: newKey(), title: "", tools: [] }]);
  const reset = () => {
    setGroups(saved);
    setStatus(null);
  };

  async function save() {
    setStatus(null);

    // grup baru yang masih kosong total diabaikan
    const rows = groups.filter((g) => g.id || g.title.trim() || g.tools.length);

    for (let i = 0; i < rows.length; i++) {
      const g = rows[i];
      if (!g.title.trim()) {
        setStatus({ ok: false, text: `Grup #${i + 1}: nama grup wajib diisi.` });
        return;
      }
      const names = g.tools.map((t) => t.name.trim().toLowerCase());
      if (names.some((n) => !n)) {
        setStatus({ ok: false, text: `Grup "${g.title.trim()}": nama tool tidak boleh kosong.` });
        return;
      }
      if (new Set(names).size !== names.length) {
        setStatus({ ok: false, text: `Grup "${g.title.trim()}": ada tool dengan nama yang sama.` });
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

  return (
    <div className="mt-5 rounded-3xl bg-[color:var(--card)] p-6">
      <div className="mb-5">
        <h2 className="font-semibold">
          Grup tools ({groups.length}) · {toolCount} tools
        </h2>
        <p className={`mt-0.5 text-sm ${muted}`}>
          Tersimpan di tabel tool_groups dan tools. Marquee di website otomatis berisi semua tool tanpa duplikat. Logo
          tampil otomatis bila nama dikenali (mis. React, Figma); selain itu tampil huruf awal.
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

      <div className="space-y-3">
        {groups.length === 0 && (
          <p className={`rounded-2xl border border-dashed border-[color:var(--chip)] px-4 py-6 text-center text-sm ${muted}`}>
            Belum ada grup. Klik &ldquo;Tambah grup&rdquo; untuk menambah.
          </p>
        )}

        {groups.map((g, i) => (
          <GroupCard
            key={g.key}
            g={g}
            index={i}
            total={groups.length}
            onChange={(p) => patch(g.key, p)}
            onUp={() => move(i, -1)}
            onDown={() => move(i, 1)}
            onRemove={() => remove(g.key)}
          />
        ))}

        <button
          type="button"
          onClick={add}
          className={`flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[color:var(--chip)] px-4 py-3 text-sm font-medium transition hover:bg-[color:var(--card-hi)] ${focus}`}
        >
          <Plus size={16} />
          Tambah grup
        </button>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--chip)] pt-5">
        <p aria-live="polite" className={`text-sm ${dirty ? "text-[#C98A00]" : muted}`}>
          {dirty
            ? "Ada perubahan yang belum disimpan."
            : "Tambah, ubah, hapus, dan urutan baru diterapkan setelah klik Simpan."}
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
            {busy ? "Menyimpan…" : "Simpan tools"}
          </button>
        </div>
      </div>
    </div>
  );
}