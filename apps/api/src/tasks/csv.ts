/**
 * Minimal CSV writer (RFC 4180). Written by hand on purpose: the whole point of
 * the feature is the quoting rules, and a library would hide every edge case.
 *
 * Rules implemented here:
 * - a cell is quoted when it contains a comma, a double quote, CR or LF;
 * - a double quote inside a quoted cell is escaped by doubling it (`"` -> `""`);
 * - `null`/`undefined` become an empty cell, `Date` becomes an ISO string;
 * - records are separated with CRLF, which is what RFC 4180 prescribes.
 *
 * A UTF-8 BOM is prepended so Excel on Windows detects the encoding and does not
 * mangle non-latin titles.
 */

const CSV_BOM = '\uFEFF';
const CSV_RECORD_SEPARATOR = '\r\n';
const NEEDS_QUOTING = /[",\r\n]/;

export type CsvValue = string | number | boolean | Date | null | undefined;

function stringifyCell(value: CsvValue): string {
  if (value === null || value === undefined) {
    return '';
  }

  const text = value instanceof Date ? value.toISOString() : String(value);

  return NEEDS_QUOTING.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function toCsv(
  headers: readonly string[],
  rows: readonly (readonly CsvValue[])[],
): string {
  const records = [headers, ...rows].map((cells) =>
    cells.map(stringifyCell).join(','),
  );

  return `${CSV_BOM}${records.join(CSV_RECORD_SEPARATOR)}${CSV_RECORD_SEPARATOR}`;
}
