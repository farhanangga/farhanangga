"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { ACCENT_GRADIENT } from "./shared";

export type PickProject = { id: string; title: string; type: string; cover: string | null };
export type PickTab = { id: string; label: string; short: string; projects: PickProject[] };

const iconBtn =
  "grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[color:var(--chip)] outline-none transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-[#5A64D8] disabled:cursor-not-allowed disabled:opacity-30";

function Thumb({ src, alt }: { src: string | null; alt: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className="h-12 w-[4.5rem] shrink-0 rounded-lg bg-[color:var(--chip)] object-cover" />
  ) : (
    <span aria-hidden className="h-12 w-[4.5rem] shrink-0 rounded-lg bg-[color:var(--chip)]" />
  );
}

/** Pilih best project per bidang (tab): maksimal `max` proyek, urutan bisa diatur.
 *  Hasilnya dikirim lewat <input type="hidden" name="best"> berulang: urutan tab, lalu urutan di tab. */
export function BestProjectPicker({
  tabs,
  initial,
  max,
}: {
  tabs: PickTab[];
  initial: string[];
  max: number;
}) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  const [sel, setSel] = useState<Record<string, string[]>>(() => {
    const out: Record<string, string[]> = {};
    for (const t of tabs) {
      const own = new Set(t.projects.map((p) => p.id));
      out[t.id] = initial.filter((id) => own.has(id)).slice(0, max);
    }
    return out;
  });

  const tab = tabs.find((t) => t.id === active) ?? tabs[0];
  if (!tab) {
    return <p className="text-sm text-[color:var(--fg-muted)]">Belum ada bidang proyek.</p>;
  }

  const byId = new Map(tab.projects.map((p) => [p.id, p]));
  const ids = sel[tab.id] ?? [];
  const chosen = ids.flatMap((id) => byId.get(id) ?? []);
  const chosenSet = new Set(ids);
  const available = tab.projects.filter((p) => !chosenSet.has(p.id));
  const full = chosen.length >= max;

  const update = (fn: (cur: string[]) => string[]) =>
    setSel((s) => ({ ...s, [tab.id]: fn(s[tab.id] ?? []) }));

  const add = (id: string) => update((cur) => (cur.length >= max || cur.includes(id) ? cur : [...cur, id]));
  const remove = (id: string) => update((cur) => cur.filter((x) => x !== id));
  const move = (i: number, dir: -1 | 1) =>
    update((cur) => {
      const to = i + dir;
      if (to < 0 || to >= cur.length) return cur;
      const next = [...cur];
      [next[i], next[to]] = [next[to], next[i]];
      return next;
    });

  return (
    <div>
      {/* isi form: urutan tab, lalu urutan di dalam tab */}
      {tabs.flatMap((t) =>
        (sel[t.id] ?? []).map((id) => <input key={`${t.id}-${id}`} type="hidden" name="best" value={id} />),
      )}

      <div role="tablist" aria-label="Bidang proyek" className="flex flex-wrap gap-2">
        {tabs.map((t) => {
          const on = t.id === tab.id;
          const n = (sel[t.id] ?? []).length;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setActive(t.id)}
              className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-[#5A64D8] ${
                on ? "text-white" : "bg-[color:var(--chip)] hover:brightness-110"
              }`}
              style={on ? { background: ACCENT_GRADIENT } : undefined}
            >
              {t.label}
              <span className={`text-xs tabular-nums ${on ? "text-white/80" : "text-[color:var(--fg-muted)]"}`}>
                {n}/{max}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {/* terpilih */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              Terpilih{" "}
              <span className="tabular-nums text-[color:var(--fg-muted)]">
                ({chosen.length}/{max})
              </span>
            </h3>
            <p className="text-xs text-[color:var(--fg-muted)]">Urutan 1 tampil paling besar</p>
          </div>

          {chosen.length === 0 ? (
            <p className="rounded-2xl bg-[color:var(--card-hi)] px-4 py-6 text-center text-sm text-[color:var(--fg-muted)]">
              Belum ada proyek terpilih. Tambahkan dari daftar di sebelah.
            </p>
          ) : (
            <ol className="space-y-2">
              {chosen.map((p, i) => (
                <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-[color:var(--card-hi)] p-2.5">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[color:var(--chip)] text-xs font-semibold tabular-nums">
                    {i + 1}
                  </span>
                  <Thumb src={p.cover} alt={`Sampul ${p.title}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{p.title}</span>
                    <span className="block truncate text-xs text-[color:var(--fg-muted)]">{p.type}</span>
                  </span>
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Naikkan ${p.title}`} className={iconBtn}>
                    <ChevronUp size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === chosen.length - 1}
                    aria-label={`Turunkan ${p.title}`}
                    className={iconBtn}
                  >
                    <ChevronDown size={15} />
                  </button>
                  <button type="button" onClick={() => remove(p.id)} aria-label={`Hapus ${p.title}`} className={`${iconBtn} hover:!bg-[#E85B53] hover:!text-white`}>
                    <X size={15} />
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* tersedia */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              Tersedia <span className="tabular-nums text-[color:var(--fg-muted)]">({available.length})</span>
            </h3>
            {full && <p className="text-xs font-medium text-[#E85B53]">Sudah {max} proyek. Hapus satu untuk menambah.</p>}
          </div>

          {available.length === 0 ? (
            <p className="rounded-2xl bg-[color:var(--card-hi)] px-4 py-6 text-center text-sm text-[color:var(--fg-muted)]">
              {tab.projects.length === 0 ? "Belum ada proyek di bidang ini." : "Semua proyek di bidang ini sudah dipilih."}
            </p>
          ) : (
            <ul className="max-h-[26rem] space-y-2 overflow-y-auto pr-1">
              {available.map((p) => (
                <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-[color:var(--card-hi)] p-2.5">
                  <Thumb src={p.cover} alt={`Sampul ${p.title}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{p.title}</span>
                    <span className="block truncate text-xs text-[color:var(--fg-muted)]">{p.type}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => add(p.id)}
                    disabled={full}
                    aria-label={`Tambahkan ${p.title}`}
                    className={iconBtn}
                  >
                    <Plus size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}