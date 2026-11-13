"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { ChevronLeft, ChevronRight, GripVertical, ImagePlus, Loader2, X } from "lucide-react";
import { ACCENT_GLOW, ACCENT_GRADIENT } from "./shared";

type Item = { key: string; file: File; url: string };

/** Pindahkan item `key` ke posisi item `targetKey` (item lain bergeser). */
function moveTo(list: Item[], key: string, targetKey: string) {
  const from = list.findIndex((it) => it.key === key);
  const to = list.findIndex((it) => it.key === targetKey);
  if (from < 0 || to < 0 || from === to) return list;
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/** Dropzone gambar: drag & drop, pratinjau, atur urutan (gambar pertama = cover).
 *  Urutan bisa diubah dengan menyeret gambar (mouse/pen langsung dari gambar, layar sentuh lewat ikon pegangan)
 *  atau dengan tombol panah di dalam gambar.
 *  File dikirim lewat <input type="file" name=...> sesuai urutan di layar.
 *
 *  Mode satu gambar (max={1}): tidak ada cover / urutan / panah. Memilih atau menjatuhkan
 *  gambar baru langsung MENGGANTI gambar sebelumnya. */
export function ImageDropzone({
  max,
  maxSize,
  name = "images",
  id,
}: {
  max: number;
  maxSize: number;
  name?: string;
  /** id untuk tombol dropzone, supaya <label htmlFor> bisa menunjuk ke sini */
  id?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [over, setOver] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);

  const single = max === 1;

  const latest = useRef<Item[]>([]);
  const stopDrag = useRef<(() => void) | null>(null);
  useEffect(() => {
    latest.current = items;
  }, [items]);
  // lepas object URL & listener saat komponen dilepas
  useEffect(
    () => () => {
      stopDrag.current?.();
      latest.current.forEach((i) => URL.revokeObjectURL(i.url));
    },
    [],
  );

  // kursor "grabbing" selama menyeret
  useEffect(() => {
    if (!dragKey) return;
    const prev = document.body.style.cursor;
    document.body.style.cursor = "grabbing";
    return () => {
      document.body.style.cursor = prev;
    };
  }, [dragKey]);

  const mb = Math.round(maxSize / 1024 / 1024);
  // mode satu gambar tidak pernah "penuh": gambar baru menggantikan yang lama
  const full = !single && items.length >= max;

  /** simpan state + samakan isi <input type=file> dengan urutan di layar */
  const commit = (next: Item[]) => {
    latest.current = next;
    setItems(next);
    const el = inputRef.current;
    if (!el) return;
    const dt = new DataTransfer();
    next.forEach((i) => dt.items.add(i.file));
    el.files = dt.files;
  };

  const add = (list: File[]) => {
    const problems: string[] = [];
    let ok = list.filter((f) => {
      if (!f.type.startsWith("image/")) {
        problems.push(`${f.name} bukan file gambar`);
        return false;
      }
      if (f.size > maxSize) {
        problems.push(`${f.name} lebih dari ${mb} MB`);
        return false;
      }
      return true;
    });

    if (single) {
      const file = ok[0];
      setMsg(problems.length ? problems[0] : null);
      if (!file) {
        // dialog dibatalkan / file ditolak: samakan lagi isi input dengan yang tampil
        commit(items);
        return;
      }
      items.forEach((i) => URL.revokeObjectURL(i.url));
      commit([{ key: crypto.randomUUID(), file, url: URL.createObjectURL(file) }]);
      return;
    }

    const room = Math.max(max - items.length, 0);
    if (ok.length > room) {
      problems.push(`Maksimal ${max} gambar`);
      ok = ok.slice(0, room);
    }
    setMsg(problems.length ? problems.slice(0, 2).join(" · ") + (problems.length > 2 ? " …" : "") : null);
    commit([
      ...items,
      ...ok.map((file) => ({ key: crypto.randomUUID(), file, url: URL.createObjectURL(file) })),
    ]);
  };

  const remove = (key: string) => {
    const gone = items.find((i) => i.key === key);
    if (gone) URL.revokeObjectURL(gone.url);
    setMsg(null);
    commit(items.filter((i) => i.key !== key));
  };

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
  function startPointer(e: React.PointerEvent<HTMLElement>, key: string) {
    if (e.button !== 0) return;
    if (latest.current.length < 2) return;
    if ((e.target as HTMLElement).closest("button")) return; // tombol di dalam gambar tetap bisa diklik

    const fromHandle = !!(e.target as HTMLElement).closest("[data-handle]");
    if (e.pointerType === "touch" && !fromHandle) return;

    // lepas capture implisit supaya event mengikuti jari/kursor walau elemen dipindah di DOM
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

    const moveFn = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return;
      if (!active) {
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return; // ambang agar klik biasa tidak menyeret
        active = true;
        setDragKey(key);
      }
      setGhost({ x: ev.clientX, y: ev.clientY });

      const card = document.elementFromPoint(ev.clientX, ev.clientY)?.closest<HTMLElement>("[data-card]");
      const target = card?.dataset.key;
      if (target && target !== key) {
        const next = moveTo(latest.current, key, target);
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
      if (ev.pointerId !== id) return;
      cleanup();
      if (active) {
        setDragKey(null);
        setGhost(null);
      }
    };

    stopDrag.current = () => {
      cleanup();
      setDragKey(null);
      setGhost(null);
    };
    window.addEventListener("pointermove", moveFn);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  }

  const small =
    "grid h-6 w-6 place-items-center rounded-full bg-black/55 text-white outline-none backdrop-blur transition hover:bg-black/75 focus-visible:ring-2 focus-visible:ring-white disabled:opacity-30";

  const ghostItem = dragKey ? items.find((i) => i.key === dragKey) : undefined;
  const canDrag = !single && items.length > 1;

  const title = full
    ? "Batas gambar tercapai"
    : single && items.length > 0
      ? "Tarik gambar ke sini atau klik untuk mengganti"
      : "Tarik gambar ke sini atau klik untuk memilih";

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept="image/*"
        multiple={!single}
        tabIndex={-1}
        aria-hidden
        className="sr-only"
        onChange={(e) => add(Array.from(e.target.files ?? []))}
      />

      <button
        id={id}
        type="button"
        disabled={full}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          add(Array.from(e.dataTransfer.files));
        }}
        className={`flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-4 py-7 text-center outline-none transition focus-visible:ring-2 focus-visible:ring-[#5A64D8] disabled:cursor-not-allowed disabled:opacity-50 ${
          over
            ? "border-[#5A64D8] bg-[#5A64D8]/10"
            : "border-[color:var(--chip)] hover:border-[#5A64D8]/60 hover:bg-[color:var(--card-hi)]"
        }`}
      >
        <span className="grid h-11 w-11 place-items-center rounded-2xl text-white" style={{ background: ACCENT_GRADIENT, boxShadow: ACCENT_GLOW }}>
          <ImagePlus size={20} />
        </span>
        <span className="text-sm font-medium">{title}</span>
        <span className="text-xs text-[color:var(--fg-muted)]">
          PNG, JPG, WEBP · maks {mb} MB{single ? "" : ` · ${items.length}/${max}`}
        </span>
      </button>

      {msg && (
        <p role="status" className="mt-2 text-xs font-medium text-[#E85B53]">
          {msg}
        </p>
      )}

      {items.length > 0 && (
        <ul className={`mt-3 select-none ${single ? "grid grid-cols-1" : "grid grid-cols-3 gap-2.5"}`}>
          {items.map((it, i) => (
            <li
              key={it.key}
              data-card
              data-key={it.key}
              onPointerDown={(e) => startPointer(e, it.key)}
              className={`group relative overflow-hidden rounded-xl bg-[color:var(--chip)] ring-1 ring-[color:var(--line)] transition-[opacity,box-shadow] ${
                single ? "mx-auto aspect-[4/5] w-44 max-w-full" : "aspect-square"
              } ${canDrag ? "cursor-grab" : ""} ${dragKey === it.key ? "opacity-40 !ring-2 !ring-[#5A64D8]" : ""}`}
              style={single ? { background: "radial-gradient(ellipse at top, #0A0A6B 0%, #02020F 70%)" } : undefined}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={it.url}
                alt={`Pratinjau ${it.file.name}`}
                draggable={false}
                className={`h-full w-full ${single ? "object-contain object-bottom" : "object-cover"}`}
              />

              {!single && i === 0 && (
                <span className="absolute left-1.5 top-1.5 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
                  Cover
                </span>
              )}

              <button type="button" onClick={() => remove(it.key)} aria-label={`Hapus ${it.file.name}`} className={`${small} absolute right-1.5 top-1.5 hover:!bg-[#E85B53]`}>
                <X size={13} />
              </button>

              {!single && (
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
              )}
            </li>
          ))}
        </ul>
      )}

      {/* bayangan gambar yang mengikuti kursor/jari saat diseret */}
      {ghostItem && ghost && (
        <div
          aria-hidden
          className="pointer-events-none fixed z-50 aspect-square w-20 overflow-hidden rounded-xl shadow-2xl ring-2 ring-[#5A64D8]"
          style={{ left: ghost.x, top: ghost.y, transform: "translate(-50%, -60%)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ghostItem.url} alt="" draggable={false} className="h-full w-full object-cover" />
        </div>
      )}
    </div>
  );
}

/** Tombol submit dengan status menyimpan. */
export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-6 text-sm font-semibold text-white outline-none transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-[#5A64D8] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg)] active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
      style={{ background: ACCENT_GRADIENT, boxShadow: ACCENT_GLOW }}
    >
      {pending && <Loader2 size={16} className="animate-spin" />}
      {pending ? "Menyimpan…" : children}
    </button>
  );
}