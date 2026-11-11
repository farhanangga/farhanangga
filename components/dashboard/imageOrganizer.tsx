"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ChevronsLeft, GripVertical, Trash2, Undo2 } from "lucide-react";

type Item = { src: string; removed: boolean };
type Act = "cover" | "prev" | "next" | "toggle";

const btn =
  "grid h-9 w-9 place-items-center rounded-xl bg-[color:var(--card-hi)] text-[color:var(--fg-muted)] outline-none transition hover:text-[color:var(--fg)] focus-visible:ring-2 focus-visible:ring-[#5A64D8] disabled:pointer-events-none disabled:opacity-35";

const btnWide = btn.replace(
  "grid h-9 w-9 place-items-center",
  "flex h-9 w-full items-center justify-center gap-1.5 px-3 text-xs font-medium",
);

/** Index tetangga terdekat yang belum ditandai hapus, arah -1 (sebelum) atau 1 (sesudah). -1 jika tidak ada. */
function neighbor(list: Item[], from: number, dir: -1 | 1) {
  for (let j = from + dir; j >= 0 && j < list.length; j += dir) if (!list[j].removed) return j;
  return -1;
}

/** Pindahkan `src` ke posisi `targetSrc` (item lain bergeser). */
function moveTo(list: Item[], src: string, targetSrc: string) {
  const from = list.findIndex((it) => it.src === src);
  const to = list.findIndex((it) => it.src === targetSrc);
  if (from < 0 || to < 0 || from === to) return list;
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/**
 * Mengatur gambar yang sudah tersimpan: seret untuk mengubah urutan, atau pakai tombol
 * (cover / geser / hapus, bisa dibatalkan). Hasilnya dikirim lewat form sebagai `imageOrder`
 * (URL berurutan yang dipertahankan). Gambar yang tidak ada di `imageOrder` dianggap dihapus.
 *
 * Seret memakai pointer events: mouse dan pen langsung dari gambar, layar sentuh lewat ikon pegangan
 * (supaya scroll halaman tetap normal). Tombol panah tetap tersedia untuk keyboard.
 */
export function ImageOrganizer({ images }: { images: string[] }) {
  const [items, setItems] = useState<Item[]>(() => images.map((src) => ({ src, removed: false })));
  const [status, setStatus] = useState("");
  const [dragSrc, setDragSrc] = useState<string | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);

  const listRef = useRef<HTMLUListElement>(null);
  const refocus = useRef<{ src: string; act: Act } | null>(null);
  const itemsRef = useRef(items);
  const stopDrag = useRef<(() => void) | null>(null);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Bersihkan listener kalau komponen dilepas di tengah seretan.
  useEffect(() => () => stopDrag.current?.(), []);

  // Kursor "grabbing" selama menyeret.
  useEffect(() => {
    if (!dragSrc) return;
    const prev = document.body.style.cursor;
    document.body.style.cursor = "grabbing";
    return () => {
      document.body.style.cursor = prev;
    };
  }, [dragSrc]);

  // Setelah urutan berubah lewat tombol, kembalikan fokus keyboard ke tombol yang baru ditekan.
  useEffect(() => {
    const target = refocus.current;
    const root = listRef.current;
    refocus.current = null;
    if (!target || !root) return;
    const find = (act: Act) =>
      root.querySelector<HTMLButtonElement>(`[data-src="${CSS.escape(target.src)}"][data-act="${act}"]`);
    for (const act of [target.act, "next", "prev", "toggle"] as Act[]) {
      const el = find(act);
      if (el && !el.disabled) {
        el.focus();
        break;
      }
    }
  }, [items]);

  if (items.length === 0) return null;

  const keptSrc = items.filter((it) => !it.removed).map((it) => it.src);
  const positionOf = (list: Item[], src: string) => list.filter((it) => !it.removed).findIndex((it) => it.src === src) + 1;

  /* ── tombol ───────────────────────────────────────────── */

  function apply(src: string, act: Act) {
    const i = items.findIndex((it) => it.src === src);
    if (i < 0) return;
    const next = [...items];

    if (act === "toggle") {
      next[i] = { ...next[i], removed: !next[i].removed };
    } else if (act === "cover") {
      const [moved] = next.splice(i, 1);
      const firstKept = next.findIndex((it) => !it.removed);
      next.splice(firstKept === -1 ? 0 : firstKept, 0, moved);
    } else {
      const j = neighbor(next, i, act === "prev" ? -1 : 1);
      if (j < 0) return;
      [next[i], next[j]] = [next[j], next[i]];
    }

    const pos = positionOf(next, src);
    setStatus(
      act === "toggle"
        ? next.find((it) => it.src === src)?.removed
          ? "Gambar akan dihapus saat disimpan"
          : `Gambar dikembalikan di posisi ${pos}`
        : `Gambar dipindahkan ke posisi ${pos}`,
    );
    refocus.current = { src, act };
    setItems(next);
  }

  /* ── seret (mouse, pen, sentuh) ───────────────────────── */

  function startPointer(e: React.PointerEvent<HTMLElement>, src: string) {
    if (e.button !== 0) return;
    if (itemsRef.current.find((it) => it.src === src)?.removed) return;

    // Di layar sentuh, hanya ikon pegangan yang menyeret; area gambar lain tetap untuk scroll.
    const fromHandle = !!(e.target as HTMLElement).closest("[data-handle]");
    if (e.pointerType === "touch" && !fromHandle) return;

    // Lepas capture implisit supaya event mengikuti posisi jari/kursor walau elemen dipindah di DOM.
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* tidak ada capture */
    }

    stopDrag.current?.();
    const id = e.pointerId;
    const sx = e.clientX;
    const sy = e.clientY;
    let active = false;

    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return;
      if (!active) {
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return; // ambang agar klik biasa tidak menyeret
        active = true;
        setDragSrc(src);
      }
      setGhost({ x: ev.clientX, y: ev.clientY });

      const card = document.elementFromPoint(ev.clientX, ev.clientY)?.closest<HTMLElement>("[data-card]");
      const target = card?.dataset.src;
      if (target && target !== src && card?.dataset.removed !== "1") {
        setItems((prev) => moveTo(prev, src, target));
      }
    };

    const cleanup = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      stopDrag.current = null;
    };

    const end = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return;
      cleanup();
      if (active) {
        setDragSrc(null);
        setGhost(null);
        setStatus(`Gambar dipindahkan ke posisi ${positionOf(itemsRef.current, src)}`);
      }
    };

    stopDrag.current = () => {
      cleanup();
      setDragSrc(null);
      setGhost(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  }

  const ghostItem = dragSrc ? items.find((it) => it.src === dragSrc) : undefined;

  return (
    <div>
      <p className="mb-2 text-sm font-medium">Gambar saat ini</p>

      {/* dikirim bersama form: urutan gambar yang dipertahankan */}
      <input type="hidden" name="imagesManaged" value="1" />
      {keptSrc.map((src) => (
        <input key={src} type="hidden" name="imageOrder" value={src} />
      ))}

      <ul ref={listRef} className="grid select-none grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2">
        {items.map((it, i) => {
          const pos = keptSrc.indexOf(it.src) + 1;
          const canPrev = neighbor(items, i, -1) !== -1;
          const canNext = neighbor(items, i, 1) !== -1;
          const dragging = dragSrc === it.src;

          return (
            <li key={it.src} data-card data-src={it.src} data-removed={it.removed ? "1" : "0"}>
              <div
                onPointerDown={(e) => startPointer(e, it.src)}
                className={`relative aspect-[4/3] overflow-hidden rounded-xl bg-[color:var(--card-hi)] transition-[opacity,box-shadow] ${
                  it.removed ? "" : "cursor-grab"
                } ${dragging ? "opacity-40 ring-2 ring-[#5A64D8]" : ""}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={it.src}
                  alt={it.removed ? "Gambar yang akan dihapus" : `Gambar ${pos}`}
                  loading="lazy"
                  draggable={false}
                  className={`h-full w-full object-cover transition-opacity ${it.removed ? "opacity-30" : ""}`}
                />
                <span
                  className={`absolute left-2 top-2 rounded-md px-2 py-0.5 text-xs font-medium text-white ${
                    it.removed ? "bg-[#E85B53]" : "bg-black/60"
                  }`}
                >
                  {it.removed ? "Akan dihapus" : pos === 1 ? "Cover" : pos}
                </span>

                {!it.removed && (
                  <span
                    data-handle
                    title="Seret untuk mengatur urutan"
                    aria-hidden
                    className="absolute right-2 top-2 grid h-9 w-9 touch-none cursor-grab place-items-center rounded-lg bg-black/60 text-white"
                  >
                    <GripVertical size={16} />
                  </span>
                )}
              </div>

              <div className="mt-1.5 flex items-center justify-between gap-1">
                {it.removed ? (
                  <button
                    type="button"
                    data-src={it.src}
                    data-act="toggle"
                    onClick={() => apply(it.src, "toggle")}
                    className={btnWide}
                  >
                    <Undo2 size={14} aria-hidden />
                    Batalkan hapus
                  </button>
                ) : (
                  <>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        data-src={it.src}
                        data-act="cover"
                        disabled={!canPrev}
                        onClick={() => apply(it.src, "cover")}
                        className={btn}
                        aria-label={`Jadikan gambar ${pos} sebagai cover`}
                        title="Jadikan cover"
                      >
                        <ChevronsLeft size={16} aria-hidden />
                      </button>
                      <button
                        type="button"
                        data-src={it.src}
                        data-act="prev"
                        disabled={!canPrev}
                        onClick={() => apply(it.src, "prev")}
                        className={btn}
                        aria-label={`Geser gambar ${pos} lebih awal`}
                        title="Geser lebih awal"
                      >
                        <ArrowLeft size={16} aria-hidden />
                      </button>
                      <button
                        type="button"
                        data-src={it.src}
                        data-act="next"
                        disabled={!canNext}
                        onClick={() => apply(it.src, "next")}
                        className={btn}
                        aria-label={`Geser gambar ${pos} lebih akhir`}
                        title="Geser lebih akhir"
                      >
                        <ArrowRight size={16} aria-hidden />
                      </button>
                    </div>
                    <button
                      type="button"
                      data-src={it.src}
                      data-act="toggle"
                      onClick={() => apply(it.src, "toggle")}
                      className={`${btn} hover:!text-[#E85B53]`}
                      aria-label={`Hapus gambar ${pos}`}
                      title="Hapus"
                    >
                      <Trash2 size={16} aria-hidden />
                    </button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* bayangan gambar yang mengikuti kursor/jari saat diseret */}
      {ghostItem && ghost && (
        <div
          aria-hidden
          className="pointer-events-none fixed z-50 aspect-[4/3] w-28 overflow-hidden rounded-xl shadow-2xl ring-2 ring-[#5A64D8]"
          style={{ left: ghost.x, top: ghost.y, transform: "translate(-50%, -60%)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ghostItem.src} alt="" draggable={false} className="h-full w-full object-cover" />
        </div>
      )}

      <p className="mt-2 text-xs text-[color:var(--fg-muted)]">
        Seret gambar untuk mengatur urutan (di layar sentuh, seret ikon pegangan di pojok gambar), atau pakai tombol
        panah. Gambar pertama jadi cover. Perubahan baru tersimpan setelah kamu menekan Simpan.
      </p>
      <p role="status" aria-live="polite" className="sr-only">
        {status}
      </p>
    </div>
  );
}