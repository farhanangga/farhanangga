import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/session";

const BASE = "/dashboard/contacts";

// Samakan dengan ICONS di app/dashboard/contacts/[id]/edit/page.tsx
const ICONS = ["linkedin", "github", "instagram", "email", "whatsapp", "twitter", "youtube", "tiktok", "facebook"];

type Ctx = { params: Promise<{ id: string }> };

type ContactRow = {
  id: string;
  platform: string;
  icon: string;
  handle: string;
  href: string;
  description: string;
  position: number;
};

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

/* ── GET: data untuk form edit ─────────────────────────── */

export async function GET(_request: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const db = adminClient();
    const { data, error } = await db
      .from("contacts")
      .select("id, platform, icon, handle, href, description, position")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;

    if (!data) {
      return NextResponse.json({ error: "Kontak tidak ditemukan." }, { status: 404 });
    }

    const row = data as ContactRow;
    return NextResponse.json({
      data: {
        contact: {
          id: row.id,
          platform: row.platform,
          icon: row.icon,
          handle: row.handle,
          href: row.href,
          desc: row.description,
          position: row.position,
        },
      },
    });
  } catch (error) {
    console.error("[edit contact] GET error:", error);
    return NextResponse.json({ error: "Gagal memuat data kontak." }, { status: 500 });
  }
}

/* ── POST: simpan perubahan ────────────────────────────── */

export async function POST(request: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session) return redirectTo(request, "/admin");

  const { id } = await params;
  const editUrl = `${BASE}/${encodeURIComponent(id)}/edit`;

  try {
    const formData = await request.formData();

    const platform = text(formData.get("platform"));
    const icon = text(formData.get("icon"));
    const handle = text(formData.get("handle"));
    const href = text(formData.get("href"));
    const description = text(formData.get("desc"));
    const rawPosition = text(formData.get("position"));

    // urutan opsional: kosong → tidak diubah
    const positionOk = !rawPosition || (/^\d{1,4}$/.test(rawPosition) && Number(rawPosition) >= 1);

    const valid =
      platform && handle && description && ICONS.includes(icon) && isContactUrl(href) && positionOk;
    if (!valid) return redirectTo(request, `${editUrl}?error=invalid`);

    const update: Record<string, string | number> = { platform, icon, handle, href, description };
    if (rawPosition) update.position = Number(rawPosition);

    const db = adminClient();
    const { data, error } = await db.from("contacts").update(update).eq("id", id).select("id");
    if (error) throw error;
    if (!data || data.length === 0) return redirectTo(request, `${BASE}?error=notfound`);

    revalidatePath(BASE);
    revalidatePath(editUrl);
    revalidatePath("/");
    return redirectTo(request, BASE);
  } catch (error) {
    console.error("[edit contact] Error:", error);
    return redirectTo(request, `${editUrl}?error=1`);
  }
}