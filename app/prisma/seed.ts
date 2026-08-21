import { prisma } from "../src/lib/prisma";
import { priceInventoryItem } from "../src/lib/pricing";
import type { Category, MarkupType, RoundingRule, UnitType } from "../src/generated/prisma/client";

// Deterministic PRNG so re-seeding produces the same demo numbers.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);
function randomInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

type BandSeed = {
  label: string;
  category: Category;
  unitType: UnitType;
  minCost: number;
  maxCost: number | null;
  markupType: MarkupType;
  markupValue: number;
  rounding: RoundingRule;
};

const BANDS: BandSeed[] = [
  // Wine — by the bottle
  { label: "Wine bottle $0–15", category: "WINE", unitType: "BOTTLE", minCost: 0, maxCost: 15, markupType: "MULTIPLIER", markupValue: 3.0, rounding: "CHARM_95" },
  { label: "Wine bottle $15–30", category: "WINE", unitType: "BOTTLE", minCost: 15, maxCost: 30, markupType: "MULTIPLIER", markupValue: 2.6, rounding: "CHARM_95" },
  { label: "Wine bottle $30–60", category: "WINE", unitType: "BOTTLE", minCost: 30, maxCost: 60, markupType: "MULTIPLIER", markupValue: 2.3, rounding: "NEAREST_1" },
  { label: "Wine bottle $60–120", category: "WINE", unitType: "BOTTLE", minCost: 60, maxCost: 120, markupType: "MULTIPLIER", markupValue: 2.0, rounding: "NEAREST_1" },
  { label: "Wine bottle $120+", category: "WINE", unitType: "BOTTLE", minCost: 120, maxCost: null, markupType: "MULTIPLIER", markupValue: 1.8, rounding: "NEAREST_1" },
  // Wine — by the glass (cost per glass)
  { label: "Wine glass $0–4", category: "WINE", unitType: "GLASS", minCost: 0, maxCost: 4, markupType: "MULTIPLIER", markupValue: 4.5, rounding: "CHARM_95" },
  { label: "Wine glass $4–8", category: "WINE", unitType: "GLASS", minCost: 4, maxCost: 8, markupType: "MULTIPLIER", markupValue: 4.0, rounding: "CHARM_95" },
  { label: "Wine glass $8+", category: "WINE", unitType: "GLASS", minCost: 8, maxCost: null, markupType: "MULTIPLIER", markupValue: 3.5, rounding: "CHARM_95" },
  // Spirits — by the bottle
  { label: "Spirits bottle $0–15", category: "SPIRITS", unitType: "BOTTLE", minCost: 0, maxCost: 15, markupType: "MULTIPLIER", markupValue: 2.6, rounding: "NEAREST_1" },
  { label: "Spirits bottle $15–30", category: "SPIRITS", unitType: "BOTTLE", minCost: 15, maxCost: 30, markupType: "MULTIPLIER", markupValue: 2.2, rounding: "NEAREST_1" },
  { label: "Spirits bottle $30+", category: "SPIRITS", unitType: "BOTTLE", minCost: 30, maxCost: null, markupType: "MULTIPLIER", markupValue: 1.9, rounding: "NEAREST_1" },
  // Spirits — by the pour (cost per 1.5oz pour)
  { label: "Spirits pour $0–1.50", category: "SPIRITS", unitType: "GLASS", minCost: 0, maxCost: 1.5, markupType: "MULTIPLIER", markupValue: 5.5, rounding: "CHARM_95" },
  { label: "Spirits pour $1.50–3", category: "SPIRITS", unitType: "GLASS", minCost: 1.5, maxCost: 3, markupType: "MULTIPLIER", markupValue: 5.0, rounding: "CHARM_95" },
  { label: "Spirits pour $3+", category: "SPIRITS", unitType: "GLASS", minCost: 3, maxCost: null, markupType: "MULTIPLIER", markupValue: 4.2, rounding: "CHARM_95" },
  // Beer — per bottle/can
  { label: "Beer $0–2", category: "BEER", unitType: "EACH", minCost: 0, maxCost: 2, markupType: "MULTIPLIER", markupValue: 3.2, rounding: "CHARM_95" },
  { label: "Beer $2+", category: "BEER", unitType: "EACH", minCost: 2, maxCost: null, markupType: "MULTIPLIER", markupValue: 2.6, rounding: "CHARM_95" },
  // Non-alcoholic
  { label: "N/A $0–2", category: "NON_ALCOHOLIC", unitType: "EACH", minCost: 0, maxCost: 2, markupType: "MULTIPLIER", markupValue: 3.0, rounding: "CHARM_95" },
  { label: "N/A $2+", category: "NON_ALCOHOLIC", unitType: "EACH", minCost: 2, maxCost: null, markupType: "MULTIPLIER", markupValue: 2.5, rounding: "CHARM_95" },
  // Cocktails — priced off recipe/pour cost
  { label: "Cocktail (all costs)", category: "COCKTAIL", unitType: "GLASS", minCost: 0, maxCost: null, markupType: "MARGIN_PERCENT", markupValue: 78, rounding: "CHARM_95" },
];

type ItemSeed = {
  name: string;
  category: Category;
  subcategory?: string;
  supplier?: string;
  cost: number;
  glassesPerBottle?: number;
  bottleSizeMl?: number;
  isFeatured?: boolean;
};

const WINE_GLASSES = 5;
const SPIRIT_POURS = 16;

const ITEMS: ItemSeed[] = [
  { name: "House Chardonnay", category: "WINE", subcategory: "Chardonnay", supplier: "Southern Wine & Spirits", cost: 8.5, glassesPerBottle: WINE_GLASSES },
  { name: "House Cabernet Sauvignon", category: "WINE", subcategory: "Cabernet Sauvignon", supplier: "Southern Wine & Spirits", cost: 9.0, glassesPerBottle: WINE_GLASSES },
  { name: "Kim Crawford Sauvignon Blanc", category: "WINE", subcategory: "Sauvignon Blanc", cost: 11.0, glassesPerBottle: WINE_GLASSES },
  { name: "Santa Margherita Pinot Grigio", category: "WINE", subcategory: "Pinot Grigio", cost: 18.0, glassesPerBottle: WINE_GLASSES },
  { name: "Rombauer Chardonnay", category: "WINE", subcategory: "Chardonnay", cost: 32.0, glassesPerBottle: WINE_GLASSES, isFeatured: true },
  { name: "Meiomi Pinot Noir", category: "WINE", subcategory: "Pinot Noir", cost: 14.0, glassesPerBottle: WINE_GLASSES },
  { name: "Josh Cellars Cabernet", category: "WINE", subcategory: "Cabernet Sauvignon", cost: 12.5, glassesPerBottle: WINE_GLASSES },
  { name: "Caymus Cabernet Sauvignon", category: "WINE", subcategory: "Cabernet Sauvignon", cost: 58.0, glassesPerBottle: WINE_GLASSES, isFeatured: true },
  { name: "Catena Malbec", category: "WINE", subcategory: "Malbec", cost: 16.0, glassesPerBottle: WINE_GLASSES },
  { name: "Whispering Angel Rosé", category: "WINE", subcategory: "Rosé", cost: 22.0, glassesPerBottle: WINE_GLASSES, isFeatured: true },
  { name: "Veuve Clicquot Brut", category: "WINE", subcategory: "Champagne", cost: 48.0, glassesPerBottle: WINE_GLASSES },
  { name: "Dom Pérignon", category: "WINE", subcategory: "Champagne", cost: 175.0, glassesPerBottle: WINE_GLASSES, isFeatured: true },
  { name: "La Marca Prosecco", category: "WINE", subcategory: "Prosecco", cost: 10.5, glassesPerBottle: WINE_GLASSES },
  { name: "Cloudy Bay Sauvignon Blanc", category: "WINE", subcategory: "Sauvignon Blanc", cost: 27.0, glassesPerBottle: WINE_GLASSES },
  { name: "Silver Oak Cabernet (Alexander Valley)", category: "WINE", subcategory: "Cabernet Sauvignon", cost: 65.0, glassesPerBottle: WINE_GLASSES },
  { name: "La Crema Pinot Noir", category: "WINE", subcategory: "Pinot Noir", cost: 17.0, glassesPerBottle: WINE_GLASSES },
  { name: "Cakebread Chardonnay", category: "WINE", subcategory: "Chardonnay", cost: 38.0, glassesPerBottle: WINE_GLASSES },
  { name: "Ravenswood Old Vine Zinfandel", category: "WINE", subcategory: "Zinfandel", cost: 10.0, glassesPerBottle: WINE_GLASSES },
  { name: "The Prisoner Red Blend", category: "WINE", subcategory: "Red Blend", cost: 42.0, glassesPerBottle: WINE_GLASSES },
  { name: "Chateau Ste. Michelle Riesling", category: "WINE", subcategory: "Riesling", cost: 9.5, glassesPerBottle: WINE_GLASSES },

  { name: "Tito's Handmade Vodka", category: "SPIRITS", subcategory: "Vodka", cost: 16.0, glassesPerBottle: SPIRIT_POURS },
  { name: "Grey Goose Vodka", category: "SPIRITS", subcategory: "Vodka", cost: 28.0, glassesPerBottle: SPIRIT_POURS },
  { name: "Tanqueray Gin", category: "SPIRITS", subcategory: "Gin", cost: 18.0, glassesPerBottle: SPIRIT_POURS },
  { name: "Hendrick's Gin", category: "SPIRITS", subcategory: "Gin", cost: 26.0, glassesPerBottle: SPIRIT_POURS },
  { name: "Buffalo Trace Bourbon", category: "SPIRITS", subcategory: "Bourbon", cost: 19.0, glassesPerBottle: SPIRIT_POURS },
  { name: "Woodford Reserve Bourbon", category: "SPIRITS", subcategory: "Bourbon", cost: 27.0, glassesPerBottle: SPIRIT_POURS },
  { name: "Macallan 12 Double Cask", category: "SPIRITS", subcategory: "Scotch", cost: 45.0, glassesPerBottle: SPIRIT_POURS, isFeatured: true },
  { name: "Johnnie Walker Black Label", category: "SPIRITS", subcategory: "Scotch", cost: 24.0, glassesPerBottle: SPIRIT_POURS },
  { name: "Patrón Silver Tequila", category: "SPIRITS", subcategory: "Tequila", cost: 32.0, glassesPerBottle: SPIRIT_POURS },
  { name: "Casamigos Blanco Tequila", category: "SPIRITS", subcategory: "Tequila", cost: 30.0, glassesPerBottle: SPIRIT_POURS },
  { name: "Bacardi Superior Rum", category: "SPIRITS", subcategory: "Rum", cost: 14.0, glassesPerBottle: SPIRIT_POURS },
  { name: "Mount Gay Rum", category: "SPIRITS", subcategory: "Rum", cost: 19.0, glassesPerBottle: SPIRIT_POURS },
  { name: "Bulleit Rye", category: "SPIRITS", subcategory: "Rye Whiskey", cost: 20.0, glassesPerBottle: SPIRIT_POURS },
  { name: "Hennessy VS Cognac", category: "SPIRITS", subcategory: "Cognac", cost: 30.0, glassesPerBottle: SPIRIT_POURS },
  { name: "Jameson Irish Whiskey", category: "SPIRITS", subcategory: "Irish Whiskey", cost: 18.0, glassesPerBottle: SPIRIT_POURS },

  { name: "Bud Light", category: "BEER", subcategory: "Domestic", cost: 1.2, bottleSizeMl: 355 },
  { name: "Local Craft IPA", category: "BEER", subcategory: "Craft", cost: 2.5, bottleSizeMl: 355 },
  { name: "Corona Extra", category: "BEER", subcategory: "Import", cost: 1.8, bottleSizeMl: 355 },
  { name: "Stella Artois", category: "BEER", subcategory: "Import", cost: 2.0, bottleSizeMl: 355 },
  { name: "Michelob Ultra", category: "BEER", subcategory: "Domestic", cost: 1.4, bottleSizeMl: 355 },
  { name: "Local Craft Lager", category: "BEER", subcategory: "Craft", cost: 2.3, bottleSizeMl: 355 },

  { name: "San Pellegrino Sparkling Water", category: "NON_ALCOHOLIC", cost: 1.5 },
  { name: "Fever-Tree Tonic Water", category: "NON_ALCOHOLIC", cost: 1.6 },
  { name: "Coca-Cola", category: "NON_ALCOHOLIC", cost: 0.6 },
  { name: "Fresh Squeezed Lemonade", category: "NON_ALCOHOLIC", cost: 1.0 },

  { name: "Classic Martini", category: "COCKTAIL", cost: 2.8, isFeatured: true },
  { name: "Old Fashioned", category: "COCKTAIL", cost: 3.2, isFeatured: true },
  { name: "Margarita", category: "COCKTAIL", cost: 2.5 },
  { name: "Mojito", category: "COCKTAIL", cost: 2.2 },
  { name: "Club Bloody Mary", category: "COCKTAIL", cost: 2.6 },
];

async function main() {
  const existing = await prisma.club.findUnique({ where: { slug: "naples-bay-golf-club" } });
  if (existing) {
    console.log(`Demo club already exists (${existing.id}). Skipping seed — delete it first to reseed.`);
    return;
  }

  const club = await prisma.club.create({
    data: {
      slug: "naples-bay-golf-club",
      name: "Naples Bay Golf & Country Club",
      city: "Naples",
      state: "FL",
      branding: {
        create: {
          primaryColor: "#123524",
          secondaryColor: "#c9a24b",
          backgroundColor: "#faf7ee",
          fontFamily: "'Playfair Display', Georgia, serif",
          headerText: "Wine & Beverage List",
          footerText: "Prices include applicable service charge. Please ask your server about today's features.",
        },
      },
    },
  });

  await prisma.markupBand.createMany({
    data: BANDS.map((b) => ({ ...b, clubId: club.id })),
  });
  const bands = await prisma.markupBand.findMany({ where: { clubId: club.id } });

  const createdItems = [];
  for (const [i, item] of ITEMS.entries()) {
    const priced = priceInventoryItem(
      { category: item.category, cost: item.cost, glassesPerBottle: item.glassesPerBottle ?? null, overrideBottlePrice: null, overrideGlassPrice: null },
      bands,
    );
    const created = await prisma.inventoryItem.create({
      data: {
        clubId: club.id,
        name: item.name,
        category: item.category,
        subcategory: item.subcategory,
        supplier: item.supplier,
        cost: item.cost,
        unitType: item.category === "WINE" || item.category === "SPIRITS" ? "BOTTLE" : "EACH",
        bottleSizeMl: item.bottleSizeMl ?? (item.category === "WINE" || item.category === "SPIRITS" ? 750 : null),
        glassesPerBottle: item.glassesPerBottle ?? null,
        isFeatured: item.isFeatured ?? false,
        sortOrder: i,
      },
    });
    createdItems.push({ item: created, priced });
  }

  // Three months of sales history, most recent month = current month.
  const now = new Date();
  const months = [2, 1, 0].map((offset) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1)));

  for (const month of months) {
    for (const { item, priced } of createdItems) {
      if (priced.finalBottlePrice !== null) {
        const isEach = item.category === "BEER" || item.category === "NON_ALCOHOLIC" || item.category === "OTHER";
        const qty = isEach ? randomInt(40, 220) : randomInt(4, 30);
        await prisma.salesRecord.create({
          data: {
            clubId: club.id,
            itemId: item.id,
            itemNameSnapshot: item.name,
            category: item.category,
            month,
            quantitySold: qty,
            unitType: isEach ? "EACH" : "BOTTLE",
            revenuePerUnit: priced.finalBottlePrice,
            costPerUnit: item.cost,
          },
        });
      }
      if (priced.finalGlassPrice !== null) {
        const costPerGlass = item.category === "COCKTAIL" ? item.cost : item.cost / (item.glassesPerBottle ?? 1);
        const qty = randomInt(20, 160);
        await prisma.salesRecord.create({
          data: {
            clubId: club.id,
            itemId: item.id,
            itemNameSnapshot: item.name,
            category: item.category,
            month,
            quantitySold: qty,
            unitType: "GLASS",
            revenuePerUnit: priced.finalGlassPrice,
            costPerUnit: costPerGlass,
          },
        });
      }
    }
  }

  console.log(`Seeded club "${club.name}" (${club.slug}) with ${createdItems.length} inventory items and ${BANDS.length} markup bands.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
