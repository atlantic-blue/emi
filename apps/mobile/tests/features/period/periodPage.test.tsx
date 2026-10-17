import { join } from 'node:path';

import type { DayRecord } from '@emi/crypto';
import { addDays, daysBetween } from '@emi/cycle';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { AccessibilityInfo } from 'react-native';

import { CycleRing, cycleRingTestID } from '../../../src/components/CycleRing';
import { listCycles } from '../../../src/data/cycleRepository';
import { readDayLog } from '../../../src/data/dayLogRepository';
import {
  highlightPageBackTestID,
  highlightPageTestID,
  highlightPageTitleTestID,
  highlightParagraphTestID,
} from '../../../src/features/highlight/HighlightPage';
import { highlightTestID } from '../../../src/features/highlight/HighlightRow';
import { readings } from '../../../src/features/highlight/highlights';
import { hygienePageTestID } from '../../../src/features/hygiene/HygieneProductsPage';
import { dayRefusedTestID } from '../../../src/features/log/DayRefused';
import { periodAnswersAfterPress } from '../../../src/features/period/answers';
import {
  periodChipTestID,
  periodPageBackTestID,
  periodPageDayTestID,
  periodPageHeadingTestID,
  periodPageHighlightsTestID,
  periodPageLockTestID,
  periodPageSaveTestID,
  periodPageTestID,
} from '../../../src/features/period/PeriodPage';
import { periodAddress } from '../../../src/features/period/periodAddress';
import { resetExpoSqlite } from '../../data/expoSqlite';
import { resetExpoSecureStore } from '../../fixtures/expoSecureStore';
import {
  aBleedingDay,
  dayOf,
  herDatabase,
  herPhoneHoldsTheseAnswers,
} from '../../fixtures/herPhone';
import { herVault } from '../../fixtures/herVault';
import { phasesFromCycle } from '../../fixtures/ringPhases';
import { theArcsOnTheRing } from '../../fixtures/theRingSheReads';

jest.mock('expo-sqlite', () => jest.requireActual('../../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../../fixtures/expoCrypto'));

/**
 * The Period page, from the periodPage board (issue 275): Flow, Discharge and What you used, picked,
 * changed and taken off before one Save, the flow keeping every period rule, a past day, and the two
 * highlights.
 */

const appDirectory = join(__dirname, '..', '..', '..', 'src', 'app');

/** A Monday. */
const whenSheOpensIt = new Date('2026-10-12T12:00:00.000Z');
const today = dayOf(whenSheOpensIt);
const theCycle = 28;
const herPeriodLengthDays = 5;

/** Her period started two days ago, so today is day 3, and the period before it a cycle earlier. */
const herPeriodStarted = addDays(today, -2);
const herPeriodSoFar: DayRecord[] = [
  aBleedingDay(addDays(herPeriodStarted, -theCycle)),
  aBleedingDay(herPeriodStarted),
  aBleedingDay(addDays(herPeriodStarted, 1)),
];

/** A period that started twenty days ago, so nothing she saves today touches it. */
const aPeriodLongAgo: DayRecord[] = [
  aBleedingDay(addDays(today, -19 - theCycle)),
  aBleedingDay(addDays(today, -19)),
];

async function herPhoneHolds(records: readonly DayRecord[]): Promise<void> {
  await herPhoneHoldsTheseAnswers(
    whenSheOpensIt,
    {
      kind: 'profile',
      cycleLengthDays: theCycle,
      periodLengthDays: herPeriodLengthDays,
      name: 'Maria',
      recordedAt: whenSheOpensIt.toISOString(),
    },
    records,
  );
}

async function sheOpens(url: string): Promise<{ pathname: () => string }> {
  const app = renderRouter(appDirectory, { initialUrl: url });
  await app;

  return { pathname: () => app.getPathname() };
}

async function sheOpensThePeriodPage(
  records: readonly DayRecord[],
  url = periodAddress(),
): Promise<void> {
  await herPhoneHolds(records);
  await sheOpens(url);
  await screen.findByTestId(periodPageTestID);
}

function whatItSays(testID: string): string {
  const read = (node: unknown): string => {
    if (typeof node === 'string') {
      return node;
    }
    if (Array.isArray(node)) {
      return node.map(read).join('');
    }
    if (node !== null && typeof node === 'object' && 'children' in node) {
      return read((node as { children: unknown }).children);
    }
    return '';
  };

  return read(screen.getByTestId(testID));
}

function theDayOnHerPhone(day: string = today): DayRecord | undefined {
  const held = readDayLog(herDatabase(), day);

  return held === undefined ? undefined : herVault().open(held.payload);
}

function isChosen(testID: string): boolean {
  return screen.getByTestId(testID).props.accessibilityState?.selected === true;
}

async function press(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(whenSheOpensIt);
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  resetExpoSqlite();
  resetExpoSecureStore();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('the Period page of today', () => {
  it('should carry the header, the day and the three groups of the board', async () => {
    await sheOpensThePeriodPage(aPeriodLongAgo);

    expect(screen.getByText('Period')).toBeTruthy();
    expect(whatItSays(periodPageDayTestID)).toBe('Monday, 12 October');
    expect(whatItSays(periodPageHeadingTestID)).toBe('Your period and discharge');
    for (const label of ['Flow', 'Discharge', 'What you used']) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    for (const label of ['No bleeding', 'Spotting', 'Light', 'Medium', 'Heavy']) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    for (const label of ['None', 'Sticky', 'Creamy', 'Egg white', 'Watery', 'Unusual']) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    for (const label of ['Pad', 'Tampon', 'Cup', 'Period underwear', 'Liner']) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it('should carry the sentence about privacy beside the lock', async () => {
    await sheOpensThePeriodPage(aPeriodLongAgo);

    expect(whatItSays(periodPageLockTestID)).toBe(
      'Emi encrypts this on the phone before it goes anywhere.',
    );
  });

  it('should seal what she saves, so the stored day does not carry her answers in plain text', async () => {
    await sheOpensThePeriodPage(aPeriodLongAgo);

    await press(periodChipTestID('discharge', 'egg-white'));
    await press(periodChipTestID('products', 'period-underwear'));
    await press(periodPageSaveTestID);

    const stored = new TextDecoder().decode(readDayLog(herDatabase(), today)?.payload);
    expect(stored).not.toContain('egg-white');
    expect(stored).not.toContain('period-underwear');
    expect(theDayOnHerPhone()).toMatchObject({
      discharge: 'egg-white',
      products: ['period-underwear'],
    });
  });

  it('should choose nothing on a day she gave no answer', async () => {
    await sheOpensThePeriodPage(aPeriodLongAgo);

    for (const value of ['none', 'spotting', 'light', 'medium', 'heavy']) {
      expect(isChosen(periodChipTestID('flow', value))).toBe(false);
    }
    for (const value of ['none', 'sticky', 'creamy', 'egg-white', 'watery', 'unusual']) {
      expect(isChosen(periodChipTestID('discharge', value))).toBe(false);
    }
    for (const value of ['pad', 'tampon', 'cup', 'period-underwear', 'liner']) {
      expect(isChosen(periodChipTestID('products', value))).toBe(false);
    }
  });
});

describe('pick, change, remove and save', () => {
  it('should write each group as she changed it, when she saves', async () => {
    await sheOpensThePeriodPage([
      ...aPeriodLongAgo,
      { day: today, symptoms: ['headache'], sex: 'none', recordedAt: `${today}T08:00:00.000Z` },
    ]);

    await press(periodChipTestID('flow', 'light'));
    await press(periodChipTestID('flow', 'spotting'));
    await press(periodChipTestID('discharge', 'sticky'));
    await press(periodChipTestID('discharge', 'creamy'));
    await press(periodChipTestID('products', 'liner'));
    await press(periodChipTestID('products', 'pad'));
    await press(periodChipTestID('products', 'cup'));
    await press(periodChipTestID('products', 'cup'));

    expect(isChosen(periodChipTestID('flow', 'light'))).toBe(false);
    expect(isChosen(periodChipTestID('flow', 'spotting'))).toBe(true);
    expect(isChosen(periodChipTestID('discharge', 'sticky'))).toBe(false);
    expect(isChosen(periodChipTestID('discharge', 'creamy'))).toBe(true);
    expect(isChosen(periodChipTestID('products', 'liner'))).toBe(true);
    expect(isChosen(periodChipTestID('products', 'pad'))).toBe(true);
    expect(isChosen(periodChipTestID('products', 'cup'))).toBe(false);

    await press(periodPageSaveTestID);

    expect(theDayOnHerPhone()).toMatchObject({
      flow: 'spotting',
      discharge: 'creamy',
      products: ['pad', 'liner'],
      symptoms: ['headache'],
      sex: 'none',
    });
  });

  it('should open on what she saved, and take each answer off with a second press', async () => {
    await sheOpensThePeriodPage([
      ...aPeriodLongAgo,
      {
        day: today,
        flow: 'none',
        discharge: 'watery',
        products: ['tampon', 'liner'],
        symptoms: ['headache'],
        recordedAt: `${today}T08:00:00.000Z`,
      },
    ]);

    expect(isChosen(periodChipTestID('flow', 'none'))).toBe(true);
    expect(isChosen(periodChipTestID('discharge', 'watery'))).toBe(true);
    expect(isChosen(periodChipTestID('products', 'tampon'))).toBe(true);
    expect(isChosen(periodChipTestID('products', 'liner'))).toBe(true);

    await press(periodChipTestID('flow', 'none'));
    await press(periodChipTestID('discharge', 'watery'));
    await press(periodChipTestID('products', 'tampon'));
    await press(periodChipTestID('products', 'liner'));
    await press(periodPageSaveTestID);

    const saved = theDayOnHerPhone();
    expect(saved).not.toHaveProperty('flow');
    expect(saved).not.toHaveProperty('discharge');
    expect(saved).not.toHaveProperty('products');
    expect(saved?.symptoms).toEqual(['headache']);
  });

  it('should write nothing until she presses Save', async () => {
    await sheOpensThePeriodPage(aPeriodLongAgo);

    await press(periodChipTestID('discharge', 'unusual'));
    await press(periodPageBackTestID);

    expect(theDayOnHerPhone()).toBeUndefined();
  });

  it('should write no day at all when she saves without an answer', async () => {
    await sheOpensThePeriodPage(aPeriodLongAgo);

    await press(periodPageSaveTestID);

    expect(theDayOnHerPhone()).toBeUndefined();
  });
});

describe('an old record', () => {
  it('should open on the flow of a day with none of the new fields, and keep it', async () => {
    await sheOpensThePeriodPage(herPeriodSoFar, periodAddress(herPeriodStarted));

    expect(theDayOnHerPhone(herPeriodStarted)).toEqual(aBleedingDay(herPeriodStarted));
    expect(isChosen(periodChipTestID('flow', 'medium'))).toBe(true);
    expect(isChosen(periodChipTestID('discharge', 'none'))).toBe(false);

    await press(periodChipTestID('products', 'cup'));
    await press(periodPageSaveTestID);

    expect(theDayOnHerPhone(herPeriodStarted)).toMatchObject({
      day: herPeriodStarted,
      flow: 'medium',
      products: ['cup'],
    });
  });

  it('should keep the mark that the bleeding was not her period while the day still bleeds', async () => {
    await sheOpensThePeriodPage([
      ...aPeriodLongAgo,
      { day: today, flow: 'spotting', bleedingIsUnexpected: true, recordedAt: `${today}T08:00Z` },
    ]);

    await press(periodChipTestID('discharge', 'sticky'));
    await press(periodPageSaveTestID);

    expect(theDayOnHerPhone()).toMatchObject({ flow: 'spotting', bleedingIsUnexpected: true });
  });

  it('should drop that mark when she says there was no bleeding', async () => {
    await sheOpensThePeriodPage([
      ...aPeriodLongAgo,
      { day: today, flow: 'spotting', bleedingIsUnexpected: true, recordedAt: `${today}T08:00Z` },
    ]);

    await press(periodChipTestID('flow', 'none'));
    await press(periodPageSaveTestID);

    const saved = theDayOnHerPhone();
    expect(saved?.flow).toBe('none');
    expect(saved).not.toHaveProperty('bleedingIsUnexpected');
  });
});

describe('the flow keeps the rules of her period', () => {
  /** How far round the ring the period arc is painted, read off the glass. */
  function thePeriodArcPainted(): number {
    const period = theArcsOnTheRing().find((arc) => arc.phase === 'period');

    if (period === undefined) {
      throw new Error('the ring painted no period arc');
    }

    return period.sweepDegrees;
  }

  /** The arc the same ring paints for a period of so many days, on today's day of her cycle. */
  async function thePeriodArcPaintedFor(periodDays: number): Promise<number> {
    await render(
      <CycleRing
        cycleLengthDays={theCycle}
        day={daysBetween(herPeriodStarted, today) + 1}
        look="named"
        phases={phasesFromCycle(theCycle, periodDays)}
      />,
    );
    const painted = thePeriodArcPainted();
    await screen.unmount();

    return painted;
  }

  function herLastCycle(): { readonly periodLengthDays: number | null } | undefined {
    return listCycles(herDatabase()).find((cycle) => cycle.startedOn === herPeriodStarted);
  }

  it('should close her period when she saves "No bleeding" on the day after it', async () => {
    const twoDays = await thePeriodArcPaintedFor(2);
    const fiveDays = await thePeriodArcPaintedFor(herPeriodLengthDays);
    await sheOpensThePeriodPage(herPeriodSoFar);

    expect(herLastCycle()?.periodLengthDays).toBeNull();

    await press(periodChipTestID('flow', 'none'));
    await press(periodPageSaveTestID);

    expect(theDayOnHerPhone()?.flow).toBe('none');
    expect(herLastCycle()?.periodLengthDays).toBe(2);

    await sheOpens('/');
    await screen.findByTestId(cycleRingTestID);
    expect(thePeriodArcPainted()).toBeCloseTo(twoDays, 6);
    expect(thePeriodArcPainted()).not.toBeCloseTo(fiveDays, 6);
  });

  it('should keep her period open when she saves only a discharge and a product', async () => {
    const fiveDays = await thePeriodArcPaintedFor(herPeriodLengthDays);
    await sheOpensThePeriodPage(herPeriodSoFar);

    await press(periodChipTestID('discharge', 'creamy'));
    await press(periodChipTestID('products', 'pad'));
    await press(periodPageSaveTestID);

    expect(theDayOnHerPhone()).not.toHaveProperty('flow');
    expect(herLastCycle()?.periodLengthDays).toBeNull();

    await sheOpens('/');
    await screen.findByTestId(cycleRingTestID);
    expect(thePeriodArcPainted()).toBeCloseTo(fiveDays, 6);
  });

  it('should start a period when she saves a bleeding flow on a day far from the last', async () => {
    await sheOpensThePeriodPage(aPeriodLongAgo);

    await press(periodChipTestID('flow', 'heavy'));
    await press(periodPageSaveTestID);

    expect(listCycles(herDatabase()).some((cycle) => cycle.startedOn === today)).toBe(true);
  });
});

describe('a past day', () => {
  it('should save to the day the address names', async () => {
    const yesterday = addDays(today, -1);
    await sheOpensThePeriodPage(aPeriodLongAgo, periodAddress(yesterday));

    expect(whatItSays(periodPageDayTestID)).toBe('Sunday, 11 October');

    await press(periodChipTestID('discharge', 'sticky'));
    await press(periodPageSaveTestID);

    expect(theDayOnHerPhone(yesterday)?.discharge).toBe('sticky');
    expect(theDayOnHerPhone()).toBeUndefined();
  });

  it('should refuse a day ahead of her', async () => {
    await herPhoneHolds(aPeriodLongAgo);
    await sheOpens(periodAddress(addDays(today, 1)));

    expect(await screen.findByTestId(dayRefusedTestID)).toBeTruthy();
    expect(screen.queryByTestId(periodPageTestID)).toBeNull();
  });
});

describe('the highlights', () => {
  it('should open the page of All about discharge, and come back', async () => {
    await sheOpensThePeriodPage(aPeriodLongAgo);

    expect(screen.getByText('All about discharge')).toBeTruthy();
    await press(highlightTestID('all-about-discharge'));

    await screen.findByTestId(highlightPageTestID);
    expect(whatItSays(highlightPageTitleTestID)).toBe('All about discharge');
    expect(readings['all-about-discharge'].paragraphs.length).toBeGreaterThan(0);
    readings['all-about-discharge'].paragraphs.forEach((paragraph, index) => {
      expect(whatItSays(highlightParagraphTestID(index))).toBe(paragraph);
    });

    await press(highlightPageBackTestID);
    expect(await screen.findByTestId(periodPageTestID)).toBeTruthy();
  });

  it('should open the Hygiene products page and not a page of paragraphs', async () => {
    await sheOpensThePeriodPage(aPeriodLongAgo);

    expect(screen.getByText('Hygiene products')).toBeTruthy();
    await press(highlightTestID('hygiene-products'));

    expect(await screen.findByTestId(hygienePageTestID)).toBeTruthy();
    expect(screen.queryByTestId(highlightPageTestID)).toBeNull();
  });

  it('should carry the row in a sideways scroll, so more highlights fit than the width holds', async () => {
    await sheOpensThePeriodPage(aPeriodLongAgo);

    expect(screen.getByTestId(periodPageHighlightsTestID).props.horizontal).toBe(true);
  });
});

describe('one press on an answer', () => {
  it('should pick, change and take off one flow or discharge without touching the others', () => {
    const picked = periodAnswersAfterPress({}, { group: 'flow', value: 'light' });
    const changed = periodAnswersAfterPress(
      { ...picked, discharge: 'creamy' },
      { group: 'flow', value: 'none' },
    );
    const removed = periodAnswersAfterPress(changed, { group: 'flow', value: 'none' });

    expect(picked).toEqual({ flow: 'light' });
    expect(changed).toEqual({ flow: 'none', discharge: 'creamy' });
    expect(removed).toEqual({ discharge: 'creamy' });
  });

  it('should add and take off products one at a time, in the order of the board', () => {
    const one = periodAnswersAfterPress({}, { group: 'products', value: 'liner' });
    const two = periodAnswersAfterPress(one, { group: 'products', value: 'tampon' });
    const back = periodAnswersAfterPress(two, { group: 'products', value: 'liner' });
    const none = periodAnswersAfterPress(back, { group: 'products', value: 'tampon' });

    expect(one).toEqual({ products: ['liner'] });
    expect(two).toEqual({ products: ['tampon', 'liner'] });
    expect(back).toEqual({ products: ['tampon'] });
    expect(none).toEqual({});
  });
});
