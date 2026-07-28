// Pure, client-safe roster CSV parsing + validation (no server deps) so the
// preview and the real import share exactly one code path, and it's unit-tested.

/** RFC-4180-ish CSV parser: handles quoted fields with embedded commas, escaped
 *  quotes (""), and newlines inside quotes. Returns non-empty rows of cells. */
export function parseCsv(text: string): string[][] {
  const s = String(text ?? "").replace(/\r\n?/g, "\n");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; } // escaped quote
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n") {
      row.push(field); rows.push(row); row = []; field = "";
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

const today = () => new Date().toISOString().slice(0, 10);

function isoDate(y: number, mo: number, d: number): string | null {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Parse a hire date, or null if it isn't a recognised format. Accepts ISO
 *  (YYYY-MM-DD / YYYY/M/D) and Indian day-first (DD/MM/YYYY, DD/MM/YY with
 *  '/', '-' or '.'). 2-digit years: 00–69 → 20xx, 70–99 → 19xx. */
export function parseDate(s: string): string | null {
  const v = (s || "").trim();
  if (!v) return null;
  let m = v.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (m) return isoDate(+m[1], +m[2], +m[3]);
  m = v.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2}|\d{4})$/);
  if (m) {
    let year = +m[3];
    if (m[3].length === 2) year = year <= 69 ? 2000 + year : 1900 + year;
    return isoDate(year, +m[2], +m[1]);
  }
  return null;
}

/** Hire date for import — parsed value, or today() as a safe fallback. */
export const normalizeDate = (s: string): string => parseDate(s) ?? today();

/** Salary from free text ("₹14,00,000" → 1400000); 0 if not numeric. */
export const parseSalary = (raw: string): number => parseInt(String(raw ?? "").replace(/[^0-9]/g, ""), 10) || 0;

export type RosterColumns = { name: number; title: number; dept: number; loc: number; salary: number; hire: number; email: number };

export function mapColumns(headerCells: string[]): RosterColumns {
  const header = headerCells.map((h) => h.trim().toLowerCase());
  const col = (names: string[]) => { for (const n of names) { const i = header.indexOf(n); if (i >= 0) return i; } return -1; };
  return {
    name: col(["name", "full name", "full_name", "employee", "employee name"]),
    title: col(["title", "designation", "role", "job title"]),
    dept: col(["department", "dept"]),
    loc: col(["location", "city", "office"]),
    salary: col(["salary", "annual salary", "ctc", "annual ctc"]),
    hire: col(["hire date", "hire_date", "hired_on", "doj", "date of joining", "joining date"]),
    email: col(["email", "email id", "email address"]),
  };
}

export type RosterRow = {
  rowNumber: number; // 1-based source line (incl. header) for messages
  name: string; title: string; dept: string; loc: string;
  salary: number; hired: string; email: string;
  warnings: string[];
};
export type RosterPreview = { columns: RosterColumns; rows: RosterRow[]; count: number; warnings: number; error?: string };

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Parse + validate a roster CSV WITHOUT touching the database. Powers the
 *  preview and is the single source the import loop iterates. */
export function parseRoster(text: string): RosterPreview {
  const grid = parseCsv(text);
  const empty: RosterColumns = { name: -1, title: -1, dept: -1, loc: -1, salary: -1, hire: -1, email: -1 };
  if (grid.length < 2) return { columns: empty, rows: [], count: 0, warnings: 0, error: "CSV needs a header row and at least one employee row." };
  const columns = mapColumns(grid[0]);
  if (columns.name < 0) return { columns, rows: [], count: 0, warnings: 0, error: 'CSV must have a "name" column.' };

  const rows: RosterRow[] = [];
  for (let r = 1; r < grid.length; r++) {
    const cells = grid[r];
    const get = (i: number) => (i >= 0 ? (cells[i] ?? "").trim() : "");
    const name = get(columns.name);
    if (!name) continue; // skip nameless rows

    const hireRaw = get(columns.hire);
    const salaryRaw = get(columns.salary);
    const email = get(columns.email);
    const warnings: string[] = [];
    if (!hireRaw) warnings.push("no hire date → defaults to today");
    else if (!parseDate(hireRaw)) warnings.push(`hire date "${hireRaw}" not recognised → defaults to today`);
    const salary = parseSalary(salaryRaw);
    if (!salaryRaw) warnings.push("no salary → imported as 0");
    else if (salary === 0) warnings.push(`salary "${salaryRaw}" isn't a number → imported as 0`);
    if (email && !EMAIL_RE.test(email)) warnings.push(`email "${email}" looks invalid`);

    rows.push({ rowNumber: r + 1, name, title: get(columns.title), dept: get(columns.dept), loc: get(columns.loc), salary, hired: normalizeDate(hireRaw), email, warnings });
  }
  return { columns, rows, count: rows.length, warnings: rows.reduce((a, x) => a + x.warnings.length, 0) };
}
