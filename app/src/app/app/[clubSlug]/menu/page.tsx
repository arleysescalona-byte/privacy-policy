import { getClubOrNotFound, getInventoryItems } from "@/lib/queries";
import { MenuBuilder } from "@/components/MenuBuilder";

export default async function MenuPage({ params }: { params: Promise<{ clubSlug: string }> }) {
  const { clubSlug } = await params;
  const club = await getClubOrNotFound(clubSlug);
  const items = await getInventoryItems(club.id);
  const branding = club.branding ?? {
    id: "",
    clubId: club.id,
    logoDataUrl: null,
    primaryColor: "#1a3c5e",
    secondaryColor: "#c5a253",
    backgroundColor: "#faf8f3",
    fontFamily: "'Playfair Display', Georgia, serif",
    headerText: "Wine & Beverage List",
    footerText: "",
    updatedAt: new Date(),
  };

  return (
    <div className="space-y-6">
      <div className="no-print">
        <h1 className="text-2xl font-serif font-semibold text-stone-900">Menu builder</h1>
        <p className="mt-1 text-sm text-stone-600 max-w-2xl">
          The preview below regenerates automatically from your current inventory, pricing, and branding. Mark an item
          &quot;Featured&quot; or hide it from the inventory page — the menu updates on its own.
        </p>
      </div>
      <MenuBuilder clubId={club.id} clubSlug={club.slug} clubName={club.name} branding={branding} items={items} />
    </div>
  );
}
