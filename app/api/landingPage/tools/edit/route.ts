// app/api/landingPage/tools/edit/route.ts
// GET  : daftar grup + tools untuk dashboard (butuh sesi admin).
// POST : sinkronkan seluruh daftar (tambah, ubah, hapus, urutan) dalam satu permintaan.

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/session";

const MAX_GROUPS = 20;
const MAX_TOOLS = 60;
const MAX_TITLE = 60;
const MAX_NAME = 40;

type DbGroup = { id: number; title: string; sort_order: number; tools: { id: number; name: string; sort_order: number }[] | null };

type InTool = { id?: number; name: string };
type InGroup = { id?: number; title: string; items: InTool[] };

const fail = (message: string, status = 400) => NextResponse.json({ message }, { status });

function admin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Menulis ke tabel butuh secret key (service role); publishable key akan ditolak RLS.
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function loadGroups(db: SupabaseClient) {
  const { data, error } = await db
    .from("tool_groups")
    .select("id, title, sort_order, tools(id, name, sort_order)")
    .order("sort_order", { ascending: true })
    .order("sort_order", { referencedTable: "tools", ascending: true })
    .returns<DbGroup[]>();

  if (error) throw new Error(error.message);

  return (data ?? []).map((g) => ({
    id: g.id,
    title: g.title,
    items: (g.tools ?? []).map((t) => ({ id: t.id, name: t.name })),
  }));
}

export async function GET() {
  if (!(await getSession())) return fail("Tidak diizinkan.", 401);

  const db = admin();
  if (!db) return fail("Supabase env belum diset (SUPABASE_SECRET_KEY).", 500);

  try {
    return NextResponse.json({ data: { groups: await loadGroups(db) } });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}

/** Validasi bentuk body. Mengembalikan daftar bersih atau pesan error. */
function parse(body: unknown): { groups: InGroup[] } | { error: string } {
  const raw = (body as { groups?: unknown } | null)?.groups;
  if (!Array.isArray(raw)) return { error: "Format data tidak valid." };
  if (raw.length > MAX_GROUPS) return { error: `Maksimal ${MAX_GROUPS} grup.` };

  const groups: InGroup[] = [];
  for (let gi = 0; gi < raw.length; gi++) {
    const g = raw[gi] as { id?: unknown; title?: unknown; items?: unknown };
    const label = `Grup #${gi + 1}`;

    const title = typeof g.title === "string" ? g.title.trim() : "";
    if (!title) return { error: `${label}: judul wajib diisi.` };
    if (title.length > MAX_TITLE) return { error: `${label}: judul maksimal ${MAX_TITLE} karakter.` };

    const id = g.id == null ? undefined : Number(g.id);
    if (id !== undefined && !Number.isInteger(id)) return { error: `${label}: id tidak valid.` };

    if (!Array.isArray(g.items)) return { error: `${label}: daftar tools tidak valid.` };
    if (g.items.length > MAX_TOOLS) return { error: `${label}: maksimal ${MAX_TOOLS} tools.` };

    const seen = new Set<string>();
    const items: InTool[] = [];
    for (const it of g.items as { id?: unknown; name?: unknown }[]) {
      const name = typeof it.name === "string" ? it.name.trim() : "";
      if (!name) return { error: `${label}: nama tool tidak boleh kosong.` };
      if (name.length > MAX_NAME) return { error: `${label}: nama tool maksimal ${MAX_NAME} karakter.` };

      const k = name.toLowerCase();
      if (seen.has(k)) return { error: `${label}: tool "${name}" terduplikasi.` };
      seen.add(k);

      const tid = it.id == null ? undefined : Number(it.id);
      if (tid !== undefined && !Number.isInteger(tid)) return { error: `${label}: id tool tidak valid.` };
      items.push({ id: tid, name });
    }

    groups.push({ id, title, items });
  }
  return { groups };
}

export async function POST(req: Request) {
  if (!(await getSession())) return fail("Tidak diizinkan.", 401);

  const db = admin();
  if (!db) return fail("Supabase env belum diset (SUPABASE_SECRET_KEY).", 500);

  const body = await req.json().catch(() => null);
  const parsed = parse(body);
  if ("error" in parsed) return fail(parsed.error);
  const { groups } = parsed;

  try {
    // 1. Keadaan saat ini di database
    const current = await loadGroups(db);
    const curGroupIds = new Set(current.map((g) => g.id));
    const curToolIds = new Set(current.flatMap((g) => g.items.map((t) => t.id)));

    const inGroupIds = new Set<number>();
    const inToolIds = new Set<number>();
    for (const g of groups) {
      if (g.id !== undefined) {
        if (!curGroupIds.has(g.id) || inGroupIds.has(g.id)) return fail("Ada grup yang tidak ditemukan. Muat ulang halaman.");
        inGroupIds.add(g.id);
      }
      for (const t of g.items) {
        if (t.id !== undefined) {
          if (!curToolIds.has(t.id) || inToolIds.has(t.id)) return fail("Ada tool yang tidak ditemukan. Muat ulang halaman.");
          inToolIds.add(t.id);
        }
      }
    }

    // 2. Hapus tool lalu grup yang sudah tidak ada di daftar
    const delTools = [...curToolIds].filter((id) => !inToolIds.has(id));
    if (delTools.length) {
      const { error } = await db.from("tools").delete().in("id", delTools);
      if (error) throw new Error(error.message);
    }
    const delGroups = [...curGroupIds].filter((id) => !inGroupIds.has(id));
    if (delGroups.length) {
      const { error } = await db.from("tool_groups").delete().in("id", delGroups);
      if (error) throw new Error(error.message);
    }

    // 3. Grup: update yang lama, insert yang baru (butuh id baru untuk anak-anaknya)
    const groupIdAt: number[] = [];
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      if (g.id !== undefined) {
        const { error } = await db.from("tool_groups").update({ title: g.title, sort_order: i }).eq("id", g.id);
        if (error) throw new Error(error.message);
        groupIdAt.push(g.id);
      } else {
        const { data, error } = await db
          .from("tool_groups")
          .insert({ title: g.title, sort_order: i })
          .select("id")
          .single();
        if (error || !data) throw new Error(error?.message ?? "Gagal membuat grup.");
        groupIdAt.push(data.id as number);
      }
    }

    // 4. Tool: update yang lama (id hanya dipakai sebagai filter), insert yang baru
    const fresh: { group_id: number; name: string; sort_order: number }[] = [];
    const updates: { id: number; group_id: number; name: string; sort_order: number }[] = [];
    groups.forEach((g, gi) =>
      g.items.forEach((t, ti) => {
        if (t.id !== undefined) updates.push({ id: t.id, group_id: groupIdAt[gi], name: t.name, sort_order: ti });
        else fresh.push({ group_id: groupIdAt[gi], name: t.name, sort_order: ti });
      }),
    );

    const results = await Promise.all(
      updates.map(({ id, ...values }) => db.from("tools").update(values).eq("id", id)),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) throw new Error(failed.error.message);

    if (fresh.length) {
      const { error } = await db.from("tools").insert(fresh);
      if (error) throw new Error(error.message);
    }

    revalidatePath("/");
    revalidatePath("/api/landingPage/tools");

    return NextResponse.json({ data: { groups: await loadGroups(db) } });
  } catch (e) {
    console.error("[tools/edit]", e);
    return fail((e as Error).message || "Gagal menyimpan tools.", 500);
  }
}