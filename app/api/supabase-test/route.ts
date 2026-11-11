import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error, count } = await supabase
    .from("projects")
    .select("id, title, category", { count: "exact" })
    .limit(3);

  if (error) {
    return NextResponse.json(
      { ok: false, code: error.code, message: error.message, hint: error.hint },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, total: count, sample: data });
}