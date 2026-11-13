import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!url || !key) {
      throw new Error("Env NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY belum diisi.");
    }

    const supabase = createClient(url, key, {
      auth: { persistSession: false },
      global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
    });

    const { data, error } = await supabase
      .from("landing_hero")
      .select("nama_lengkap, deskripsi, url_foto")
      .order("id", { ascending: true })
      .limit(1);

    if (error) throw error;

    const row = data?.[0] ?? null;

    return NextResponse.json(
      {
        data: row
          ? {
              namaLengkap: row.nama_lengkap,
              deskripsi: row.deskripsi,
              urlFoto: row.url_foto,
            }
          : null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[landing hero] GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memuat data hero." },
      { status: 500 },
    );
  }
}