// SEG-2FA: codificador QR mínimo (ISO/IEC 18004) para mostrar la URI otpauth sin dependencias ni servicios externos.
// Modo byte, corrección de errores M y máscara elegida por penalización. El secreto nunca sale del navegador.

const ECC_PER_BLOCK_M = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28];
const BLOCKS_M = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49];

export type QrMatrix = { size: number; dark: (x: number, y: number) => boolean; mask: number; version: number };

/** Matriz QR de {@code text}. {@code forcedMask} solo sirve para comparar con otra implementación en las pruebas. */
export function qrMatrix(text: string, forcedMask?: number): QrMatrix {
  const data = new TextEncoder().encode(text);
  let version = 1;
  while (version <= 40 && 4 + (version < 10 ? 8 : 16) + data.length * 8 > dataCodewords(version) * 8) version++;
  if (version > 40) throw new Error("El texto no cabe en un código QR.");

  const bits: number[] = [];
  const push = (value: number, length: number) => { for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1); };
  push(0b0100, 4);
  push(data.length, version < 10 ? 8 : 16);
  data.forEach((byte) => push(byte, 8));
  const capacity = dataCodewords(version) * 8;
  push(0, Math.min(4, capacity - bits.length));
  push(0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < capacity; pad ^= 0xec ^ 0x11) push(pad, 8);
  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) codewords.push(bits.slice(i, i + 8).reduce((acc, bit) => (acc << 1) | bit, 0));

  const size = version * 4 + 17;
  const modules = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  const fixed = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  const set = (x: number, y: number, dark: boolean) => { modules[y][x] = dark; fixed[y][x] = true; };

  for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]]) {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const x = cx + dx, y = cy + dy, distance = Math.max(Math.abs(dx), Math.abs(dy));
      if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, distance !== 2 && distance !== 4);
    }
  }
  const align = alignmentPositions(version, size);
  align.forEach((ax, i) => align.forEach((ay, j) => {
    if ((i === 0 && j === 0) || (i === 0 && j === align.length - 1) || (i === align.length - 1 && j === 0)) return;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }));
  drawFormat(set, size, 0);
  if (version >= 7) {
    let rem = version;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const value = (version << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const dark = ((value >>> i) & 1) === 1, a = size - 11 + (i % 3), b = Math.floor(i / 3);
      set(a, b, dark); set(b, a, dark);
    }
  }

  const all = withErrorCorrection(codewords, version);
  let index = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vertical = 0; vertical < size; vertical++) for (let j = 0; j < 2; j++) {
      const x = right - j, upward = ((right + 1) & 2) === 0, y = upward ? size - 1 - vertical : vertical;
      if (!fixed[y][x] && index < all.length * 8) {
        modules[y][x] = ((all[index >>> 3] >>> (7 - (index & 7))) & 1) === 1;
        index++;
      }
    }
  }

  const masked = (mask: number) => {
    const copy = modules.map((row) => row.slice());
    const setCopy = (x: number, y: number, dark: boolean) => { copy[y][x] = dark; };
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fixed[y][x] && maskBit(mask, x, y)) copy[y][x] = !copy[y][x];
    drawFormat(setCopy, size, mask);
    return copy;
  };
  let mask = forcedMask ?? 0, best = forcedMask === undefined ? Infinity : 0;
  if (forcedMask === undefined) for (let candidate = 0; candidate < 8; candidate++) {
    const score = penalty(masked(candidate));
    if (score < best) { best = score; mask = candidate; }
  }
  const result = masked(mask);
  return { size, version, mask, dark: (x, y) => result[y][x] };
}

function rawModules(version: number) {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const count = Math.floor(version / 7) + 2;
    result -= (25 * count - 10) * count - 55;
    if (version >= 7) result -= 36;
  }
  return result;
}

function dataCodewords(version: number) {
  return Math.floor(rawModules(version) / 8) - ECC_PER_BLOCK_M[version] * BLOCKS_M[version];
}

function alignmentPositions(version: number, size: number) {
  if (version === 1) return [];
  const count = Math.floor(version / 7) + 2;
  const step = version === 32 ? 26 : Math.ceil((version * 4 + 4) / (count * 2 - 2)) * 2;
  const result = [6];
  for (let position = size - 7; result.length < count; position -= step) result.splice(1, 0, position);
  return result;
}

function drawFormat(set: (x: number, y: number, dark: boolean) => void, size: number, mask: number) {
  const data = (0b00 << 3) | mask; // Nivel M = 00.
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  const bits = ((data << 10) | rem) ^ 0x5412;
  const bit = (i: number) => ((bits >>> i) & 1) === 1;
  for (let i = 0; i <= 5; i++) set(8, i, bit(i));
  set(8, 7, bit(6)); set(8, 8, bit(7)); set(7, 8, bit(8));
  for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
  for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i));
  for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i));
  set(8, size - 8, true);
}

function maskBit(mask: number, x: number, y: number) {
  switch (mask) {
    case 0: return (x + y) % 2 === 0;
    case 1: return y % 2 === 0;
    case 2: return x % 3 === 0;
    case 3: return (x + y) % 3 === 0;
    case 4: return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
    case 5: return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6: return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    default: return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
  }
}

function withErrorCorrection(data: number[], version: number) {
  const blockCount = BLOCKS_M[version], eccLength = ECC_PER_BLOCK_M[version];
  const raw = Math.floor(rawModules(version) / 8), shortBlocks = blockCount - (raw % blockCount), shortLength = Math.floor(raw / blockCount);
  const divisor = reedSolomonDivisor(eccLength);
  const blocks: number[][] = [];
  for (let i = 0, k = 0; i < blockCount; i++) {
    const block = data.slice(k, k + shortLength - eccLength + (i < shortBlocks ? 0 : 1));
    k += block.length;
    const ecc = reedSolomonRemainder(block, divisor);
    if (i < shortBlocks) block.push(0);
    blocks.push(block.concat(ecc));
  }
  const result: number[] = [];
  for (let i = 0; i < blocks[0].length; i++) blocks.forEach((block, j) => {
    if (i !== shortLength - eccLength || j >= shortBlocks) result.push(block[i]);
  });
  return result;
}

function multiply(x: number, y: number) {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

function reedSolomonDivisor(degree: number) {
  const result = Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = multiply(result[j], root);
      if (j + 1 < degree) result[j] ^= result[j + 1];
    }
    root = multiply(root, 0x02);
  }
  return result;
}

function reedSolomonRemainder(data: number[], divisor: number[]) {
  const result = Array<number>(divisor.length).fill(0);
  for (const byte of data) {
    const factor = byte ^ (result.shift() as number);
    result.push(0);
    divisor.forEach((coefficient, i) => { result[i] ^= multiply(coefficient, factor); });
  }
  return result;
}

// Penalizaciones N1–N4 de la norma; solo influyen en qué máscara se elige, no en la validez del código.
function penalty(grid: boolean[][]) {
  const size = grid.length;
  let score = 0, dark = 0;
  const lines: boolean[][] = [];
  for (let i = 0; i < size; i++) { lines.push(grid[i]); lines.push(grid.map((row) => row[i])); }
  const finder = [true, false, true, true, true, false, true];
  for (const line of lines) {
    for (let i = 0, run = 1; i < size; i++, run++) {
      if (i === size - 1 || line[i] !== line[i + 1]) { if (run >= 5) score += run - 2; run = 0; }
    }
    for (let i = 0; i + 7 <= size; i++) {
      if (!finder.every((value, k) => line[i + k] === value)) continue;
      const before = i >= 4 && [1, 2, 3, 4].every((k) => !line[i - k]);
      const after = i + 11 <= size && [7, 8, 9, 10].every((k) => !line[i + k]);
      if (before || after) score += 40;
    }
  }
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    if (grid[y][x]) dark++;
    if (x < size - 1 && y < size - 1 && grid[y][x] === grid[y][x + 1] && grid[y][x] === grid[y + 1][x] && grid[y][x] === grid[y + 1][x + 1]) score += 3;
  }
  score += Math.floor(Math.abs(dark * 20 - size * size * 10) / (size * size)) * 10;
  return score;
}
