"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, GripVertical, Trash2, Undo2 } from "lucide-react";

export type ExistingImage = { id: string; src: string };

type Item = ExistingImage & { removed: boolean };

/** Pindahkan item `id` ke posisi item `targetId` (item lain bergeser). */
function moveTo(list: Item[], id: string, targetId: string) {
  const from = list.findIndex((it) => it.id === id);
  const to = list.findIndex((it) => it.id === targetId);
  if (from < 0 || to < 0 || from === to) return list;
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/** Gambar yang sudah tersimpan: bisa diseret untuk mengatur urutan dan ditandai untuk dihapus.
 *  Dikirim lewat hidden input: `order` (gambar yang dipertahankan, sesuai urutan di layar)
 *  dan `remove` (gambar yang akan dihapus). */
export function ExistingImages({ images }: { images: ExistingImage[] }) {
  const [items, setItems] = useState<Item[]>(() => images.map((i) => ({ ...i, removed: false })));
  const [dragId, setDragId] = useState<string | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);

  const latest = useRef<Item[]>(items);
  const stopDrag = useRef<(() => void) | null>(null);

  useEffect(() => () => stopDrag.current?.(), []);

  // kursor "grabbing" selama menyeret
  useEffect(() => {
    if (!dragId) return;
    const prev = document.body.style.cursor;
    document.body.style.cursor = "grabbing";
    return () => {
      document.body.style.cursor = prev;
    };
  }, [dragId]);

  const commit = (next: Item[]) => {
    latest.current = next;
    setItems(next);
  };

  const toggleRemove = (id: string) =>
    commit(latest.current.map((it) => (it.id === id ? { ...it, removed: !it.removed } : it)));

  const move = (index: number, dir: -1 | 1) => {
    const to = index + dir;
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    [next[index], next[to]] = [next[to], next[index]];
    commit(next);
  };

  /* ── seret (mouse, pen, sentuh) ─────────────────────────
   * Mouse & pen: tekan lalu geser langsung dari gambar.
   * Layar sentuh: lewat ikon pegangan, supaya scroll halaman tetap normal. */
  function startPointer(e: React.PointerEvent<HTMLElement>, id: string) {
    if (e.button !== 0) return;
    if (latest.current.length < 2) return;
    if ((e.target as HTMLElement).closest("button")) return;

    const fromHandle = !!(e.target as HTMLElement).closest("[data-handle]");
    if (e.pointerType === "touch" && !fromHandle) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* tidak ada capture */
    }

    stopDrag.current?.();
    const pid = e.pointerId;
    const sx = e.clientX;
    const sy = e.clientY;
    let active = false;

    const moveFn = (ev: PointerEvent) => {
      if (ev.pointerId !== pid) return;
      if (!active) {
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return;
        active = true;
        setDragId(id);
      }
      setGhost({ x: ev.clientX, y: ev.clientY });

      const card = document.elementFromPoint(ev.clientX, ev.clientY)?.closest<HTMLElement>("[data-existing-card]");
      const target = card?.dataset.id;
      if (target && target !== id) {
        const next = moveTo(latest.current, id, target);
        if (next !== latest.current) commit(next);
      }
    };

    const cleanup = () => {
      window.removeEventListener("pointermove", moveFn);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      stopDrag.current = null;
    };

    const end = (ev: PointerEvent) => {
      if (ev.pointerId !== pid) return;
      cleanup();
      if (active) {
        setDragId(null);
        setGhost(null);
      }
    };

    stopDrag.current = () => {
      cleanup();
      setDragId(null);
      setGhost(null);
    };
    window.addEventListener("pointermove", moveFn);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  }

  const small =
    "grid h-6 w-6 place-items-center rounded-full bg-black/55 text-white outline-none backdrop-blur transition hover:bg-black/75 focus-visible:ring-2 focus-visible:ring-white disabled:opacity-30";

  const canDrag = items.length > 1;
  const ghostItem = dragId ? items.find((i) => i.id === dragId) : undefined;
  const coverId = items.find((i) => !i.removed)?.id;
  const keptCount = items.filter((i) => !i.removed).length;

  return (
    <div>
      <p className="mb-2 text-sm font-medium">Gambar saat ini</p>

      {/* nilai yang dibaca route: urutan gambar yang dipertahankan + gambar yang dihapus */}
      {items.map((it) =>
        it.removed ? (
          <input key={it.id} type="hidden" name="remove" value={it.id} />
        ) : (
          <input key={it.id} type="hidden" name="order" value={it.id} />
        ),
      )}

      <ul className="grid select-none grid-cols-3 gap-2.5">
        {items.map((it, i) => (
          <li
            key={it.id}
            data-existing-card
            data-id={it.id}
            onPointerDown={(e) => startPointer(e, it.id)}
            className={`group relative aspect-square overflow-hidden rounded-xl bg-[color:var(--chip)] ring-1 ring-[color:var(--line)] transition-[opacity,box-shadow] ${
              canDrag ? "cursor-grab" : ""
            } ${dragId === it.id ? "opacity-40 !ring-2 !ring-[#5A64D8]" : ""}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={it.src}
              alt={`Gambar ${i + 1}`}
              draggable={false}
              loading="lazy"
              className={`h-full w-full object-cover transition ${it.removed ? "opacity-40 grayscale" : ""}`}
            />

            {it.id === coverId && (
              <span className="absolute left-1.5 top-1.5 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
                Cover
              </span>
            )}

            {it.removed && (
              <span className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 bg-[#E85B53]/80 py-1 text-center text-[10px] font-semibold text-white">
                Akan dihapus
              </span>
            )}

            <button
              type="button"
              onClick={() => toggleRemove(it.id)}
              aria-label={it.removed ? `Batalkan hapus gambar ${i + 1}` : `Hapus gambar ${i + 1}`}
              className={`${small} absolute right-1.5 top-1.5 ${it.removed ? "hover:!bg-[#5A64D8]" : "hover:!bg-[#E85B53]"}`}
            >
              {it.removed ? <Undo2 size={13} /> : <Trash2 size={13} />}
            </button>

            <div className="absolute inset-x-1.5 bottom-1.5 flex items-center justify-between opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Geser ke kiri" className={small}>
                <ChevronLeft size={13} />
              </button>

              {canDrag && (
                <span
                  data-handle
                  title="Seret untuk mengatur urutan"
                  aria-hidden
                  className="grid h-6 w-6 touch-none cursor-grab place-items-center rounded-full bg-black/55 text-white backdrop-blur"
                >
                  <GripVertical size={13} />
                </span>
              )}

              <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Geser ke kanan" className={small}>
                <ChevronRight size={13} />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-2 text-xs text-[color:var(--fg-muted)]">
        Seret untuk mengatur urutan (gambar pertama jadi cover). Klik ikon tempat sampah untuk menghapus, klik lagi untuk
        membatalkan. {keptCount}/{items.length} gambar dipertahankan.
      </p>

      {/* bayangan gambar yang mengikuti kursor/jari saat diseret */}
      {ghostItem && ghost && (
        <div
          aria-hidden
          className="pointer-events-none fixed z-50 aspect-square w-20 overflow-hidden rounded-xl shadow-2xl ring-2 ring-[#5A64D8]"
          style={{ left: ghost.x, top: ghost.y, transform: "translate(-50%, -60%)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ghostItem.src} alt="" draggable={false} className="h-full w-full object-cover" />
        </div>
      )}
    </div>
  );
}