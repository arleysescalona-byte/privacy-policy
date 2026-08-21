"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { parseUploadedFile, guessColumn, guessUnitType, parseNumber, ImportParseError, type ParsedRow } from "@/lib/import-parsing";
import { SALES_FIELDS, type NewSalesRow } from "@/lib/import-types";
import { commitSalesImport } from "@/lib/actions";

type Props = { clubId: string; clubSlug: string; defaultMonth: string };

type Mapping = Record<string, string>;

const CANDIDATES: Record<string, string[]> = {
  itemName: ["item name", "item", "product", "description", "menu item"],
  quantitySold: ["quantity sold", "qty sold", "qty", "quantity", "units sold", "count"],
  unitTypeHint: ["sold by", "unit", "serving", "pour type"],
  revenueOverride: ["revenue", "price", "sale price", "actual price", "amount"],
};

export function SalesImportWizard({ clubId, clubSlug, defaultMonth }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [filename, setFilename] = useState("");
  const [mapping, setMapping] = useState<Mapping>({});
  const [month, setMonth] = useState(defaultMonth);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ matched: number; unmatched: string[] } | null>(null);

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
      for (const field of SALES_FIELDS) {
        const found = guessColumn(hdrs, CANDIDATES[field.key] ?? [field.label]);
        guessed[field.key] = found ?? "";
      }
      setMapping(guessed);
    } catch (e) {
      setError(e instanceof ImportParseError ? e.message : "Could not read that file.");
    }
  }

  const preview: NewSalesRow[] = useMemo(() => {
    if (!rows) return [];
    return buildRows(rows, mapping);
  }, [rows, mapping]);

  async function handleImport() {
    if (!rows) return;
    setBusy(true);
    setError(null);
    const res = await commitSalesImport(clubId, clubSlug, filename, month, preview);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setResult({ matched: res.matched ?? 0, unmatched: res.unmatched ?? [] });
    setRows(null);
    router.refresh();
  }

  if (!rows) {
    return (
      <div className="rounded-lg border border-dashed border-stone-300 bg-white p-6 text-center">
        <label className="cursor-pointer text-sm font-medium text-emerald-800 hover:underline">
          Upload monthly sales export (.csv or .xlsx)
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
        <p className="mt-2 text-xs text-stone-500">Rows are matched to inventory items by name — import inventory first.</p>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {result && (
          <div className="mt-3 rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800 text-left">
            <p>Imported {result.matched} sales rows.</p>
            {result.unmatched.length > 0 && (
              <p className="mt-1 text-amber-700">
                {result.unmatched.length} item name{result.unmatched.length === 1 ? "" : "s"} didn&apos;t match inventory:{" "}
                {result.unmatched.slice(0, 6).join(", ")}
                {result.unmatched.length > 6 ? "…" : ""}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  const missingRequired = SALES_FIELDS.filter((f) => f.required && !mapping[f.key]);

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-stone-900">Map columns — {filename}</h3>
        <button onClick={() => setRows(null)} className="text-sm text-stone-500 hover:underline">
          Cancel
        </button>
      </div>

      <label className="block text-xs font-medium text-stone-600 max-w-xs">
        Reporting month
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm" />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        {SALES_FIELDS.map((field) => (
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
      </div>

      {missingRequired.length > 0 && (
        <p className="text-sm text-amber-700">Map: {missingRequired.map((f) => f.label).join(", ")} to continue.</p>
      )}

      <p className="text-xs text-stone-500">
        {preview.length} of {rows.length} row{rows.length === 1 ? "" : "s"} ready to import for {month}.
      </p>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={handleImport}
        disabled={busy || missingRequired.length > 0 || preview.length === 0}
        className="rounded-md bg-emerald-800 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-900 disabled:opacity-50"
      >
        {busy ? "Importing…" : `Import ${preview.length} row${preview.length === 1 ? "" : "s"}`}
      </button>
    </div>
  );
}

function buildRows(rows: ParsedRow[], mapping: Mapping): NewSalesRow[] {
  const out: NewSalesRow[] = [];
  for (const row of rows) {
    const itemName = mapping.itemName ? row[mapping.itemName] : "";
    const qty = mapping.quantitySold ? parseNumber(row[mapping.quantitySold]) : null;
    if (!itemName || qty === null) continue;
    const revenueOverride = mapping.revenueOverride ? parseNumber(row[mapping.revenueOverride]) : null;
    out.push({
      itemName,
      quantitySold: qty,
      unitTypeHint: mapping.unitTypeHint ? guessUnitType(row[mapping.unitTypeHint]) : null,
      revenueOverride,
    });
  }
  return out;
}
