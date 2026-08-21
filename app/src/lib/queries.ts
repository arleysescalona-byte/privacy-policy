import "server-only";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { priceInventoryItem, type PricingResult } from "@/lib/pricing";
import type { InventoryItem, MarkupBand } from "@/generated/prisma/client";

export async function listClubs() {
  return prisma.club.findMany({ orderBy: { name: "asc" } });
}

export async function getClubBySlug(slug: string) {
  return prisma.club.findUnique({ where: { slug }, include: { branding: true } });
}

export async function getClubOrNotFound(slug: string) {
  const club = await getClubBySlug(slug);
  if (!club) notFound();
  return club;
}

export async function getMarkupBands(clubId: string) {
  return prisma.markupBand.findMany({
    where: { clubId },
    orderBy: [{ category: "asc" }, { unitType: "asc" }, { minCost: "asc" }],
  });
}

export type PricedInventoryItem = InventoryItem & { pricing: PricingResult };

export async function getInventoryItems(clubId: string): Promise<PricedInventoryItem[]> {
  const [items, bands] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: { clubId },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    }),
    getMarkupBands(clubId),
  ]);
  return items.map((item) => ({ ...item, pricing: priceInventoryItem(item, bands) }));
}

export function priceItems(items: InventoryItem[], bands: MarkupBand[]): PricedInventoryItem[] {
  return items.map((item) => ({ ...item, pricing: priceInventoryItem(item, bands) }));
}

export async function getAvailableMonths(clubId: string): Promise<Date[]> {
  const rows = await prisma.salesRecord.findMany({
    where: { clubId },
    distinct: ["month"],
    select: { month: true },
    orderBy: { month: "desc" },
  });
  return rows.map((r) => r.month);
}

export async function getSalesForMonth(clubId: string, month: Date) {
  return prisma.salesRecord.findMany({ where: { clubId, month } });
}

export async function getImportBatches(clubId: string) {
  return prisma.importBatch.findMany({
    where: { clubId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}
