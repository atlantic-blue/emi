import { createHash } from 'node:crypto';

import { PayerError, payerDigestFor, payerDigestSeparator, type PayerRefusal } from '../src/payer';
import { accountIdLength, crockfordAlphabet, crockfordBase32, digestOf } from '../src/signature';

const thePool = 'eu-central-1_NOTAPOOL';
const anotherPool = 'eu-central-1_NOTAPOOLEITHER';
const theName = 'SignInWithApple_000123.abc.0001';
const anotherName = 'Google_000123abc0001';

// Checked in. A change to the parts, to their order, to the separator or to the base 32 writer
// moves this value, so it goes red here rather than orphaning a payment somebody already made.
// Cross checked against the SHA-256 in node:crypto on 2026-11-16.
const theDigest = 'J62830S5GNJTGBTYKZZ4BB5DZG';

const refusalOf = (poolId: string, userName: string): PayerRefusal => {
  try {
    payerDigestFor(poolId, userName);
  } catch (thrown) {
    if (thrown instanceof PayerError) {
      return thrown.refusal;
    }
  }

  throw new Error(`a digest of "${poolId}" and "${userName}" was not refused`);
};

describe('a payment is held under a digest of the way she signs in', () => {
  describe('the payer digest', () => {
    it('is twenty six characters of Crockford base 32', () => {
      const digest = payerDigestFor(thePool, theName);

      expect(digest).toHaveLength(accountIdLength);
      expect([...digest].every((character) => crockfordAlphabet.includes(character))).toBe(true);
    });

    it('is the checked in digest for the checked in pool and name', () => {
      expect(payerDigestFor(thePool, theName)).toBe(theDigest);
    });

    it('is the digest of the pool, a newline and the name, cut to sixteen bytes', () => {
      const digest = createHash('sha256')
        .update(Buffer.from(`${thePool}\n${theName}`, 'utf8'))
        .digest();

      expect(payerDigestFor(thePool, theName)).toBe(crockfordBase32(digest.subarray(0, 16)));
    });

    it('is written in the shape the account identifier is written in', () => {
      const parts = new TextEncoder().encode(`${thePool}${payerDigestSeparator}${theName}`);

      expect(payerDigestFor(thePool, theName)).toBe(digestOf(parts));
    });

    it('is the same digest every time the same pair is read', () => {
      expect(payerDigestFor(thePool, theName)).toBe(payerDigestFor(thePool, theName));
    });

    it('moves when the pool moves, so one name in two pools is two payers', () => {
      expect(payerDigestFor(anotherPool, theName)).not.toBe(theDigest);
    });

    it('moves when the name moves, so two ways in are two payers', () => {
      expect(payerDigestFor(thePool, anotherName)).not.toBe(theDigest);
    });

    it('is not the digest of the same two parts the other way round', () => {
      expect(payerDigestFor(theName, thePool)).not.toBe(theDigest);
    });
  });

  describe('a part that is missing', () => {
    it('refuses an empty pool user name, because a payment with no payer reaches nobody', () => {
      expect(refusalOf(thePool, '')).toBe('user-name-is-missing');
    });

    it('refuses an empty pool identifier', () => {
      expect(refusalOf('', theName)).toBe('pool-is-missing');
    });

    it('refuses rather than writing one digest for every caller that lost a value', () => {
      expect(() => payerDigestFor('', '')).toThrow(PayerError);
    });

    it('says which part is missing, in the message as well as the refusal', () => {
      expect(() => payerDigestFor(thePool, '')).toThrow('a payer digest needs the pool user name');
      expect(() => payerDigestFor('', theName)).toThrow('a payer digest needs the pool identifier');
    });
  });
});
