import { symptomGroups, type SymptomGroup } from '@emi/cycle';

import { canonicalJson } from '../src/canonical';
import {
  openProfile,
  openPulledRecord,
  openRecord,
  sealProfile,
  sealRecord,
} from '../src/envelope';
import {
  type Feeling,
  type Focus,
  type Goal,
  type ProfileRecord,
  type Regularity,
  ProfileError,
  checkedProfile,
  earliestBirthYear,
  feelingValues,
  focusValues,
  goalValues,
  longestCycleLengthDays,
  longestName,
  longestPeriodLengthDays,
  profileBytes,
  profileFromBytes,
  profileJson,
  profileKeys,
  profileKind,
  profileProblems,
  pulledFromBytes,
  regularityValues,
  shortestCycleLengthDays,
  shortestPeriodLengthDays,
  youngestBirthYears,
} from '../src/profile';
import { type DayRecord } from '../src/record';

const aProfile: ProfileRecord = {
  kind: 'profile',
  recordedAt: '2026-09-23T09:14:00.000Z',
};

/** The day the bounds are read against, so the newest year of birth does not move under a test. */
const theDaySheAnswered = new Date('2026-09-23T09:14:00.000Z');
const theNewestBirthYear = 2026 - youngestBirthYears;

function aProfileWith(fields: Record<string, unknown>): ProfileRecord {
  return { ...aProfile, ...fields } as ProfileRecord;
}

function problemsWith(fields: Record<string, unknown>): readonly string[] {
  return profileProblems(aProfileWith(fields), { now: theDaySheAnswered });
}

function refusedFor(fields: Record<string, unknown>): string {
  try {
    profileJson(aProfileWith(fields), { now: theDaySheAnswered });
  } catch (error) {
    if (error instanceof ProfileError) {
      return error.problems.join('; ');
    }
    throw error;
  }
  throw new Error('the profile was accepted and a refusal was expected');
}

function aKey(fill = 0x4d): Uint8Array {
  return new Uint8Array(32).fill(fill);
}

const fixedRandom = (byteCount: number): Uint8Array =>
  new Uint8Array(byteCount).map((_, at) => at + 1);

describe('the plaintext of a profile', () => {
  describe('the bounds the design names', () => {
    // The messages below carry these numbers as text. This case carries them as numbers, so a
    // bound cannot be widened by editing the constant and the sentence together.
    it('are the numbers in section 2, and nothing near them', () => {
      expect([shortestCycleLengthDays, longestCycleLengthDays]).toEqual([21, 45]);
      expect([shortestPeriodLengthDays, longestPeriodLengthDays]).toEqual([1, 15]);
      expect(longestName).toBe(40);
      expect(earliestBirthYear).toBe(1940);
      expect(youngestBirthYears).toBe(9);
    });
  });

  describe('the fields it may carry', () => {
    it('accepts a profile that fills every one of them', () => {
      const full: ProfileRecord = {
        kind: 'profile',
        name: 'Maria',
        birthYear: 1994,
        cycleLengthDays: 29,
        periodLengthDays: 5,
        regularity: 'moves',
        feeling: 'understand',
        goals: ['forecast', 'symptoms'],
        focus: ['sleep', 'pain'],
        recordedAt: '2026-09-23T09:14:00.000Z',
      };

      expect(profileProblems(full, { now: theDaySheAnswered })).toEqual([]);
      expect(Object.keys(full).sort()).toEqual([...profileKeys]);
    });

    it('accepts a profile that answers nothing but the two it must', () => {
      expect(profileProblems(aProfile, { now: theDaySheAnswered })).toEqual([]);
    });

    it('refuses a field the design does not name', () => {
      expect(refusedFor({ height: 168 })).toContain('height is not a field of a profile');
    });

    it('names every offence at once, so a screen can show them together', () => {
      expect(problemsWith({ cycleLengthDays: 46, periodLengthDays: 0 })).toHaveLength(2);
    });

    it('hands the profile back when it passes, so a seal has one gate and not two', () => {
      const answered = aProfileWith({ feeling: 'hard' });

      expect(checkedProfile(answered, { now: theDaySheAnswered })).toBe(answered);
    });
  });

  describe('the kind and the time she saved it', () => {
    it('refuses a profile that names no kind', () => {
      const withoutAKind = { recordedAt: aProfile.recordedAt } as unknown as ProfileRecord;

      expect(profileProblems(withoutAKind)).toEqual(['a profile names no kind']);
    });

    it('refuses a kind that is not profile, because a day is not a profile', () => {
      expect(refusedFor({ kind: 'day' })).toContain('a profile names its kind as profile');
    });

    it('refuses a profile that names no time it was saved', () => {
      const withoutATime = { kind: profileKind } as ProfileRecord;

      expect(profileProblems(withoutATime)).toEqual(['a profile names no time it was saved']);
    });

    it('refuses a time that is not an instant', () => {
      expect(refusedFor({ recordedAt: 'this morning' })).toContain(
        'the time it was saved is not an instant',
      );
    });
  });

  describe('her name', () => {
    it('accepts forty characters', () => {
      expect(problemsWith({ name: 'a'.repeat(longestName) })).toEqual([]);
    });

    it('refuses forty one, and says how many it holds', () => {
      expect(refusedFor({ name: 'a'.repeat(longestName + 1) })).toBe(
        `a name holds at most ${longestName} characters, this one holds ${longestName + 1}`,
      );
    });

    it('counts what she sees, so an emoji costs her one character and not two', () => {
      expect(problemsWith({ name: `${'🌙'.repeat(longestName)}` })).toEqual([]);
    });

    it('measures the length once the spaces at each end are taken off', () => {
      expect(problemsWith({ name: `  ${'a'.repeat(longestName)}  ` })).toEqual([]);
    });

    it('refuses a name that is nothing but spaces, because that is not a name', () => {
      expect(refusedFor({ name: '   ' })).toContain('holds at least one character');
    });

    it('refuses a line break, because the greeting sits on one line', () => {
      expect(refusedFor({ name: 'Maria\nJose' })).toBe(
        'a name sits on one line, this one carries a line break',
      );
    });

    it('refuses a name that is not text', () => {
      expect(refusedFor({ name: 7 })).toContain('a name is text, this one is 7');
    });
  });

  describe('her year of birth', () => {
    it('accepts the earliest year the screen offers', () => {
      expect(problemsWith({ birthYear: earliestBirthYear })).toEqual([]);
    });

    it('refuses the year before it', () => {
      expect(refusedFor({ birthYear: earliestBirthYear - 1 })).toContain(
        'a year of birth runs from',
      );
    });

    it('accepts the newest year, which is nine years back from the clock', () => {
      expect(problemsWith({ birthYear: theNewestBirthYear })).toEqual([]);
    });

    it('refuses a year that would make her a child', () => {
      expect(refusedFor({ birthYear: theNewestBirthYear + 1 })).toBe(
        `a year of birth runs from ${earliestBirthYear} to ${theNewestBirthYear}, ` +
          `this one is ${theNewestBirthYear + 1}`,
      );
    });

    it('moves its newest year with the clock, so a build does not age out', () => {
      const laterYear = new Date('2031-01-01T00:00:00.000Z');

      expect(profileProblems(aProfileWith({ birthYear: 2020 }), { now: laterYear })).toEqual([]);
    });

    it('refuses a year with a fraction', () => {
      expect(refusedFor({ birthYear: 1994.5 })).toContain('a year of birth is a whole number');
    });
  });

  describe('how long her cycle runs', () => {
    it('accepts the ends of the range', () => {
      expect(problemsWith({ cycleLengthDays: shortestCycleLengthDays })).toEqual([]);
      expect(problemsWith({ cycleLengthDays: longestCycleLengthDays })).toEqual([]);
    });

    it('refuses twenty days, which is shorter than the first run allows', () => {
      expect(refusedFor({ cycleLengthDays: shortestCycleLengthDays - 1 })).toBe(
        `a cycle length runs from ${shortestCycleLengthDays} to ${longestCycleLengthDays}, ` +
          `this one is ${shortestCycleLengthDays - 1}`,
      );
    });

    it('refuses forty six days, which is the number nobody should be able to seal', () => {
      expect(refusedFor({ cycleLengthDays: longestCycleLengthDays + 1 })).toBe(
        `a cycle length runs from ${shortestCycleLengthDays} to ${longestCycleLengthDays}, ` +
          `this one is ${longestCycleLengthDays + 1}`,
      );
    });

    it('refuses a length with a fraction', () => {
      expect(refusedFor({ cycleLengthDays: 28.5 })).toContain('a cycle length is a whole number');
    });
  });

  describe('how long her period runs', () => {
    it('accepts the ends of the range', () => {
      expect(problemsWith({ periodLengthDays: shortestPeriodLengthDays })).toEqual([]);
      expect(problemsWith({ periodLengthDays: longestPeriodLengthDays })).toEqual([]);
    });

    it('refuses zero days, because a period she had lasted at least one', () => {
      expect(refusedFor({ periodLengthDays: 0 })).toBe(
        `a period length runs from ${shortestPeriodLengthDays} to ${longestPeriodLengthDays}, ` +
          'this one is 0',
      );
    });

    it('refuses sixteen days', () => {
      expect(refusedFor({ periodLengthDays: longestPeriodLengthDays + 1 })).toContain(
        'a period length runs from',
      );
    });

    it('refuses a length that is not a number', () => {
      expect(refusedFor({ periodLengthDays: '5' })).toContain('a period length is a whole number');
    });
  });

  describe('whether her cycle is regular', () => {
    it('accepts each of the three answers', () => {
      for (const regularity of regularityValues) {
        expect(problemsWith({ regularity })).toEqual([]);
      }
    });

    it('refuses an answer that is not one of them', () => {
      expect(refusedFor({ regularity: 'chaotic' })).toBe(
        'a regularity is one of regular, moves, unknown, this one is "chaotic"',
      );
    });

    it('lists every value the type holds, which a run time check cannot read', () => {
      const everyValueIsListed: Exclude<Regularity, (typeof regularityValues)[number]> extends never
        ? true
        : never = true;

      expect(everyValueIsListed).toBe(true);
      expect(regularityValues).toHaveLength(3);
    });
  });

  describe('how she feels about her cycle', () => {
    it('accepts each of the three answers', () => {
      for (const feeling of feelingValues) {
        expect(problemsWith({ feeling })).toEqual([]);
      }
    });

    it('refuses an answer that is not one of them', () => {
      expect(refusedFor({ feeling: 'curious' })).toContain('a feeling is one of fine, hard');
    });

    it('lists every value the type holds, which a run time check cannot read', () => {
      const everyValueIsListed: Exclude<Feeling, (typeof feelingValues)[number]> extends never
        ? true
        : never = true;

      expect(everyValueIsListed).toBe(true);
      expect(feelingValues).toHaveLength(3);
    });
  });

  describe('what she came for', () => {
    it('accepts all four goals at once', () => {
      expect(problemsWith({ goals: [...goalValues] })).toEqual([]);
    });

    it('accepts none of them, because the screen had a Skip', () => {
      expect(problemsWith({ goals: [] })).toEqual([]);
    });

    it('refuses a goal the design does not list, and names it', () => {
      expect(refusedFor({ goals: ['forecast', 'weightLoss'] })).toContain(
        'these are not: "weightLoss"',
      );
    });

    it('refuses the same goal twice, because she chose it once', () => {
      expect(refusedFor({ goals: ['forecast', 'forecast'] })).toBe(
        'a goal is chosen once, these were chosen twice: "forecast"',
      );
    });

    it('refuses a goal list that is not a list', () => {
      expect(refusedFor({ goals: 'forecast' })).toContain('a goal list is a list');
    });

    it('lists every value the type holds, which a run time check cannot read', () => {
      const everyValueIsListed: Exclude<Goal, (typeof goalValues)[number]> extends never
        ? true
        : never = true;

      expect(everyValueIsListed).toBe(true);
      expect(goalValues).toHaveLength(4);
    });
  });

  describe('what she wants watched', () => {
    it('accepts all six groups at once', () => {
      expect(problemsWith({ focus: [...focusValues] })).toEqual([]);
    });

    it('keeps the order she chose, because the log sheet follows it', () => {
      const hers = aProfileWith({ focus: ['pain', 'sleep', 'mood'] });

      expect(profileJson(hers, { now: theDaySheAnswered })).toContain(
        '"focus":["pain","sleep","mood"]',
      );
    });

    it('refuses a group the screen does not offer, even though the catalogue holds it', () => {
      const notOffered: readonly SymptomGroup[] = symptomGroups.filter(
        (group) => !(focusValues as readonly string[]).includes(group),
      );

      expect(notOffered).toEqual(['head', 'libido']);
      expect(refusedFor({ focus: ['libido'] })).toContain('these are not: "libido"');
    });

    it('refuses the same group twice', () => {
      expect(refusedFor({ focus: ['sleep', 'sleep'] })).toContain(
        'a focus is chosen once, these were chosen twice: "sleep"',
      );
    });

    it('lists every value the type holds, which a run time check cannot read', () => {
      const everyValueIsListed: Exclude<Focus, (typeof focusValues)[number]> extends never
        ? true
        : never = true;

      expect(everyValueIsListed).toBe(true);
      expect(focusValues).toHaveLength(6);
    });
  });

  describe('canonical json', () => {
    it('writes the same bytes for two profiles that differ only in key order', () => {
      const one = { kind: 'profile', name: 'Maria', recordedAt: aProfile.recordedAt } as const;
      const other = { recordedAt: aProfile.recordedAt, name: 'Maria', kind: 'profile' } as const;

      expect(profileJson(one, { now: theDaySheAnswered })).toBe(
        profileJson(other, { now: theDaySheAnswered }),
      );
      expect(profileJson(one, { now: theDaySheAnswered })).toBe(
        canonicalJson({ kind: 'profile', name: 'Maria', recordedAt: aProfile.recordedAt }),
      );
    });

    it('leaves out an answer she skipped, rather than writing it as null', () => {
      expect(profileJson(aProfile, { now: theDaySheAnswered })).toBe(
        `{"kind":"profile","recordedAt":"${aProfile.recordedAt}"}`,
      );
    });
  });

  describe('what comes back out of the envelope', () => {
    it('is the profile that went in', () => {
      const answered = aProfileWith({ name: 'Maria', goals: ['symptoms'] });

      expect(profileFromBytes(profileBytes(answered, { now: theDaySheAnswered }))).toEqual(
        answered,
      );
    });

    it('is refused when the plaintext is not a record at all', () => {
      expect(() => profileFromBytes(new TextEncoder().encode('[1,2,3]'))).toThrow(ProfileError);
    });

    it('is refused when the plaintext is a day, because a day is not a profile', () => {
      const day = new TextEncoder().encode('{"day":"2026-03-14"}');

      expect(() => profileFromBytes(day)).toThrow(ProfileError);
    });

    it('is not re-checked against the bounds, so an old profile stays readable', () => {
      const older = new TextEncoder().encode('{"cycleLengthDays":90,"kind":"profile"}');

      expect(profileFromBytes(older)).toEqual({ cycleLengthDays: 90, kind: 'profile' });
    });
  });

  describe('a record pulled off the server', () => {
    it('is read as a profile when it names that kind', () => {
      const answered = aProfileWith({ regularity: 'regular' });
      const pulled = pulledFromBytes(profileBytes(answered, { now: theDaySheAnswered }));

      expect(pulled).toEqual({ kind: 'profile', profile: answered });
    });

    it('is read as a day when it names no kind, because a day names none', () => {
      const day = new TextEncoder().encode('{"day":"2026-03-14","flow":"medium"}');

      expect(pulledFromBytes(day)).toEqual({
        kind: 'day',
        day: { day: '2026-03-14', flow: 'medium' },
      });
    });

    it('is refused when the plaintext is not a record at all', () => {
      expect(() => pulledFromBytes(new TextEncoder().encode('"nothing"'))).toThrow(ProfileError);
    });
  });

  describe('the envelope a profile travels in', () => {
    it('is the envelope a day travels in, so one format carries both', () => {
      const sealed = sealProfile(aProfile, aKey(), {
        random: fixedRandom,
        now: theDaySheAnswered,
      });
      const day = sealRecord({ day: '2026-03-14', recordedAt: aProfile.recordedAt }, aKey(), {
        random: fixedRandom,
      });

      expect(sealed[0]).toBe(day[0]);
      expect(sealed.slice(1, 25)).toEqual(day.slice(1, 25));
    });

    it('goes in and comes back out as the answers she gave', () => {
      const answered = aProfileWith({ name: 'Maria', focus: ['sleep', 'mood'], birthYear: 1994 });

      const sealed = sealProfile(answered, aKey(), {
        random: fixedRandom,
        now: theDaySheAnswered,
      });

      expect(openProfile(sealed, aKey())).toEqual(answered);
    });

    it('is never an unchecked seal, so a cycle of forty six days produces no bytes', () => {
      expect(() =>
        sealProfile(aProfileWith({ cycleLengthDays: longestCycleLengthDays + 1 }), aKey(), {
          random: fixedRandom,
          now: theDaySheAnswered,
        }),
      ).toThrow(ProfileError);
    });

    it('carries the kind inside the ciphertext, where the server cannot read it', () => {
      const sealed = sealProfile(aProfile, aKey(), {
        random: fixedRandom,
        now: theDaySheAnswered,
      });

      expect(Buffer.from(sealed).includes(Buffer.from(profileKind))).toBe(false);
    });

    it('opens a profile as a profile and a day as a day, through the one reader', () => {
      const day: DayRecord = { day: '2026-03-14', recordedAt: aProfile.recordedAt };

      const sealedProfile = sealProfile(aProfile, aKey(), {
        random: fixedRandom,
        now: theDaySheAnswered,
      });
      const sealedDay = sealRecord(day, aKey(), { random: fixedRandom });

      expect(openPulledRecord(sealedProfile, aKey())).toEqual({
        kind: 'profile',
        profile: aProfile,
      });
      expect(openPulledRecord(sealedDay, aKey())).toEqual({ kind: 'day', day });
      expect(openRecord(sealedDay, aKey())).toEqual(day);
    });
  });
});
