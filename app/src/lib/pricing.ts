import type { Category, MarkupBand, RoundingRule, UnitType } from "@/generated/prisma/client";

/** Round to 2 decimal places, avoiding float noise (e.g. 12.499999999). */
function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundToStep(value: number, step: number): number {
  return round2(Math.round(value / step) * step);
}

/** "Charm" pricing: round up to the nearest whole dollar minus `tail`
 * (e.g. tail=0.05 turns 12.30 into 12.95, not down to 11.95). */
function charmPrice(value: number, tail: number): number {
  let base = Math.floor(value) + (1 - tail);
  if (base < value) base += 1;
  return round2(base);
}

export function applyRounding(value: number, rule: RoundingRule): number {
  switch (rule) {
    case "NONE":
      return round2(value);
    case "NEAREST_025":
      return roundToStep(value, 0.25);
    case "NEAREST_050":
      return roundToStep(value, 0.5);
    case "NEAREST_1":
      return roundToStep(value, 1);
    case "CHARM_95":
      return charmPrice(value, 0.05);
    case "CHARM_99":
      return charmPrice(value, 0.01);
    default:
      return round2(value);
  }
}

/** Raw price from a markup rule, before rounding. */
export function applyMarkup(cost: number, band: Pick<MarkupBand, "markupType" | "markupValue">): number {
  switch (band.markupType) {
    case "MULTIPLIER":
      return cost * band.markupValue;
    case "MARKUP_PERCENT":
      return cost * (1 + band.markupValue / 100);
    case "MARGIN_PERCENT": {
      // Solve for price where (price - cost) / price === markupValue / 100
      const margin = Math.min(Math.max(band.markupValue, 0), 99.99) / 100;
      return cost / (1 - margin);
    }
    default:
      return cost;
  }
}

/**
 * Pick the best-matching band for a given category/unitType/cost.
 * Ties (overlapping ranges) are broken by explicit `priority` first, then by
 * the narrowest cost range (the more specific rule), so a club can layer a
 * tight override band on top of a broad default without deleting it.
 */
export function matchBand(
  bands: MarkupBand[],
  category: Category,
  unitType: UnitType,
  cost: number,
): MarkupBand | null {
  const candidates = bands.filter(
    (b) =>
      b.active &&
      b.category === category &&
      b.unitType === unitType &&
      cost >= b.minCost &&
      (b.maxCost === null || b.maxCost === undefined || cost < b.maxCost),
  );
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    const spanA = (a.maxCost ?? Infinity) - a.minCost;
    const spanB = (b.maxCost ?? Infinity) - b.minCost;
    return spanA - spanB;
  });
  return candidates[0];
}

export type PricedLine = {
  price: number;
  band: MarkupBand;
} | null;

export type InventoryItemForPricing = {
  category: Category;
  cost: number;
  glassesPerBottle: number | null;
  overrideBottlePrice: number | null;
  overrideGlassPrice: number | null;
};

export type PricingResult = {
  /** Suggested price per bottle (or per each/can for beer & non-alc), from bands. */
  suggestedBottlePrice: PricedLine;
  /** Suggested price per glass/pour, only computed for items sold by the glass. */
  suggestedGlassPrice: PricedLine;
  /** Final bottle price shown on the menu — override wins over engine output. */
  finalBottlePrice: number | null;
  /** Final glass price shown on the menu — override wins over engine output. */
  finalGlassPrice: number | null;
};

/** Categories physically purchased & sold by the bottle (may *also* be poured by the glass). */
const BOTTLE_SOLD: Category[] = ["WINE", "SPIRITS"];
/** Categories with no bottle concept — priced as a single unit (a can, a beer, a mixed cocktail). */
const EACH_SOLD: Category[] = ["BEER", "NON_ALCOHOLIC", "OTHER"];

/**
 * Compute suggested bottle/glass prices for one inventory item against a
 * club's configured markup bands, then fold in any manual override.
 *
 * - WINE / SPIRITS: priced by the bottle (against full cost) and, when
 *   `glassesPerBottle` is set, also by the glass/pour (against cost per
 *   glass).
 * - BEER / NON_ALCOHOLIC / OTHER: priced as a single unit — the result
 *   lands in `finalBottlePrice` since there's only one price to show.
 * - COCKTAIL: no bottle concept; priced by the glass directly off the
 *   recipe/pour cost.
 */
export function priceInventoryItem(
  item: InventoryItemForPricing,
  bands: MarkupBand[],
): PricingResult {
  let suggestedBottlePrice: PricedLine = null;
  let suggestedGlassPrice: PricedLine = null;

  if (BOTTLE_SOLD.includes(item.category)) {
    const bottleBand = matchBand(bands, item.category, "BOTTLE", item.cost);
    suggestedBottlePrice = bottleBand
      ? { price: applyRounding(applyMarkup(item.cost, bottleBand), bottleBand.rounding), band: bottleBand }
      : null;

    if (item.glassesPerBottle && item.glassesPerBottle > 0) {
      const costPerGlass = item.cost / item.glassesPerBottle;
      const glassBand = matchBand(bands, item.category, "GLASS", costPerGlass);
      if (glassBand) {
        suggestedGlassPrice = {
          price: applyRounding(applyMarkup(costPerGlass, glassBand), glassBand.rounding),
          band: glassBand,
        };
      }
    }
  } else if (EACH_SOLD.includes(item.category)) {
    const eachBand = matchBand(bands, item.category, "EACH", item.cost);
    suggestedBottlePrice = eachBand
      ? { price: applyRounding(applyMarkup(item.cost, eachBand), eachBand.rounding), band: eachBand }
      : null;
  } else if (item.category === "COCKTAIL") {
    const glassBand = matchBand(bands, item.category, "GLASS", item.cost);
    suggestedGlassPrice = glassBand
      ? { price: applyRounding(applyMarkup(item.cost, glassBand), glassBand.rounding), band: glassBand }
      : null;
  }

  return {
    suggestedBottlePrice,
    suggestedGlassPrice,
    finalBottlePrice: item.overrideBottlePrice ?? suggestedBottlePrice?.price ?? null,
    finalGlassPrice: item.overrideGlassPrice ?? suggestedGlassPrice?.price ?? null,
  };
}
