"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { parseUploadedFile, guessColumn, guessCategory, parseNumber, ImportParseError, type ParsedRow } from "@/lib/import-parsing";
import { INVENTORY_FIELDS, type NewInventoryRow } from "@/lib/import-types";
import { Category, UnitType } from "@/generated/prisma/enums";
import { CATEGORY_LABELS } from "@/lib/labels";
import { commitInventoryImport } from "@/lib/actions";

type Props = { clubId: string; clubSlug: string };

type Mapping = Record<string, string>; // field key -> source header ("" = unmapped)

const CATEGORY_CANDIDATES: Record<string, string[]> = {
  name: ["item name", "item", "product", "description", "name"],
  cost: ["cost", "unit cost", "case cost", "bottle cost", "price", "cost per bottle"],
  categoryRaw: ["category", "type", "class"],
  subcategory: ["subcategory", "varietal", "style", "sub category"],
  supplier: ["supplier", "vendor", "distributor"],
  sku: ["sku", "item #", "item number", "code"],
  glassesPerBottle: ["glasses per bottle", "pours", "pours per bottle", "servings"],
};

export function InventoryImportWizard({ clubId, clubSlug }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [filename, setFilename] = useState("");
  const [mapping, setMapping] = useState<Mapping>({});
  const [defaultCategory, setDefaultCategory] = useState<Category>("WINE");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ count: number } | null>(null);

  const headers = useMemo(() => (rows && rows.length > 0 ? Object.keys(rows[0]) : []), [rows]);

  async function onFile(file: File) {
    setError(null);
    setResult(null);
    try {
      const parsed = await parseUploadedFile(file);
      if (parsed.length === 0) {
        setError("No rows found in that file.");
        return;
      }
      setRows(parsed);
      setFilename(file.name);
      const hdrs = Object.keys(parsed[0]);
      const guessed: Mapping = {};
      for (const field of INVENTORY_FIELDS) {
        const found = guessColumn(hdrs, CATEGORY_CANDIDATES[field.key] ?? [field.label]);
        guessed[field.key] = found ?? "";
      }
      setMapping(guessed);
    } catch (e) {
      setError(e instanceof ImportParseError ? e.message : "Could not read that file.");
    }
  }

  const preview: NewInventoryRow[] = useMemo(() => {
    if (!rows) return [];
    return buildRows(rows, mapping, defaultCategory);
  }, [rows, mapping, defaultCategory]);

  async function handleImport() {
    if (!rows) return;
    setBusy(true);
    setError(null);
    const result = await commitInventoryImport(clubId, clubSlug, filename, preview);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setResult({ count: result.count ?? preview.length });
    setRows(null);
    router.refresh();
  }

  if (!rows) {
    return (
      <div className="rounded-lg border border-dashed border-stone-300 bg-white p-6 text-center">
        <label className="cursor-pointer text-sm font-medium text-emerald-800 hover:underline">
          Upload inventory / cost export (.csv or .xlsx)
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onFile(file);
              e.target.value = "";
            }}
          />
        </label>
        <p className="mt-2 text-xs text-stone-500">Exported from Scannabar, your POS, or a plain Excel cost sheet.</p>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {result && (
          <p className="mt-3 rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800">
            Imported {result.count} item{result.count === 1 ? "" : "s"}.
          </p>
        )}
      </div>
    );
  }

  const missingRequired = INVENTORY_FIELDS.filter((f) => f.required && !mapping[f.key]);

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-stone-900">Map columns — {filename}</h3>
        <button onClick={() => setRows(null)} className="text-sm text-stone-500 hover:underline">
          Cancel
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {INVENTORY_FIELDS.map((field) => (
          <label key={field.key} className="text-xs font-medium text-stone-600">
            {field.label}
            {field.required && <span className="text-red-500"> *</span>}
            <select
              value={mapping[field.key] ?? ""}
              onChange={(e) => setMapping((m) => ({ ...m, [field.key]: e.target.value }))}
              className="mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm"
            >
              <option value="">— not in file —</option>
              {headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </label>
        ))}
        {!mapping.categoryRaw && (
          <label className="text-xs font-medium text-stone-600">
            Default category (no category column found)
            <select
              value={defaultCategory}
              onChange={(e) => setDefaultCategory(e.target.value as Category)}
              className="mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm"
            >
              {Object.values(Category).map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {missingRequired.length > 0 && (
        <p className="text-sm text-amber-700">Map: {missingRequired.map((f) => f.label).join(", ")} to continue.</p>
      )}

      <div>
        <p className="text-xs font-medium text-stone-500 mb-2">
          Preview — {preview.length} of {rows.length} row{rows.length === 1 ? "" : "s"} will import
        </p>
        <div className="overflow-x-auto rounded-md border border-stone-200">
          <table className="min-w-full text-sm">
            <thead className="bg-stone-50 text-xs uppercase text-stone-500">
              <tr>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Category</th>
                <th className="px-3 py-2 text-left">Cost</th>
                <th className="px-3 py-2 text-left">Glasses/bottle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {preview.slice(0, 8).map((row, i) => (
                <tr key={i}>
                  <td className="px-3 py-1.5">{row.name}</td>
                  <td className="px-3 py-1.5">{CATEGORY_LABELS[row.category]}</td>
                  <td className="px-3 py-1.5">${row.cost.toFixed(2)}</td>
                  <td className="px-3 py-1.5">{row.glassesPerBottle ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={handleImport}
        disabled={busy || missingRequired.length > 0 || preview.length === 0}
        className="rounded-md bg-emerald-800 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-900 disabled:opacity-50"
      >
        {busy ? "Importing…" : `Import ${preview.length} item${preview.length === 1 ? "" : "s"}`}
      </button>
    </div>
  );
}

function buildRows(rows: ParsedRow[], mapping: Mapping, defaultCategory: Category): NewInventoryRow[] {
  const out: NewInventoryRow[] = [];
  for (const row of rows) {
    const name = mapping.name ? row[mapping.name] : "";
    const cost = mapping.cost ? parseNumber(row[mapping.cost]) : null;
    if (!name || cost === null) continue;

    const category = mapping.categoryRaw ? guessCategory(row[mapping.categoryRaw]) : defaultCategory;
    const glassesPerBottle = mapping.glassesPerBottle ? parseNumber(row[mapping.glassesPerBottle]) : null;

    out.push({
      name,
      category,
      subcategory: mapping.subcategory ? row[mapping.subcategory] || null : null,
      supplier: mapping.supplier ? row[mapping.supplier] || null : null,
      sku: mapping.sku ? row[mapping.sku] || null : null,
      cost,
      unitType: category === "WINE" || category === "SPIRITS" ? "BOTTLE" : ("EACH" as UnitType),
      bottleSizeMl: category === "WINE" || category === "SPIRITS" ? 750 : null,
      glassesPerBottle: glassesPerBottle && glassesPerBottle > 0 ? Math.round(glassesPerBottle) : category === "WINE" ? 5 : category === "SPIRITS" ? 16 : null,
    });
  }
  return out;
}
