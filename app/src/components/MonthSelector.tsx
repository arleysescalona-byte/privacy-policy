"use client";

import { useRouter } from "next/navigation";

export function MonthSelector({ months, selected, clubSlug }: { months: Date[]; selected: Date; clubSlug: string }) {
  const router = useRouter();
  return (
    <select
      value={selected.toISOString().slice(0, 7)}
      onChange={(e) => router.push(`/app/${clubSlug}/financials?month=${e.target.value}`)}
      className="rounded-md border border-stone-300 px-3 py-1.5 text-sm"
    >
      {months.map((m) => {
        const value = m.toISOString().slice(0, 7);
        return (
          <option key={value} value={value}>
            {m.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </option>
        );
      })}
    </select>
  );
}
