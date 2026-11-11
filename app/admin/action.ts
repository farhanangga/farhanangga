"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, findAccount } from "@/lib/account";

export async function loginAction(formData: FormData): Promise<{ error: string } | void> {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!username.trim() || !password) {
    return { error: "Username dan kata sandi wajib diisi." };
  }

  const account = findAccount(username, password);
  if (!account) {
    return { error: "Username atau kata sandi salah." };
  }

  const jar = await cookies();
  jar.set(
    SESSION_COOKIE,
    encodeURIComponent(JSON.stringify({ username: account.username, name: account.name, role: account.role })),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    }
  );

  redirect("/dashboard");
}