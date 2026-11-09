import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getContactData } from "@/lib/data";

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
 * GET /api/contacts
 * Header: x-api-key: <API_SECRET_KEY>   (atau Authorization: Bearer <API_SECRET_KEY>)
 *
 * Respons: { count, data: { email, location, availability?, links: ContactItem[] } }
 * count = jumlah kanal di `links`.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = getContactData();
    return NextResponse.json(
      { count: data.links.length, data },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[api/contacts]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}