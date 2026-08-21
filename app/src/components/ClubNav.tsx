"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "", label: "Overview" },
  { href: "/inventory", label: "Inventory & Pricing" },
  { href: "/pricing", label: "Markup Bands" },
  { href: "/menu", label: "Menu" },
  { href: "/financials", label: "Financials" },
];

export function ClubNav({ clubSlug }: { clubSlug: string }) {
  const pathname = usePathname();
  const base = `/app/${clubSlug}`;

  return (
    <nav className="flex gap-1 -mb-px overflow-x-auto">
      {TABS.map((tab) => {
        const href = `${base}${tab.href}`;
        const active = tab.href === "" ? pathname === base : pathname.startsWith(href);
        return (
          <Link
            key={tab.href}
            href={href}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
              active
                ? "border-emerald-700 text-emerald-800"
                : "border-transparent text-stone-600 hover:text-stone-900 hover:border-stone-300"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
