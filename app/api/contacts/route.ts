import { NextResponse } from "next/server";
import { getContactData } from "@/lib/data";

export async function GET() {
  return NextResponse.json({ data: getContactData() });
}