"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { ChevronLeft, ChevronRight, ImagePlus, Loader2, X } from "lucide-react";
import { ACCENT_GLOW, ACCENT_GRADIENT } from "./shared";

type Item = { key: string; file: File; url: string };

/** Dropzone gambar: drag & drop, pratinjau, atur urutan (gambar pertama = cover).
 *  File dikirim lewat <input type="file" name=...> sesuai urutan di layar. */
export function ImageDropzone({
  max,
  maxSize,
  name = "images",
}: {
  max: number;
  maxSize: number;
  name?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [over, setOver] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const latest = useRef<Item[]>([]);
  useEffect(() => {
    latest.current = items;
  }, [items]);
  // lepas object URL saat komponen dilepas
  useEffect(() => () => latest.current.forEach((i) => URL.revokeObjectURL(i.url)), []);

  const mb = Math.round(maxSize / 1024 / 1024);
  const full = items.length >= max;

  /** simpan state + samakan isi <input type=file> dengan urutan di layar */
  const commit = (next: Item[]) => {
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

  const small =
    "grid h-6 w-6 place-items-center rounded-full bg-black/55 text-white outline-none backdrop-blur transition hover:bg-black/75 focus-visible:ring-2 focus-visible:ring-white disabled:opacity-30";

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept="image/*"
        multiple
        tabIndex={-1}
        aria-hidden
        className="sr-only"
        onChange={(e) => add(Array.from(e.target.files ?? []))}
      />

      <button
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
        <span className="text-sm font-medium">{full ? "Batas gambar tercapai" : "Tarik gambar ke sini atau klik untuk memilih"}</span>
        <span className="text-xs text-[color:var(--fg-muted)]">
          PNG, JPG, WEBP · maks {mb} MB · {items.length}/{max}
        </span>
      </button>

      {msg && (
        <p role="status" className="mt-2 text-xs font-medium text-[#E85B53]">
          {msg}
        </p>
      )}

      {items.length > 0 && (
        <ul className="mt-3 grid grid-cols-3 gap-2.5">
          {items.map((it, i) => (
            <li key={it.key} className="group relative aspect-square overflow-hidden rounded-xl bg-[color:var(--chip)] ring-1 ring-[color:var(--line)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.url} alt={`Pratinjau ${it.file.name}`} className="h-full w-full object-cover" />

              {i === 0 && (
                <span className="absolute left-1.5 top-1.5 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
                  Cover
                </span>
              )}

              <button type="button" onClick={() => remove(it.key)} aria-label={`Hapus ${it.file.name}`} className={`${small} absolute right-1.5 top-1.5 hover:!bg-[#E85B53]`}>
                <X size={13} />
              </button>

              <div className="absolute inset-x-1.5 bottom-1.5 flex justify-between opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Geser ke kiri" className={small}>
                  <ChevronLeft size={13} />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Geser ke kanan" className={small}>
                  <ChevronRight size={13} />
                </button>
              </div>
            </li>
          ))}
        </ul>
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