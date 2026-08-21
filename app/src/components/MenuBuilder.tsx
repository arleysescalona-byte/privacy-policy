"use client";

import { useRef, useState, useTransition } from "react";
import type { MenuBranding } from "@/generated/prisma/client";
import type { PricedInventoryItem } from "@/lib/queries";
import { Category } from "@/generated/prisma/enums";
import { CATEGORY_LABELS } from "@/lib/labels";
import { updateBranding } from "@/lib/actions";

type Props = {
  clubId: string;
  clubSlug: string;
  clubName: string;
  branding: MenuBranding;
  items: PricedInventoryItem[];
};

const CATEGORY_ORDER: Category[] = ["WINE", "SPIRITS", "COCKTAIL", "BEER", "NON_ALCOHOLIC", "OTHER"];

const MAX_LOGO_BYTES = 400_000;

export function MenuBuilder({ clubId, clubSlug, clubName, branding, items }: Props) {
  const [form, setForm] = useState({
    logoDataUrl: branding.logoDataUrl ?? "",
    primaryColor: branding.primaryColor,
    secondaryColor: branding.secondaryColor,
    backgroundColor: branding.backgroundColor,
    fontFamily: branding.fontFamily,
    headerText: branding.headerText,
    footerText: branding.footerText,
  });
  const [saved, setSaved] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  function onLogoFile(file: File) {
    if (file.size > MAX_LOGO_BYTES) {
      setError("Logo must be under 400KB — resize the image and try again.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => set("logoDataUrl", String(reader.result));
    reader.readAsDataURL(file);
  }

  function handleSave() {
    setError(null);
    const fd = new FormData();
    for (const [k, v] of Object.entries(form)) fd.set(k, v);
    startTransition(async () => {
      const res = await updateBranding(clubId, clubSlug, fd);
      if (!res.ok) setError(res.error);
      else setSaved(true);
    });
  }

  const grouped = new Map<Category, PricedInventoryItem[]>();
  for (const item of items) {
    if (!item.isActive) continue;
    if (item.pricing.finalBottlePrice === null && item.pricing.finalGlassPrice === null) continue;
    grouped.set(item.category, [...(grouped.get(item.category) ?? []), item]);
  }
  for (const list of grouped.values()) {
    list.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || (a.subcategory ?? "").localeCompare(b.subcategory ?? "") || a.name.localeCompare(b.name));
  }

  return (
    <div className="space-y-6">
      <div className="no-print rounded-lg border border-stone-200 bg-white p-5 space-y-4">
        <h2 className="font-medium text-stone-900">Branding</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-medium text-stone-600">
            Header text
            <input value={form.headerText} onChange={(e) => set("headerText", e.target.value)} className="mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm" />
          </label>
          <label className="text-xs font-medium text-stone-600">
            Footer text
            <input value={form.footerText} onChange={(e) => set("footerText", e.target.value)} className="mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm" />
          </label>
          <label className="text-xs font-medium text-stone-600">
            Primary color
            <input type="color" value={form.primaryColor} onChange={(e) => set("primaryColor", e.target.value)} className="mt-1 h-9 w-full rounded-md border border-stone-300" />
          </label>
          <label className="text-xs font-medium text-stone-600">
            Accent color
            <input type="color" value={form.secondaryColor} onChange={(e) => set("secondaryColor", e.target.value)} className="mt-1 h-9 w-full rounded-md border border-stone-300" />
          </label>
          <label className="text-xs font-medium text-stone-600">
            Background color
            <input type="color" value={form.backgroundColor} onChange={(e) => set("backgroundColor", e.target.value)} className="mt-1 h-9 w-full rounded-md border border-stone-300" />
          </label>
          <label className="text-xs font-medium text-stone-600">
            Font family (CSS value)
            <input value={form.fontFamily} onChange={(e) => set("fontFamily", e.target.value)} placeholder="'Playfair Display', Georgia, serif" className="mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm" />
          </label>
          <label className="text-xs font-medium text-stone-600 sm:col-span-2">
            Logo
            <input ref={fileRef} type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && onLogoFile(e.target.files[0])} className="mt-1 block text-sm" />
            {form.logoDataUrl && (
              <button type="button" onClick={() => set("logoDataUrl", "")} className="mt-1 text-xs text-red-600 hover:underline">
                Remove logo
              </button>
            )}
          </label>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={pending}
            className="rounded-md bg-emerald-800 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-900 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save branding"}
          </button>
          <button type="button" onClick={() => window.print()} className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50">
            Print / Save as PDF
          </button>
          {!saved && <span className="text-xs text-stone-500">Unsaved changes — preview updates live, save to persist.</span>}
        </div>
      </div>

      <MenuPreview clubName={clubName} branding={form} grouped={grouped} />
    </div>
  );
}

function MenuPreview({
  clubName,
  branding,
  grouped,
}: {
  clubName: string;
  branding: { primaryColor: string; secondaryColor: string; backgroundColor: string; fontFamily: string; headerText: string; footerText: string; logoDataUrl: string };
  grouped: Map<Category, PricedInventoryItem[]>;
}) {
  return (
    <div
      className="mx-auto max-w-3xl rounded-lg border border-stone-200 p-10 shadow-sm print:border-0 print:shadow-none print:rounded-none"
      style={{ backgroundColor: branding.backgroundColor, fontFamily: branding.fontFamily, color: branding.primaryColor }}
    >
      <header className="text-center mb-8">
        {branding.logoDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={branding.logoDataUrl} alt={`${clubName} logo`} className="mx-auto mb-3 max-h-20 object-contain" />
        )}
        <h1 className="text-3xl font-semibold tracking-wide">{clubName}</h1>
        <p className="mt-1 text-lg" style={{ color: branding.secondaryColor }}>
          {branding.headerText}
        </p>
      </header>

      {CATEGORY_ORDER.filter((c) => grouped.has(c)).map((category) => (
        <section key={category} className="mb-8 break-inside-avoid">
          <h2
            className="text-xl font-semibold uppercase tracking-widest mb-3 pb-1 border-b-2"
            style={{ borderColor: branding.secondaryColor }}
          >
            {CATEGORY_LABELS[category]}
          </h2>
          <ul className="space-y-2.5">
            {grouped.get(category)!.map((item) => (
              <li key={item.id} className="flex items-baseline justify-between gap-4">
                <div>
                  <span className="font-medium">
                    {item.isFeatured && <span style={{ color: branding.secondaryColor }}>★ </span>}
                    {item.name}
                  </span>
                  {item.subcategory && <span className="text-sm opacity-70"> — {item.subcategory}</span>}
                  {item.menuDescription && <p className="text-sm italic opacity-70">{item.menuDescription}</p>}
                </div>
                <span className="whitespace-nowrap text-sm font-medium" style={{ color: branding.secondaryColor }}>
                  {item.pricing.finalGlassPrice !== null && item.pricing.finalBottlePrice !== null ? (
                    <>
                      {item.pricing.finalGlassPrice.toFixed(2)} <span className="text-xs opacity-70">gl</span> /{" "}
                      {item.pricing.finalBottlePrice.toFixed(2)} <span className="text-xs opacity-70">btl</span>
                    </>
                  ) : (
                    (item.pricing.finalGlassPrice ?? item.pricing.finalBottlePrice)!.toFixed(2)
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {branding.footerText && <p className="mt-10 text-center text-xs opacity-60">{branding.footerText}</p>}
    </div>
  );
}
