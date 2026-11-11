import { NextResponse } from "next/server";
import { getActivities } from "@/lib/data";

export async function GET() {
  try {
    const data = getActivities();
    return NextResponse.json({ count: data.length, data });
  } catch (err) {
    console.error("[api/activities]", err);
    return NextResponse.json(
      { error: "Gagal mengambil data kegiatan" },
      { status: 500 }
    );
  }
}