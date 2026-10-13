import { join } from 'node:path';

import type { DayRecord } from '@emi/crypto';
import { addDays } from '@emi/cycle';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { colour } from '@emi/tokens';
import { AccessibilityInfo, StyleSheet } from 'react-native';

import { listCycles } from '../../../src/data/cycleRepository';
import { readDayLog } from '../../../src/data/dayLogRepository';
import { calendarScreenTestID } from '../../../src/features/calendar/CalendarScreen';
import { dateDiscTestID } from '../../../src/features/calendar/CycleMonth';
import { theFertileWindowOn } from '../../../src/features/calendar/herMonthPhases';
import { recordedDays } from '../../../src/features/cycle/rebuild';
import type { RingInputFrom } from '../../../src/features/cycle/ringInput';
import { dayRefusedTestID } from '../../../src/features/log/DayRefused';
import {
  highlightPageBackTestID,
  highlightPageTestID,
  highlightPageTitleTestID,
  highlightParagraphTestID,
} from '../../../src/features/highlight/HighlightPage';
import { highlightTestID } from '../../../src/features/highlight/HighlightRow';
import { highlights } from '../../../src/features/highlight/highlights';
import { answersAfterPress } from '../../../src/features/sex/answers';
import {
  sexChipTestID,
  sexPageBackTestID,
  sexPageDayTestID,
  sexPageFertileTestID,
  sexPageLockTestID,
  sexPageQuestionTestID,
  sexPageSaveTestID,
  sexPageTestID,
} from '../../../src/features/sex/SexPage';
import { resetExpoSqlite } from '../../data/expoSqlite';
import { resetExpoSecureStore } from '../../fixtures/expoSecureStore';
import {
  aBleedingDay,
  dayOf,
  herDatabase,
  herPhoneHoldsTheseAnswers,
} from '../../fixtures/herPhone';
import { herVault } from '../../fixtures/herVault';

jest.mock('expo-sqlite', () => jest.requireActual('../../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../../fixtures/expoCrypto'));

/**
 * The Sex page, from the sexPage board (issues 272 and 275): three answers she picks, changes and
 * takes off before one Save, a past day, the note in the fertile window, and the two highlights.
 */

const appDirectory = join(__dirname, '..', '..', '..', 'src', 'app');

/** A Monday. */
const whenSheOpensIt = new Date('2026-10-12T12:00:00.000Z');
const today = dayOf(whenSheOpensIt);
const theCycle = 28;

/** Period starts one cycle apart, so that today is the given day of the last of them. */
function herPeriodStarts(cycleDay: number, starts: number): DayRecord[] {
  const started = addDays(today, -(cycleDay - 1));

  return Array.from({ length: starts }, (_, index) =>
    aBleedingDay(addDays(started, -(starts - 1 - index) * theCycle)),
  );
}

async function herPhoneHolds(records: readonly DayRecord[]): Promise<void> {
  await herPhoneHoldsTheseAnswers(
    whenSheOpensIt,
    {
      kind: 'profile',
      cycleLengthDays: theCycle,
      periodLengthDays: 5,
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

async function sheOpensTheSexPage(records: readonly DayRecord[], url = '/sex'): Promise<void> {
  await herPhoneHolds(records);
  await sheOpens(url);
  await screen.findByTestId(sexPageTestID);
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

describe('the Sex page of today', () => {
  it('should name the day and ask the question of the board', async () => {
    await sheOpensTheSexPage(herPeriodStarts(20, 2));

    expect(screen.getAllByText('Sex')).toHaveLength(2);
    expect(whatItSays(sexPageDayTestID)).toBe('Monday, 12 October');
    expect(whatItSays(sexPageQuestionTestID)).toBe('Did you have sex today?');
    expect(screen.getByText('Sex drive')).toBeTruthy();
    expect(screen.getByText('Orgasm')).toBeTruthy();
    for (const label of ['No sex', 'Protected', 'Unprotected', 'Low', 'Neutral', 'High']) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    for (const label of ['Yes', 'No', 'Rather not say']) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it('should carry the sentence about privacy beside the lock', async () => {
    await sheOpensTheSexPage(herPeriodStarts(20, 2));

    expect(whatItSays(sexPageLockTestID)).toBe(
      'Emi encrypts this on the phone before it goes anywhere.',
    );
  });

  it('should choose nothing on a day she gave no answer', async () => {
    await sheOpensTheSexPage(herPeriodStarts(20, 2));

    for (const [group, value] of [
      ['sex', 'none'],
      ['sex', 'protected'],
      ['sex', 'unprotected'],
      ['sexDrive', 'low'],
      ['sexDrive', 'neutral'],
      ['sexDrive', 'high'],
      ['orgasm', 'yes'],
      ['orgasm', 'no'],
      ['orgasm', 'rather-not-say'],
    ] as const) {
      expect(isChosen(sexChipTestID(group, value))).toBe(false);
    }
  });
});

describe('pick, change, remove and save', () => {
  it('should write what she picked, as she changed it, when she saves', async () => {
    await sheOpensTheSexPage([
      ...herPeriodStarts(20, 2),
      { day: today, symptoms: ['headache'], recordedAt: `${today}T08:00:00.000Z` },
    ]);

    await press(sexChipTestID('sex', 'protected'));
    await press(sexChipTestID('sex', 'unprotected'));
    await press(sexChipTestID('sexDrive', 'high'));
    await press(sexChipTestID('orgasm', 'yes'));
    await press(sexChipTestID('orgasm', 'yes'));

    expect(isChosen(sexChipTestID('sex', 'protected'))).toBe(false);
    expect(isChosen(sexChipTestID('sex', 'unprotected'))).toBe(true);
    expect(isChosen(sexChipTestID('orgasm', 'yes'))).toBe(false);

    await press(sexPageSaveTestID);

    const saved = theDayOnHerPhone();
    expect(saved?.sex).toBe('unprotected');
    expect(saved?.sexDrive).toBe('high');
    expect(saved).not.toHaveProperty('orgasm');
    expect(saved?.symptoms).toEqual(['headache']);
  });

  it('should open on what she saved, and take an answer off with a second press', async () => {
    await sheOpensTheSexPage([
      ...herPeriodStarts(20, 2),
      {
        day: today,
        sex: 'protected',
        sexDrive: 'low',
        orgasm: 'rather-not-say',
        symptoms: ['headache'],
        recordedAt: `${today}T08:00:00.000Z`,
      },
    ]);

    expect(isChosen(sexChipTestID('sex', 'protected'))).toBe(true);
    expect(isChosen(sexChipTestID('sexDrive', 'low'))).toBe(true);
    expect(isChosen(sexChipTestID('orgasm', 'rather-not-say'))).toBe(true);

    await press(sexChipTestID('sex', 'protected'));
    await press(sexChipTestID('sexDrive', 'low'));
    await press(sexChipTestID('orgasm', 'rather-not-say'));
    await press(sexPageSaveTestID);

    const saved = theDayOnHerPhone();
    expect(saved).not.toHaveProperty('sex');
    expect(saved).not.toHaveProperty('sexDrive');
    expect(saved).not.toHaveProperty('orgasm');
    expect(saved?.symptoms).toEqual(['headache']);
  });

  it('should write nothing until she presses Save', async () => {
    await sheOpensTheSexPage(herPeriodStarts(20, 2));

    await press(sexChipTestID('sex', 'none'));
    await press(sexPageBackTestID);

    expect(theDayOnHerPhone()).toBeUndefined();
  });

  it('should write no day at all when she saves without an answer', async () => {
    await sheOpensTheSexPage(herPeriodStarts(20, 2));

    await press(sexPageSaveTestID);

    expect(theDayOnHerPhone()).toBeUndefined();
  });

  it('should keep the flow of an old record that has none of the new fields', async () => {
    await sheOpensTheSexPage(herPeriodStarts(1, 2));

    expect(theDayOnHerPhone()).toEqual(aBleedingDay(today));
    expect(isChosen(sexChipTestID('sex', 'none'))).toBe(false);

    await press(sexChipTestID('sex', 'none'));
    await press(sexPageSaveTestID);

    expect(theDayOnHerPhone()).toMatchObject({ day: today, flow: 'medium', sex: 'none' });
  });
});

describe('a past day', () => {
  it('should ask about yesterday in the words for yesterday, and save to that day', async () => {
    const yesterday = addDays(today, -1);
    await sheOpensTheSexPage(herPeriodStarts(20, 2), `/sex?day=${yesterday}`);

    expect(whatItSays(sexPageDayTestID)).toBe('Sunday, 11 October');
    expect(whatItSays(sexPageQuestionTestID)).toBe('Did you have sex yesterday?');

    await press(sexChipTestID('sex', 'protected'));
    await press(sexPageSaveTestID);

    expect(theDayOnHerPhone(yesterday)?.sex).toBe('protected');
    expect(theDayOnHerPhone()).toBeUndefined();
  });

  it('should ask about an older day as that day', async () => {
    await sheOpensTheSexPage(herPeriodStarts(20, 2), `/sex?day=${addDays(today, -9)}`);

    expect(whatItSays(sexPageDayTestID)).toBe('Saturday, 3 October');
    expect(whatItSays(sexPageQuestionTestID)).toBe('Did you have sex that day?');
  });

  it('should refuse a day ahead of her', async () => {
    await herPhoneHolds(herPeriodStarts(20, 2));
    await sheOpens(`/sex?day=${addDays(today, 1)}`);

    expect(await screen.findByTestId(dayRefusedTestID)).toBeTruthy();
    expect(screen.queryByTestId(sexPageTestID)).toBeNull();
  });
});

describe('the note in the fertile window', () => {
  function herReading(): RingInputFrom {
    return {
      cycles: listCycles(herDatabase()),
      records: recordedDays(herDatabase(), herVault().open),
      today,
      statedCycleLengthDays: theCycle,
      statedPeriodLengthDays: 5,
    };
  }

  it('should name the window on a day inside it, in the words of the board', async () => {
    await sheOpensTheSexPage(herPeriodStarts(12, 2));

    expect(whatItSays(sexPageFertileTestID)).toBe(
      'You are in your fertile window, 11 to 17 October. This is an estimate. It is not contraception.',
    );
  });

  it('should name the same days the calendar marks fertile', async () => {
    await sheOpensTheSexPage(herPeriodStarts(12, 2));
    const window = theFertileWindowOn(herReading(), today);
    const marks = new Set<string>([colour.washWarm, colour.ovulation]);

    await sheOpens('/calendar');
    await screen.findByTestId(calendarScreenTestID);
    const october = Array.from({ length: 31 }, (_, index) => addDays('2026-10-01', index));
    const marked = october.filter((day) => {
      const disc = screen.queryByTestId(dateDiscTestID(day));
      const fill = disc === null ? undefined : StyleSheet.flatten(disc.props.style).backgroundColor;

      return typeof fill === 'string' && marks.has(fill);
    });

    expect(window).toEqual({ from: '2026-10-11', to: '2026-10-17' });
    expect(marked).toEqual([
      '2026-10-11',
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
      '2026-10-15',
      '2026-10-16',
      '2026-10-17',
    ]);
  });

  it('should say nothing about the window on a day outside it', async () => {
    await sheOpensTheSexPage(herPeriodStarts(20, 2));

    expect(screen.queryByTestId(sexPageFertileTestID)).toBeNull();
    expect(screen.queryByText(/fertile window/)).toBeNull();
  });

  it('should speak of a past day in the window in the past tense', async () => {
    await sheOpensTheSexPage(herPeriodStarts(14, 2), `/sex?day=${addDays(today, -1)}`);

    expect(whatItSays(sexPageFertileTestID)).toBe(
      'You were in your fertile window, 9 to 15 October. This is an estimate. It is not contraception.',
    );
  });
});

describe('the highlights', () => {
  it.each([
    { slug: 'intercourse', title: 'Intercourse' },
    { slug: 'learn-about-sex', title: 'Learn more about sex' },
  ] as const)('should open the page of $title, and come back', async ({ slug, title }) => {
    await sheOpensTheSexPage(herPeriodStarts(20, 2));

    expect(screen.getByText(title)).toBeTruthy();
    await press(highlightTestID(slug));

    await screen.findByTestId(highlightPageTestID);
    expect(whatItSays(highlightPageTitleTestID)).toBe(title);
    highlights[slug].paragraphs.forEach((paragraph, index) => {
      expect(whatItSays(highlightParagraphTestID(index))).toBe(paragraph);
    });
    expect(highlights[slug].paragraphs.length).toBeGreaterThan(0);

    await press(highlightPageBackTestID);
    expect(await screen.findByTestId(sexPageTestID)).toBeTruthy();
  });

  it('should give each highlight its own page', () => {
    expect(highlights.intercourse.paragraphs).not.toEqual(highlights['learn-about-sex'].paragraphs);
  });

  it('should send an address that names no highlight back to Today', async () => {
    await herPhoneHolds(herPeriodStarts(20, 2));
    const app = await sheOpens('/highlight/nothing-here');

    expect(screen.queryByTestId(highlightPageTestID)).toBeNull();
    expect(app.pathname()).toBe('/');
  });
});

describe('one press on an answer', () => {
  it('should pick, change and take off one answer without touching the others', () => {
    const picked = answersAfterPress({}, { group: 'sex', value: 'protected' });
    const changed = answersAfterPress(
      { ...picked, sexDrive: 'high' },
      { group: 'sex', value: 'unprotected' },
    );
    const removed = answersAfterPress(changed, { group: 'sex', value: 'unprotected' });

    expect(picked).toEqual({ sex: 'protected' });
    expect(changed).toEqual({ sex: 'unprotected', sexDrive: 'high' });
    expect(removed).toEqual({ sexDrive: 'high' });
  });
});
