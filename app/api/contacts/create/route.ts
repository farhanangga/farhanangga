import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/session";

const BASE = "/dashboard/contacts";
const NEW_URL = `${BASE}/new`;

// Samakan dengan ICONS di app/dashboard/contacts/new/page.tsx
const ICONS = ["linkedin", "github", "instagram", "email", "whatsapp", "twitter", "youtube", "tiktok", "facebook"];

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error("Konfigurasi Supabase server belum lengkap.");
  }

  return createClient(url, key, {
    auth: { persistSession: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
}

const text = (value: FormDataEntryValue | null) => String(value ?? "").trim();

function isContactUrl(value: string) {
  try {
    return ["http:", "https:", "mailto:", "tel:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url), 303);
}

/* ── POST: tambah kontak baru ──────────────────────────── */

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return redirectTo(request, "/admin");

  try {
    const formData = await request.formData();

    const platform = text(formData.get("platform"));
    const icon = text(formData.get("icon"));
    const handle = text(formData.get("handle"));
    const href = text(formData.get("href"));
    const description = text(formData.get("desc"));
    const rawPosition = text(formData.get("position"));

    // urutan opsional: kosong → ditaruh paling akhir
    const positionOk = !rawPosition || (/^\d{1,4}$/.test(rawPosition) && Number(rawPosition) >= 1);

    const valid =
      platform && handle && description && ICONS.includes(icon) && isContactUrl(href) && positionOk;
    if (!valid) return redirectTo(request, `${NEW_URL}?error=invalid`);

    const db = adminClient();

    let position = rawPosition ? Number(rawPosition) : 0;
    if (!position) {
      const { data: last, error: lastError } = await db
        .from("contacts")
        .select("position")
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lastError) throw lastError;
      position = (last?.position ?? 0) + 1;
    }

    const { error } = await db
      .from("contacts")
      .insert({ platform, icon, handle, href, description, position });
    if (error) throw error;

    revalidatePath(BASE);
    revalidatePath("/");
    return redirectTo(request, BASE);
  } catch (error) {
    console.error("[create contact] Error:", error);
    return redirectTo(request, `${NEW_URL}?error=1`);
  }
}