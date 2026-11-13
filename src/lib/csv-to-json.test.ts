import { describe, expect, it } from "vitest";
import { csvToJson, convertCell, detectDelimiter, parseCsv } from "./csv-to-json";
import { jsonValueToCsv, type CsvConversionOptions } from "./csv";

const BASE = {
  delimiter: "auto",
  header: true,
  inferTypes: true,
  unflatten: true,
} as const;

/** Narrow a parseCsv outcome or fail the test with its message. */
function okRows(result: ReturnType<typeof parseCsv>): string[][] {
  if (!result.ok) throw new Error(result.error);
  return result.rows;
}

describe("parseCsv", () => {
  it("splits plain rows and cells, ignoring the trailing newline", () => {
    const rows = okRows(parseCsv("a,b\n1,2\n", ","));
    expect(rows).toEqual([["a", "b"], ["1", "2"]]);
  });

  it("keeps delimiters and newlines inside quoted fields", () => {
    const rows = okRows(parseCsv('a,b\n"x,y","line1\nline2"\n', ","));
    expect(rows).toEqual([["a", "b"], ["x,y", "line1\nline2"]]);
  });

  it("unescapes doubled quotes", () => {
    const rows = okRows(parseCsv('"say ""hi""",b\n', ","));
    expect(rows).toEqual([['say "hi"', "b"]]);
  });

  it("treats CRLF and bare LF identically", () => {
    const crlf = parseCsv("a,b\r\n1,2\r\n", ",");
    const lf = parseCsv("a,b\n1,2\n", ",");
    expect(okRows(crlf)).toEqual(okRows(lf));
  });

  it("keeps the final empty cell of a trailing delimiter", () => {
    const rows = okRows(parseCsv("a,b,\n", ","));
    expect(rows).toEqual([["a", "b", ""]]);
  });

  it("fails on an unclosed quote instead of guessing", () => {
    const result = parseCsv('a,"unclosed\nb,c', ",");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("never closed");
  });
});

describe("detectDelimiter", () => {
  it("picks the comma for ordinary files", () => {
    expect(detectDelimiter("a,b,c\n1,2,3\n").delimiter).toBe(",");
  });

  it("picks the semicolon for European exports, even when quoted cells contain commas", () => {
    const text = 'a;b;c\n1;"2,5";3\n';
    expect(detectDelimiter(text).delimiter).toBe(";");
  });

  it("ignores separators inside quotes", () => {
    const text = 'a,b\n"x;y",b\n"x,z",b\n';
    expect(detectDelimiter(text).delimiter).toBe(",");
  });
});

describe("convertCell", () => {
  it("converts numbers and booleans that round-trip exactly", () => {
    expect(convertCell("19.5", true)).toBe(19.5);
    expect(convertCell("-3", true)).toBe(-3);
    expect(convertCell("true", true)).toBe(true);
    expect(convertCell("false", true)).toBe(false);
    expect(convertCell("", true)).toBeNull();
    // Scientific notation re-serialises as "100", so the exactness guard
    // keeps the original text instead of guessing.
    expect(convertCell("1e2", true)).toBe("1e2");
  });

  it("keeps strings for values whose text would change", () => {
    // 19.50 would come back as 19.5
    expect(convertCell("19.50", true)).toBe("19.50");
    // 019 would come back as 19
    expect(convertCell("019", true)).toBe("019");
    // Beyond 2^53: precision loss
    expect(convertCell("1234567890123456789", true)).toBe("1234567890123456789");
    // Not numeric-looking at all
    expect(convertCell("Ada", true)).toBe("Ada");
    expect(convertCell("+44", true)).toBe("+44");
  });

  it("returns the raw string when inference is off", () => {
    expect(convertCell("19.5", false)).toBe("19.5");
    expect(convertCell("true", false)).toBe("true");
    expect(convertCell("", false)).toBe("");
  });
});

describe("csvToJson", () => {
  it("builds one object per row from the header", () => {
    const result = csvToJson("id,name\n1,Ada\n2,Grace\n", { ...BASE, delimiter: "," });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(JSON.parse(result.json)).toEqual([
      { id: 1, name: "Ada" },
      { id: 2, name: "Grace" },
    ]);
    expect(result.rows).toBe(2);
    expect(result.columns).toEqual(["id", "name"]);
  });

  it("unflattens dotted headers into nested objects", () => {
    const result = csvToJson("id,user.name,admin\n7,Ada,true\n", { ...BASE, delimiter: "," });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(JSON.parse(result.json)).toEqual([{ id: 7, user: { name: "Ada" }, admin: true }]);
  });

  it("renames duplicate headers and fills empty ones", () => {
    const result = csvToJson("id,,id\n1,x,2\n", { ...BASE, delimiter: "," });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.columns).toEqual(["id", "column2", "id_2"]);
    expect(result.warnings.some((w) => w.includes("columnN"))).toBe(true);
  });

  it("warns about ragged rows and pads missing cells with null", () => {
    const result = csvToJson("a,b,c\n1,2\n", { ...BASE, delimiter: "," });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(JSON.parse(result.json)).toEqual([{ a: 1, b: 2, c: null }]);
    expect(result.warnings.some((w) => w.includes("different column count"))).toBe(true);
  });

  it("generates column names and keeps strings without a header row", () => {
    const result = csvToJson("19.5,Ada\n", { ...BASE, delimiter: ",", header: false });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(JSON.parse(result.json)).toEqual([{ column1: 19.5, column2: "Ada" }]);
  });

  it("detects a tab delimiter from TSV text", () => {
    const result = csvToJson("id\tname\n1\tAda\n", { ...BASE });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.columns).toEqual(["id", "name"]);
    expect(result.warnings).toHaveLength(0);
  });

  it("fails on empty input and on files with no rows", () => {
    expect(csvToJson("", BASE).ok).toBe(false);
    expect(csvToJson("   \n", BASE).ok).toBe(false);
  });

  it("returns an empty array for a header-only file, with a warning", () => {
    const result = csvToJson("id,name\n", { ...BASE, delimiter: "," });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(JSON.parse(result.json)).toEqual([]);
    expect(result.warnings.some((w) => w.includes("only a header"))).toBe(true);
  });

  it("keeps everything as strings when inference is off", () => {
    const result = csvToJson("id,ok\n19.50,true\n", {
      ...BASE,
      delimiter: ",",
      inferTypes: false,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(JSON.parse(result.json)).toEqual([{ id: "19.50", ok: "true" }]);
  });
});

describe("round trip with jsonValueToCsv", () => {
  const csvOptions: CsvConversionOptions = {
    delimiter: ",",
    flattenObjects: true,
    includeHeader: true,
  };

  it("reproduces the original data for flat-and-nested objects", () => {
    const original = [
      { id: 1, total: 19.5, coupon: null, vip: true, name: "Ada" },
      { id: 2, total: 8, coupon: "SUMMER10", vip: false, name: "19.50" },
    ];

    const csv = jsonValueToCsv(original, csvOptions);
    expect(csv.ok).toBe(true);
    if (!csv.ok) return;

    const back = csvToJson(csv.csv, { ...BASE, delimiter: "," });
    expect(back.ok).toBe(true);
    if (!back.ok) return;

    expect(JSON.parse(back.json)).toEqual(original);
  });

  it("keeps big integer IDs as strings in both directions", () => {
    const original = [{ id: "1234567890123456789", count: 12 }];
    const csv = jsonValueToCsv(original, csvOptions);
    expect(csv.ok).toBe(true);
    if (!csv.ok) return;

    const back = csvToJson(csv.csv, { ...BASE, delimiter: "," });
    expect(back.ok).toBe(true);
    if (!back.ok) return;

    expect(JSON.parse(back.json)).toEqual(original);
  });
});
