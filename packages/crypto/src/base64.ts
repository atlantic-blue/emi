/**
 * Base 64, written here rather than taken from a platform. Node has `Buffer` and a browser has
 * `atob`, and a React Native runtime reliably has neither, so one implementation serves the phone
 * and the service and a vector means the same thing in both.
 */

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const values = new Map<string, number>(
  [...alphabet].map((character, value) => [character, value] as const),
);

/** The one way base 64 refuses, as a value, so a caller matches on the reason and not on words. */
export type Base64Refusal = 'text-is-not-base64';

/** Carries the refusal beside the message, the way the envelope and the signature do. */
export class Base64Error extends Error {
  readonly refusal: Base64Refusal;

  constructor(message: string) {
    super(message);
    this.name = 'Base64Error';
    this.refusal = 'text-is-not-base64';
  }
}

/** Bytes to text, padded with `=` so the length always reaches a multiple of four. */
export function base64Of(bytes: Uint8Array): string {
  let written = '';

  for (let at = 0; at < bytes.length; at += 3) {
    const first = bytes[at] as number;
    const second = bytes[at + 1];
    const third = bytes[at + 2];

    written += alphabet[first >> 2] as string;
    written += alphabet[((first & 0b11) << 4) | ((second ?? 0) >> 4)] as string;
    written +=
      second === undefined
        ? '='
        : (alphabet[((second & 0b1111) << 2) | ((third ?? 0) >> 6)] as string);
    written += third === undefined ? '=' : (alphabet[third & 0b111111] as string);
  }

  return written;
}

/**
 * Text to bytes. Anything outside the alphabet is refused rather than skipped, because a public key
 * that quietly loses a character is a public key that verifies nothing.
 */
export function bytesFromBase64(text: string): Uint8Array {
  const body = text.endsWith('==')
    ? text.slice(0, -2)
    : text.endsWith('=')
      ? text.slice(0, -1)
      : text;

  if (text.length % 4 !== 0 || body.includes('=')) {
    throw new Base64Error('the text is not a whole number of base 64 groups');
  }

  const bits: number[] = [];

  for (const character of body) {
    const value = values.get(character);

    if (value === undefined) {
      throw new Base64Error(`the text holds "${character}", which base 64 does not use`);
    }

    bits.push(value);
  }

  const bytes = new Uint8Array(Math.floor((bits.length * 6) / 8));
  let held = 0;
  let count = 0;
  let written = 0;

  for (const value of bits) {
    held = (held << 6) | value;
    count += 6;

    if (count >= 8) {
      count -= 8;
      bytes[written] = (held >> count) & 0xff;
      written += 1;
    }
  }

  return bytes;
}
