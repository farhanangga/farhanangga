import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Ambil env wajib. Dicek saat dipakai (bukan saat modul diimpor), supaya build tidak gagal. */
function requireEnv(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  throw new Error(`${names.join(" / ")} belum di-set di environment`);
}

const options = { auth: { persistSession: false } };

let reader: SupabaseClient | undefined;
let admin: SupabaseClient | undefined;

/** Untuk membaca data (publishable key, tunduk pada RLS). */
export function supabaseReader(): SupabaseClient {
  reader ??= createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    options
  );
  return reader;
}

/** Untuk menulis data dan storage (secret key, hanya di server, melewati RLS). */
export function supabaseAdmin(): SupabaseClient {
  admin ??= createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY"),
    options
  );
  return admin;
}