import { join } from 'node:path';

import { findSymptom } from '@emi/cycle';
import { phaseLabel } from '@emi/tokens';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { dayParameter } from '../../src/features/calendar/askedMonth';
import { dayTestID } from '../../src/features/calendar/CycleMonth';
import { daySheetTestID } from '../../src/features/calendar/DaySheet';
import { ordinal } from '../../src/features/forecast/copy';
import { flowLabel } from '../../src/features/log/FlowPicker';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { controlsTooSmallToPress } from '../fixtures/tapTargets';
import {
  herPhoneHoldsThreeRecordedCycles,
  theDatesOfTheDrawing,
  theDayTheDrawingsSheetNames,
  theDaysTheDrawingFills,
  theMonthSheOpens,
  thePhaseTheRingSaysOn,
  theSheetSheReads,
} from '../fixtures/theMonthSheOpens';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

/**
 * The sheet at the foot of the month, on the days one walk cannot reach: a month she pressed
 * nothing in, a day she logged nothing on, and a day so far back that no cycle of hers holds it.
 */

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday on the day the drawing of the month names in its sheet, so it reads the same in any zone. */
const whenSheOpensIt = (): Date => new Date(`${theDayTheDrawingsSheetNames()}T12:00:00.000Z`);

/** The symptom the drawing's sheet names her having marked on that day. */
function theSymptomSheMarked(): { readonly slug: string; readonly name: string } {
  const found = findSymptom('cramps');

  if (found === undefined) {
    throw new Error('cramps is not a symptom Emi offers');
  }

  return found;
}

/** A month she recorded nothing in at all, which is well before her first period. */
const aMonthBeforeHerFirstCycle = '2026-06-01';
const aDayOfThatMonth = '2026-06-15';

/** A date of the drawn month she neither bled on nor marked anything on. */
function aDaySheLoggedNothingOn(): string {
  const marked = new Set([...theDaysTheDrawingFills(), theDayTheDrawingsSheetNames()]);
  const found = theDatesOfTheDrawing()
    .map((date) => `${theMonthSheOpens.slice(0, 8)}${String(date).padStart(2, '0')}`)
    .find((day) => !marked.has(day) && day < theDayTheDrawingsSheetNames());

  if (found === undefined) {
    throw new Error('every day the drawing of the month draws carries a mark of some kind');
  }

  return found;
}

async function sheOpens(at: string): Promise<void> {
  await renderRouter(appDirectory, { initialUrl: at });
}

async function shePresses(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

function theDateInTheLead(day: string): string {
  return ordinal(Number(day.slice(8, 10)));
}

describe('she presses a day in the month and reads what she wrote that day', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt());
    resetExpoSqlite();
    resetExpoSecureStore();
    await herPhoneHoldsThreeRecordedCycles(whenSheOpensIt(), [
      {
        day: theDayTheDrawingsSheetNames(),
        symptoms: [theSymptomSheMarked().slug],
        recordedAt: `${theDayTheDrawingsSheetNames()}T09:00:00.000Z`,
      },
    ]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('the sheet at the foot of the month', () => {
    it('is drawn for no day at all until she presses one', async () => {
      await sheOpens('/calendar');

      expect(screen.queryByTestId(daySheetTestID)).toBeNull();
      expect(theSheetSheReads()).toBeUndefined();
    });

    it('names the day she pressed and not the day she is on', async () => {
      const another = String(theDaysTheDrawingFills()[0]);

      await sheOpens('/calendar');
      await shePresses(dayTestID(another));

      expect(theSheetSheReads()?.lead).toContain(theDateInTheLead(another));
      expect(theSheetSheReads()?.lead).not.toContain(
        theDateInTheLead(theDayTheDrawingsSheetNames()),
      );
    });

    it('names the cycle day and the phase of a day she marked nothing on, and no mark', async () => {
      const plain = aDaySheLoggedNothingOn();

      await sheOpens('/calendar');
      await shePresses(dayTestID(plain));

      const said = String(theSheetSheReads()?.line).toLowerCase();
      const phase = thePhaseTheRingSaysOn(plain);

      expect(phase).toBeDefined();
      expect(said).toContain(phaseLabel[phase ?? 'period'].toLowerCase());
      expect(said).not.toContain(theSymptomSheMarked().name.toLowerCase());
      expect(said).not.toContain(flowLabel.medium.toLowerCase());
    });

    it('names the date alone on a day no cycle of hers holds', async () => {
      await sheOpens(`/calendar?${dayParameter}=${aMonthBeforeHerFirstCycle}`);
      await shePresses(dayTestID(aDayOfThatMonth));

      expect(thePhaseTheRingSaysOn(aDayOfThatMonth)).toBeUndefined();
      expect(theSheetSheReads()?.lead).toContain(theDateInTheLead(aDayOfThatMonth));
      expect(theSheetSheReads()?.line).toBeUndefined();
    });

    it('is at least 44 points on both axes', async () => {
      await sheOpens('/calendar');
      await shePresses(dayTestID(theDayTheDrawingsSheetNames()));

      expect(controlsTooSmallToPress([screen.getByTestId(daySheetTestID)])).toEqual([]);
    });

    it('opens the day she pressed, and not the day she is on', async () => {
      const another = String(theDaysTheDrawingFills()[0]);
      const app = renderRouter(appDirectory, { initialUrl: '/calendar' });
      await app;

      await shePresses(dayTestID(another));
      await shePresses(daySheetTestID);

      expect(app.getPathname()).toBe(`/day/${another}`);
    });
  });
});
