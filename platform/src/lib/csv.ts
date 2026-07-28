/** Minimal, correct CSV builder. Quotes any field containing a comma, quote,
 *  or newline (RFC-4180) and escapes embedded quotes by doubling them. */
export type CsvCell = string | number | null | undefined;

function cell(v: CsvCell): string {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: CsvCell[][]): string {
  return [headers, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
}
