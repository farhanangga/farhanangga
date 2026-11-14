"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ACCENT_GLOW, ACCENT_GRADIENT } from "@/components/dashboard/shared";
import { LANDING_BASE, LANDING_SECTIONS } from "./sections";

/**
 * Tab antar bagian landing page.
 * Bentuknya sama dengan tombol aksi di Ringkasan (chip rounded-xl, h-10);
 * tab aktif memakai gradient + glow seperti menu aktif di sidebar.
 * Di layar kecil barisnya bisa digeser horizontal.
 */
export function LandingNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Bagian landing page" className="-mx-2 -my-3 overflow-x-auto px-2 py-4">
      <ul className="flex w-max gap-2">
        {LANDING_SECTIONS.map((s) => {
          const href = `${LANDING_BASE}/${s.slug}`;
          const on = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={s.slug}>
              <Link
                href={href}
                aria-current={on ? "page" : undefined}
                className={`inline-flex h-10 items-center whitespace-nowrap rounded-xl px-4 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-[#5A64D8] active:scale-[0.98] ${
                  on ? "text-white" : "bg-[color:var(--chip)] text-[color:var(--fg)] hover:brightness-110"
                }`}
                style={on ? { background: ACCENT_GRADIENT, boxShadow: ACCENT_GLOW } : undefined}
              >
                {s.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}