"use client";

import { useState } from "react";
import { X } from "lucide-react";

/** Input tag: ketik kata lalu Enter → kata tercetak di bawah, input kosong lagi.
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

  const commit = (raw: string) => {
    const incoming = raw.split(",").map((s) => s.trim()).filter(Boolean);
    if (incoming.length === 0) {
      setDraft("");
      return;
    }
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
    <div>
      <input type="hidden" name={name} value={tags.join(", ")} />

      {/* kolom input: selalu kosong setelah Enter */}
      <input
        value={draft}
        placeholder={placeholder}
        aria-label="Tambah tool"
        autoComplete="off"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault(); // jangan submit form
            commit(draft);
          }
        }}
        onBlur={() => commit(draft)}
        className="h-11 w-full rounded-2xl bg-[color:var(--card-hi)] px-4 text-sm text-[color:var(--fg)] outline-none ring-1 ring-transparent transition placeholder:text-[color:var(--fg-muted)] focus:ring-2 focus:ring-[#5A64D8]"
      />

      {/* hasil: tercetak di bawah input */}
      {tags.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Daftar tool">
          {tags.map((t) => (
            <li
              key={t}
              className="inline-flex items-center gap-1 rounded-lg bg-[color:var(--chip)] py-1 pl-3 pr-1 text-xs font-medium"
            >
              {t}
              <button
                type="button"
                aria-label={`Hapus ${t}`}
                onClick={() => setTags((prev) => prev.filter((x) => x !== t))}
                className="grid h-5 w-5 place-items-center rounded-md text-[color:var(--fg-muted)] outline-none transition hover:bg-[#E85B53] hover:text-white focus-visible:ring-2 focus-visible:ring-[#5A64D8]"
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