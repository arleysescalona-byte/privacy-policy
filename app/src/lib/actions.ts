"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { Category, MarkupType, RoundingRule, UnitType } from "@/generated/prisma/client";
import type { NewInventoryRow, NewSalesRow } from "@/lib/import-types";
import { guessUnitType } from "@/lib/import-parsing";

export type ActionResult = { ok: true } | { ok: false; error: string };

function fail(error: string): ActionResult {
  return { ok: false, error };
}

// ---------------------------------------------------------------------------
// Clubs
// ---------------------------------------------------------------------------

const createClubSchema = z.object({
  name: z.string().min(2).max(120),
  city: z.string().max(120).optional(),
  state: z.string().max(60).optional(),
});

export async function createClub(formData: FormData): Promise<void> {
  const parsed = createClubSchema.safeParse({
    name: formData.get("name"),
    city: formData.get("city") || undefined,
    state: formData.get("state") || undefined,
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid club details.");

  const base = slugify(parsed.data.name) || "club";
  let slug = base;
  let suffix = 1;
  while (await prisma.club.findUnique({ where: { slug } })) {
    suffix += 1;
    slug = `${base}-${suffix}`;
  }

  const club = await prisma.club.create({
    data: {
      slug,
      name: parsed.data.name,
      city: parsed.data.city,
      state: parsed.data.state,
      branding: { create: {} },
    },
  });

  revalidatePath("/app");
  redirect(`/app/${club.slug}`);
}

const brandingSchema = z.object({
  logoDataUrl: z.string().max(2_000_000).optional().nullable(),
  primaryColor: z.string().min(1).max(30),
  secondaryColor: z.string().min(1).max(30),
  backgroundColor: z.string().min(1).max(30),
  fontFamily: z.string().min(1).max(200),
  headerText: z.string().max(200),
  footerText: z.string().max(500),
});

export async function updateBranding(clubId: string, clubSlug: string, formData: FormData): Promise<ActionResult> {
  const logo = formData.get("logoDataUrl");
  const parsed = brandingSchema.safeParse({
    logoDataUrl: typeof logo === "string" && logo.length > 0 ? logo : undefined,
    primaryColor: formData.get("primaryColor"),
    secondaryColor: formData.get("secondaryColor"),
    backgroundColor: formData.get("backgroundColor"),
    fontFamily: formData.get("fontFamily"),
    headerText: formData.get("headerText"),
    footerText: formData.get("footerText"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid branding.");

  await prisma.menuBranding.upsert({
    where: { clubId },
    create: { clubId, ...parsed.data },
    update: parsed.data,
  });
  revalidatePath(`/app/${clubSlug}/menu`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Markup bands
// ---------------------------------------------------------------------------

const markupBandSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1).max(120),
  category: z.enum(Category),
  unitType: z.enum(UnitType),
  minCost: z.coerce.number().min(0),
  maxCost: z.coerce.number().min(0).optional(),
  markupType: z.enum(MarkupType),
  markupValue: z.coerce.number(),
  rounding: z.enum(RoundingRule),
  priority: z.coerce.number().int().optional(),
});

export async function upsertMarkupBand(clubId: string, clubSlug: string, formData: FormData): Promise<ActionResult> {
  const raw = {
    id: formData.get("id") || undefined,
    label: formData.get("label"),
    category: formData.get("category"),
    unitType: formData.get("unitType"),
    minCost: formData.get("minCost"),
    maxCost: formData.get("maxCost") || undefined,
    markupType: formData.get("markupType"),
    markupValue: formData.get("markupValue"),
    rounding: formData.get("rounding"),
    priority: formData.get("priority") || undefined,
  };
  const parsed = markupBandSchema.safeParse(raw);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid markup band.");
  if (parsed.data.maxCost !== undefined && parsed.data.maxCost <= parsed.data.minCost) {
    return fail("Max cost must be greater than min cost.");
  }

  const { id, ...data } = parsed.data;
  const payload = {
    label: data.label,
    category: data.category,
    unitType: data.unitType,
    minCost: data.minCost,
    maxCost: data.maxCost ?? null,
    markupType: data.markupType,
    markupValue: data.markupValue,
    rounding: data.rounding,
    priority: data.priority ?? 0,
  };

  if (id) {
    const existing = await prisma.markupBand.findUnique({ where: { id } });
    if (!existing || existing.clubId !== clubId) return fail("Markup band not found.");
    await prisma.markupBand.update({ where: { id }, data: payload });
  } else {
    await prisma.markupBand.create({ data: { ...payload, clubId } });
  }

  revalidatePath(`/app/${clubSlug}/pricing`);
  revalidatePath(`/app/${clubSlug}/inventory`);
  revalidatePath(`/app/${clubSlug}/menu`);
  return { ok: true };
}

export async function deleteMarkupBand(clubId: string, clubSlug: string, id: string): Promise<ActionResult> {
  const existing = await prisma.markupBand.findUnique({ where: { id } });
  if (!existing || existing.clubId !== clubId) return fail("Markup band not found.");
  await prisma.markupBand.delete({ where: { id } });
  revalidatePath(`/app/${clubSlug}/pricing`);
  revalidatePath(`/app/${clubSlug}/inventory`);
  revalidatePath(`/app/${clubSlug}/menu`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Inventory items
// ---------------------------------------------------------------------------

const itemOverrideSchema = z.object({
  overrideBottlePrice: z.coerce.number().min(0).optional(),
  overrideGlassPrice: z.coerce.number().min(0).optional(),
  menuDescription: z.string().max(500).optional(),
  isFeatured: z.coerce.boolean().optional(),
  isActive: z.coerce.boolean().optional(),
  cost: z.coerce.number().min(0).optional(),
});

export async function updateInventoryItem(clubId: string, clubSlug: string, itemId: string, formData: FormData): Promise<ActionResult> {
  const existing = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
  if (!existing || existing.clubId !== clubId) return fail("Item not found.");

  const clearBottle = formData.get("clearBottleOverride") === "on";
  const clearGlass = formData.get("clearGlassOverride") === "on";

  const parsed = itemOverrideSchema.safeParse({
    overrideBottlePrice: clearBottle ? undefined : formData.get("overrideBottlePrice") || undefined,
    overrideGlassPrice: clearGlass ? undefined : formData.get("overrideGlassPrice") || undefined,
    menuDescription: formData.get("menuDescription") || undefined,
    isFeatured: formData.get("isFeatured") === "on",
    isActive: formData.get("isActive") === "on",
    cost: formData.get("cost") || undefined,
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid item.");

  await prisma.inventoryItem.update({
    where: { id: itemId },
    data: {
      overrideBottlePrice: clearBottle ? null : (parsed.data.overrideBottlePrice ?? existing.overrideBottlePrice),
      overrideGlassPrice: clearGlass ? null : (parsed.data.overrideGlassPrice ?? existing.overrideGlassPrice),
      menuDescription: parsed.data.menuDescription ?? existing.menuDescription,
      isFeatured: parsed.data.isFeatured ?? false,
      isActive: parsed.data.isActive ?? false,
      cost: parsed.data.cost ?? existing.cost,
    },
  });

  revalidatePath(`/app/${clubSlug}/inventory`);
  revalidatePath(`/app/${clubSlug}/menu`);
  return { ok: true };
}

export async function deleteInventoryItem(clubId: string, clubSlug: string, itemId: string): Promise<ActionResult> {
  const existing = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
  if (!existing || existing.clubId !== clubId) return fail("Item not found.");
  await prisma.inventoryItem.delete({ where: { id: itemId } });
  revalidatePath(`/app/${clubSlug}/inventory`);
  revalidatePath(`/app/${clubSlug}/menu`);
  return { ok: true };
}

export async function commitInventoryImport(
  clubId: string,
  clubSlug: string,
  filename: string,
  rows: NewInventoryRow[],
): Promise<ActionResult & { count?: number }> {
  if (rows.length === 0) return fail("No valid rows to import.");
  if (rows.length > 5000) return fail("Too many rows in one import (max 5000).");

  const club = await prisma.club.findUnique({ where: { id: clubId } });
  if (!club) return fail("Club not found.");

  await prisma.$transaction(async (tx) => {
    const batch = await tx.importBatch.create({
      data: { clubId, type: "INVENTORY", filename: filename.slice(0, 200), rowCount: rows.length },
    });
    let sortOrder = await tx.inventoryItem.count({ where: { clubId } });
    for (const row of rows) {
      await tx.inventoryItem.create({
        data: {
          clubId,
          importBatchId: batch.id,
          name: row.name.slice(0, 200),
          category: row.category,
          subcategory: row.subcategory,
          supplier: row.supplier,
          sku: row.sku,
          cost: row.cost,
          unitType: row.unitType,
          bottleSizeMl: row.bottleSizeMl,
          glassesPerBottle: row.glassesPerBottle,
          sortOrder: sortOrder++,
        },
      });
    }
  });

  revalidatePath(`/app/${clubSlug}/inventory`);
  revalidatePath(`/app/${clubSlug}/menu`);
  return { ok: true, count: rows.length };
}

// ---------------------------------------------------------------------------
// Sales import (monthly F&B financials)
// ---------------------------------------------------------------------------

export async function commitSalesImport(
  clubId: string,
  clubSlug: string,
  filename: string,
  monthKey: string,
  rows: NewSalesRow[],
): Promise<ActionResult & { matched?: number; unmatched?: string[] }> {
  if (rows.length === 0) return fail("No valid rows to import.");
  if (rows.length > 20000) return fail("Too many rows in one import (max 20000).");

  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!match) return fail("Invalid reporting month.");
  const month = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));

  const items = await prisma.inventoryItem.findMany({ where: { clubId } });
  const byName = new Map(items.map((i) => [i.name.trim().toLowerCase(), i]));
  const bands = await prisma.markupBand.findMany({ where: { clubId } });

  const { priceInventoryItem } = await import("@/lib/pricing");

  const unmatched: string[] = [];
  const toCreate: {
    itemId: string;
    itemNameSnapshot: string;
    category: Category;
    unitType: UnitType;
    quantitySold: number;
    revenuePerUnit: number;
    costPerUnit: number;
  }[] = [];

  for (const row of rows) {
    const item = byName.get(row.itemName.trim().toLowerCase());
    if (!item) {
      unmatched.push(row.itemName);
      continue;
    }
    const unitType: UnitType =
      guessUnitType(row.unitTypeHint ?? undefined) ?? (item.category === "WINE" || item.category === "SPIRITS" ? "BOTTLE" : item.category === "COCKTAIL" ? "GLASS" : "EACH");

    const priced = priceInventoryItem(item, bands);
    const isGlass = unitType === "GLASS";
    const suggestedPrice = isGlass ? priced.finalGlassPrice : priced.finalBottlePrice;
    const revenuePerUnit = row.revenueOverride ?? suggestedPrice ?? item.cost;
    const costPerUnit = isGlass ? item.cost / (item.glassesPerBottle ?? 1) : item.cost;

    toCreate.push({
      itemId: item.id,
      itemNameSnapshot: item.name,
      category: item.category,
      unitType,
      quantitySold: Math.max(0, Math.round(row.quantitySold)),
      revenuePerUnit,
      costPerUnit,
    });
  }

  if (toCreate.length === 0) return fail("None of the rows matched an existing inventory item name.");

  await prisma.$transaction(async (tx) => {
    await tx.importBatch.create({
      data: { clubId, type: "SALES", filename: filename.slice(0, 200), rowCount: rows.length },
    });
    for (const row of toCreate) {
      await tx.salesRecord.create({
        data: {
          clubId,
          month,
          itemId: row.itemId,
          itemNameSnapshot: row.itemNameSnapshot,
          category: row.category,
          unitType: row.unitType,
          quantitySold: row.quantitySold,
          revenuePerUnit: row.revenuePerUnit,
          costPerUnit: row.costPerUnit,
        },
      });
    }
  });

  revalidatePath(`/app/${clubSlug}/financials`);
  return { ok: true, matched: toCreate.length, unmatched: Array.from(new Set(unmatched)).slice(0, 50) };
}
