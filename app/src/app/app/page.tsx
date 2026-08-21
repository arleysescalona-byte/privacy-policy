import Link from "next/link";
import { listClubs } from "@/lib/queries";
import { createClub } from "@/lib/actions";

export default async function ClubsPage() {
  const clubs = await listClubs();

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-3xl px-6 h-14 flex items-center">
          <Link href="/" className="font-serif text-lg font-semibold text-stone-900">
            Vintly
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-12 space-y-10">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-stone-900">Your clubs</h1>
          <p className="mt-1 text-sm text-stone-600">Pick a club to manage pricing, menus, and F&amp;B financials.</p>
        </div>

        {clubs.length > 0 && (
          <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200 bg-white">
            {clubs.map((club) => (
              <li key={club.id}>
                <Link href={`/app/${club.slug}`} className="flex items-center justify-between px-5 py-4 hover:bg-stone-50">
                  <div>
                    <p className="font-medium text-stone-900">{club.name}</p>
                    <p className="text-sm text-stone-500">
                      {[club.city, club.state].filter(Boolean).join(", ") || "No location set"}
                    </p>
                  </div>
                  <span aria-hidden className="text-stone-400">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <section className="rounded-lg border border-stone-200 bg-white p-6">
          <h2 className="font-medium text-stone-900">Add a new club</h2>
          <p className="mt-1 text-sm text-stone-600">
            Creates a tenant with empty inventory and default markup bands — you can import a cost export right after.
          </p>
          <form action={createClub} className="mt-4 grid gap-3 sm:grid-cols-2">
            <input
              name="name"
              required
              placeholder="Club name"
              className="sm:col-span-2 rounded-md border border-stone-300 px-3 py-2 text-sm"
            />
            <input name="city" placeholder="City" className="rounded-md border border-stone-300 px-3 py-2 text-sm" />
            <input name="state" placeholder="State" className="rounded-md border border-stone-300 px-3 py-2 text-sm" />
            <button
              type="submit"
              className="sm:col-span-2 rounded-md bg-emerald-800 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-900"
            >
              Create club
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
