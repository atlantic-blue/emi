import { join } from 'node:path';

import type { DayRecord } from '@emi/crypto';
import { type CyclePhaseName, addDays } from '@emi/cycle';
import { fireEvent, screen, within } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { AccessibilityInfo } from 'react-native';

import type { CycleRow } from '../../../src/data/cycleRepository';
import { readDayLog } from '../../../src/data/dayLogRepository';
import {
  phaseCardChevronTestID,
  phaseCardLineTestID,
  phaseCardPressTestID,
  phaseCardTestID,
} from '../../../src/features/home/PhaseCard';
import { guideAreas } from '../../../src/features/phase/copy';
import { diaryChips } from '../../../src/features/phase/diary';
import { herPastPhase } from '../../../src/features/phase/pastPhases';
import { phaseBarPartTestID } from '../../../src/features/phase/PhaseBar';
import {
  diaryChipTestID,
  phaseDiaryAllSymptomsTestID,
  phaseDiaryNoteTestID,
} from '../../../src/features/phase/PhaseDiary';
import {
  phaseGuideAreaTestID,
  phaseGuideCloseTestID,
  phaseGuideEveryoneTestID,
  phaseGuidePhaseTestID,
  phaseGuideTestID,
  phaseGuideTitleTestID,
} from '../../../src/features/phase/PhaseGuide';
import {
  phasePageBackTestID,
  phasePageDayTestID,
  phasePageGuideTestID,
  phasePageLeadTestID,
  phasePageLockTestID,
  phasePagePastHeadingTestID,
  phasePagePastLineTestID,
  phasePageTestID,
  phasePageTitleTestID,
} from '../../../src/features/phase/PhasePage';
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
 * The Cycle phase page, from the phasePage and phaseGuide boards (issues 273, 274 and 275): the
 * page of each phase, the diary written through the save of a day, the guidance sheet, her records
 * grouped by phase, and the phase card on Today that opens the page.
 */

const appDirectory = join(__dirname, '..', '..', '..', 'src', 'app');

const whenSheOpensIt = new Date('2026-10-12T12:00:00.000Z');
const today = dayOf(whenSheOpensIt);
const herPeriodLengthDays = 5;
const theCycle = 28;

/** Period starts one cycle apart, so that today is the given day of the last of them. */
function herPeriodStarts(cycleDay: number, starts: number): DayRecord[] {
  const started = addDays(today, -(cycleDay - 1));

  return Array.from({ length: starts }, (_, index) =>
    aBleedingDay(addDays(started, -(starts - 1 - index) * theCycle)),
  );
}

/** A day she wrote in the diary, with no flow, at the given cycle day of the given past cycle. */
function aDiaryDay(cyclesAgo: number, cycleDay: number, record: Partial<DayRecord>): DayRecord {
  const day = addDays(today, -(15 + cyclesAgo * theCycle) + (cycleDay - 1));

  return { day, recordedAt: `${day}T09:00:00.000Z`, ...record };
}

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

async function sheOpens(url: string): Promise<{ pathname: () => string; search: () => object }> {
  const app = renderRouter(appDirectory, { initialUrl: url });
  await app;

  return { pathname: () => app.getPathname(), search: () => app.getSearchParams() };
}

async function sheOpensThePhasePage(records: readonly DayRecord[]): Promise<void> {
  await herPhoneHolds(records);
  await sheOpens('/phase');
  await screen.findByTestId(phasePageTestID);
}

/** The words of one element and everything inside it, as one string. */
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

function theDayOnHerPhone(): DayRecord | undefined {
  const held = readDayLog(herDatabase(), today);

  return held === undefined ? undefined : herVault().open(held.payload);
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

describe('the page of each phase', () => {
  const learning = 'This is an estimate from the cycle length you gave.';

  it.each([
    {
      cycleDay: 2,
      title: 'Period phase',
      lead: `Days 1 to 5. These are the days you bleed. ${learning}`,
    },
    {
      cycleDay: 9,
      title: 'Follicular phase',
      lead: `Days 1 to 13. It starts with your period and ends the day before the ovulation phase. ${learning}`,
    },
    {
      cycleDay: 16,
      title: 'Ovulation phase',
      lead: `Days 14 to 18. Emi expects ovulation between day 14 and day 18, most likely on day 16. ${learning}`,
    },
    {
      cycleDay: 20,
      title: 'Luteal phase',
      lead: `Days 19 to 28. It starts the day after the ovulation phase and ends the day before your next period. ${learning}`,
    },
  ])('should name the $title on day $cycleDay with its days', async ({ cycleDay, title, lead }) => {
    await sheOpensThePhasePage(herPeriodStarts(cycleDay, 2));

    expect(whatItSays(phasePageDayTestID)).toBe(`Day ${cycleDay} of about 28`);
    expect(whatItSays(phasePageTitleTestID)).toBe(title);
    expect(whatItSays(phasePageLeadTestID)).toBe(lead);
  });

  it('should draw the four phases with their days, the follicular one from day 1', async () => {
    await sheOpensThePhasePage(herPeriodStarts(16, 2));
    const phases: readonly CyclePhaseName[] = ['period', 'follicular', 'ovulation', 'luteal'];

    expect(phases.map((phase) => whatItSays(phaseBarPartTestID(phase)))).toEqual([
      'Period\ndays 1 to 5',
      'Follicular\ndays 1 to 13',
      'Ovulation\ndays 14 to 18',
      'Luteal\ndays 19 to 28',
    ]);
    expect(
      phases.map((phase) => screen.getByTestId(phaseBarPartTestID(phase)).props.accessibilityState),
    ).toEqual([{ selected: false }, { selected: false }, { selected: true }, { selected: false }]);
  });

  it('should count the estimate from her own cycles once Emi forecasts', async () => {
    await sheOpensThePhasePage(herPeriodStarts(16, 4));

    expect(whatItSays(phasePageLeadTestID)).toBe(
      'Days 14 to 18. Emi expects ovulation between day 14 and day 18, most likely on day 16. This is an estimate from your last 3 cycles.',
    );
  });

  it('should carry the sentence about privacy and no designer note', async () => {
    await sheOpensThePhasePage(herPeriodStarts(16, 2));

    expect(whatItSays(phasePageLockTestID)).toBe(
      'Emi encrypts this on the phone before it goes anywhere.',
    );
    expect(screen.queryByText(/Draft copy/)).toBeNull();
  });
});

describe('the diary of today', () => {
  it('should draw the chips of the board, none chosen on a day she wrote nothing', async () => {
    await sheOpensThePhasePage(herPeriodStarts(16, 2));

    expect(diaryChips.map((chip) => chip.slug)).toEqual([
      'cramps',
      'bloating',
      'breast-tenderness',
      'headache',
      'acne',
      'ovulation-pain',
      'cravings',
      'hungry',
      'little-appetite',
      'sweet',
      'salty',
      'calm',
      'happy',
      'energetic',
      'irritable',
      'anxious',
      'sad',
    ]);
    for (const chip of diaryChips) {
      expect(screen.getByTestId(diaryChipTestID(chip)).props.accessibilityState).toEqual({
        selected: false,
      });
    }
    expect(screen.getByText('Tender breasts')).toBeTruthy();
    expect(screen.getByText('Pain on one side')).toBeTruthy();
  });

  it('should seal what she picks and writes, and keep the flow of a period day', async () => {
    await sheOpensThePhasePage(herPeriodStarts(1, 2));
    const pick = async (slug: string): Promise<void> => {
      const chip = diaryChips.find((each) => each.slug === slug);
      if (chip === undefined) {
        throw new Error(`the diary has no ${slug}`);
      }
      await fireEvent.press(screen.getByTestId(diaryChipTestID(chip)));
    };

    await pick('cramps');
    await pick('hungry');
    await pick('calm');
    await pick('energetic');
    await fireEvent.changeText(screen.getByTestId(phaseDiaryNoteTestID), 'Long day at work');
    await fireEvent(screen.getByTestId(phaseDiaryNoteTestID), 'endEditing');

    expect(theDayOnHerPhone()).toMatchObject({
      day: today,
      flow: 'medium',
      symptoms: ['cramps', 'energetic'],
      food: ['hungry'],
      moods: ['calm'],
      note: 'Long day at work',
    });
    expect(screen.getByTestId('phase-diary-symptoms-cramps').props.accessibilityState).toEqual({
      selected: true,
    });
    expect(whatItSays(phasePageTitleTestID)).toBe('Period phase');
  });

  it('should take a chip off the day when she presses it again', async () => {
    await sheOpensThePhasePage(herPeriodStarts(16, 2));

    await fireEvent.press(screen.getByTestId('phase-diary-food-sweet'));
    await fireEvent.press(screen.getByTestId('phase-diary-food-salty'));
    await fireEvent.press(screen.getByTestId('phase-diary-food-sweet'));

    expect(theDayOnHerPhone()?.food).toEqual(['salty']);
    await fireEvent.press(screen.getByTestId('phase-diary-food-salty'));
    expect(theDayOnHerPhone()).not.toHaveProperty('food');
  });

  it('should open on the answers the day already holds', async () => {
    const day = { day: today, recordedAt: whenSheOpensIt.toISOString() };
    await sheOpensThePhasePage([
      ...herPeriodStarts(16, 2),
      { ...day, symptoms: ['acne', 'migraine'], moods: ['sad'], note: 'Tired' },
    ]);

    expect(screen.getByTestId('phase-diary-symptoms-acne').props.accessibilityState).toEqual({
      selected: true,
    });
    expect(screen.getByTestId('phase-diary-moods-sad').props.accessibilityState).toEqual({
      selected: true,
    });
    expect(screen.getByTestId(phaseDiaryNoteTestID).props.value).toBe('Tired');

    await fireEvent.press(screen.getByTestId('phase-diary-symptoms-cramps'));

    expect(theDayOnHerPhone()?.symptoms).toEqual(['acne', 'migraine', 'cramps']);
  });

  it('should lead to every symptom through the log', async () => {
    await herPhoneHolds(herPeriodStarts(16, 2));
    const app = await sheOpens('/phase');
    await screen.findByTestId(phasePageTestID);

    await fireEvent.press(screen.getByTestId(phaseDiaryAllSymptomsTestID));

    expect(app.pathname()).toBe('/log');
    expect(app.search()).toEqual({ on: 'symptoms' });
  });
});

describe('the guidance sheet', () => {
  it('should open over the page with a short tip for each of the four areas, and close', async () => {
    await sheOpensThePhasePage(herPeriodStarts(16, 2));
    expect(screen.queryByTestId(phaseGuideTestID)).toBeNull();

    await fireEvent.press(screen.getByTestId(phasePageGuideTestID));

    expect(whatItSays(phaseGuidePhaseTestID)).toBe('Ovulation phase');
    expect(whatItSays(phaseGuideTitleTestID)).toBe('Around ovulation: what may help');
    expect(guideAreas.map((area) => whatItSays(phaseGuideAreaTestID(area)))).toEqual([
      'MoodYou may feel more social and confident. A good time for plans with other people.',
      'AppetiteYour appetite may change. Try to eat regularly and drink enough water.',
      'BodySome people feel a short pain on one side, or notice clear, stretchy discharge.',
      'MovementEnergy is often high. If you feel strong, try a harder session, with a proper warm up.',
    ]);
    expect(screen.queryByText(/specialist/)).toBeNull();
    expect(screen.queryByText('What this phase can mean for you')).toBeNull();
    expect(screen.queryByText(/oestrogen/)).toBeNull();

    await fireEvent.press(screen.getByTestId(phaseGuideCloseTestID));

    expect(screen.queryByTestId(phaseGuideTestID)).toBeNull();
    expect(screen.getByTestId(phasePageTestID)).toBeTruthy();
  });

  it('should say under the tips that everyone is different', async () => {
    await sheOpensThePhasePage(herPeriodStarts(20, 2));

    await fireEvent.press(screen.getByTestId(phasePageGuideTestID));

    expect(whatItSays(phaseGuideTitleTestID)).toBe('Before your period: what may help');
    expect(whatItSays(phaseGuideEveryoneTestID)).toBe(
      'Everyone is different. If symptoms get in the way of daily life, talk to a doctor.',
    );
  });

  it.each([
    { cycleDay: 2, title: 'During your period: what may help' },
    { cycleDay: 9, title: 'After your period: what may help' },
    { cycleDay: 16, title: 'Around ovulation: what may help' },
    { cycleDay: 20, title: 'Before your period: what may help' },
  ])('should title the guide "$title" on day $cycleDay', async ({ cycleDay, title }) => {
    await sheOpensThePhasePage(herPeriodStarts(cycleDay, 2));

    await fireEvent.press(screen.getByTestId(phasePageGuideTestID));

    expect(whatItSays(phaseGuideTitleTestID)).toBe(title);
  });

  it.each([2, 9, 20])('should carry guidance for all four areas on day %i', async (cycleDay) => {
    await sheOpensThePhasePage(herPeriodStarts(cycleDay, 2));

    await fireEvent.press(screen.getByTestId(phasePageGuideTestID));

    for (const area of guideAreas) {
      expect(within(screen.getByTestId(phaseGuideAreaTestID(area))).getAllByText(/\w/).length).toBe(
        2,
      );
    }
  });
});

describe('her records grouped by phase', () => {
  /** Three complete cycles of 28 days, and the one she is in, each with one bleeding day. */
  function threeCycles(): CycleRow[] {
    const firstStart = addDays(today, -(15 + 3 * theCycle));

    return [0, 1, 2, 3].map((index) => ({
      id: `cycle-${index}`,
      startedOn: addDays(firstStart, index * theCycle),
      endedOn: index === 3 ? null : addDays(firstStart, (index + 1) * theCycle - 1),
      lengthDays: index === 3 ? null : theCycle,
      periodLengthDays: 1,
      isPredicted: false,
    }));
  }

  const herDiaryDays: readonly DayRecord[] = [
    aDiaryDay(3, 15, { symptoms: ['energetic', 'ovulation-pain'] }),
    aDiaryDay(2, 14, { symptoms: ['energetic'] }),
    aDiaryDay(2, 18, { symptoms: ['ovulation-pain'], food: ['hungry'] }),
    aDiaryDay(1, 16, { symptoms: ['energetic'] }),
    // Day 13 is follicular and day 19 is luteal, so neither counts for the ovulation phase.
    aDiaryDay(1, 13, { food: ['hungry'] }),
    aDiaryDay(1, 19, { food: ['hungry'] }),
    // A symptom outside the diary is not one the page can name in three languages.
    aDiaryDay(1, 17, { symptoms: ['migraine'] }),
  ];

  it('should count each chip once a cycle, over the three complete cycles', () => {
    const past = herPastPhase({ cycles: threeCycles(), records: herDiaryDays, phase: 'ovulation' });

    expect(past.kind).toBe('counted');
    if (past.kind !== 'counted') {
      return;
    }
    expect(past.cycles).toBe(3);
    expect(past.noted.map((each) => [each.chip.slug, each.cycles])).toEqual([
      ['energetic', 3],
      ['ovulation-pain', 2],
      ['hungry', 1],
    ]);
  });

  it('should count the follicular phase from day 1, so it holds the period', () => {
    const past = herPastPhase({
      cycles: threeCycles(),
      records: [aDiaryDay(1, 1, { symptoms: ['cramps'] }), aDiaryDay(1, 13, { food: ['hungry'] })],
      phase: 'follicular',
    });

    expect(past).toEqual({
      kind: 'counted',
      cycles: 3,
      noted: [
        { chip: diaryChips.find((chip) => chip.slug === 'cramps'), cycles: 1 },
        { chip: diaryChips.find((chip) => chip.slug === 'hungry'), cycles: 1 },
      ],
    });
  });

  it('should wait while no cycle is complete', () => {
    expect(
      herPastPhase({ cycles: threeCycles().slice(3), records: herDiaryDays, phase: 'ovulation' }),
    ).toEqual({ kind: 'waiting' });
  });

  it('should read the two counts on the page, from real records', async () => {
    await sheOpensThePhasePage([...herPeriodStarts(16, 4), ...herDiaryDays]);

    expect(whatItSays(phasePagePastHeadingTestID)).toBe('In your past ovulation phases');
    expect(whatItSays(phasePagePastLineTestID)).toBe(
      'You noted Energetic in 3 of 3 cycles, and Pain on one side in 2 of 3.',
    );
  });

  it('should say so when her complete cycles hold nothing from the diary', async () => {
    await sheOpensThePhasePage(herPeriodStarts(16, 4));

    expect(whatItSays(phasePagePastLineTestID)).toBe(
      'You noted nothing from this diary in these phases yet.',
    );
  });

  it('should show a true empty sentence before her first complete cycle', async () => {
    await sheOpensThePhasePage(herPeriodStarts(16, 1));

    expect(whatItSays(phasePagePastLineTestID)).toBe(
      'Emi shows this after your first complete cycle.',
    );
  });

  it('should say her observations will appear here while no cycle is complete', async () => {
    await sheOpensThePhasePage(herPeriodStarts(16, 1));

    expect(whatItSays(phasePagePastHeadingTestID)).toBe('Your observations will appear here');
    expect(screen.queryByText('In your past ovulation phases')).toBeNull();
  });
});

describe('the phase card on Today', () => {
  it('should open the page of her phase, and the way back returns to Today', async () => {
    await herPhoneHolds(herPeriodStarts(16, 2));
    const app = await sheOpens('/');
    const card = await screen.findByTestId(phaseCardTestID);

    expect(screen.getByTestId(phaseCardPressTestID).props.accessibilityRole).toBe('button');
    expect(screen.getByTestId(phaseCardChevronTestID)).toBeTruthy();
    expect(whatItSays(phaseCardLineTestID)).toBe(
      'Energy is often at its highest. This phase is an estimate. How you may feel and what may help.',
    );

    await fireEvent.press(card);

    expect(app.pathname()).toBe('/phase');
    expect(whatItSays(phasePageTitleTestID)).toBe('Ovulation phase');

    await fireEvent.press(screen.getByTestId(phasePageBackTestID));

    expect(app.pathname()).toBe('/');
  });

  it('should send her to Today when no period is recorded', async () => {
    await herPhoneHolds([]);
    const app = await sheOpens('/phase');

    expect(app.pathname()).toBe('/');
    expect(screen.queryByTestId(phasePageTestID)).toBeNull();
  });
});
