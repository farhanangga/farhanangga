import { Suspense } from "react";
import { connection } from "next/server";
import { supabase } from "@/lib/supabase";

const TABLES = [
  "project_tabs",
  "projects",
  "project_images",
  "best_projects",
  "activities",
  "activity_images",
] as const;

async function TableDump() {
  await connection(); // data selalu diambil saat request

  const results = await Promise.all(
    TABLES.map(async (name) => {
      const { data, error, count } = await supabase
        .from(name)
        .select("*", { count: "exact" })
        .limit(50);
      return { name, data: data ?? [], count: count ?? 0, error: error?.message ?? null };
    })
  );

  return (
    <div className="space-y-4">
      {/* ringkasan */}
      <table className="w-full max-w-xl text-left text-sm">
        <thead className="text-white/50">
          <tr>
            <th className="py-2">Tabel</th>
            <th>Jumlah baris</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.name} className="border-t border-white/10">
              <td className="py-2 font-mono">{r.name}</td>
              <td>{r.count}</td>
              <td className={r.error ? "text-red-400" : r.count === 0 ? "text-yellow-400" : "text-green-400"}>
                {r.error ? "Error" : r.count === 0 ? "Kosong / diblokir RLS" : "OK"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* isi tiap tabel */}
      {results.map((r) => (
        <details key={r.name} className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
          <summary className="cursor-pointer font-mono text-sm">
            {r.name} ({r.count})
          </summary>
          {r.error && <p className="mt-3 text-sm text-red-400">Error: {r.error}</p>}
          <pre className="mt-3 max-h-96 overflow-auto text-xs text-white/70">
            {JSON.stringify(r.data, null, 2)}
          </pre>
        </details>
      ))}
    </div>
  );
}

export default function DebugDbPage() {
  return (
    <main className="min-h-screen bg-[#02020F] p-8 text-white">
      <h1 className="mb-6 text-2xl font-bold">Cek Data Supabase</h1>
      <Suspense fallback={<p className="text-white/50">Memuat data…</p>}>
        <TableDump />
      </Suspense>
    </main>
  );
}