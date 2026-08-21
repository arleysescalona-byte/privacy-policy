# Vintly — Beverage Costing & Wine Pricing for Private Clubs

A SaaS MVP that replaces the manual Excel workflow private clubs use for beverage
pricing: upload an inventory/cost export, configure markup by category and cost
range, get suggested bottle/glass prices automatically, generate a branded
printed menu, and review monthly F&B financial performance — all from the same
data.

**The problem:** inventory systems (Scannabar, POS) don't talk to club
management systems (Jonas, Northstar), or to each other. Clubs end up
exporting everything to Excel and pricing, building menus, and closing the
month by hand. This app is that workflow, built as software instead of a
spreadsheet.

## Stack

- **Next.js 16** (App Router, Turbopack, Server Actions) + TypeScript + Tailwind v4
- **Prisma 7** + SQLite (via the `better-sqlite3` driver adapter) — file-based,
  zero external services, easy to swap for Postgres later
- **xlsx** / **papaparse** for client-side spreadsheet parsing
- **recharts** for the financial dashboard

No auth, billing, or multi-tenant access control is included — see
[Not in scope](#not-in-scope-for-this-mvp) below. Every club (`Club` row) is
fully data-isolated in the schema; only the login layer is missing.

## Getting started

```bash
npm install
npm run db:migrate   # applies the Prisma schema to prisma/dev.db
npm run db:seed       # creates a demo club ("Naples Bay Golf & Country Club")
                       # with 50 inventory items, 19 markup bands, and 3
                       # months of sales history
npm run dev
```

Open `http://localhost:3000` for the marketing page, or jump straight to
`http://localhost:3000/app/naples-bay-golf-club` for the seeded demo club.

Other scripts: `npm run build`, `npm run lint`, `npm run db:studio` (Prisma's
data browser).

## How pricing works

Nothing is priced by hand. Each `InventoryItem` has a `cost` and a `category`.
Each `MarkupBand` says "for category X, priced as a bottle/glass/each, with
cost between $min and $max, apply this markup, then round this way." The
engine (`src/lib/pricing.ts`) matches an item to the best-fitting band —
ties broken by an explicit `priority` field, then by the narrowest range —
and computes the suggested price. A per-item `overrideBottlePrice` /
`overrideGlassPrice` always wins over the computed suggestion, for the rare
item that needs a hand-set price.

- **Wine / Spirits** are priced by the bottle (against full cost) and, when
  `glassesPerBottle` is set, also by the glass/pour (against cost ÷
  glasses-per-bottle).
- **Beer / Non-alcoholic / Other** are priced as a single unit.
- **Cocktails** have no bottle concept — priced directly off the recipe/pour
  cost.

Markup types supported: multiplier (`cost × X`), markup % (`cost × (1 + X%)`),
and target margin % (solves for the price that yields that gross margin).
Rounding rules include plain nearest-$0.25/$0.50/$1 and "charm" pricing
(rounds up to `.95` or `.99`).

## Data model

See `prisma/schema.prisma`. Everything hangs off `Club` (the tenant):
`MarkupBand`, `InventoryItem`, `MenuBranding`, `SalesRecord`, and
`ImportBatch` (an audit trail of what was uploaded and when).

`SalesRecord` snapshots `revenuePerUnit` and `costPerUnit` at import time, so
editing an item's cost or markup bands later doesn't retroactively change a
prior month's reported margin.

## Importing spreadsheets

Both the inventory importer (`/inventory`) and the monthly sales importer
(`/financials`) work the same way: pick a file, the app parses it **in the
browser** (nothing is uploaded until you confirm the mapping), guesses which
column is which, lets you fix the mapping, previews the result, then commits
via a Server Action. Sales rows are matched to existing inventory items by
name — import inventory before importing a sales export.

**Security note on `xlsx`:** the SheetJS `xlsx` package has known
prototype-pollution/ReDoS advisories with no fixed version published to npm
at the time this was built (SheetJS moved fixed releases to their own CDN,
which wasn't reachable from this build environment). Since this app parses
untrusted uploaded files, `src/lib/import-parsing.ts` defends against it
directly: every parsed row is rebuilt into a fresh `Object.create(null)` map
(dropping `__proto__`/`constructor`/`prototype` keys) before it touches
anything else, and uploads are capped in size and row count. If you deploy
this for real, prefer installing a patched `xlsx` build from SheetJS's own
registry.

## Project structure

```
prisma/schema.prisma        data model
prisma/seed.ts               demo club + data
src/lib/pricing.ts           markup → suggested price engine (pure functions)
src/lib/financials.ts        sales rows → revenue/COGS/margin summaries (pure)
src/lib/import-parsing.ts    CSV/XLSX parsing + column-guessing helpers
src/lib/queries.ts           read-only DB access (server-only)
src/lib/actions.ts           Server Actions — all mutations, with zod validation
src/app/app/[clubSlug]/      the club workspace: overview, inventory, pricing,
                              menu builder, financials
src/components/              client components (import wizards, tables, charts)
```

## Not in scope for this MVP

- **Auth & billing.** There's no login — `/app` lists every club in the
  database. The schema is tenant-scoped and every Server Action checks that
  the record being mutated belongs to the `clubId` passed in, so wiring up
  real auth (NextAuth, Clerk, etc.) and gating each club by session is the
  main remaining step before this is multi-tenant-safe in production.
- **Direct Scannabar/POS/Jonas/Northstar integrations.** The import flow
  intentionally works off whatever export a club can already produce (CSV or
  Excel), rather than building against each vendor's API — that's the
  fastest path to being useful across clubs on different systems, and a
  direct integration can be layered on top of the same `InventoryItem` /
  `SalesRecord` model later.
- **Logo storage.** Logos are stored inline as data URLs on `MenuBranding`
  (capped at 400KB) rather than in object storage — fine for an MVP, worth
  moving to S3/R2/Blob storage before scaling up.
