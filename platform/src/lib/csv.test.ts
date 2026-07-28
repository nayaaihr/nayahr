import { describe, it, expect } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("joins header + rows with CRLF", () => {
    expect(toCsv(["a", "b"], [["1", "2"]])).toBe("a,b\r\n1,2");
  });
  it("quotes fields containing commas, quotes, or newlines and doubles inner quotes", () => {
    const csv = toCsv(["name", "note"], [["Sharma, A", 'say "hi"'], ["multi\nline", "ok"]]);
    expect(csv).toBe('name,note\r\n"Sharma, A","say ""hi"""\r\n"multi\nline",ok');
  });
  it("renders null/undefined/number cells", () => {
    expect(toCsv(["x", "y", "z"], [[null, undefined, 42]])).toBe("x,y,z\r\n,,42");
  });
});
