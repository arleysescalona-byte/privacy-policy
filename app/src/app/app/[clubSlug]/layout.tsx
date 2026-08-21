import Link from "next/link";
import { getClubOrNotFound } from "@/lib/queries";
import { ClubNav } from "@/components/ClubNav";

export default async function ClubLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ clubSlug: string }>;
}) {
  const { clubSlug } = await params;
  const club = await getClubOrNotFound(clubSlug);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="no-print border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <Link href="/" className="font-serif text-lg font-semibold text-stone-900">
                Vintly
              </Link>
              <span className="text-stone-300">/</span>
              <Link href={`/app/${club.slug}`} className="text-sm font-medium text-stone-700 hover:text-stone-900">
                {club.name}
              </Link>
            </div>
            <Link href="/app" className="text-xs text-stone-500 hover:text-stone-800">
              Switch club
            </Link>
          </div>
          <ClubNav clubSlug={club.slug} />
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}
