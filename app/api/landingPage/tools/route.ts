// app/api/landingPage/tools/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ToolRow = { id: number; name: string; sort_order: number };
type GroupRow = {
  id: number;
  title: string;
  sort_order: number;
  tools: ToolRow[] | null;
};

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Di server pakai secret key (tanpa NEXT_PUBLIC_), fallback ke publishable key
  const key =
    process.env.SUPABASE_SECRET_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return NextResponse.json(
      { error: "Supabase env belum diset" },
      { status: 500 },
    );
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from("tool_groups")
    .select("id, title, sort_order, tools(id, name, sort_order)")
    .order("sort_order", { ascending: true })
    .order("sort_order", { referencedTable: "tools", ascending: true })
    .returns<GroupRow[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const groups = (data ?? []).map((g) => ({
    id: g.id,
    title: g.title,
    items: (g.tools ?? []).map((t) => t.name),
  }));

  // Marquee = semua tool dari semua grup, tanpa duplikat (mis. Figma)
  const marquee = Array.from(new Set(groups.flatMap((g) => g.items)));

  return NextResponse.json({ groups, marquee });
}