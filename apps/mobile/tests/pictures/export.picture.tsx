import type { DayRecord } from '@emi/crypto';
import { addDays } from '@emi/cycle';

import { logDay } from '../../src/features/cycle/rebuild';
import { everythingIn } from '../../src/features/export/everything';
import { readableFile } from '../../src/features/export/files';
import { chooseUnits } from '../../src/features/log/units';
import { migratedDatabase } from '../fixtures/cycleCache';
import { herVault } from '../fixtures/herVault';
import { drawOrCheckPage } from '../../../../brand/screens/picture';

/**
 * The document she can hand to a doctor, drawn as it opens. The markup is the file the application
 * writes, so the picture is the product rather than an illustration of it.
 *
 * The suite never picks it up. It is drawn on demand by npm run generate:export-picture.
 */

const whenSheExported = new Date('2026-05-14T20:00:00.000Z');
const today = '2026-05-14';
const herCycleLengthDays = 28;
const herPeriodDays = 4;

const herPeriodStarts = [4, 3, 2, 1, 0].map((back) =>
  addDays(addDays(today, -13), -back * herCycleLengthDays),
);

const theFullDay = addDays(today, -5);

function herDays(): DayRecord[] {
  const bleeding = herPeriodStarts.flatMap((start) =>
    Array.from({ length: herPeriodDays }, (_unused, day) => ({
      day: addDays(start, day),
      flow: (day === 0 ? 'light' : 'medium') as DayRecord['flow'],
      recordedAt: `${addDays(start, day)}T08:00:00.000Z`,
    })),
  );

  return [
    ...bleeding,
    {
      day: theFullDay,
      flow: 'spotting',
      bleedingIsUnexpected: true,
      symptoms: ['cramps', 'headache'],
      moods: ['irritable'],
      energy: 2,
      temperatureCelsius: 36.7,
      weightKilograms: 63.2,
      note: 'Cramps started in the afternoon and the headache came with them.',
      recordedAt: `${theFullDay}T20:00:00.000Z`,
    },
  ];
}

describe('the document she can hand to a doctor', () => {
  it('draws it as it opens', () => {
    const database = migratedDatabase();
    const vault = herVault();

    for (const record of herDays()) {
      logDay(
        database,
        { day: record.day, payload: vault.seal(record), now: new Date(record.recordedAt) },
        vault.open,
      );
    }

    chooseUnits(database, { temperature: 'celsius', weight: 'kilograms' });

    const file = readableFile(everythingIn(database, vault, whenSheExported), whenSheExported);

    const result = drawOrCheckPage({
      name: 'export-document',
      markup: file.text,
      size: { width: 860, height: 1400 },
      script: 'generate:export-picture',
      holds: `the document she opens, ${file.name}`,
    });

    expect(result.problems).toEqual([]);
    console.log(result.said);
  });
});
