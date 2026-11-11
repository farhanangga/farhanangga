import { NextResponse } from "next/server";
import { getActivities } from "@/lib/data";

export async function GET() {
  return NextResponse.json({ data: getActivities() });
}