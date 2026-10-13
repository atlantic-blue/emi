import { isKnownMood, isKnownSymptom } from '@emi/cycle';

import { openRecord, sealRecord } from '../src/envelope';
import {
  type DayRecord,
  RecordError,
  dischargeValues,
  foodValues,
  nothingYet,
  orgasmValues,
  ovulationPopupValues,
  ovulationSignValues,
  productValues,
  recordFromBytes,
  recordJson,
  recordProblems,
  sexDriveValues,
  sexValues,
} from '../src/record';

/**
 * The fields the Sex, Period and Cycle phase pages and the ovulation popup write, read against the
 * dictionary in docs/design/data-model.md. The lists here are written out by hand on purpose: a
 * value that changes in the code and not in the document fails this file.
 */

const key = new Uint8Array(32).fill(0x9f);

const aDay: DayRecord = {
  day: '2026-11-12',
  recordedAt: '2026-11-12T21:05:00.000Z',
};

function aDayWith(fields: Record<string, unknown>): DayRecord {
  return { ...aDay, ...fields } as DayRecord;
}

function problemsWith(fields: Record<string, unknown>): readonly string[] {
  return recordProblems(aDayWith(fields));
}

function roundTrip(record: DayRecord): DayRecord {
  return openRecord(sealRecord(record, key), key);
}

describe('the values each new field allows', () => {
  it('are the board values, and no other', () => {
    expect(sexValues).toEqual(['none', 'protected', 'unprotected']);
    expect(sexDriveValues).toEqual(['low', 'neutral', 'high']);
    expect(orgasmValues).toEqual(['yes', 'no', 'rather-not-say']);
    expect(dischargeValues).toEqual(['none', 'sticky', 'creamy', 'egg-white', 'watery', 'unusual']);
    expect(productValues).toEqual(['pad', 'tampon', 'cup', 'period-underwear', 'liner']);
    expect(foodValues).toEqual(['cravings', 'hungry', 'little-appetite', 'sweet', 'salty']);
    expect(ovulationSignValues).toEqual([
      'egg-white-discharge',
      'pain-on-one-side',
      'tender-breasts',
      'higher-sex-drive',
      'positive-ovulation-test',
      'higher-temperature',
      'nothing-yet',
    ]);
    expect(nothingYet).toBe('nothing-yet');
    expect(ovulationPopupValues).toEqual(['answered', 'dismissed']);
  });
});

describe('a seal and an open', () => {
  const oneValueFields: readonly [string, readonly string[]][] = [
    ['sex', sexValues],
    ['sexDrive', sexDriveValues],
    ['orgasm', orgasmValues],
    ['discharge', dischargeValues],
  ];

  it.each(oneValueFields)('gives back every value of %s', (field, values) => {
    for (const value of values) {
      const record = aDayWith({ [field]: value });

      expect(roundTrip(record)).toEqual(record);
    }
  });

  it('gives back several products, in the order she picked them', () => {
    const record = aDayWith({ products: ['tampon', 'liner', 'period-underwear'] });

    expect(roundTrip(record)).toEqual(record);
  });

  it('gives back every food', () => {
    const record = aDayWith({ food: [...foodValues] });

    expect(roundTrip(record)).toEqual(record);
  });

  it('gives back several signs of ovulation, with the popup answered', () => {
    const record = aDayWith({
      ovulationSigns: ['egg-white-discharge', 'positive-ovulation-test'],
      ovulationPopup: 'answered',
    });

    expect(roundTrip(record)).toEqual(record);
  });

  it('gives back the answer "nothing yet", which is not the same as never asked', () => {
    const answered = roundTrip(
      aDayWith({ ovulationSigns: [nothingYet], ovulationPopup: 'answered' }),
    );
    const neverAsked = roundTrip(aDay);

    expect(answered.ovulationSigns).toEqual(['nothing-yet']);
    expect(neverAsked.ovulationSigns).toBeUndefined();
    expect(neverAsked.ovulationPopup).toBeUndefined();
  });

  it('gives back a popup she closed, so it does not show again that day', () => {
    expect(roundTrip(aDayWith({ ovulationPopup: 'dismissed' })).ovulationPopup).toBe('dismissed');
  });

  it('gives back a day that fills every new field at once', () => {
    const record = aDayWith({
      sex: 'protected',
      sexDrive: 'high',
      orgasm: 'rather-not-say',
      discharge: 'egg-white',
      products: ['cup'],
      food: ['sweet', 'salty'],
      moods: ['happy', 'sad'],
      ovulationSigns: ['tender-breasts'],
      ovulationPopup: 'answered',
    });

    expect(roundTrip(record)).toEqual(record);
  });
});

describe('an old record', () => {
  it('opens without any new field, and each one reads as not recorded', () => {
    const written = new TextEncoder().encode(
      '{"day":"2026-03-14","flow":"medium","recordedAt":"2026-03-14T21:05:00.000Z"}',
    );
    const opened = recordFromBytes(written);

    expect(opened).toEqual({
      day: '2026-03-14',
      flow: 'medium',
      recordedAt: '2026-03-14T21:05:00.000Z',
    });
    for (const field of [
      'sex',
      'sexDrive',
      'orgasm',
      'discharge',
      'products',
      'food',
      'ovulationSigns',
      'ovulationPopup',
    ]) {
      expect(field in opened).toBe(false);
    }
  });

  it('still seals again with no new field added to it', () => {
    const old: DayRecord = { day: '2026-03-14', flow: 'light', recordedAt: aDay.recordedAt };

    expect(recordProblems(old)).toEqual([]);
    expect(roundTrip(old)).toEqual(old);
  });
});

describe('the refusals', () => {
  it.each([
    ['sex', 'maybe'],
    ['sexDrive', 'medium'],
    ['orgasm', 'sometimes'],
    ['discharge', 'Egg white'],
    ['ovulationPopup', 'shown'],
  ])('refuses %s of %s, and names the allowed values', (field, value) => {
    const problems = problemsWith({ [field]: value });

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain(JSON.stringify(value));
  });

  it('refuses one value where a list belongs', () => {
    expect(problemsWith({ products: 'pad' })).toHaveLength(1);
    expect(problemsWith({ sex: ['protected'] })).toHaveLength(1);
  });

  it.each([
    ['products', 'sponge'],
    ['food', 'chocolate'],
  ])('refuses a %s value the board does not list, and names it', (field, value) => {
    expect(problemsWith({ [field]: [value] }).join('; ')).toContain(value);
  });

  it('refuses a sign of ovulation the board does not list', () => {
    expect(
      problemsWith({ ovulationSigns: ['cramps'], ovulationPopup: 'answered' }).join('; '),
    ).toContain('cramps');
  });

  it.each(['products', 'food', 'ovulationSigns'])('refuses an empty list for %s', (field) => {
    const extra = field === 'ovulationSigns' ? { ovulationPopup: 'answered' } : {};

    expect(problemsWith({ [field]: [], ...extra }).join('; ')).toContain('empty');
  });

  it('refuses the same product twice', () => {
    expect(problemsWith({ products: ['pad', 'pad'] }).join('; ')).toContain('twice');
  });

  it('refuses "nothing yet" beside a sign', () => {
    expect(
      problemsWith({
        ovulationSigns: ['nothing-yet', 'tender-breasts'],
        ovulationPopup: 'answered',
      }).join('; '),
    ).toContain('nothing yet');
  });

  it('refuses signs of ovulation on a popup she closed', () => {
    expect(
      problemsWith({ ovulationSigns: ['tender-breasts'], ovulationPopup: 'dismissed' }),
    ).toHaveLength(1);
  });

  it('refuses signs of ovulation with no popup answer', () => {
    expect(problemsWith({ ovulationSigns: ['tender-breasts'] })).toHaveLength(1);
  });

  it('refuses a popup answered with no signs', () => {
    expect(problemsWith({ ovulationPopup: 'answered' })).toHaveLength(1);
  });

  it('never seals a refused record', () => {
    expect(() => recordJson(aDayWith({ sex: 'maybe' }))).toThrow(RecordError);
    expect(() => sealRecord(aDayWith({ food: ['chocolate'] }), key)).toThrow(RecordError);
  });
});

describe('the emotions of the Cycle phase page', () => {
  it('are all in the catalogue, so the page adds no field of its own', () => {
    for (const mood of ['calm', 'happy', 'irritable', 'anxious', 'sad']) {
      expect(isKnownMood(mood)).toBe(true);
    }
    expect(isKnownSymptom('energetic')).toBe(true);
    expect(isKnownMood('energetic')).toBe(false);
  });

  it('are accepted in a sealed day', () => {
    expect(problemsWith({ moods: ['happy', 'sad', 'calm'], symptoms: ['energetic'] })).toEqual([]);
  });
});
