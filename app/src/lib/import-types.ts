import type { Category, UnitType } from "@/generated/prisma/client";

/** One row from a mapped inventory import, ready to insert. */
export type NewInventoryRow = {
  name: string;
  category: Category;
  subcategory: string | null;
  supplier: string | null;
  sku: string | null;
  cost: number;
  unitType: UnitType;
  bottleSizeMl: number | null;
  glassesPerBottle: number | null;
};

/** One row from a mapped monthly sales import, ready to insert. */
export type NewSalesRow = {
  itemName: string;
  quantitySold: number;
  unitTypeHint: "BOTTLE" | "GLASS" | "EACH" | null;
  revenueOverride: number | null;
};

export const INVENTORY_FIELDS: { key: keyof NewInventoryRow | "categoryRaw"; label: string; required: boolean }[] = [
  { key: "name", label: "Item name", required: true },
  { key: "cost", label: "Cost per unit", required: true },
  { key: "categoryRaw", label: "Category (wine/spirits/beer/...)", required: false },
  { key: "subcategory", label: "Subcategory / varietal", required: false },
  { key: "supplier", label: "Supplier", required: false },
  { key: "sku", label: "SKU", required: false },
  { key: "glassesPerBottle", label: "Glasses/pours per bottle", required: false },
];

export const SALES_FIELDS: { key: keyof NewSalesRow; label: string; required: boolean }[] = [
  { key: "itemName", label: "Item name", required: true },
  { key: "quantitySold", label: "Quantity sold", required: true },
  { key: "unitTypeHint", label: "Sold by (bottle/glass/each)", required: false },
  { key: "revenueOverride", label: "Actual sale price (optional)", required: false },
];
