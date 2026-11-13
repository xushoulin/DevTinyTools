import { describe, expect, it } from "vitest";
import { createZip, type ZipEntry } from "./zip";

/**
 * A deliberately tiny ZIP reader. It is only used here, to prove that what
 * the writer emits is what unzip tools will see: signatures, offsets, the
 * STORE method, UTF-8 names and intact content verified against CRC-32.
 */

interface ReadEntry {
  name: string;
  content: string;
  method: number;
  crc: number;
}

function findEocd(bytes: Uint8Array): number {
  for (let i = bytes.length - 22; i >= 0; i--) {
    if (
      bytes[i] === 0x50 &&
      bytes[i + 1] === 0x4b &&
      bytes[i + 2] === 0x05 &&
      bytes[i + 3] === 0x06
    ) {
      return i;
    }
  }
  throw new Error("end of central directory record not found");
}

function readZip(bytes: Uint8Array): ReadEntry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocd = findEocd(bytes);
  const count = view.getUint16(eocd + 10, true);
  const centralOffset = view.getUint32(eocd + 16, true);
  const decoder = new TextDecoder();

  const entries: ReadEntry[] = [];
  let cursor = centralOffset;

  for (let i = 0; i < count; i++) {
    const signature = view.getUint32(cursor, true);
    expect(signature).toBe(0x02014b50);

    const crc = view.getUint32(cursor + 16, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const name = decoder.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));

    expect(view.getUint32(localOffset, true)).toBe(0x04034b50);
    const method = view.getUint16(localOffset + 8, true);
    const localNameLength = view.getUint16(localOffset + 26, true);
    const dataStart = localOffset + 30 + localNameLength;
    const data = bytes.subarray(dataStart, dataStart + compressedSize);

    expect(view.getUint32(localOffset + 14, true)).toBe(crc);

    entries.push({ name, content: decoder.decode(data), method, crc });
    cursor += 46 + nameLength;
  }

  return entries;
}

describe("createZip", () => {
  it("round-trips names, method and content", () => {
    const entries: ZipEntry[] = [
      { name: "users.ts", content: "export interface Users {\n  id: number;\n}\n" },
      { name: "nested/users.schema.json", content: '{"type":"object"}' },
    ];

    const archive = createZip(entries);
    const read = readZip(archive);

    expect(read).toHaveLength(2);
    expect(read[0].name).toBe("users.ts");
    expect(read[0].content).toBe(entries[0].content);
    expect(read[1].name).toBe("nested/users.schema.json");
    expect(read[1].content).toBe(entries[1].content);
    expect(read.every((entry) => entry.method === 0)).toBe(true);
  });

  it("writes correct CRC-32 values for each payload", () => {
    const archive = createZip([{ name: "a.txt", content: "123456789" }]);
    const [entry] = readZip(archive);

    // The canonical CRC-32 check value of "123456789" (PKZip 2.0 test vector).
    expect(entry.crc).toBe(0xcbf43926);
  });

  it("stores UTF-8 names flagged in the header", () => {
    const archive = createZip([{ name: "résultats.commandes.ts", content: "export {}" }]);
    const [entry] = readZip(archive);

    expect(entry.name).toBe("résultats.commandes.ts");
    expect(entry.content).toBe("export {}");
  });

  it("handles an empty archive and keeps EOCD counts in sync", () => {
    const bytes = createZip([]);
    const view = new DataView(bytes.buffer);
    const eocd = findEocd(bytes);

    expect(view.getUint16(eocd + 8, true)).toBe(0);
    expect(view.getUint16(eocd + 10, true)).toBe(0);
    expect(view.getUint32(eocd + 16, true)).toBe(0);
    expect(readZip(bytes)).toHaveLength(0);
  });

  it("starts with a local header and ends with the EOCD record", () => {
    const bytes = createZip([{ name: "x", content: "y" }]);

    expect(bytes[0]).toBe(0x50); // P
    expect(bytes[1]).toBe(0x4b); // K
    expect(bytes[2]).toBe(0x03);
    expect(bytes[3]).toBe(0x04);
    // EOCD is the final 22 bytes; its signature sits at length - 22 and the
    // trailing two bytes are the (empty) comment length.
    expect(Array.from(bytes.subarray(bytes.length - 22, bytes.length - 18))).toEqual([
      0x50, 0x4b, 0x05, 0x06,
    ]);
    expect(Array.from(bytes.subarray(bytes.length - 2))).toEqual([0x00, 0x00]);
  });
});
