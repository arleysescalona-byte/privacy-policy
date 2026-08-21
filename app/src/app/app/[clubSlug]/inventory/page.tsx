import { getClubOrNotFound, getInventoryItems } from "@/lib/queries";
import { InventoryImportWizard } from "@/components/InventoryImportWizard";
import { InventoryTable } from "@/components/InventoryTable";

export default async function InventoryPage({ params }: { params: Promise<{ clubSlug: string }> }) {
  const { clubSlug } = await params;
  const club = await getClubOrNotFound(clubSlug);
  const items = await getInventoryItems(club.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-semibold text-stone-900">Inventory &amp; pricing</h1>
        <p className="mt-1 text-sm text-stone-600 max-w-2xl">
          Prices below are computed live from each item&apos;s cost and the club&apos;s markup bands. Override a single item when
          it needs a hand-set price.
        </p>
      </div>
      <InventoryImportWizard clubId={club.id} clubSlug={club.slug} />
      <InventoryTable clubId={club.id} clubSlug={club.slug} items={items} />
    </div>
  );
}
