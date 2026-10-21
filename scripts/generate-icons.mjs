// One-off icon generator: draws the site mark and writes favicon.ico + apple-icon.png.
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

const BG = [15, 23, 42];

function crc32(buffer) {
  let crc = ~0;
  for (const byte of buffer) {
    crc ^= byte;
    for (let k = 0; k < 8; k += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([length, typeBuf, data, crc]);
}

function encodePng(size, rgba) {
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function encodeIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  let offset = 6 + 16 * images.length;
  const entries = images.map((image) => {
    const entry = Buffer.alloc(16);
    entry[0] = image.size >= 256 ? 0 : image.size;
    entry[1] = image.size >= 256 ? 0 : image.size;
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(image.png.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += image.png.length;
    return entry;
  });

  return Buffer.concat([header, ...entries, ...images.map((image) => image.png)]);
}

function bracePoints(mirrored) {
  const points = [
    [0.81, 0.12],
    [0.7, 0.12],
    [0.66, 0.18],
    [0.66, 0.42],
    [0.57, 0.5],
    [0.66, 0.58],
    [0.66, 0.82],
    [0.7, 0.88],
    [0.81, 0.88],
  ];
  return mirrored ? points.map(([x, y]) => [1 - x, y]) : points;
}

function distanceToSegments(segments, x, y) {
  let best = Infinity;
  for (const [x1, y1, x2, y2] of segments) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSquared = dx * dx + dy * dy || 1;
    let t = ((x - x1) * dx + (y - y1) * dy) / lengthSquared;
    t = Math.max(0, Math.min(1, t));
    const px = x1 + t * dx;
    const py = y1 + t * dy;
    best = Math.min(best, Math.hypot(x - px, y - py));
  }
  return best;
}

function toSegments(points, scale) {
  const segments = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    segments.push([
      points[i][0] * scale,
      points[i][1] * scale,
      points[i + 1][0] * scale,
      points[i + 1][1] * scale,
    ]);
  }
  return segments;
}

function render(size) {
  const SS = 3;
  const W = size * SS;
  const radius = W * 0.22;
  const half = Math.max(1, W * 0.031);

  const paths = [
    toSegments(bracePoints(false), W),
    toSegments(bracePoints(true), W),
  ];

  const acc = new Float64Array(size * size * 4);

  for (let sy = 0; sy < W; sy += 1) {
    for (let sx = 0; sx < W; sx += 1) {
      const x = sx + 0.5;
      const y = sy + 0.5;

      const qx = Math.abs(x - W / 2) - (W / 2 - radius);
      const qy = Math.abs(y - W / 2) - (W / 2 - radius);
      const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
      const boxDistance = outside + Math.min(Math.max(qx, qy), 0) - radius;

      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      if (boxDistance <= 0) {
        r = BG[0];
        g = BG[1];
        b = BG[2];
        a = 1;

        const distance = Math.min(
          distanceToSegments(paths[0], x, y),
          distanceToSegments(paths[1], x, y),
        );
        if (distance <= half) {
          r = 255;
          g = 255;
          b = 255;
        }
      }

      const index = (Math.floor(sy / SS) * size + Math.floor(sx / SS)) * 4;
      acc[index] += r;
      acc[index + 1] += g;
      acc[index + 2] += b;
      acc[index + 3] += a;
    }
  }

  const samples = SS * SS;
  const rgba = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i += 1) {
    const alpha = acc[i * 4 + 3] / samples;
    rgba[i * 4] = Math.round(acc[i * 4] / samples);
    rgba[i * 4 + 1] = Math.round(acc[i * 4 + 1] / samples);
    rgba[i * 4 + 2] = Math.round(acc[i * 4 + 2] / samples);
    rgba[i * 4 + 3] = Math.round(alpha * 255);
  }
  return rgba;
}

const sizes = [16, 32, 48];
const pngs = sizes.map((size) => ({ size, png: encodePng(size, render(size)) }));

writeFileSync("src/app/favicon.ico", encodeIco(pngs));

const apple = 180;
writeFileSync("src/app/apple-icon.png", encodePng(apple, render(apple)));

console.log("icons written:", sizes.join(", "), "+ apple 180");
