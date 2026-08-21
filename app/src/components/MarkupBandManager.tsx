"use client";

import { useState, useTransition } from "react";
import type { MarkupBand } from "@/generated/prisma/client";
import { Category, UnitType, MarkupType, RoundingRule } from "@/generated/prisma/enums";
import { CATEGORY_LABELS, UNIT_TYPE_LABELS, MARKUP_TYPE_LABELS, ROUNDING_LABELS } from "@/lib/labels";
import { upsertMarkupBand, deleteMarkupBand } from "@/lib/actions";

type Props = {
  clubId: string;
  clubSlug: string;
  bands: MarkupBand[];
};

const emptyDraft = {
  id: "",
  label: "",
  category: "WINE" as Category,
  unitType: "BOTTLE" as UnitType,
  minCost: "0",
  maxCost: "",
  markupType: "MULTIPLIER" as MarkupType,
  markupValue: "3",
  rounding: "CHARM_95" as RoundingRule,
  priority: "0",
};

export function MarkupBandManager({ clubId, clubSlug, bands }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const grouped = new Map<string, MarkupBand[]>();
  for (const band of bands) {
    const key = `${band.category}__${band.unitType}`;
    grouped.set(key, [...(grouped.get(key) ?? []), band]);
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this markup band? Items relying on it will show no suggested price.")) return;
    startTransition(async () => {
      const res = await deleteMarkupBand(clubId, clubSlug, id);
      if (!res.ok) setError(res.error);
    });
  }

  async function handleSubmit(formData: FormData, closeAfter: () => void) {
    setError(null);
    startTransition(async () => {
      const res = await upsertMarkupBand(clubId, clubSlug, formData);
      if (!res.ok) {
        setError(res.error);
      } else {
        closeAfter();
      }
    });
  }

  return (
    <div className="space-y-6">
      {error && <p className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>}

      {Array.from(grouped.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, groupBands]) => {
          const [category, unitType] = key.split("__") as [Category, UnitType];
          return (
            <section key={key} className="rounded-lg border border-stone-200 bg-white">
              <header className="border-b border-stone-100 px-4 py-3">
                <h3 className="font-medium text-stone-900">
                  {CATEGORY_LABELS[category]} — {UNIT_TYPE_LABELS[unitType]}
                </h3>
              </header>
              <ul className="divide-y divide-stone-100">
                {groupBands
                  .sort((a, b) => a.minCost - b.minCost)
                  .map((band) =>
                    editing === band.id ? (
                      <li key={band.id} className="px-4 py-4 bg-stone-50">
                        <BandForm
                          draft={toDraft(band)}
                          pending={pending}
                          onCancel={() => setEditing(null)}
                          onSubmit={(fd) => handleSubmit(fd, () => setEditing(null))}
                        />
                      </li>
                    ) : (
                      <li key={band.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                        <div>
                          <p className="font-medium text-stone-900">{band.label}</p>
                          <p className="text-stone-500">
                            ${band.minCost.toFixed(2)} – {band.maxCost === null ? "∞" : `$${band.maxCost.toFixed(2)}`} ·{" "}
                            {MARKUP_TYPE_LABELS[band.markupType]}: {band.markupValue} · {ROUNDING_LABELS[band.rounding]}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button onClick={() => setEditing(band.id)} className="text-emerald-700 hover:underline">
                            Edit
                          </button>
                          <button onClick={() => handleDelete(band.id)} className="text-red-600 hover:underline">
                            Delete
                          </button>
                        </div>
                      </li>
                    ),
                  )}
              </ul>
            </section>
          );
        })}

      <section className="rounded-lg border border-dashed border-stone-300 bg-white p-4">
        {creating ? (
          <BandForm
            draft={emptyDraft}
            pending={pending}
            onCancel={() => setCreating(false)}
            onSubmit={(fd) => handleSubmit(fd, () => setCreating(false))}
          />
        ) : (
          <button onClick={() => setCreating(true)} className="text-sm font-medium text-emerald-800 hover:underline">
            + Add markup band
          </button>
        )}
      </section>
    </div>
  );
}

type Draft = typeof emptyDraft;

function toDraft(band: MarkupBand): Draft {
  return {
    id: band.id,
    label: band.label,
    category: band.category,
    unitType: band.unitType,
    minCost: String(band.minCost),
    maxCost: band.maxCost === null ? "" : String(band.maxCost),
    markupType: band.markupType,
    markupValue: String(band.markupValue),
    rounding: band.rounding,
    priority: String(band.priority),
  };
}

function BandForm({
  draft,
  pending,
  onSubmit,
  onCancel,
}: {
  draft: Draft;
  pending: boolean;
  onSubmit: (formData: FormData) => void;
  onCancel: () => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(new FormData(e.currentTarget));
      }}
      className="grid gap-3 sm:grid-cols-3"
    >
      {draft.id && <input type="hidden" name="id" value={draft.id} />}
      <label className="text-xs font-medium text-stone-600 sm:col-span-3">
        Label
        <input name="label" defaultValue={draft.label} required className="mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm" />
      </label>
      <label className="text-xs font-medium text-stone-600">
        Category
        <select name="category" defaultValue={draft.category} className="mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm">
          {Object.values(Category).map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs font-medium text-stone-600">
        Priced unit
        <select name="unitType" defaultValue={draft.unitType} className="mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm">
          {Object.values(UnitType).map((u) => (
            <option key={u} value={u}>
              {UNIT_TYPE_LABELS[u]}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs font-medium text-stone-600">
        Priority (ties)
        <input
          name="priority"
          type="number"
          step="1"
          defaultValue={draft.priority}
          className="mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm"
        />
      </label>
      <label className="text-xs font-medium text-stone-600">
        Min cost ($)
        <input
          name="minCost"
          type="number"
          step="0.01"
          min="0"
          defaultValue={draft.minCost}
          required
          className="mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm"
        />
      </label>
      <label className="text-xs font-medium text-stone-600">
        Max cost ($, blank = unlimited)
        <input
          name="maxCost"
          type="number"
          step="0.01"
          min="0"
          defaultValue={draft.maxCost}
          className="mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm"
        />
      </label>
      <label className="text-xs font-medium text-stone-600">
        Markup type
        <select name="markupType" defaultValue={draft.markupType} className="mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm">
          {Object.values(MarkupType).map((m) => (
            <option key={m} value={m}>
              {MARKUP_TYPE_LABELS[m]}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs font-medium text-stone-600">
        Value
        <input
          name="markupValue"
          type="number"
          step="0.01"
          defaultValue={draft.markupValue}
          required
          className="mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm"
        />
      </label>
      <label className="text-xs font-medium text-stone-600">
        Rounding
        <select name="rounding" defaultValue={draft.rounding} className="mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm">
          {Object.values(RoundingRule).map((r) => (
            <option key={r} value={r}>
              {ROUNDING_LABELS[r]}
            </option>
          ))}
        </select>
      </label>
      <div className="sm:col-span-3 flex gap-2 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-emerald-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-900 disabled:opacity-50"
        >
          {draft.id ? "Save changes" : "Add band"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-md px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100">
          Cancel
        </button>
      </div>
    </form>
  );
}
