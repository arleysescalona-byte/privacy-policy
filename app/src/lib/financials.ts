import type { Category } from "@/generated/prisma/client";

export type SalesLine = {
  itemId: string | null;
  itemNameSnapshot: string;
  category: Category;
  quantitySold: number;
  revenuePerUnit: number;
  costPerUnit: number;
};

export type CategoryBreakdown = {
  category: Category;
  revenue: number;
  cogs: number;
  margin: number;
  marginPct: number;
  unitsSold: number;
};

export type ItemPerformance = {
  itemId: string | null;
  name: string;
  category: Category;
  unitsSold: number;
  revenue: number;
  cogs: number;
  margin: number;
  marginPct: number;
};

export type FinancialSummary = {
  revenue: number;
  cogs: number;
  margin: number;
  marginPct: number;
  unitsSold: number;
  byCategory: CategoryBreakdown[];
  topPerformers: ItemPerformance[];
  bottomPerformers: ItemPerformance[];
};

function safeDiv(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function summarizeSales(lines: SalesLine[]): FinancialSummary {
  const revenue = round2(lines.reduce((sum, l) => sum + l.quantitySold * l.revenuePerUnit, 0));
  const cogs = round2(lines.reduce((sum, l) => sum + l.quantitySold * l.costPerUnit, 0));
  const margin = round2(revenue - cogs);
  const unitsSold = lines.reduce((sum, l) => sum + l.quantitySold, 0);

  const byCategoryMap = new Map<Category, { revenue: number; cogs: number; unitsSold: number }>();
  for (const line of lines) {
    const bucket = byCategoryMap.get(line.category) ?? { revenue: 0, cogs: 0, unitsSold: 0 };
    bucket.revenue += line.quantitySold * line.revenuePerUnit;
    bucket.cogs += line.quantitySold * line.costPerUnit;
    bucket.unitsSold += line.quantitySold;
    byCategoryMap.set(line.category, bucket);
  }
  const byCategory: CategoryBreakdown[] = Array.from(byCategoryMap.entries())
    .map(([category, b]) => ({
      category,
      revenue: round2(b.revenue),
      cogs: round2(b.cogs),
      margin: round2(b.revenue - b.cogs),
      marginPct: round2(safeDiv(b.revenue - b.cogs, b.revenue) * 100),
      unitsSold: b.unitsSold,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const byItemMap = new Map<string, ItemPerformance>();
  for (const line of lines) {
    const key = line.itemId ?? `name:${line.itemNameSnapshot}`;
    const existing = byItemMap.get(key);
    const lineRevenue = line.quantitySold * line.revenuePerUnit;
    const lineCogs = line.quantitySold * line.costPerUnit;
    if (existing) {
      existing.unitsSold += line.quantitySold;
      existing.revenue += lineRevenue;
      existing.cogs += lineCogs;
    } else {
      byItemMap.set(key, {
        itemId: line.itemId,
        name: line.itemNameSnapshot,
        category: line.category,
        unitsSold: line.quantitySold,
        revenue: lineRevenue,
        cogs: lineCogs,
        margin: 0,
        marginPct: 0,
      });
    }
  }
  const byItem = Array.from(byItemMap.values()).map((it) => ({
    ...it,
    revenue: round2(it.revenue),
    cogs: round2(it.cogs),
    margin: round2(it.revenue - it.cogs),
    marginPct: round2(safeDiv(it.revenue - it.cogs, it.revenue) * 100),
  }));

  const byMargin = [...byItem].sort((a, b) => b.margin - a.margin);
  const topPerformers = byMargin.slice(0, 8);
  const bottomPerformers = byMargin.slice(-8).reverse();

  return {
    revenue,
    cogs,
    margin,
    marginPct: round2(safeDiv(margin, revenue) * 100),
    unitsSold,
    byCategory,
    topPerformers,
    bottomPerformers,
  };
}

export type MonthOverMonth = {
  current: FinancialSummary;
  previous: FinancialSummary | null;
  revenueDeltaPct: number | null;
  marginDeltaPct: number | null;
};

export function compareMonths(currentLines: SalesLine[], previousLines: SalesLine[] | null): MonthOverMonth {
  const current = summarizeSales(currentLines);
  if (!previousLines) {
    return { current, previous: null, revenueDeltaPct: null, marginDeltaPct: null };
  }
  const previous = summarizeSales(previousLines);
  return {
    current,
    previous,
    revenueDeltaPct: previous.revenue === 0 ? null : round2(safeDiv(current.revenue - previous.revenue, previous.revenue) * 100),
    marginDeltaPct: previous.margin === 0 ? null : round2(safeDiv(current.margin - previous.margin, previous.margin) * 100),
  };
}
