import type { Category, MarkupType, RoundingRule, UnitType } from "@/generated/prisma/client";

export const CATEGORY_LABELS: Record<Category, string> = {
  WINE: "Wine",
  SPIRITS: "Spirits",
  BEER: "Beer",
  COCKTAIL: "Cocktail",
  NON_ALCOHOLIC: "Non-Alcoholic",
  OTHER: "Other",
};

export const UNIT_TYPE_LABELS: Record<UnitType, string> = {
  BOTTLE: "Bottle",
  GLASS: "Glass / Pour",
  CAN: "Can",
  KEG: "Keg",
  EACH: "Each",
};

export const MARKUP_TYPE_LABELS: Record<MarkupType, string> = {
  MULTIPLIER: "Multiplier (cost × X)",
  MARGIN_PERCENT: "Target margin %",
  MARKUP_PERCENT: "Markup %",
};

export const ROUNDING_LABELS: Record<RoundingRule, string> = {
  NONE: "No rounding",
  NEAREST_025: "Nearest $0.25",
  NEAREST_050: "Nearest $0.50",
  NEAREST_1: "Nearest $1.00",
  CHARM_95: "Charm pricing (.95)",
  CHARM_99: "Charm pricing (.99)",
};

export function formatCurrency(value: number | null | undefined, currency = "USD"): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${value.toFixed(1)}%`;
}
