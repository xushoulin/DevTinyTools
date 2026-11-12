import { describe, expect, it } from "vitest";
import { escapeCsvField, jsonValueToCsv, serializeCell } from "./csv";

describe("jsonValueToCsv", () => {
  it("writes a header and CRLF rows for a flat array", () => {
    const result = jsonValueToCsv([{ id: 1, name: "Ada" }, { id: 2, name: "Alan" }],
      { delimiter: ",", flattenObjects: true, includeHeader: true },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.csv).toBe("id,name\r\n1,Ada\r\n2,Alan\r\n");
    expect(result.rows).toBe(2);
    expect(result.columns).toEqual(["id", "name"]);
  });

  it("omits the header when asked", () => {
    const result = jsonValueToCsv([{ a: 1 }, { a: 2 }], {
      delimiter: ",",
      flattenObjects: true,
      includeHeader: false,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.csv).toBe("1\r\n2\r\n");
  });

  it("flattens nested objects into dotted-path columns", () => {
    const result = jsonValueToCsv([{ id: 1, user: { name: "Ada", address: { city: "London" } } }],
      { delimiter: ",", flattenObjects: true, includeHeader: true },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.csv).toBe("id,user.name,user.address.city\r\n1,Ada,London\r\n");
    expect(result.columns).toEqual(["id", "user.name", "user.address.city"]);
  });

  it("serialises arrays as JSON, never as extra columns", () => {
    const result = jsonValueToCsv([{ id: 1, tags: ["a", "b"] }], {
      delimiter: ",",
      flattenObjects: true,
      includeHeader: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.csv).toBe(`id,tags\r\n1,"[""a"",""b""]"\r\n`);
  });

  it("unions columns in first-appearance order across heterogeneous rows", () => {
    const result = jsonValueToCsv([{ a: 1 }, { b: 2 }, { a: 3, c: 4 }], {
      delimiter: ",",
      flattenObjects: true,
      includeHeader: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.columns).toEqual(["a", "b", "c"]);
    expect(result.csv).toBe("a,b,c\r\n1,,\r\n,2,\r\n3,,4\r\n");
  });

  it("collapses primitive array elements into a single value column", () => {
    const result = jsonValueToCsv([1, "two", true, null], {
      delimiter: ",",
      flattenObjects: true,
      includeHeader: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.csv).toBe("value\r\n1\r\ntwo\r\ntrue\r\n\r\n");
  });

  it("writes null as an empty cell, not the string null", () => {
    const result = jsonValueToCsv([{ a: null }, { a: "x" }], {
      delimiter: ",",
      flattenObjects: true,
      includeHeader: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.csv).toBe("a\r\n\r\nx\r\n");
  });

  it("quotes fields that contain the delimiter", () => {
    const result = jsonValueToCsv([{ a: "x;y" }], {
      delimiter: ";",
      flattenObjects: true,
      includeHeader: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.csv).toBe(`a\r\n"x;y"\r\n`);
  });

  it("keeps a quoted field intact for line breaks and embedded quotes", () => {
    const result = jsonValueToCsv([{ note: "line1\nline2 \"q\"" }], {
      delimiter: ",",
      flattenObjects: true,
      includeHeader: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.csv).toBe(`note\r\n"line1\nline2 ""q"""\r\n`);
  });

  it("supports tab delimiters", () => {
    const result = jsonValueToCsv([{ a: 1, b: 2 }], {
      delimiter: "\t",
      flattenObjects: true,
      includeHeader: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.csv).toBe("a\tb\r\n1\t2\r\n");
  });

  it("wraps a single object into a one-row table", () => {
    const result = jsonValueToCsv({ id: 7 }, {
      delimiter: ",",
      flattenObjects: true,
      includeHeader: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.csv).toBe("id\r\n7\r\n");
  });

  it("serialises whole objects into one json column when flattening is off", () => {
    const result = jsonValueToCsv([{ a: { b: 1 } }], {
      delimiter: ",",
      flattenObjects: false,
      includeHeader: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.columns).toEqual(["json"]);
    expect(result.csv).toBe(`json\r\n"{""a"":{""b"":1}}"\r\n`);
  });

  it("rejects a scalar root with a plain-English error", () => {
    const result = jsonValueToCsv("just a string", {
      delimiter: ",",
      flattenObjects: true,
      includeHeader: true,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("root value must be an object or an array");
  });

  it("rejects an empty array", () => {
    const result = jsonValueToCsv([], {
      delimiter: ",",
      flattenObjects: true,
      includeHeader: true,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("array is empty");
  });
});

describe("serializeCell", () => {
  it("maps null and undefined to an empty string", () => {
    expect(serializeCell(null)).toBe("");
    expect(serializeCell(undefined)).toBe("");
  });

  it("stringifies numbers and booleans", () => {
    expect(serializeCell(42)).toBe("42");
    expect(serializeCell(false)).toBe("false");
  });

  it("passes strings through untouched", () => {
    expect(serializeCell("a,b")).toBe("a,b");
  });

  it("JSON-encodes objects and arrays", () => {
    expect(serializeCell({ a: 1 })).toBe('{"a":1}');
    expect(serializeCell([1, 2])).toBe("[1,2]");
  });
});

describe("escapeCsvField", () => {
  it("returns plain fields untouched", () => {
    expect(escapeCsvField("plain", ",")).toBe("plain");
  });

  it("quotes fields containing the delimiter", () => {
    expect(escapeCsvField("a,b", ",")).toBe('"a,b"');
    expect(escapeCsvField("a;b", ",")).toBe("a;b");
  });

  it("doubles embedded quotes and quotes line breaks", () => {
    expect(escapeCsvField('say "hi"', ",")).toBe('"say ""hi"""');
    expect(escapeCsvField("a\nb", ",")).toBe('"a\nb"');
    expect(escapeCsvField("a\rb", ",")).toBe('"a\rb"');
  });
});
