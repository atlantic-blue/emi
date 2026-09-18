import { inflateSync } from 'node:zlib';

/** Straight, not premultiplied, four channels a pixel, row major. */
export interface Image {
  readonly width: number;
  readonly height: number;
  readonly pixels: Uint8Array;
}

export interface Box {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const CHANNELS_BY_COLOUR_TYPE: Readonly<Record<number, number>> = { 0: 1, 2: 3, 4: 2, 6: 4 };

function readUnsigned32(bytes: Uint8Array, at: number): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return view.getUint32(at);
}

function paeth(left: number, above: number, upperLeft: number): number {
  const estimate = left + above - upperLeft;
  const toLeft = Math.abs(estimate - left);
  const toAbove = Math.abs(estimate - above);
  const toUpperLeft = Math.abs(estimate - upperLeft);
  if (toLeft <= toAbove && toLeft <= toUpperLeft) return left;
  if (toAbove <= toUpperLeft) return above;
  return upperLeft;
}

function undoFilters(raw: Uint8Array, width: number, height: number, channels: number): Uint8Array {
  const rowBytes = width * channels;
  const out = new Uint8Array(rowBytes * height);

  for (let row = 0; row < height; row += 1) {
    const filter = raw[row * (rowBytes + 1)];
    const from = row * (rowBytes + 1) + 1;
    const to = row * rowBytes;

    for (let at = 0; at < rowBytes; at += 1) {
      const value = raw[from + at] ?? 0;
      const left = at >= channels ? (out[to + at - channels] ?? 0) : 0;
      const above = row > 0 ? (out[to - rowBytes + at] ?? 0) : 0;
      const upperLeft = row > 0 && at >= channels ? (out[to - rowBytes + at - channels] ?? 0) : 0;

      let restored: number;
      switch (filter) {
        case 0:
          restored = value;
          break;
        case 1:
          restored = value + left;
          break;
        case 2:
          restored = value + above;
          break;
        case 3:
          restored = value + Math.floor((left + above) / 2);
          break;
        case 4:
          restored = value + paeth(left, above, upperLeft);
          break;
        default:
          throw new Error(
            `the png uses filter ${String(filter)} on row ${row}, which is not one of the five`,
          );
      }

      out[to + at] = restored & 0xff;
    }
  }

  return out;
}

/**
 * Enough of the format to read what a rasteriser writes: eight bits a channel, no interlacing, no
 * palette. Anything else is refused by name rather than read wrongly.
 */
export function decodePng(bytes: Uint8Array): Image {
  for (const [at, expected] of SIGNATURE.entries()) {
    if (bytes[at] !== expected) {
      throw new Error('the file does not start with the png signature');
    }
  }

  let width = 0;
  let height = 0;
  let channels = 0;
  const parts: Uint8Array[] = [];

  let at = 8;
  while (at < bytes.length) {
    const length = readUnsigned32(bytes, at);
    const kind = String.fromCharCode(...bytes.slice(at + 4, at + 8));
    const body = bytes.slice(at + 8, at + 8 + length);

    if (kind === 'IHDR') {
      width = readUnsigned32(body, 0);
      height = readUnsigned32(body, 4);
      const depth = body[8];
      const colourType = body[9] ?? -1;
      const interlace = body[12];
      if (depth !== 8)
        throw new Error(`the png is ${String(depth)} bits a channel, and only 8 is read here`);
      if (interlace !== 0)
        throw new Error('the png is interlaced, and only the plain layout is read here');
      channels = CHANNELS_BY_COLOUR_TYPE[colourType] ?? 0;
      if (channels === 0)
        throw new Error(`the png uses colour type ${String(colourType)}, which is not read here`);
    } else if (kind === 'IDAT') {
      parts.push(body);
    } else if (kind === 'IEND') {
      break;
    }

    at += length + 12;
  }

  if (width === 0 || height === 0) throw new Error('the png carries no header');

  const raw = undoFilters(inflateSync(Buffer.concat(parts)), width, height, channels);
  const pixels = new Uint8Array(width * height * 4);

  for (let index = 0; index < width * height; index += 1) {
    const from = index * channels;
    const to = index * 4;
    const first = raw[from] ?? 0;
    if (channels >= 3) {
      pixels[to] = first;
      pixels[to + 1] = raw[from + 1] ?? 0;
      pixels[to + 2] = raw[from + 2] ?? 0;
      pixels[to + 3] = channels === 4 ? (raw[from + 3] ?? 255) : 255;
    } else {
      pixels[to] = first;
      pixels[to + 1] = first;
      pixels[to + 2] = first;
      pixels[to + 3] = channels === 2 ? (raw[from + 1] ?? 255) : 255;
    }
  }

  return { width, height, pixels };
}

export interface Colour {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
}

export function colourFromHex(hex: string): Colour {
  const digits = hex.replace('#', '');
  return {
    red: Number.parseInt(digits.slice(0, 2), 16),
    green: Number.parseInt(digits.slice(2, 4), 16),
    blue: Number.parseInt(digits.slice(4, 6), 16),
  };
}

export function pixelAt(image: Image, x: number, y: number): Colour & { readonly alpha: number } {
  const at = (y * image.width + x) * 4;
  return {
    red: image.pixels[at] ?? 0,
    green: image.pixels[at + 1] ?? 0,
    blue: image.pixels[at + 2] ?? 0,
    alpha: image.pixels[at + 3] ?? 0,
  };
}

function distanceFromGround(
  pixel: Colour & { readonly alpha: number },
  ground: Colour | 'nothing',
): number {
  if (ground === 'nothing') return pixel.alpha;

  const over = (channel: number, under: number): number =>
    (channel * pixel.alpha + under * (255 - pixel.alpha)) / 255;

  return Math.max(
    Math.abs(over(pixel.red, ground.red) - ground.red),
    Math.abs(over(pixel.green, ground.green) - ground.green),
    Math.abs(over(pixel.blue, ground.blue) - ground.blue),
  );
}

/**
 * The extent of the drawing, measured rather than assumed. A pixel counts as ink once it is more
 * than half way from the ground to the strongest pixel in the image, which puts the edge of the box
 * on the geometric edge of the shape however the rasteriser softened it.
 */
export function inkBox(image: Image, ground: Colour | 'nothing'): Box {
  let strongest = 0;
  const distances = new Float64Array(image.width * image.height);

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const distance = distanceFromGround(pixelAt(image, x, y), ground);
      distances[y * image.width + x] = distance;
      strongest = Math.max(strongest, distance);
    }
  }

  if (strongest === 0) {
    throw new Error('the image holds no ink at all, only its ground');
  }

  let left = image.width;
  let top = image.height;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if ((distances[y * image.width + x] ?? 0) <= strongest / 2) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }

  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}
