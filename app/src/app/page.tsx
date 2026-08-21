import Link from "next/link";

const STEPS = [
  {
    title: "Upload the cost export",
    body: "Drop in whatever the club already has — a Scannabar or POS inventory export, or a plain Excel cost sheet. No integration required.",
  },
  {
    title: "Configure markup bands",
    body: "Set markup by category and cost range once — $0–15 wine at 3x, $60+ at 1.8x, spirits pours at 5x — and every item prices itself.",
  },
  {
    title: "Generate the printed menu",
    body: "The club's colors, logo, and fonts are applied automatically. Print it, or save straight to PDF.",
  },
  {
    title: "Review the monthly F&B report",
    body: "Import a sales export and get revenue, COGS, and margin by category — the recap that used to take an afternoon in Excel.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 h-16 flex items-center justify-between">
          <span className="font-serif text-xl font-semibold text-stone-900">Vintly</span>
          <Link
            href="/app"
            className="rounded-md bg-emerald-800 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-900"
          >
            Open the demo club
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 pt-20 pb-16 text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-emerald-800">Beverage costing &amp; wine pricing</p>
        <h1 className="mt-4 font-serif text-4xl sm:text-5xl font-semibold text-stone-900 leading-tight">
          Built for private clubs, not spreadsheets
        </h1>
        <p className="mt-6 text-lg text-stone-600 max-w-2xl mx-auto">
          Vintly turns a club&apos;s inventory export into configurable markup pricing, a branded printed menu, and a monthly
          F&amp;B financial report — the flow most clubs still rebuild by hand in Excel every month.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/app"
            className="rounded-md bg-emerald-800 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-900"
          >
            See it with real club data
          </Link>
        </div>
      </section>

      <section className="border-y border-stone-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-center font-serif text-2xl font-semibold text-stone-900">The problem is structural</h2>
          <p className="mt-4 mx-auto max-w-2xl text-center text-stone-600">
            Inventory systems like Scannabar and POS platforms don&apos;t talk to club management systems like Jonas or
            Northstar — and they don&apos;t talk to each other. Every club ends up exporting everything to Excel and
            calculating prices, menus, and monthly reports by hand.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-center font-serif text-2xl font-semibold text-stone-900">One flow, start to finish</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {STEPS.map((step, i) => (
            <div key={step.title} className="rounded-lg border border-stone-200 bg-white p-6">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-800 text-sm font-semibold text-white">
                {i + 1}
              </span>
              <h3 className="mt-3 font-medium text-stone-900">{step.title}</h3>
              <p className="mt-1 text-sm text-stone-600">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-stone-200 bg-white">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h2 className="font-serif text-2xl font-semibold text-stone-900">Validated on the floor, not in a boardroom</h2>
          <p className="mt-4 text-stone-600">
            This workflow was built firsthand as an Operations Specialist at a private golf club in Naples, Florida —
            manually running the markup calculator, printed menus, and financial reports every month — then confirmed with
            other Directors of F&amp;B that most clubs still rely on Excel and personal experience, with no single tool
            that ties pricing, menus, and financial analysis together.
          </p>
        </div>
      </section>

      <footer className="mx-auto max-w-5xl px-6 py-10 text-center text-sm text-stone-500">
        <Link href="/app" className="font-medium text-emerald-800 hover:underline">
          Open the demo club →
        </Link>
      </footer>
    </div>
  );
}
