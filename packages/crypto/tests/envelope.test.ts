import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  EnvelopeError,
  type EnvelopeRefusal,
  type RandomSource,
  envelopeVersion,
  headerLength,
  keyLength,
  nonceLength,
  openBytes,
  openRecord,
  readEnvelope,
  sealRecord,
  systemRandom,
  tagLength,
} from '../src/envelope';
import { type DayRecord, recordBytes, recordJson } from '../src/record';

interface Vector {
  readonly name: string;
  readonly keyHex: string;
  readonly nonceHex: string;
  readonly record: DayRecord;
  readonly canonicalJson: string;
  readonly envelopeHex: string;
}

interface VectorFile {
  readonly version: number;
  readonly vectors: readonly Vector[];
}

const vectorFile = JSON.parse(readFileSync(join(__dirname, 'vectors.json'), 'utf8')) as VectorFile;

function bytesFromHex(hex: string): Uint8Array {
  const bytes = hex.match(/../g) ?? [];
  return Uint8Array.from(bytes.map((pair) => Number.parseInt(pair, 16)));
}

function hexFromBytes(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** A vector carries its own nonce, so the source it passes hands back exactly those bytes. */
function fixedRandom(nonce: Uint8Array): RandomSource {
  return (byteCount: number): Uint8Array => {
    if (byteCount !== nonce.length) {
      throw new Error(
        `the envelope asked for ${byteCount} bytes and the vector holds ${nonce.length}`,
      );
    }
    return nonce;
  };
}

function refusalOf(act: () => unknown): EnvelopeRefusal {
  try {
    act();
  } catch (error) {
    if (error instanceof EnvelopeError) {
      return error.refusal;
    }
    throw error;
  }
  throw new Error('the call was accepted and a refusal was expected');
}

const key = bytesFromHex('9f'.repeat(keyLength));

const aDay: DayRecord = {
  day: '2026-03-14',
  flow: 'medium',
  symptoms: ['cramps', 'low-mood'],
  energy: 2,
  temperatureCelsius: 36.6,
  note: 'a long afternoon',
  recordedAt: '2026-03-14T21:05:00.000Z',
};

function sealed(record: DayRecord = aDay): Uint8Array {
  return sealRecord(record, key);
}

describe('the envelope', () => {
  describe('the bytes it writes', () => {
    it('opens as the record that went in', () => {
      expect(openRecord(sealed(), key)).toEqual(aDay);
    });

    it('starts with the version byte and carries a nonce of twenty four bytes', () => {
      const envelope = sealed();

      expect(envelope[0]).toBe(envelopeVersion);
      expect(readEnvelope(envelope).nonce).toHaveLength(nonceLength);
    });

    it('is the header, the plaintext and the tag, and nothing else', () => {
      const plaintext = recordBytes(aDay);

      expect(sealed()).toHaveLength(headerLength + plaintext.length + tagLength);
    });

    it('carries no readable part of the day', () => {
      const envelope = sealed();

      expect(hexFromBytes(envelope)).not.toContain(hexFromBytes(recordBytes(aDay).slice(0, 8)));
      expect(new TextDecoder().decode(envelope)).not.toContain('cramps');
    });
  });

  describe('a nonce is drawn fresh for every write', () => {
    it('writes the same day twice as two different envelopes', () => {
      const first = sealed();
      const second = sealed();

      expect(hexFromBytes(first)).not.toEqual(hexFromBytes(second));
      expect(openRecord(first, key)).toEqual(openRecord(second, key));
    });

    it('draws a nonce that is never seen twice across a hundred writes', () => {
      const nonces = new Set<string>();

      for (let write = 0; write < 100; write += 1) {
        nonces.add(hexFromBytes(readEnvelope(sealed()).nonce));
      }

      expect(nonces.size).toBe(100);
    });

    it('refuses a source that is not running and returns zeroes', () => {
      const stopped: RandomSource = (byteCount) => new Uint8Array(byteCount);

      expect(refusalOf(() => sealRecord(aDay, key, { random: stopped }))).toBe('nonce-is-all-zero');
    });

    it('refuses a source that returns the wrong number of bytes', () => {
      const short: RandomSource = () => new Uint8Array([1, 2, 3]);

      expect(refusalOf(() => sealRecord(aDay, key, { random: short }))).toBe(
        'random-source-is-the-wrong-length',
      );
    });
  });

  describe('a key of the wrong length', () => {
    it('is refused on the way in', () => {
      expect(refusalOf(() => sealRecord(aDay, new Uint8Array(16)))).toBe('key-is-the-wrong-length');
    });

    it('is refused on the way out', () => {
      expect(refusalOf(() => openRecord(sealed(), new Uint8Array(31)))).toBe(
        'key-is-the-wrong-length',
      );
    });
  });

  describe('another key', () => {
    it('opens nothing', () => {
      const other = bytesFromHex('11'.repeat(keyLength));

      expect(refusalOf(() => openRecord(sealed(), other))).toBe('envelope-is-not-authentic');
    });
  });

  describe('a truncated envelope', () => {
    it('is refused at every length short of a header, a byte and a tag', () => {
      const envelope = sealed();
      const shortest = headerLength + tagLength + 1;
      const refusals = new Set<string>();

      for (let length = 0; length < shortest; length += 1) {
        refusals.add(refusalOf(() => readEnvelope(envelope.slice(0, length))));
      }

      expect(refusals).toEqual(new Set(['envelope-is-truncated']));
      expect(shortest).toBe(42);
    });

    it('is refused when the tag alone is cut away', () => {
      const envelope = sealed();

      expect(refusalOf(() => openBytes(envelope.slice(0, envelope.length - tagLength), key))).toBe(
        'envelope-is-not-authentic',
      );
    });
  });

  describe('a version byte that is not one', () => {
    it('is refused rather than read as version one', () => {
      const envelope = sealed();

      for (const version of [0x00, 0x02, 0x7f, 0xff]) {
        const other = Uint8Array.from(envelope);
        other[0] = version;

        expect(refusalOf(() => readEnvelope(other))).toBe('version-is-not-known');
      }
    });
  });

  describe('the random source the phone passes', () => {
    it('is the platform generator, and it draws the length that was asked for', () => {
      expect(systemRandom(nonceLength)).toHaveLength(nonceLength);
      expect(hexFromBytes(systemRandom(nonceLength))).not.toBe(
        hexFromBytes(systemRandom(nonceLength)),
      );
    });
  });

  describe('the vectors checked into this repository', () => {
    it('holds a vector for every version the format has', () => {
      expect(vectorFile.version).toBe(envelopeVersion);
      expect(vectorFile.vectors.length).toBeGreaterThanOrEqual(3);
    });

    it.each(vectorFile.vectors.map((vector) => [vector.name, vector] as const))(
      'opens %s as its known plaintext',
      (_name, vector) => {
        const envelope = bytesFromHex(vector.envelopeHex);

        expect(openRecord(envelope, bytesFromHex(vector.keyHex))).toEqual(vector.record);
        expect(new TextDecoder().decode(openBytes(envelope, bytesFromHex(vector.keyHex)))).toBe(
          vector.canonicalJson,
        );
      },
    );

    it.each(vectorFile.vectors.map((vector) => [vector.name, vector] as const))(
      'writes %s as the same bytes it was written as',
      (_name, vector) => {
        const written = sealRecord(vector.record, bytesFromHex(vector.keyHex), {
          random: fixedRandom(bytesFromHex(vector.nonceHex)),
        });

        // The record goes in, not the stored text, so the sorting and the spacing of the
        // canonical json are pinned by these bytes as much as the cipher is.
        expect(recordJson(vector.record)).toBe(vector.canonicalJson);
        expect(hexFromBytes(written)).toBe(vector.envelopeHex);
      },
    );
  });
});

describe('every flipped bit in an envelope', () => {
  it('rejects the flip at every bit of every byte', () => {
    const envelope = sealed();
    const opened: string[] = [];
    const refusals = new Set<EnvelopeRefusal>();

    for (let index = 0; index < envelope.length; index += 1) {
      for (let bit = 0; bit < 8; bit += 1) {
        const changed = Uint8Array.from(envelope);
        changed[index] = (envelope[index] ?? 0) ^ (1 << bit);

        try {
          openRecord(changed, key);
          opened.push(`byte ${index}, bit ${bit}`);
        } catch (error) {
          if (!(error instanceof EnvelopeError)) {
            throw error;
          }
          refusals.add(error.refusal);
        }
      }
    }

    expect(opened).toEqual([]);
    expect(refusals).toEqual(new Set(['version-is-not-known', 'envelope-is-not-authentic']));
    expect(envelope.length * 8).toBeGreaterThan(600);
  });
});
