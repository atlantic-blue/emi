/** Six bytes of time, then ten bytes that carry the version, the variant and the randomness. */
export const uuidV7RandomByteCount = 10;

const maximumMillis = 2 ** 48 - 1;

/**
 * A universally unique identifier, version 7: the write time in the first six bytes, so the
 * identifiers one phone writes sort in the order she wrote them.
 */
export function uuidV7(millis: number, random: Uint8Array): string {
  if (!Number.isInteger(millis) || millis < 0 || millis > maximumMillis) {
    throw new Error(
      `a version 7 identifier needs a whole millisecond count, this one is ${millis}`,
    );
  }
  if (random.length !== uuidV7RandomByteCount) {
    throw new Error(
      `a version 7 identifier needs ${uuidV7RandomByteCount} random bytes, this one has ${random.length}`,
    );
  }

  const source = new DataView(random.buffer, random.byteOffset, random.byteLength);
  const bytes = new Uint8Array(16);
  const out = new DataView(bytes.buffer);

  const millisAbove32Bits = Math.floor(millis / 2 ** 32);
  out.setUint16(0, millisAbove32Bits);
  out.setUint32(2, millis - millisAbove32Bits * 2 ** 32);
  out.setUint8(6, 0x70 | (source.getUint8(0) & 0x0f));
  out.setUint8(7, source.getUint8(1));
  out.setUint8(8, 0x80 | (source.getUint8(2) & 0x3f));
  bytes.set(random.subarray(3), 9);

  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-');
}
