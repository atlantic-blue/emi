import { argon2id } from '@noble/hashes/argon2.js';

import { EnvelopeError, headerLength, keyLength, tagLength } from '../src/envelope';
import {
  drawRecoveryCode,
  drawRecoverySalt,
  openWrappedVaultKey,
  readRecoveryCode,
  readWrappedVaultKey,
  RecoveryError,
  recoveryCodeBits,
  recoveryCodeLength,
  recoveryKeyFrom,
  recoveryParameters,
  recoverySaltLength,
  wrappedVaultKeyLength,
  wrapVaultKey,
} from '../src/recovery';
import { crockfordAlphabet } from '../src/signature';

/** A generator that gives the same bytes every run, so a failure names the same code. */
const fixedRandom =
  (seed: number) =>
  (byteCount: number): Uint8Array =>
    new Uint8Array(byteCount).map((_, at) => (at * 37 + seed * 11 + 1) % 256);

const herVaultKey = new Uint8Array(keyLength).map((_, at) => (at * 13 + 5) % 256);
const herSalt = drawRecoverySalt(fixedRandom(2));
const herCode = drawRecoveryCode(fixedRandom(1));

/**
 * Argon2id costs about a tenth of a second by design, so the keys these cases share are derived
 * once here. The case that pins the parameters derives its own, because that is what it checks.
 */
const herRecoveryKey = recoveryKeyFrom(herCode, herSalt);
const aWrongCode = drawRecoveryCode(fixedRandom(22));
const keyFromTheWrongCode = recoveryKeyFrom(aWrongCode, herSalt);
const anotherSalt = drawRecoverySalt(fixedRandom(19));
const keyFromAnotherSalt = recoveryKeyFrom(herCode, anotherSalt);
const herWrappedKey = wrapVaultKey(herVaultKey, herRecoveryKey, fixedRandom(3));

const refusalOf = (run: () => unknown): string => {
  try {
    run();
  } catch (thrown) {
    if (thrown instanceof RecoveryError || thrown instanceof EnvelopeError) {
      return thrown.refusal;
    }

    return `threw ${String(thrown)}`;
  }

  return 'nothing was refused';
};

describe('the recovery code, which is contract VAULT-2', () => {
  describe('the code she writes down', () => {
    it('is 26 characters, every one of them from the alphabet she was shown', () => {
      const code = drawRecoveryCode(fixedRandom(4));

      expect(code).toHaveLength(recoveryCodeLength);
      expect([...code].every((character) => crockfordAlphabet.includes(character))).toBe(true);
    });

    it('carries 130 bits, which is 26 characters of an alphabet of 32', () => {
      expect(crockfordAlphabet).toHaveLength(32);
      expect(recoveryCodeLength * Math.log2(crockfordAlphabet.length)).toBe(recoveryCodeBits);
    });

    it('draws every character evenly, so no part of the alphabet comes up more often', () => {
      const counts = new Map<string, number>();
      const everyByteValue = everyByteInTurn();

      // 26 characters times 128 draws is 3328 bytes, which is each of the 256 values thirteen
      // times over. An alphabet the low five bits did not divide evenly lands here as a gap.
      for (let draw = 0; draw < 128; draw += 1) {
        for (const character of drawRecoveryCode(everyByteValue)) {
          counts.set(character, (counts.get(character) ?? 0) + 1);
        }
      }

      const seen = [...counts.values()];

      expect(counts.size).toBe(crockfordAlphabet.length);
      expect(Math.min(...seen)).toBe(104);
      expect(Math.max(...seen)).toBe(104);
    });

    it('is a different code on the next phone', () => {
      expect(drawRecoveryCode(fixedRandom(5))).not.toBe(drawRecoveryCode(fixedRandom(6)));
    });

    it('is refused rather than drawn when the generator is not running', () => {
      expect(refusalOf(() => drawRecoveryCode(() => new Uint8Array(recoveryCodeLength)))).toBe(
        'random-source-returned-zeroes',
      );
    });

    it('is refused when the generator gives back fewer bytes than it was asked for', () => {
      expect(refusalOf(() => drawRecoveryCode(() => new Uint8Array(4).fill(9)))).toBe(
        'random-source-is-the-wrong-length',
      );
    });
  });

  describe('the salt', () => {
    it('is 16 bytes', () => {
      expect(drawRecoverySalt(fixedRandom(7))).toHaveLength(recoverySaltLength);
    });

    it('is a different salt on the next account, so one code never opens two vaults', () => {
      expect([...herSalt]).not.toEqual([...anotherSalt]);
      expect([...herRecoveryKey]).not.toEqual([...keyFromAnotherSalt]);
    });

    it('is refused rather than shared when the generator is not running', () => {
      expect(refusalOf(() => drawRecoverySalt(() => new Uint8Array(recoverySaltLength)))).toBe(
        'random-source-returned-zeroes',
      );
    });
  });

  describe('reading back what she typed', () => {
    it('reads the code she was shown, unchanged', () => {
      expect(readRecoveryCode(herCode)).toBe(herCode);
    });

    it('reads it in lower case, because paper has no case', () => {
      expect(readRecoveryCode(herCode.toLowerCase())).toBe(herCode);
    });

    it('reads the spaces and hyphens she put in to keep her place', () => {
      const spaced = `${herCode.slice(0, 6)} ${herCode.slice(6, 12)}-${herCode.slice(12)}`;

      expect(readRecoveryCode(spaced)).toBe(herCode);
    });

    it('reads a capital i and a letter l as the one they stand for', () => {
      expect(readRecoveryCode(`I${'0'.repeat(recoveryCodeLength - 2)}L`)).toBe(
        `1${'0'.repeat(recoveryCodeLength - 2)}1`,
      );
    });

    it('reads a letter o as the zero it stands for', () => {
      expect(readRecoveryCode('O'.repeat(recoveryCodeLength))).toBe('0'.repeat(recoveryCodeLength));
    });

    it('refuses a letter the alphabet leaves out rather than guessing what she meant', () => {
      expect(refusalOf(() => readRecoveryCode(`U${herCode.slice(1)}`))).toBe(
        'recovery-code-is-not-crockford-base32',
      );
    });

    it('refuses a code one character short', () => {
      expect(refusalOf(() => readRecoveryCode(herCode.slice(1)))).toBe(
        'recovery-code-is-the-wrong-length',
      );
    });

    it('refuses a code one character long', () => {
      expect(refusalOf(() => readRecoveryCode(`${herCode}7`))).toBe(
        'recovery-code-is-the-wrong-length',
      );
    });

    it('says what is wrong without ever writing the code back out', () => {
      const messages = [
        messageOf(() => readRecoveryCode(`${herCode}U`)),
        messageOf(() => readRecoveryCode(herCode.slice(2))),
        messageOf(() => recoveryKeyFrom(herCode, new Uint8Array(3))),
        messageOf(() => openWrappedVaultKey(herWrappedKey, keyFromTheWrongCode)),
      ].join('\n');

      for (const spelling of everySpellingOf(herCode)) {
        expect(messages).not.toContain(spelling);
      }
    });
  });

  describe('the key her code derives', () => {
    it('is Argon2id at the parameters of the one constant', () => {
      expect(recoveryParameters).toEqual({
        memoryKiB: 19456,
        passes: 2,
        lanes: 1,
        derivedLength: keyLength,
      });

      expect([...recoveryKeyFrom(herCode, herSalt)]).toEqual([
        ...argon2id(herCode, herSalt, {
          m: recoveryParameters.memoryKiB,
          t: recoveryParameters.passes,
          p: recoveryParameters.lanes,
          dkLen: recoveryParameters.derivedLength,
        }),
      ]);
    });

    it('is the same key from the code however she typed it', () => {
      const typed = `${herCode.slice(0, 8).toLowerCase()}-${herCode.slice(8)}`;

      expect([...recoveryKeyFrom(typed, herSalt)]).toEqual([...herRecoveryKey]);
    });

    it('refuses a salt that is not 16 bytes', () => {
      expect(refusalOf(() => recoveryKeyFrom(herCode, new Uint8Array(15)))).toBe(
        'recovery-salt-is-the-wrong-length',
      );
    });
  });

  describe('the vault key sealed under it', () => {
    it('is recovered from the code alone, byte for byte', () => {
      expect([...openWrappedVaultKey(herWrappedKey, herRecoveryKey)]).toEqual([...herVaultKey]);
    });

    it('is exactly the header, a key and a tag, so its length gives nothing else away', () => {
      expect(wrappedVaultKeyLength).toBe(headerLength + keyLength + tagLength);
      expect(herWrappedKey).toHaveLength(wrappedVaultKeyLength);
    });

    it('holds the vault key nowhere a reader could find it', () => {
      expect(hexOf(herWrappedKey)).not.toContain(hexOf(herVaultKey));
    });

    it('is different bytes every time, because the nonce is drawn again', () => {
      expect(hexOf(wrapVaultKey(herVaultKey, herRecoveryKey, fixedRandom(3)))).not.toBe(
        hexOf(wrapVaultKey(herVaultKey, herRecoveryKey, fixedRandom(4))),
      );
    });

    it('opens nothing at all under a wrong code, rather than handing back rubbish', () => {
      expect(aWrongCode).not.toBe(herCode);
      expect(refusalOf(() => openWrappedVaultKey(herWrappedKey, keyFromTheWrongCode))).toBe(
        'wrapped-vault-key-does-not-open',
      );
    });

    it('opens nothing under the right code and the wrong salt', () => {
      expect(refusalOf(() => openWrappedVaultKey(herWrappedKey, keyFromAnotherSalt))).toBe(
        'wrapped-vault-key-does-not-open',
      );
    });

    it('opens nothing when one bit of it was changed on the way', () => {
      const refusals = new Set<string>();

      for (let at = 1; at < herWrappedKey.length; at += 1) {
        const changed = Uint8Array.from(herWrappedKey);
        changed[at] = (changed[at] as number) ^ 0b1;
        refusals.add(refusalOf(() => openWrappedVaultKey(changed, herRecoveryKey)));
      }

      expect([...refusals]).toEqual(['wrapped-vault-key-does-not-open']);
    });

    it('refuses to wrap anything that is not a vault key', () => {
      expect(refusalOf(() => wrapVaultKey(new Uint8Array(31), herRecoveryKey))).toBe(
        'key-is-the-wrong-length',
      );
    });
  });

  describe('what the service reads, holding no key', () => {
    it('reads the version and the nonce and nothing further', () => {
      const parts = readWrappedVaultKey(herWrappedKey);

      expect(parts.version).toBe(1);
      expect(parts.nonce).toHaveLength(24);
      expect(parts.sealed).toHaveLength(keyLength + tagLength);
    });

    it('refuses bytes shorter than a wrapped key', () => {
      expect(refusalOf(() => readWrappedVaultKey(herWrappedKey.slice(0, -1)))).toBe(
        'wrapped-vault-key-is-the-wrong-length',
      );
    });

    it('refuses bytes longer than a wrapped key, which is where a day would hide', () => {
      expect(
        refusalOf(() => readWrappedVaultKey(new Uint8Array(wrappedVaultKeyLength + 1).fill(1))),
      ).toBe('wrapped-vault-key-is-the-wrong-length');
    });

    it('refuses a version it does not know', () => {
      const unknown = Uint8Array.from(herWrappedKey);
      unknown[0] = 9;

      expect(refusalOf(() => readWrappedVaultKey(unknown))).toBe('version-is-not-known');
    });
  });
});

/**
 * One source that walks 0 to 255 over and over, across every draw it is given to. Uniform bytes
 * in, so anything uneven that comes out is the drawing and not the source.
 */
function everyByteInTurn(): (byteCount: number) => Uint8Array {
  let next = 0;

  return (byteCount) =>
    new Uint8Array(byteCount).map(() => {
      const value = next % 256;
      next += 1;

      return value;
    });
}

function hexOf(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** The ways a code could reach a message: as itself, in lower case, or in part. */
function everySpellingOf(code: string): string[] {
  return [code, code.toLowerCase(), code.slice(0, 8), code.slice(-8)];
}

function messageOf(run: () => unknown): string {
  try {
    run();
  } catch (thrown) {
    return thrown instanceof Error ? `${thrown.name} ${thrown.message}` : String(thrown);
  }

  return '';
}
