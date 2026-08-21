-- CreateTable
CREATE TABLE "Club" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MenuBranding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clubId" TEXT NOT NULL,
    "logoDataUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#1a3c5e',
    "secondaryColor" TEXT NOT NULL DEFAULT '#c5a253',
    "backgroundColor" TEXT NOT NULL DEFAULT '#faf8f3',
    "fontFamily" TEXT NOT NULL DEFAULT '''Playfair Display'', Georgia, serif',
    "headerText" TEXT NOT NULL DEFAULT 'Wine & Beverage List',
    "footerText" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MenuBranding_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MarkupBand" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clubId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unitType" TEXT NOT NULL,
    "minCost" REAL NOT NULL,
    "maxCost" REAL,
    "markupType" TEXT NOT NULL,
    "markupValue" REAL NOT NULL,
    "rounding" TEXT NOT NULL DEFAULT 'NEAREST_050',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MarkupBand_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clubId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "supplier" TEXT,
    "sku" TEXT,
    "vintage" TEXT,
    "unitType" TEXT NOT NULL,
    "cost" REAL NOT NULL,
    "bottleSizeMl" INTEGER DEFAULT 750,
    "glassesPerBottle" INTEGER DEFAULT 5,
    "overrideBottlePrice" REAL,
    "overrideGlassPrice" REAL,
    "menuDescription" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "importBatchId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InventoryItem_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InventoryItem_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clubId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImportBatch_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SalesRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clubId" TEXT NOT NULL,
    "itemId" TEXT,
    "itemNameSnapshot" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "month" DATETIME NOT NULL,
    "quantitySold" INTEGER NOT NULL,
    "unitType" TEXT NOT NULL,
    "revenuePerUnit" REAL NOT NULL,
    "costPerUnit" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SalesRecord_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SalesRecord_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Club_slug_key" ON "Club"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "MenuBranding_clubId_key" ON "MenuBranding"("clubId");

-- CreateIndex
CREATE INDEX "MarkupBand_clubId_category_unitType_idx" ON "MarkupBand"("clubId", "category", "unitType");

-- CreateIndex
CREATE INDEX "InventoryItem_clubId_category_idx" ON "InventoryItem"("clubId", "category");

-- CreateIndex
CREATE INDEX "SalesRecord_clubId_month_idx" ON "SalesRecord"("clubId", "month");
