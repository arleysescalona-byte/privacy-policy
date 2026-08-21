"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CategoryBreakdown } from "@/lib/financials";
import { CATEGORY_LABELS } from "@/lib/labels";

const COLORS = { revenue: "#0f766e", cogs: "#d97706" };

export function CategoryBreakdownChart({ data }: { data: CategoryBreakdown[] }) {
  const chartData = data.map((d) => ({ name: CATEGORY_LABELS[d.category], Revenue: d.revenue, COGS: d.cogs }));
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
          <Tooltip formatter={(v) => `$${Number(v).toFixed(2)}`} />
          <Legend />
          <Bar dataKey="Revenue" fill={COLORS.revenue} radius={[4, 4, 0, 0]} />
          <Bar dataKey="COGS" fill={COLORS.cogs} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
