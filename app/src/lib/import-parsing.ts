import Papa from "papaparse";
import * as XLSX from "xlsx";

/**
 * Parsed spreadsheet rows as plain string-keyed records. Values are read
 * with `sheet_to_json({ raw: false })` / Papa's string mode so every cell
 * comes back as a string — safer than accepting XLSX's raw JS values, and
 * simpler for the column-mapping step below.
 *
 * Security note: the `xlsx` package (SheetJS) has known prototype-pollution
 * and ReDoS advisories with no npm-published fix at time of writing. We
 * defend by (a) only ever reading plain cell values out of the parsed
 * workbook — never spreading/merging parsed objects into other objects —
 * and (b) rebuilding every row into a fresh `Object.create(null)` map
 * before it touches the rest of the app, so a crafted `__proto__` key in
 * the file can't reach a shared prototype.
 */
export type ParsedRow = Record<string, string>;

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_ROWS = 20_000;

export class ImportParseError extends Error {}

function sanitizeRow(raw: Record<string, unknown>): ParsedRow {
  const clean: ParsedRow = Object.create(null);
  for (const key of Object.keys(raw)) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
    const value = raw[key];
    clean[String(key).trim()] = value === null || value === undefined ? "" : String(value).trim();
  }
  return clean;
}

export function parseCsv(text: string): ParsedRow[] {
  const result = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true,
  });
  if (result.errors.length > 0 && result.data.length === 0) {
    throw new ImportParseError(result.errors[0]?.message ?? "Could not parse CSV file.");
  }
  const rows = result.data.slice(0, MAX_ROWS).map(sanitizeRow);
  return rows;
}

export function parseWorkbook(buffer: ArrayBuffer): ParsedRow[] {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false, cellHTML: false, cellFormula: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new ImportParseError("The workbook has no sheets.");
  const sheet = workbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { raw: false, defval: "" });
  return raw.slice(0, MAX_ROWS).map(sanitizeRow);
}

export async function parseUploadedFile(file: File): Promise<ParsedRow[]> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ImportParseError("File is too large (max 10MB).");
  }
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv") || file.type === "text/csv") {
    const text = await file.text();
    return parseCsv(text);
  }
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const buffer = await file.arrayBuffer();
    return parseWorkbook(buffer);
  }
  throw new ImportParseError("Unsupported file type. Upload a .csv or .xlsx file.");
}

/** Loosely matches a target field to the closest header name in a row. */
export function guessColumn(headers: string[], candidates: string[]): string | null {
  const normalized = headers.map((h) => ({ raw: h, norm: h.toLowerCase().replace(/[^a-z0-9]/g, "") }));
  for (const candidate of candidates) {
    const target = candidate.toLowerCase().replace(/[^a-z0-9]/g, "");
    const exact = normalized.find((h) => h.norm === target);
    if (exact) return exact.raw;
  }
  for (const candidate of candidates) {
    const target = candidate.toLowerCase().replace(/[^a-z0-9]/g, "");
    const partial = normalized.find((h) => h.norm.includes(target));
    if (partial) return partial.raw;
  }
  return null;
}

export function guessCategory(raw: string | undefined): "WINE" | "SPIRITS" | "BEER" | "COCKTAIL" | "NON_ALCOHOLIC" | "OTHER" {
  const v = (raw ?? "").toLowerCase();
  if (/wine|champagne|prosecco|sparkling/.test(v)) return "WINE";
  if (/spirit|vodka|gin|whiskey|whisky|bourbon|scotch|tequila|rum|cognac|liquor/.test(v)) return "SPIRITS";
  if (/beer|lager|ale|ipa|stout|cider/.test(v)) return "BEER";
  if (/cocktail|mixed drink/.test(v)) return "COCKTAIL";
  if (/soda|juice|water|non.?alc|n\/?a\b|coffee|tea/.test(v)) return "NON_ALCOHOLIC";
  return "OTHER";
}

export function guessUnitType(hint: string | undefined): "BOTTLE" | "GLASS" | "EACH" | null {
  const v = (hint ?? "").toLowerCase();
  if (/glass|pour|by the glass|btg/.test(v)) return "GLASS";
  if (/bottle|btl/.test(v)) return "BOTTLE";
  if (/each|can|unit|bottle\(each\)/.test(v)) return "EACH";
  return null;
}

export function parseNumber(value: string | undefined): number | null {
  if (!value) return null;
  const cleaned = value.replace(/[^0-9.\-]/g, "");
  if (cleaned === "" || cleaned === "-") return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}
