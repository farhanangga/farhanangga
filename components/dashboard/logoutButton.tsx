"use client";

import { useTransition } from "react";
import { Loader2, LogOut } from "lucide-react";
import { logoutAction } from "@/app/dashboard/actions";

export function LogoutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => logoutAction())}
      className="inline-flex items-center gap-2 rounded-full bg-red-500/15 px-5 py-2.5 text-sm font-semibold text-red-300 outline-none transition-colors hover:bg-red-500/25 focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-70"
    >
      {pending ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
      {pending ? "Keluar…" : "Logout"}
    </button>
  );
}