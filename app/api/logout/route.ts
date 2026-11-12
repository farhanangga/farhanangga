import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// SESUAIKAN: nama cookie sesi yang dipakai lib/session.ts.
// Kalau lib/session sudah punya fungsi hapus sesi (mis. destroySession), panggil itu saja sebagai ganti baris cookies().delete.
const SESSION_COOKIE = "session";

export async function POST(req: NextRequest) {
  (await cookies()).delete(SESSION_COOKIE);
  // 303 agar browser mengubah POST menjadi GET saat redirect
  return NextResponse.redirect(new URL("/admin", req.url), 303);
}