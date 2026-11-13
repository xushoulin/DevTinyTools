/**
 * Minimal ZIP archive writer — STORE method, zero dependencies.
 *
 * Batch conversion needs to hand the user several generated files at once.
 * Shipping a compression library for that is overkill: the payloads here are
 * plain text, the browser downloads them over the network anyway, and STORE
 * entries are readable by every unzip tool since PKZip 1.0 (1993).
 *
 * Sizes are known before writing because nothing is compressed, so each
 * local header is complete when it is emitted and the central directory is a
 * straight replay of the same metadata.
 */

const encoder = new TextEncoder();

const CRC_TABLE = buildCrcTable();

function buildCrcTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let bit = 0; bit < 8; bit++) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

interface DosStamp {
  time: number;
  date: number;
}

function dosDateTime(at: Date): DosStamp {
  const time =
    (at.getHours() << 11) | (at.getMinutes() << 5) | Math.floor(at.getSeconds() / 2);
  const date =
    ((Math.max(at.getFullYear(), 1980) - 1980) << 9) |
    ((at.getMonth() + 1) << 5) |
    at.getDate();
  return { time, date };
}

export interface ZipEntry {
  /** Path inside the archive. Forward slashes; no leading slash. */
  name: string;
  /** UTF-8 text payload, written uncompressed. */
  content: string;
}

/**
 * Build a complete .zip archive in memory.
 *
 * The returned buffer starts with the local file headers, followed by the
 * central directory and the end-of-central-directory record — the layout every
 * reader, from `unzip` to macOS Finder to Windows Explorer, expects.
 */
export function createZip(entries: ZipEntry[], timestamp: Date = new Date()): Uint8Array<ArrayBuffer> {
  const { time, date } = dosDateTime(timestamp);

  const localChunks: Uint8Array[] = [];
  const centralChunks: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const dataBytes = encoder.encode(entry.content);
    const crc = crc32(dataBytes);

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true); // local file header signature
    local.setUint16(4, 20, true); // version needed to extract
    local.setUint16(6, 0x0800, true); // general purpose flags: UTF-8 names
    local.setUint16(8, 0, true); // method 0 = STORE
    local.setUint16(10, time, true);
    local.setUint16(12, date, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, dataBytes.length, true); // compressed size
    local.setUint32(22, dataBytes.length, true); // uncompressed size
    local.setUint16(26, nameBytes.length, true);
    local.setUint16(28, 0, true); // extra field length

    localChunks.push(new Uint8Array(local.buffer), nameBytes, dataBytes);

    const central = new DataView(new ArrayBuffer(46));
    central.setUint32(0, 0x02014b50, true); // central directory signature
    central.setUint16(4, 20, true); // version made by
    central.setUint16(6, 20, true); // version needed to extract
    central.setUint16(8, 0x0800, true);
    central.setUint16(10, 0, true); // method STORE
    central.setUint16(12, time, true);
    central.setUint16(14, date, true);
    central.setUint32(16, crc, true);
    central.setUint32(20, dataBytes.length, true);
    central.setUint32(24, dataBytes.length, true);
    central.setUint16(28, nameBytes.length, true);
    central.setUint16(30, 0, true); // extra length
    central.setUint16(32, 0, true); // comment length
    central.setUint16(34, 0, true); // disk number start
    central.setUint16(36, 0, true); // internal attributes
    central.setUint32(38, 0, true); // external attributes
    central.setUint32(42, offset, true); // relative offset of local header

    centralChunks.push(new Uint8Array(central.buffer), nameBytes);

    offset += 30 + nameBytes.length + dataBytes.length;
  }

  const centralSize = centralChunks.reduce((sum, chunk) => sum + chunk.length, 0);

  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); // end of central directory signature
  end.setUint16(4, 0, true); // disk number
  end.setUint16(6, 0, true); // disk with central directory
  end.setUint16(8, entries.length, true);
  end.setUint16(10, entries.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true); // central directory offset
  end.setUint16(20, 0, true); // comment length

  const out = new Uint8Array(offset + centralSize + 22);
  let position = 0;
  for (const chunk of [...localChunks, ...centralChunks, new Uint8Array(end.buffer)]) {
    out.set(chunk, position);
    position += chunk.length;
  }
  return out;
}
