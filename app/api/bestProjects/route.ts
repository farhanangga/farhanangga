import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { BEST_PROJECT_LIMIT, getBestProjectTabs } from "@/lib/data";

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
 * GET /api/bestProjects
 * Header: x-api-key: <API_SECRET_KEY>   (atau Authorization: Bearer <API_SECRET_KEY>)
 * Opsional: ?limit=6 (maks proyek per tab, maks 6)
 *
 * Respons: { count, data: ProjectTab[] }
 * Alur: bestProject (order + idProject) -> projects (detail) -> gambarProject (maks 10 gambar)
 */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = Number(req.nextUrl.searchParams.get("limit"));
  const limit =
    Number.isInteger(raw) && raw > 0 ? Math.min(raw, BEST_PROJECT_LIMIT) : BEST_PROJECT_LIMIT;

  const data = getBestProjectTabs(limit);

  return NextResponse.json(
    { count: data.reduce((n, t) => n + t.projects.length, 0), data },
    { headers: { "Cache-Control": "no-store" } }
  );
}