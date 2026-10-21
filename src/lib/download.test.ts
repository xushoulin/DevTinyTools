import { describe, expect, it } from "vitest";
import { safeFilename, timestampedFilename } from "./download";

describe("safeFilename", () => {
  it("keeps normal filenames intact", () => {
    expect(safeFilename("formatted-json-20261021-0905.json")).toBe(
      "formatted-json-20261021-0905.json",
    );
  });

  it("strips path traversal attempts", () => {
    expect(safeFilename("../../etc/passwd")).toBe("etc-passwd");
    expect(safeFilename("C:\\Windows\\system32\\config.json")).toBe(
      "C-Windows-system32-config.json",
    );
  });

  it("replaces spaces and brackets", () => {
    expect(safeFilename("my file (1).json")).toBe("my-file-1-.json");
  });

  it("falls back when nothing usable remains", () => {
    expect(safeFilename("")).toBe("data.json");
    expect(safeFilename("///")).toBe("data.json");
    expect(safeFilename("...", "fallback.json")).toBe("fallback.json");
  });

  it("drops control characters", () => {
    expect(safeFilename("a\u0000b\u001fc.json")).toBe("abc.json");
  });

  it("caps the length", () => {
    expect(safeFilename("a".repeat(200)).length).toBeLessThanOrEqual(80);
  });
});

describe("timestampedFilename", () => {
  it("produces a sortable, safe name", () => {
    const date = new Date(2026, 9, 21, 9, 5, 0);
    expect(timestampedFilename("formatted-json", date)).toBe(
      "formatted-json-20261021-0905.json",
    );
  });

  it("sanitises the prefix", () => {
    const date = new Date(2026, 0, 2, 3, 4, 0);
    expect(timestampedFilename("odd prefix!", date)).toBe("odd-prefix-20260102-0304.json");
  });
});
