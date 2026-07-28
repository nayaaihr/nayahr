import { describe, it, expect } from "vitest";
import { parseCsv, parseDate, normalizeDate, parseSalary, parseRoster } from "./import-parse";

describe("parseCsv", () => {
  it("splits simple rows and skips blank lines", () => {
    expect(parseCsv("a,b\n1,2\n\n3,4\n")).toEqual([["a", "b"], ["1", "2"], ["3", "4"]]);
  });
  it("keeps commas inside quoted fields", () => {
    expect(parseCsv('name,city\n"Sharma, Anil","Pune, MH"')).toEqual([["name", "city"], ["Sharma, Anil", "Pune, MH"]]);
  });
  it("unescapes doubled quotes and allows newlines inside quotes", () => {
    expect(parseCsv('note\n"say ""hi""\nline two"')).toEqual([["note"], ['say "hi"\nline two']]);
  });
});

describe("parseDate", () => {
  it("parses ISO and Indian day-first with various separators", () => {
    expect(parseDate("2023-04-12")).toBe("2023-04-12");
    expect(parseDate("12/04/2023")).toBe("2023-04-12");
    expect(parseDate("12-04-2023")).toBe("2023-04-12");
    expect(parseDate("12.04.2023")).toBe("2023-04-12");
  });
  it("pivots 2-digit years (00–69 → 20xx, 70–99 → 19xx)", () => {
    expect(parseDate("08/01/24")).toBe("2024-01-08");
    expect(parseDate("15/06/95")).toBe("1995-06-15");
  });
  it("returns null for unparseable or out-of-range input", () => {
    expect(parseDate("")).toBeNull();
    expect(parseDate("not a date")).toBeNull();
    expect(parseDate("45/13/2023")).toBeNull();
  });
  it("normalizeDate falls back to today() when unparseable", () => {
    expect(normalizeDate("garbage")).toBe(new Date().toISOString().slice(0, 10));
  });
});

describe("parseSalary", () => {
  it("strips currency/formatting to a number", () => {
    expect(parseSalary("₹14,00,000")).toBe(1400000);
    expect(parseSalary("900000")).toBe(900000);
    expect(parseSalary("N/A")).toBe(0);
  });
});

describe("parseRoster", () => {
  it("errors without a header + a row, or without a name column", () => {
    expect(parseRoster("name\n").error).toBeTruthy();
    expect(parseRoster("title,salary\nEngineer,100").error).toContain("name");
  });
  it("maps aliased headers and quoted values, flagging per-row warnings", () => {
    const csv = [
      "Full Name,Designation,CTC,Date of Joining,Email",
      '"Nair, Priya",Senior Engineer,"14,00,000",12/04/2023,priya@acme.example',
      "Rahul Bose,,notanumber,bad-date,not-an-email",
    ].join("\n");
    const p = parseRoster(csv);
    expect(p.error).toBeUndefined();
    expect(p.count).toBe(2);

    expect(p.rows[0].name).toBe("Nair, Priya");
    expect(p.rows[0].salary).toBe(1400000);
    expect(p.rows[0].hired).toBe("2023-04-12");
    expect(p.rows[0].warnings).toHaveLength(0);

    expect(p.rows[1].salary).toBe(0);
    expect(p.rows[1].hired).toBe(new Date().toISOString().slice(0, 10));
    expect(p.rows[1].warnings.length).toBeGreaterThanOrEqual(3); // salary, date, email
    expect(p.warnings).toBeGreaterThan(0);
  });
  it("skips rows with no name", () => {
    expect(parseRoster("name,title\nAsha,Manager\n,Orphaned").count).toBe(1);
  });
});
