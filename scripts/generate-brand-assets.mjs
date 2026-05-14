import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function crc32(buf) {
  let crc = ~0;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function color(hex) {
  const raw = hex.replace('#', '');
  return [
    parseInt(raw.slice(0, 2), 16),
    parseInt(raw.slice(2, 4), 16),
    parseInt(raw.slice(4, 6), 16),
    raw.length === 8 ? parseInt(raw.slice(6, 8), 16) : 255,
  ];
}

function blend(base, top, alpha = top[3] / 255) {
  return [
    Math.round(top[0] * alpha + base[0] * (1 - alpha)),
    Math.round(top[1] * alpha + base[1] * (1 - alpha)),
    Math.round(top[2] * alpha + base[2] * (1 - alpha)),
    255,
  ];
}

function makePng(width, height, painter, outPath) {
  const rows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0;
    for (let x = 0; x < width; x++) {
      const px = painter(x, y, width, height);
      const offset = 1 + x * 4;
      row[offset] = px[0];
      row[offset + 1] = px[1];
      row[offset + 2] = px[2];
      row[offset + 3] = px[3];
    }
    rows.push(row);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  writeFileSync(outPath, Buffer.concat([
    PNG_SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]));
}

const ink = color('#0D0D0B');
const surface = color('#15130F');
const gold = color('#C8AD7F');
const parchment = color('#F1E4C8');

function roundedRectMask(x, y, w, h, rx, ry, rw, rh, r) {
  const cx = Math.max(rx + r, Math.min(x, rx + rw - r));
  const cy = Math.max(ry + r, Math.min(y, ry + rh - r));
  return Math.hypot(x - cx, y - cy) <= r;
}

function symbolPainter(x, y, w, h, transparent = false) {
  const scale = w / 512;
  const sx = x / scale;
  const sy = y / scale;
  let px = transparent ? [0, 0, 0, 0] : ink;

  if (roundedRectMask(sx, sy, 512, 512, 36, 36, 440, 440, 92)) {
    px = blend(px, [gold[0], gold[1], gold[2], 22]);
  }

  const inE =
    (sx >= 160 && sx <= 230 && sy >= 110 && sy <= 402) ||
    (sx >= 160 && sx <= 365 && sy >= 110 && sy <= 158 && sx <= 365 - Math.max(0, sy - 110) * 0.28) ||
    (sx >= 160 && sx <= 332 && sy >= 232 && sy <= 278 && sx <= 332 - Math.max(0, sy - 232) * 0.26) ||
    (sx >= 160 && sx <= 370 && sy >= 354 && sy <= 402 && sx <= 370 - Math.max(0, sy - 354) * 0.3);
  if (inE) px = gold;

  const leftHighlight =
    sx >= 146 && sx <= 230 &&
    sy >= 110 && sy <= 402 &&
    sx <= 230 - Math.abs(sy - 256) * 0.13 &&
    sx >= 146 + Math.abs(sy - 256) * 0.04;
  if (leftHighlight) px = blend(px, [parchment[0], parchment[1], parchment[2], 46], 0.18);

  const line = (x1, y1, x2, y2, widthPx, col) => {
    const a = sx - x1;
    const b = sy - y1;
    const c = x2 - x1;
    const d = y2 - y1;
    const dot = a * c + b * d;
    const len = c * c + d * d;
    const t = Math.max(0, Math.min(1, dot / len));
    const nx = x1 + t * c;
    const ny = y1 + t * d;
      if (Math.hypot(sx - nx, sy - ny) <= widthPx / 2) px = col;
  };

  line(258, 158, 346, 244, 20, ink);
  line(346, 244, 258, 354, 20, ink);
  line(265, 175, 337, 244, 5, parchment);
  line(337, 244, 265, 337, 5, parchment);
  const decision = Math.hypot(sx - 350, sy - 244);
  if (decision <= 18 && decision > 15) px = blend(px, [gold[0], gold[1], gold[2], 64], 0.25);
  if (decision <= 9) px = parchment;

  return px;
}

makePng(1024, 1024, (x, y, w, h) => symbolPainter(x, y, w, h), 'apps/mobile/assets/images/icon.png');
makePng(1024, 1024, (x, y, w, h) => symbolPainter(x, y, w, h, true), 'apps/mobile/assets/images/adaptive-icon.png');
makePng(256, 256, (x, y, w, h) => symbolPainter(x, y, w, h), 'apps/mobile/assets/images/favicon.png');
makePng(1024, 1024, (x, y, w, h) => {
  const px = symbolPainter(x, y, w, h, true);
  const cx = w / 2;
  const cy = h / 2;
  const dist = Math.hypot(x - cx, y - cy);
  if (px[3] === 0 && dist < 470) return [13, 13, 11, 255];
  return px;
}, 'apps/mobile/assets/images/splash-icon.png');
