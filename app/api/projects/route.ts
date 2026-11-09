import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { projectTabs, type ProjectTab } from "@/lib/data";

// Memeriksa API Key dari client
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.API_SECRET_KEY?.trim();

  // Jika API Key server belum dikonfigurasi, tolak akses
  if (!secret) return false;

  // Mengambil API Key dari Header
  const given = (
    req.headers.get("x-api-key") ??
    req.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "") ??
    ""
  ).trim();

  // Mengubah string menjadi Buffer
  const a = Buffer.from(given);
  const b = Buffer.from(secret);

  // Membandingkan API Key
  return a.length === b.length && timingSafeEqual(a, b);
}

// GET /api/projects
export function GET(req: NextRequest) {
  // Validasi autentikasi
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // Mengambil seluruh data proyek
  const data: ProjectTab[] = projectTabs;

  // Menghitung total seluruh proyek
  const count = data.reduce(
    (total, tab) => total + tab.projects.length,
    0
  );

  // Mengirimkan respons JSON
  return NextResponse.json(
    {
      success: true,
      count,
      data,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}