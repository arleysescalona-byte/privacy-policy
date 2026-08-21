import { getClubOrNotFound, getAvailableMonths, getSalesForMonth } from "@/lib/queries";
import { compareMonths } from "@/lib/financials";
import { formatCurrency, formatPercent, CATEGORY_LABELS } from "@/lib/labels";
import { SalesImportWizard } from "@/components/SalesImportWizard";
import { MonthSelector } from "@/components/MonthSelector";
import { CategoryBreakdownChart } from "@/components/FinancialsCharts";

function monthKeyToUtcDate(key: string): Date {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1));
}

export default async function FinancialsPage({
  params,
  searchParams,
}: {
  params: Promise<{ clubSlug: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { clubSlug } = await params;
  const { month: monthParam } = await searchParams;
  const club = await getClubOrNotFound(clubSlug);
  const months = await getAvailableMonths(club.id);
  const defaultMonthKey = new Date().toISOString().slice(0, 7);

  if (months.length === 0) {
    return (
      <div className="space-y-6">
        <Header />
        <SalesImportWizard clubId={club.id} clubSlug={club.slug} defaultMonth={defaultMonthKey} />
        <p className="text-sm text-stone-500">
          No sales data yet. Import a monthly sales export (item name + quantity sold) to see revenue, COGS, and margin.
        </p>
      </div>
    );
  }

  const selected = monthParam ? monthKeyToUtcDate(monthParam) : months[0];
  const currentLines = await getSalesForMonth(club.id, selected);

  const idx = months.findIndex((m) => m.getTime() === selected.getTime());
  const previousMonth = idx >= 0 && idx + 1 < months.length ? months[idx + 1] : null;
  const previousLines = previousMonth ? await getSalesForMonth(club.id, previousMonth) : null;

  const comparison = compareMonths(currentLines, previousLines);
  const { current } = comparison;

  return (
    <div className="space-y-6">
      <Header />
      <SalesImportWizard clubId={club.id} clubSlug={club.slug} defaultMonth={defaultMonthKey} />

      <div className="flex items-center justify-between">
        <h2 className="font-medium text-stone-900">
          {selected.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })} performance
        </h2>
        <MonthSelector months={months} selected={selected} clubSlug={club.slug} />
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Kpi label="Revenue" value={formatCurrency(current.revenue)} delta={comparison.revenueDeltaPct} />
        <Kpi label="COGS" value={formatCurrency(current.cogs)} />
        <Kpi label="Gross margin" value={formatCurrency(current.margin)} delta={comparison.marginDeltaPct} />
        <Kpi label="Margin %" value={formatPercent(current.marginPct)} />
      </div>

      {current.byCategory.length > 0 && (
        <div className="rounded-lg border border-stone-200 bg-white p-5">
          <h3 className="font-medium text-stone-900 mb-3">Revenue vs. cost by category</h3>
          <CategoryBreakdownChart data={current.byCategory} />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <PerformerTable title="Top performers by margin" rows={current.topPerformers} />
        <PerformerTable title="Lowest margin" rows={current.bottomPerformers} />
      </div>

      <div className="rounded-lg border border-stone-200 bg-white overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-stone-50 text-xs uppercase text-stone-500">
            <tr>
              <th className="px-3 py-2 text-left">Category</th>
              <th className="px-3 py-2 text-right">Units sold</th>
              <th className="px-3 py-2 text-right">Revenue</th>
              <th className="px-3 py-2 text-right">COGS</th>
              <th className="px-3 py-2 text-right">Margin</th>
              <th className="px-3 py-2 text-right">Margin %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {current.byCategory.map((c) => (
              <tr key={c.category}>
                <td className="px-3 py-2">{CATEGORY_LABELS[c.category]}</td>
                <td className="px-3 py-2 text-right tabular-nums">{c.unitsSold}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(c.revenue)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(c.cogs)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(c.margin)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatPercent(c.marginPct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="no-print">
      <h1 className="text-2xl font-serif font-semibold text-stone-900">Financial analysis</h1>
      <p className="mt-1 text-sm text-stone-600 max-w-2xl">
        Import each month&apos;s sales export to track revenue, cost of goods, and margin by category — replacing the manual
        end-of-month F&amp;B recap spreadsheet.
      </p>
    </div>
  );
}

function Kpi({ label, value, delta }: { label: string; value: string; delta?: number | null }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-stone-900">{value}</p>
      {delta !== undefined && delta !== null && (
        <p className={`mt-1 text-xs font-medium ${delta >= 0 ? "text-emerald-700" : "text-red-600"}`}>
          {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}% vs. prior month
        </p>
      )}
    </div>
  );
}

function PerformerTable({ title, rows }: { title: string; rows: { name: string; margin: number; marginPct: number }[] }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <h3 className="font-medium text-stone-900 mb-2">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-stone-400">No data.</p>
      ) : (
        <ul className="divide-y divide-stone-100 text-sm">
          {rows.map((r) => (
            <li key={r.name} className="flex items-center justify-between py-1.5">
              <span className="truncate pr-2">{r.name}</span>
              <span className="whitespace-nowrap tabular-nums text-stone-600">
                {formatCurrency(r.margin)} <span className="text-stone-400">({formatPercent(r.marginPct)})</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
