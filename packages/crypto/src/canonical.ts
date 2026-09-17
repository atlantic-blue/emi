/**
 * Canonical json: the keys of every object sorted, no whitespace. The same record therefore
 * produces the same bytes on every phone and in every version, which is what lets a vector be
 * checked into this repository and still mean something a year from now.
 */

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue | undefined };

export type CanonicalRefusal = 'value-is-not-json' | 'number-is-not-finite';

export class CanonicalError extends Error {
  readonly refusal: CanonicalRefusal;

  constructor(refusal: CanonicalRefusal, message: string) {
    super(message);
    this.name = 'CanonicalError';
    this.refusal = refusal;
  }
}

export function canonicalJson(value: JsonValue): string {
  return written(value, 'the record');
}

export function canonicalBytes(value: JsonValue): Uint8Array {
  return new TextEncoder().encode(canonicalJson(value));
}

export function fromCanonicalBytes(bytes: Uint8Array): unknown {
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
}

function written(value: unknown, at: string): string {
  if (value === null) {
    return 'null';
  }

  switch (typeof value) {
    case 'boolean':
      return value ? 'true' : 'false';
    case 'number':
      return writtenNumber(value, at);
    case 'string':
      return JSON.stringify(value);
    case 'object':
      return Array.isArray(value)
        ? writtenArray(value as readonly unknown[], at)
        : writtenObject(value, at);
    default:
      throw new CanonicalError('value-is-not-json', `${at} carries a ${typeof value}`);
  }
}

function writtenNumber(value: number, at: string): string {
  if (!Number.isFinite(value)) {
    throw new CanonicalError('number-is-not-finite', `${at} carries ${String(value)}`);
  }

  // JSON.stringify writes the shortest text that reads back as this number, and it writes minus
  // zero as zero, so two records that differ only in the sign of a zero are one record here.
  return JSON.stringify(value);
}

function writtenArray(values: readonly unknown[], at: string): string {
  return `[${values.map((item, index) => written(item, `${at}[${index}]`)).join(',')}]`;
}

function writtenObject(value: object, at: string): string {
  const prototype: unknown = Object.getPrototypeOf(value);
  // A Date, a Map or a class instance would be written as {} and the reader would never know a
  // thing was lost, so anything that is not a plain object is refused instead.
  if (prototype !== Object.prototype && prototype !== null) {
    throw new CanonicalError('value-is-not-json', `${at} carries ${value.constructor.name}`);
  }

  const held = value as Record<string, unknown>;
  const keys = Object.keys(held)
    .filter((key) => held[key] !== undefined)
    .sort(byCodeUnit);

  return `{${keys.map((key) => `${JSON.stringify(key)}:${written(held[key], `${at}.${key}`)}`).join(',')}}`;
}

function byCodeUnit(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  return left > right ? 1 : 0;
}
