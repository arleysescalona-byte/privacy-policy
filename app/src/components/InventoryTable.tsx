"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PricedInventoryItem } from "@/lib/queries";
import { CATEGORY_LABELS } from "@/lib/labels";
import { updateInventoryItem, deleteInventoryItem } from "@/lib/actions";

function money(v: number | null): string {
  return v === null ? "—" : `$${v.toFixed(2)}`;
}

export function InventoryTable({
  clubId,
  clubSlug,
  items,
}: {
  clubId: string;
  clubSlug: string;
  items: PricedInventoryItem[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const filtered = items.filter(
    (i) => i.name.toLowerCase().includes(filter.toLowerCase()) || (i.subcategory ?? "").toLowerCase().includes(filter.toLowerCase()),
  );

  function handleDelete(id: string) {
    if (!confirm("Remove this item from inventory?")) return;
    startTransition(async () => {
      const res = await deleteInventoryItem(clubId, clubSlug, id);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  function handleSave(itemId: string, formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await updateInventoryItem(clubId, clubSlug, itemId, formData);
      if (!res.ok) setError(res.error);
      else {
        setEditing(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-3">
      {error && <p className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>}
      <input
        placeholder="Filter items…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="w-full max-w-xs rounded-md border border-stone-300 px-3 py-1.5 text-sm"
      />
      <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Category</th>
              <th className="px-3 py-2 text-right">Cost</th>
              <th className="px-3 py-2 text-right">Bottle price</th>
              <th className="px-3 py-2 text-right">Glass price</th>
              <th className="px-3 py-2 text-center">Featured</th>
              <th className="px-3 py-2 text-center">Active</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filtered.map((item) => (
              <RowGroup
                key={item.id}
                item={item}
                editing={editing === item.id}
                pending={pending}
                onEdit={() => setEditing(item.id)}
                onCancel={() => setEditing(null)}
                onSave={(fd) => handleSave(item.id, fd)}
                onDelete={() => handleDelete(item.id)}
              />
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-stone-400">
                  No items yet — upload a cost export above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RowGroup({
  item,
  editing,
  pending,
  onEdit,
  onCancel,
  onSave,
  onDelete,
}: {
  item: PricedInventoryItem;
  editing: boolean;
  pending: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (fd: FormData) => void;
  onDelete: () => void;
}) {
  const bottleOverridden = item.overrideBottlePrice !== null;
  const glassOverridden = item.overrideGlassPrice !== null;

  return (
    <>
      <tr className={!item.isActive ? "opacity-50" : ""}>
        <td className="px-3 py-2">
          <p className="font-medium text-stone-900">{item.name}</p>
          {item.subcategory && <p className="text-xs text-stone-500">{item.subcategory}</p>}
        </td>
        <td className="px-3 py-2 text-stone-600">{CATEGORY_LABELS[item.category]}</td>
        <td className="px-3 py-2 text-right tabular-nums">${item.cost.toFixed(2)}</td>
        <td className="px-3 py-2 text-right tabular-nums">
          {money(item.pricing.finalBottlePrice)}
          {bottleOverridden && <span className="ml-1 text-[10px] text-amber-600">override</span>}
        </td>
        <td className="px-3 py-2 text-right tabular-nums">
          {money(item.pricing.finalGlassPrice)}
          {glassOverridden && <span className="ml-1 text-[10px] text-amber-600">override</span>}
        </td>
        <td className="px-3 py-2 text-center">{item.isFeatured ? "★" : ""}</td>
        <td className="px-3 py-2 text-center">{item.isActive ? "✓" : "—"}</td>
        <td className="px-3 py-2 text-right whitespace-nowrap">
          <button onClick={onEdit} className="text-emerald-700 hover:underline text-xs mr-3">
            Edit
          </button>
          <button onClick={onDelete} className="text-red-600 hover:underline text-xs">
            Delete
          </button>
        </td>
      </tr>
      {editing && (
        <tr className="bg-stone-50">
          <td colSpan={8} className="px-4 py-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSave(new FormData(e.currentTarget));
              }}
              className="grid gap-3 sm:grid-cols-4"
            >
              <label className="text-xs font-medium text-stone-600">
                Cost
                <input name="cost" type="number" step="0.01" min="0" defaultValue={item.cost} className="mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm" />
              </label>
              <label className="text-xs font-medium text-stone-600">
                Override bottle price
                <input
                  name="overrideBottlePrice"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={item.overrideBottlePrice ?? ""}
                  placeholder={item.pricing.suggestedBottlePrice ? item.pricing.suggestedBottlePrice.price.toFixed(2) : ""}
                  className="mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm"
                />
                <span className="mt-1 flex items-center gap-1 text-[11px] text-stone-500">
                  <input type="checkbox" name="clearBottleOverride" /> clear override
                </span>
              </label>
              <label className="text-xs font-medium text-stone-600">
                Override glass price
                <input
                  name="overrideGlassPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={item.overrideGlassPrice ?? ""}
                  placeholder={item.pricing.suggestedGlassPrice ? item.pricing.suggestedGlassPrice.price.toFixed(2) : ""}
                  className="mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm"
                />
                <span className="mt-1 flex items-center gap-1 text-[11px] text-stone-500">
                  <input type="checkbox" name="clearGlassOverride" /> clear override
                </span>
              </label>
              <label className="text-xs font-medium text-stone-600">
                Menu description
                <input name="menuDescription" defaultValue={item.menuDescription ?? ""} className="mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm" />
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-stone-600">
                <input type="checkbox" name="isFeatured" defaultChecked={item.isFeatured} /> Featured on menu
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-stone-600">
                <input type="checkbox" name="isActive" defaultChecked={item.isActive} /> Active
              </label>
              <div className="sm:col-span-4 flex gap-2">
                <button type="submit" disabled={pending} className="rounded-md bg-emerald-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-900 disabled:opacity-50">
                  Save
                </button>
                <button type="button" onClick={onCancel} className="rounded-md px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-100">
                  Cancel
                </button>
              </div>
            </form>
          </td>
        </tr>
      )}
    </>
  );
}
