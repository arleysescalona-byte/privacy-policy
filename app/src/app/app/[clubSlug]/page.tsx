import Link from "next/link";
import { getClubOrNotFound, getInventoryItems, getMarkupBands, getAvailableMonths, getSalesForMonth } from "@/lib/queries";
import { summarizeSales } from "@/lib/financials";
import { formatCurrency, formatPercent } from "@/lib/labels";

export default async function ClubOverviewPage({ params }: { params: Promise<{ clubSlug: string }> }) {
  const { clubSlug } = await params;
  const club = await getClubOrNotFound(clubSlug);
  const [items, bands, months] = await Promise.all([
    getInventoryItems(club.id),
    getMarkupBands(club.id),
    getAvailableMonths(club.id),
  ]);

  const latestMonth = months[0] ?? null;
  const latestSales = latestMonth ? await getSalesForMonth(club.id, latestMonth) : [];
  const summary = latestSales.length > 0 ? summarizeSales(latestSales) : null;

  const unpriced = items.filter((i) => i.pricing.finalBottlePrice === null && i.pricing.finalGlassPrice === null);

  const cards = [
    { label: "Inventory items", value: items.length.toString(), href: `/app/${club.slug}/inventory` },
    { label: "Markup bands configured", value: bands.length.toString(), href: `/app/${club.slug}/pricing` },
    {
      label: latestMonth ? `Revenue — ${latestMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}` : "Revenue this month",
      value: summary ? formatCurrency(summary.revenue) : "No sales imported yet",
      href: `/app/${club.slug}/financials`,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-serif font-semibold text-stone-900">{club.name}</h1>
        <p className="mt-1 text-sm text-stone-600">{[club.city, club.state].filter(Boolean).join(", ")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-lg border border-stone-200 bg-white p-5 hover:border-emerald-300 hover:shadow-sm transition"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{card.label}</p>
            <p className="mt-2 text-xl font-semibold text-stone-900">{card.value}</p>
          </Link>
        ))}
      </div>

      {summary && (
        <div className="rounded-lg border border-stone-200 bg-white p-5">
          <p className="text-sm font-medium text-stone-900">Gross margin last reported month</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-800">
            {formatCurrency(summary.margin)} <span className="text-sm font-normal text-stone-500">({formatPercent(summary.marginPct)})</span>
          </p>
        </div>
      )}

      {unpriced.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          {unpriced.length} item{unpriced.length === 1 ? "" : "s"} have no markup band matching their cost, so they show no suggested
          price.{" "}
          <Link href={`/app/${club.slug}/pricing`} className="font-medium underline">
            Review markup bands
          </Link>
          .
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href={`/app/${club.slug}/inventory`} className="rounded-lg border border-stone-200 bg-white p-5 hover:border-emerald-300">
          <p className="font-medium text-stone-900">1. Import inventory</p>
          <p className="mt-1 text-sm text-stone-600">Upload a Scannabar, POS, or Excel cost export.</p>
        </Link>
        <Link href={`/app/${club.slug}/pricing`} className="rounded-lg border border-stone-200 bg-white p-5 hover:border-emerald-300">
          <p className="font-medium text-stone-900">2. Configure markup bands</p>
          <p className="mt-1 text-sm text-stone-600">Set markup by category and cost range — prices recompute automatically.</p>
        </Link>
        <Link href={`/app/${club.slug}/menu`} className="rounded-lg border border-stone-200 bg-white p-5 hover:border-emerald-300">
          <p className="font-medium text-stone-900">3. Generate the printed menu</p>
          <p className="mt-1 text-sm text-stone-600">Apply the club&apos;s branding and print or save as PDF.</p>
        </Link>
        <Link href={`/app/${club.slug}/financials`} className="rounded-lg border border-stone-200 bg-white p-5 hover:border-emerald-300">
          <p className="font-medium text-stone-900">4. Review monthly F&amp;B performance</p>
          <p className="mt-1 text-sm text-stone-600">Import a sales export to see revenue, COGS, and margin by category.</p>
        </Link>
      </div>
    </div>
  );
}
