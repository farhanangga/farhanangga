"use client";

import { useRef, useState } from "react";
import { X } from "lucide-react";

/** Input tag: Enter / koma menambah, Backspace menghapus yang terakhir.
 *  Nilai dikirim lewat <input type="hidden" name=...> sebagai "a, b, c". */
export function TagInput({
  name,
  placeholder,
  defaultValue = [],
}: {
  name: string;
  placeholder?: string;
  defaultValue?: string[];
}) {
  const [tags, setTags] = useState<string[]>(defaultValue);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = (raw: string) => {
    const incoming = raw.split(",").map((s) => s.trim()).filter(Boolean);
    if (incoming.length === 0) return;
    setTags((prev) => {
      const seen = new Set(prev.map((t) => t.toLowerCase()));
      const next = [...prev];
      for (const t of incoming) {
        if (!seen.has(t.toLowerCase())) {
          seen.add(t.toLowerCase());
          next.push(t);
        }
      }
      return next;
    });
    setDraft("");
  };

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className="flex min-h-11 cursor-text flex-wrap items-center gap-1.5 rounded-2xl bg-[color:var(--card-hi)] px-2.5 py-2 ring-1 ring-transparent transition focus-within:ring-2 focus-within:ring-[#5A64D8]"
    >
      <input type="hidden" name={name} value={tags.join(", ")} />

      {tags.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-lg bg-[color:var(--chip)] py-1 pl-2.5 pr-1 text-xs font-medium">
          {t}
          <button
            type="button"
            aria-label={`Hapus ${t}`}
            onClick={() => setTags((prev) => prev.filter((x) => x !== t))}
            className="grid h-5 w-5 place-items-center rounded-md text-[color:var(--fg-muted)] outline-none transition hover:bg-[#E85B53] hover:text-white focus-visible:ring-2 focus-visible:ring-[#5A64D8]"
          >
            <X size={12} />
          </button>
        </span>
      ))}

      <input
        ref={inputRef}
        value={draft}
        placeholder={tags.length === 0 ? placeholder : "Tambah lagi…"}
        aria-label="Tambah tool"
        onChange={(e) => {
          const v = e.target.value;
          // koma atau paste "a, b, c" langsung dipecah jadi tag
          if (v.includes(",")) commit(v);
          else setDraft(v);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault(); // jangan submit form
            commit(draft);
          } else if (e.key === "Backspace" && draft === "" && tags.length > 0) {
            setTags((prev) => prev.slice(0, -1));
          }
        }}
        onBlur={() => commit(draft)}
        className="min-w-[8rem] flex-1 bg-transparent px-1.5 py-1 text-sm text-[color:var(--fg)] outline-none placeholder:text-[color:var(--fg-muted)]"
      />
    </div>
  );
}