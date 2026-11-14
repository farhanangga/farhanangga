"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Plus, Search, X } from "lucide-react";
import { ACCENT_GRADIENT } from "./shared";

export type PickProject = { id: string; title: string; type: string; cover: string | null };
export type PickTab = { id: string; label: string; short: string; projects: PickProject[] };

const iconBtn =
  "grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/55 text-white outline-none backdrop-blur transition active:scale-95 hover:bg-black/70 focus-visible:ring-2 focus-visible:ring-[#5A64D8] disabled:cursor-not-allowed disabled:opacity-30";

function Cover({ src, alt }: { src: string | null; alt: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} draggable={false} className="pointer-events-none h-full w-full select-none object-cover" loading="lazy" />
  ) : (
    <span aria-hidden className="block h-full w-full bg-[color:var(--chip)]" />
  );
}

/** Pilih best project per bidang (tab): maksimal `max` proyek, urutan bisa diatur.
 *  Tampilan: kartu slot terpilih (grid) + bottom sheet untuk memilih dari daftar (dengan pencarian).
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
  const [sheet, setSheet] = useState(false);
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState<Record<string, string[]>>(() => {
    const out: Record<string, string[]> = {};
    for (const t of tabs) {
      const own = new Set(t.projects.map((p) => p.id));
      out[t.id] = initial.filter((id) => own.has(id)).slice(0, max);
    }
    return out;
  });

  // Kunci scroll body + tutup dengan Escape saat sheet terbuka
  useEffect(() => {
    if (!sheet) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSheet(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [sheet]);

  // --- drag & drop (pointer events, tanpa library) ---
  const itemRefs = useRef<Map<string, HTMLLIElement>>(new Map());
  const dragActive = useRef(false);
  const pressCleanup = useRef<(() => void) | null>(null);
  const [drag, setDrag] = useState<{
    id: string;
    x: number;
    y: number;
    w: number;
    ox: number;
    oy: number;
  } | null>(null);

  useEffect(() => {
    // Saat drag aktif di layar sentuh, cegah halaman ikut ter-scroll.
    const block = (e: TouchEvent) => {
      if (dragActive.current && e.cancelable) e.preventDefault();
    };
    window.addEventListener("touchmove", block, { passive: false });
    return () => {
      window.removeEventListener("touchmove", block);
      pressCleanup.current?.();
    };
  }, []);

  const tab = tabs.find((t) => t.id === active) ?? tabs[0];

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!tab) return [];
    if (!q) return tab.projects;
    return tab.projects.filter((p) => `${p.title} ${p.type}`.toLowerCase().includes(q));
  }, [tab, q]);

  if (!tab) {
    return <p className="text-sm text-[color:var(--fg-muted)]">Belum ada bidang proyek.</p>;
  }

  const byId = new Map(tab.projects.map((p) => [p.id, p]));
  const ids = sel[tab.id] ?? [];
  const chosen = ids.flatMap((id) => byId.get(id) ?? []);
  const full = chosen.length >= max;

  const update = (fn: (cur: string[]) => string[]) =>
    setSel((s) => ({ ...s, [tab.id]: fn(s[tab.id] ?? []) }));

  const toggle = (id: string) =>
    update((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      return cur.length >= max ? cur : [...cur, id];
    });
  const remove = (id: string) => update((cur) => cur.filter((x) => x !== id));
  const move = (i: number, dir: -1 | 1) =>
    update((cur) => {
      const to = i + dir;
      if (to < 0 || to >= cur.length) return cur;
      const next = [...cur];
      [next[i], next[to]] = [next[to], next[i]];
      return next;
    });

  const reorderTo = (tabId: string, id: string, targetId: string) =>
    setSel((s) => {
      const cur = s[tabId] ?? [];
      const from = cur.indexOf(id);
      const to = cur.indexOf(targetId);
      if (from < 0 || to < 0 || from === to) return s;
      const next = [...cur];
      next.splice(from, 1);
      next.splice(to, 0, id);
      return { ...s, [tabId]: next };
    });

  // Mouse: langsung geser. Sentuh: tahan ±250ms dulu, lalu geser (supaya scroll halaman tetap normal).
  const startPress = (e: React.PointerEvent<HTMLElement>, id: string) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if ((e.target as HTMLElement).closest("button")) return;
    const li = itemRefs.current.get(id);
    if (!li || pressCleanup.current) return;

    const tabId = tab.id;
    const pid = e.pointerId;
    const isMouse = e.pointerType === "mouse";
    const r = li.getBoundingClientRect();
    const ox = e.clientX - r.left;
    const oy = e.clientY - r.top;
    const sx = e.clientX;
    const sy = e.clientY;
    let active = false;
    let timer: number | undefined;
    if (isMouse) e.preventDefault();

    const activate = (x: number, y: number) => {
      active = true;
      dragActive.current = true;
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(12);
      setDrag({ id, x, y, w: r.width, ox, oy });
    };

    const finish = () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      dragActive.current = false;
      pressCleanup.current = null;
      setDrag(null);
    };

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pid) return;
      if (!active) {
        const dist = Math.hypot(ev.clientX - sx, ev.clientY - sy);
        if (isMouse) {
          if (dist > 4) activate(ev.clientX, ev.clientY);
        } else if (dist > 10) {
          finish(); // jari bergerak sebelum tahan selesai: anggap scroll biasa
        }
        return;
      }
      setDrag((d) => (d ? { ...d, x: ev.clientX, y: ev.clientY } : d));
      if (ev.clientY < 70) window.scrollBy(0, -14);
      else if (ev.clientY > window.innerHeight - 70) window.scrollBy(0, 14);
      for (const [otherId, el] of itemRefs.current) {
        if (otherId === id) continue;
        const rc = el.getBoundingClientRect();
        if (ev.clientX >= rc.left && ev.clientX <= rc.right && ev.clientY >= rc.top && ev.clientY <= rc.bottom) {
          reorderTo(tabId, id, otherId);
          break;
        }
      }
    };

    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId === pid) finish();
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    pressCleanup.current = finish;
    if (!isMouse) timer = window.setTimeout(() => activate(sx, sy), 250);
  };

  const openSheet = () => {
    setQuery("");
    setSheet(true);
  };

  return (
    <div>
      {/* isi form: urutan tab, lalu urutan di dalam tab */}
      {tabs.flatMap((t) =>
        (sel[t.id] ?? []).map((id) => <input key={`${t.id}-${id}`} type="hidden" name="best" value={id} />),
      )}

      {/* tab: satu baris, bisa digeser ke samping */}
      <div
        role="tablist"
        aria-label="Bidang proyek"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden"
      >
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
              className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-[#5A64D8] ${
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

      <div className="mt-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">
          Terpilih{" "}
          <span className="tabular-nums text-[color:var(--fg-muted)]">
            ({chosen.length}/{max})
          </span>
        </h3>
        <p className="text-right text-xs text-[color:var(--fg-muted)]">
          Tahan &amp; geser gambar untuk mengatur urutan. Urutan 1 tampil paling besar.
        </p>
      </div>

      {/* slot terpilih */}
      <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {chosen.map((p, i) => (
          <li
            key={p.id}
            ref={(el) => {
              if (el) itemRefs.current.set(p.id, el);
              else itemRefs.current.delete(p.id);
            }}
            className={`overflow-hidden rounded-2xl bg-[color:var(--card-hi)] transition-opacity ${
              drag?.id === p.id ? "opacity-30" : ""
            }`}
          >
            <div
              onPointerDown={(e) => startPress(e, p.id)}
              onContextMenu={(e) => e.preventDefault()}
              className="relative aspect-[4/3] w-full cursor-grab select-none overflow-hidden [-webkit-touch-callout:none] active:cursor-grabbing"
            >
              <Cover src={p.cover} alt={`Sampul ${p.title}`} />
              <span className="absolute left-2 top-2 grid h-6 min-w-6 place-items-center rounded-full bg-black/60 px-1.5 text-xs font-semibold tabular-nums text-white backdrop-blur">
                {i + 1}
              </span>
              <button
                type="button"
                onClick={() => remove(p.id)}
                aria-label={`Hapus ${p.title}`}
                className={`${iconBtn} absolute right-2 top-2 !h-8 !w-8 hover:!bg-[#E85B53]`}
              >
                <X size={14} />
              </button>
              <div className="absolute inset-x-2 bottom-2 flex justify-between">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label={`Geser ${p.title} ke depan`}
                  className={iconBtn}
                >
                  <ChevronLeft size={17} />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === chosen.length - 1}
                  aria-label={`Geser ${p.title} ke belakang`}
                  className={iconBtn}
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
            <div className="px-3 py-2">
              <p className="truncate text-sm font-medium">{p.title}</p>
              <p className="truncate text-xs text-[color:var(--fg-muted)]">{p.type}</p>
            </div>
          </li>
        ))}

        {!full && (
          <li>
            <button
              type="button"
              onClick={openSheet}
              disabled={tab.projects.length === 0}
              className="grid h-full min-h-[9.5rem] w-full place-items-center rounded-2xl border-2 border-dashed border-[color:var(--chip)] p-3 text-[color:var(--fg-muted)] outline-none transition hover:brightness-125 focus-visible:ring-2 focus-visible:ring-[#5A64D8] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="flex flex-col items-center gap-2 text-center text-sm font-medium">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-[color:var(--chip)]">
                  <Plus size={18} />
                </span>
                {tab.projects.length === 0 ? "Belum ada proyek di bidang ini" : "Tambah proyek"}
              </span>
            </button>
          </li>
        )}
      </ul>

      {full && (
        <p className="mt-3 text-xs text-[color:var(--fg-muted)]">
          Sudah {max} proyek. Hapus satu untuk menambah, atau{" "}
          <button type="button" onClick={openSheet} className="font-medium underline underline-offset-2">
            ubah pilihan
          </button>
          .
        </p>
      )}

      {/* kartu "melayang" yang mengikuti jari/kursor saat drag */}
      {drag &&
        (() => {
          const p = byId.get(drag.id);
          if (!p) return null;
          return (
            <div
              aria-hidden
              className="pointer-events-none fixed z-[60] overflow-hidden rounded-2xl bg-[color:var(--card-hi)] shadow-2xl ring-2 ring-[#5A64D8]"
              style={{
                left: drag.x - drag.ox,
                top: drag.y - drag.oy,
                width: drag.w,
                transform: "scale(1.05) rotate(1.5deg)",
              }}
            >
              <div className="aspect-[4/3] w-full overflow-hidden">
                <Cover src={p.cover} alt="" />
              </div>
              <div className="px-3 py-2">
                <p className="truncate text-sm font-medium">{p.title}</p>
                <p className="truncate text-xs text-[color:var(--fg-muted)]">{p.type}</p>
              </div>
            </div>
          );
        })()}

      {/* bottom sheet (dialog di layar lebar) */}
      {sheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="presentation">
          <button
            type="button"
            aria-label="Tutup"
            onClick={() => setSheet(false)}
            className="absolute inset-0 cursor-default bg-black/60"
            tabIndex={-1}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Pilih proyek ${tab.label}`}
            className="relative flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-[color:var(--card,#1b1b1f)] shadow-2xl sm:max-w-3xl sm:rounded-3xl"
          >
            <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-[color:var(--chip)] sm:hidden" />

            <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-2 pt-3 sm:px-5">
              <div className="min-w-0">
                <h4 className="truncate text-base font-semibold">Pilih proyek · {tab.label}</h4>
                <p className="text-xs tabular-nums text-[color:var(--fg-muted)]">
                  {chosen.length}/{max} dipilih
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSheet(false)}
                aria-label="Tutup"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[color:var(--chip)] outline-none focus-visible:ring-2 focus-visible:ring-[#5A64D8]"
              >
                <X size={16} />
              </button>
            </div>

            {tab.projects.length > 6 && (
              <div className="shrink-0 px-4 pb-2 sm:px-5">
                <label className="relative block">
                  <Search
                    size={15}
                    aria-hidden
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--fg-muted)]"
                  />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      // cegah Enter men-submit form induk
                      if (e.key === "Enter") e.preventDefault();
                    }}
                    placeholder="Cari judul atau jenis proyek"
                    aria-label="Cari proyek"
                    className="h-10 w-full rounded-xl bg-[color:var(--chip)] pl-9 pr-3 text-sm outline-none placeholder:text-[color:var(--fg-muted)] focus-visible:ring-2 focus-visible:ring-[#5A64D8]"
                  />
                </label>
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-1 sm:px-5">
              {filtered.length === 0 ? (
                <p className="py-10 text-center text-sm text-[color:var(--fg-muted)]">
                  {tab.projects.length === 0 ? "Belum ada proyek di bidang ini." : "Tidak ada proyek yang cocok."}
                </p>
              ) : (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {filtered.map((p) => {
                    const idx = ids.indexOf(p.id);
                    const on = idx !== -1;
                    const blocked = full && !on;
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => toggle(p.id)}
                          disabled={blocked}
                          aria-pressed={on}
                          aria-label={`${on ? "Batalkan" : "Pilih"} ${p.title}`}
                          className={`block w-full overflow-hidden rounded-2xl bg-[color:var(--card-hi)] text-left outline-none transition focus-visible:ring-2 focus-visible:ring-[#5A64D8] disabled:cursor-not-allowed disabled:opacity-40 ${
                            on ? "ring-2 ring-[#5A64D8]" : ""
                          }`}
                        >
                          <span className="relative block aspect-[4/3] w-full overflow-hidden">
                            <Cover src={p.cover} alt={`Sampul ${p.title}`} />
                            <span
                              className={`absolute right-2 top-2 grid h-6 min-w-6 place-items-center rounded-full px-1.5 text-xs font-semibold tabular-nums text-white ${
                                on ? "" : "bg-black/45 backdrop-blur"
                              }`}
                              style={on ? { background: ACCENT_GRADIENT } : undefined}
                            >
                              {on ? idx + 1 : <Check size={13} className="opacity-0" />}
                            </span>
                          </span>
                          <span className="block px-3 py-2">
                            <span className="block truncate text-sm font-medium">{p.title}</span>
                            <span className="block truncate text-xs text-[color:var(--fg-muted)]">{p.type}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="shrink-0 border-t border-[color:var(--chip)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
              <button
                type="button"
                onClick={() => setSheet(false)}
                className="h-11 w-full rounded-xl text-sm font-semibold text-white outline-none transition active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-[#5A64D8]"
                style={{ background: ACCENT_GRADIENT }}
              >
                Selesai{chosen.length > 0 ? ` (${chosen.length}/${max})` : ""}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}