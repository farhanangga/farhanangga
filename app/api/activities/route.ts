import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getActivities } from "@/lib/data";

/** Bandingkan API key tanpa bocor lewat perbedaan waktu. */
function isAuthorized(req: NextRequest) {
  const secret = process.env.API_SECRET_KEY?.trim();
  if (!secret) return false; // env belum diisi -> tolak semua

  const given = (
    req.headers.get("x-api-key") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    ""
  ).trim();

  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * GET /api/activities
 * Header: x-api-key: <API_SECRET_KEY>   (atau Authorization: Bearer <API_SECRET_KEY>)
 * Opsional: ?year=2024 (hanya kegiatan tahun itu)
 *
 * Respons: { count, data: ActivityItem[] }
 * Alur: activities (detail) -> gambarActivities (maks 10 gambar, terurut)
 */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const year = Number(req.nextUrl.searchParams.get("year"));
    const all = getActivities();
    const data = Number.isInteger(year) && year > 0 ? all.filter((a) => a.tahun === year) : all;

    return NextResponse.json({ count: data.length, data }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[api/activities]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}