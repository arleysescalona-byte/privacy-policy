import { getClubOrNotFound, getMarkupBands } from "@/lib/queries";
import { MarkupBandManager } from "@/components/MarkupBandManager";

export default async function PricingPage({ params }: { params: Promise<{ clubSlug: string }> }) {
  const { clubSlug } = await params;
  const club = await getClubOrNotFound(clubSlug);
  const bands = await getMarkupBands(club.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-semibold text-stone-900">Markup bands</h1>
        <p className="mt-1 text-sm text-stone-600 max-w-2xl">
          Prices are never typed in by hand. Each inventory item is matched against the band whose category, priced unit, and
          cost range fit it, and the price is computed automatically. Add a tighter band with a higher priority to override a
          broad default for a specific range.
        </p>
      </div>
      <MarkupBandManager clubId={club.id} clubSlug={club.slug} bands={bands} />
    </div>
  );
}
