import { NextResponse } from "next/server";
import { getContactData } from "@/lib/data";

export async function GET() {
  try {
    const data = getContactData();
    return NextResponse.json({ count: data.links.length, data });
  } catch (err) {
    console.error("[api/contacts]", err);
    return NextResponse.json(
      { error: "Gagal mengambil data kontak" },
      { status: 500 }
    );
  }
}