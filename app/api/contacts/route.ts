import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/session";

const BASE = "/dashboard/contacts";
const COLUMNS = "id, platform, icon, handle, href, description, position";

// Samakan dengan daftar ikon di app/dashboard/contacts/page.tsx
const ICONS = ["linkedin", "github", "instagram", "email", "whatsapp", "twitter", "youtube", "tiktok", "facebook"];

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
    // jangan biarkan Next.js menyimpan hasil query di cache fetch
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

/** Kembali ke halaman dashboard; `params` dipakai untuk pesan error / membuka ulang modal. */
function back(request: NextRequest, params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  return NextResponse.redirect(new URL(qs ? `${BASE}?${qs}` : BASE, request.url), 303);
}

/* ── GET: daftar kontak (data publik, juga bisa dipakai website portfolio) ── */

export async function GET() {
  try {
    const db = adminClient();
    const { data, error } = await db.from("contacts").select(COLUMNS).order("position").order("created_at");
    if (error) throw error;

    const rows = ((data ?? []) as ContactRow[]).map((r) => ({
      id: r.id,
      platform: r.platform,
      icon: r.icon,
      handle: r.handle,
      href: r.href,
      desc: r.description,
      position: r.position,
    }));

    return NextResponse.json({ data: rows });
  } catch (error) {
    console.error("[contacts] GET error:", error);
    return NextResponse.json({ error: "Gagal memuat kontak." }, { status: 500 });
  }
}

/* ── POST: satu pintu untuk tambah, ubah, dan hapus (field `intent`) ── */

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL("/admin", request.url), 303);

  let intent = "";
  let id = "";

  // modal yang dibuka ulang bila gagal
  const reopen = (): Record<string, string> =>
    intent === "create" ? { new: "1" } : intent === "update" && id ? { edit: id } : {};

  try {
    const formData = await request.formData();
    intent = text(formData.get("intent"));
    id = text(formData.get("id"));
    const db = adminClient();

    /* hapus: dikonfirmasi dengan mengetik "delete <platform>" */
    if (intent === "delete") {
      const confirm = text(formData.get("confirm"));

      const { data: contact, error: findError } = await db
        .from("contacts")
        .select("id, platform")
        .eq("id", id)
        .maybeSingle();
      if (findError) throw findError;
      if (!contact) return back(request, { error: "notfound" });

      // validasi sebenarnya ada di server, bukan hanya atribut pattern
      if (confirm !== `delete ${contact.platform}`.trim()) return back(request, { error: "delete" });

      const { error } = await db.from("contacts").delete().eq("id", id);
      if (error) throw error;

      revalidatePath(BASE);
      revalidatePath("/");
      return back(request);
    }

    if (intent !== "create" && intent !== "update") return back(request, { error: "1" });

    /* tambah / ubah: validasi isian */
    const platform = text(formData.get("platform"));
    const icon = text(formData.get("icon"));
    const handle = text(formData.get("handle"));
    const href = text(formData.get("href"));
    const description = text(formData.get("desc"));
    const rawPosition = text(formData.get("position"));

    let position: number | null = null;
    const positionOk = !rawPosition || (/^\d{1,4}$/.test(rawPosition) && Number(rawPosition) >= 1);
    if (rawPosition && positionOk) position = Number(rawPosition);

    const valid =
      platform && handle && description && ICONS.includes(icon) && isContactUrl(href) && positionOk;
    if (!valid || (intent === "update" && !id)) return back(request, { error: "invalid", ...reopen() });

    if (intent === "create") {
      if (position === null) {
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
    } else {
      const update: Record<string, string | number> = { platform, icon, handle, href, description };
      // urutan hanya diubah bila diisi
      if (position !== null) update.position = position;

      const { data, error } = await db.from("contacts").update(update).eq("id", id).select("id");
      if (error) throw error;
      if (!data || data.length === 0) return back(request, { error: "notfound" });
    }

    revalidatePath(BASE);
    revalidatePath("/");
    return back(request);
  } catch (error) {
    console.error(`[contacts] POST ${intent || "?"} error:`, error);
    return back(request, { error: intent === "delete" ? "delete" : "1", ...reopen() });
  }
}