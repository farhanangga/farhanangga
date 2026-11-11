import { cookies } from "next/headers";
import { SESSION_COOKIE, type Account } from "./account";

export type Session = Pick<Account, "username" | "name" | "role">;

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  for (const candidate of [safeDecode(raw), raw]) {
    try {
      const data = JSON.parse(candidate);
      if (data && typeof data.username === "string") return data as Session;
    } catch {
      /* coba kandidat berikutnya */
    }
  }
  return null;
}

function safeDecode(v: string) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}