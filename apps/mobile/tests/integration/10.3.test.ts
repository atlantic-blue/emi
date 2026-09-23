import {
  EnvelopeError,
  ProfileError,
  longestCycleLengthDays,
  openProfile,
  openPulledRecord,
  sealProfile,
  sealRecord,
} from '@emi/crypto';

import { aDayRecord } from '../fixtures/dayRecord';
import { herKey, herRandom } from '../fixtures/herVault';
import { aProfileRecord } from '../fixtures/profileRecord';

const theDaySheAnswered = new Date('2026-09-23T09:14:00.000Z');

/** What the first run will hand the vault: her answers, sealed under the key her phone holds. */
function sealedWithHerKey(profile = aProfileRecord()): Uint8Array {
  return sealProfile(profile, herKey(), { random: herRandom, now: theDaySheAnswered });
}

function refusalFor(cycleLengthDays: number): readonly string[] {
  try {
    sealedWithHerKey(aProfileRecord({ cycleLengthDays }));
  } catch (error) {
    if (error instanceof ProfileError) {
      return error.problems;
    }
    throw error;
  }
  throw new Error(`a cycle of ${cycleLengthDays} days was sealed and a refusal was expected`);
}

describe('a profile with a cycle length of 46 days is refused before it is sealed', () => {
  describe('the number she typed', () => {
    it('produces no bytes at all, so nothing wrong reaches a payload', () => {
      expect(() => sealedWithHerKey(aProfileRecord({ cycleLengthDays: 46 }))).toThrow(ProfileError);
    });

    it('names the bound in the refusal, so a screen can tell her what to change', () => {
      expect(refusalFor(46)).toEqual(['a cycle length runs from 21 to 45, this one is 46']);
    });

    it('is accepted at forty five, which is the longest cycle the first run offers', () => {
      expect(
        sealedWithHerKey(aProfileRecord({ cycleLengthDays: longestCycleLengthDays })).length,
      ).toBeGreaterThan(0);
    });

    it('is refused at twenty, which is the other end of the same bound', () => {
      expect(refusalFor(20)).toEqual(['a cycle length runs from 21 to 45, this one is 20']);
    });
  });

  describe('the answers that pass', () => {
    it('come back out of the envelope as she gave them', () => {
      const hers = aProfileRecord();

      expect(openProfile(sealedWithHerKey(hers), herKey())).toEqual(hers);
    });

    it('are not readable in the sealed bytes, which is why they are sealed', () => {
      const sealed = Buffer.from(sealedWithHerKey());

      expect(sealed.includes(Buffer.from('Maria'))).toBe(false);
      expect(sealed.includes(Buffer.from('profile'))).toBe(false);
      expect(sealed.includes(Buffer.from('cycleLengthDays'))).toBe(false);
    });

    it('stay shut to another key, so her phone is the only phone that reads them', () => {
      const anotherKey = herKey().map((byte) => byte ^ 0xff);

      expect(() => openProfile(sealedWithHerKey(), anotherKey)).toThrow(EnvelopeError);
    });
  });

  describe('the reader that sorts a pulled record', () => {
    it('gives back her answers when the record is a profile', () => {
      const hers = aProfileRecord();

      expect(openPulledRecord(sealedWithHerKey(hers), herKey())).toEqual({
        kind: 'profile',
        profile: hers,
      });
    });

    it('gives back a day she logged today, which names no kind and is not a profile', () => {
      const today = aDayRecord({ flow: 'medium' });
      const sealed = sealRecord(today, herKey(), { random: herRandom });

      expect(openPulledRecord(sealed, herKey())).toEqual({ kind: 'day', day: today });
    });
  });
});
