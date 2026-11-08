import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcBuf = Buffer.alloc(4);
  const toCrc = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(toCrc), 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function createPng(size, maskable = false) {
  const width = size;
  const height = size;
  const rawData = Buffer.alloc(height * (1 + width * 4));

  const cx = width / 2;
  const cy = height / 2;
  const radius = maskable ? width * 0.44 : width * 0.42;
  const ringRadius = radius * 0.75;

  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter byte 0 (None)
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let r = 8, g = 8, b = 8, a = 255; // Background dark

      if (!maskable && dist > radius + 4) {
        // Transparent outside circular badge on standard icon
        r = 0; g = 0; b = 0; a = 0;
      } else if (dist <= radius) {
        // Crimson sphere core
        const grad = Math.min(1, Math.max(0, (y - (cy - radius)) / (2 * radius)));
        r = Math.round(209 + (255 - 209) * (1 - grad));
        g = Math.round(15 + (46 - 15) * (1 - grad));
        b = Math.round(47 + (77 - 47) * (1 - grad));
        a = 255;

        // Draw speech bubble notch at bottom left
        if (x < cx - radius * 0.2 && y > cy + radius * 0.4 && y < cy + radius * 0.9) {
          r = 209; g = 15; b = 47;
        }

        // Draw orbital ring
        const ringDist = Math.abs(dist - ringRadius);
        if (ringDist < width * 0.04) {
          r = 255; g = 255; b = 255; a = 240;
        }

        // Draw center white dots
        const d1 = Math.sqrt((x - (cx - width * 0.08)) ** 2 + (y - cy) ** 2);
        const d2 = Math.sqrt((x - (cx + width * 0.08)) ** 2 + (y - cy) ** 2);
        if (d1 < width * 0.06 || d2 < width * 0.045) {
          r = 255; g = 255; b = 255; a = 255;
        }
      }

      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits per channel
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdr);

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

const outDir = path.resolve('public');
fs.writeFileSync(path.join(outDir, 'icon-192.png'), createPng(192));
fs.writeFileSync(path.join(outDir, 'icon-512.png'), createPng(512));
fs.writeFileSync(path.join(outDir, 'icon-maskable.png'), createPng(512, true));
console.log('Generated PWA icons successfully.');

