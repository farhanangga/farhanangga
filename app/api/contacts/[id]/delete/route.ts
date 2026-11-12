import { NextRequest } from "next/server";
// Logika hapus (cek sesi, cek teks konfirmasi, query DB, redirect) tetap satu tempat: POST di /api/contacts.
// Route ini hanya memetakan /api/contacts/[id]/delete -> intent=delete + id dari URL.
import { POST as contactsPost } from "@/app/api/contacts/route";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const incoming = await req.formData();

  const fd = new FormData();
  fd.set("intent", "delete");
  fd.set("id", id); // id selalu dari URL, bukan dari body
  const confirm = incoming.get("confirm");
  if (typeof confirm === "string") fd.set("confirm", confirm);

  // teruskan cookie sesi & header lain; biarkan fetch membuat content-type multipart yang baru
  const headers = new Headers(req.headers);
  headers.delete("content-type");
  headers.delete("content-length");

  return contactsPost(
    new NextRequest(new URL("/api/contacts", req.url), { method: "POST", headers, body: fd }),
  );
}