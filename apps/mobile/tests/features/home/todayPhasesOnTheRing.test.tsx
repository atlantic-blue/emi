import { join } from 'node:path';

import type { DayRecord } from '@emi/crypto';
import { addDays } from '@emi/cycle';
import {
  CONTRAST_FLOOR,
  NAMED_RING_DIAMETER,
  type PhaseName,
  colour,
  phaseNameInk,
  phaseNameOnArc,
  phaseNames,
  phasePalette,
  ringGeometry,
  space,
} from '@emi/tokens';
import { fireEvent, screen, within } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { AccessibilityInfo } from 'react-native';

import {
  cycleRingTestID,
  ringCentreDayTestID,
  ringCentreLengthTestID,
  ringCentrePhaseTestID,
  ringNameTestID,
} from '../../../src/components/CycleRing';
import { tabs } from '../../../src/features/chrome/tabs';
import { phasesOf, shapeFromLength } from '../../../src/features/cycle/ringInput';
import {
  homeCalendarTestID,
  homeGreetingTestID,
  homeHeaderAvatarTestID,
  homeHeaderWordTestID,
} from '../../../src/features/home/HomeHeader';
import {
  phaseCardChevronTestID,
  phaseCardDaysTestID,
  phaseCardLineTestID,
  phaseCardPressTestID,
  phaseCardTestID,
} from '../../../src/features/home/PhaseCard';
import { resetExpoSqlite } from '../../data/expoSqlite';
import { aSmallIPhone } from '../../fixtures/theWidthOfARow';
import { resetExpoSecureStore } from '../../fixtures/expoSecureStore';
import { aBleedingDay, dayOf, herPhoneHoldsTheseAnswers } from '../../fixtures/herPhone';

jest.mock('expo-sqlite', () => jest.requireActual('../../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../../fixtures/expoCrypto'));

/**
 * Today from the todayPhases board (issues 273 and 274): the top bar, the four phase names along
 * their arcs, and the phase card under the ring.
 */

const appDirectory = join(__dirname, '..', '..', '..', 'src', 'app');

const whenSheOpensIt = new Date('2026-10-12T12:00:00.000Z');
const today = dayOf(whenSheOpensIt);
const herPeriodLengthDays = 5;

/** Two period starts one cycle apart, so that today is the given day of her cycle. */
function herFirstRunDays(cycleDay: number, cycleLengthDays: number): DayRecord[] {
  const started = addDays(today, -(cycleDay - 1));

  return [aBleedingDay(addDays(started, -cycleLengthDays)), aBleedingDay(started)];
}

async function sheOpensToday(
  cycleDay: number,
  cycleLengthDays: number,
  name: string | null = 'Maria',
): Promise<{ pathname: () => string; searchParams: () => Record<string, string> }> {
  await herPhoneHoldsTheseAnswers(
    whenSheOpensIt,
    {
      kind: 'profile',
      cycleLengthDays,
      periodLengthDays: herPeriodLengthDays,
      ...(name === null ? {} : { name }),
      recordedAt: whenSheOpensIt.toISOString(),
    },
    herFirstRunDays(cycleDay, cycleLengthDays),
  );
  const app = renderRouter(appDirectory, { initialUrl: '/' });
  await app;
  await screen.findByTestId(cycleRingTestID);

  return {
    pathname: () => app.getPathname(),
    searchParams: () => app.getSearchParams() as Record<string, string>,
  };
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
      // The drawing library carries the words of a text along a path as a prop, not as a child.
      const content = (node as { props?: { content?: unknown } }).props?.content;

      return (
        (typeof content === 'string' ? content : '') +
        read((node as { children: unknown }).children)
      );
    }
    return '';
  };

  return read(screen.getByTestId(testID));
}

/** A fill as the drawing library hands it to the native view: an opaque colour as one number. */
function theFillOf(hex: string): { type: number; payload: number } {
  return { type: 0, payload: 0xff000000 + Number.parseInt(hex.slice(1), 16) };
}

/** The ratio of the Web Content Accessibility Guidelines, worked out here from the two values. */
function contrastBetween(one: string, other: string): number {
  const luminance = (hex: string): number => {
    const channels = [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16) / 255);
    const [red, green, blue] = channels.map((value) =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
    ) as [number, number, number];

    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  };
  const [lighter, darker] = [luminance(one), luminance(other)].sort((a, b) => b - a) as [
    number,
    number,
  ];

  return (lighter + 0.05) / (darker + 0.05);
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

describe('the top bar of Today', () => {
  it('should draw her initial, the word emi and "Hello, Maria"', async () => {
    await sheOpensToday(16, 28);

    expect(whatItSays(homeHeaderAvatarTestID)).toBe('M');
    expect(whatItSays(homeHeaderWordTestID)).toBe('emi');
    expect(whatItSays(homeGreetingTestID)).toBe('Hello, Maria');
  });

  it('should draw no letter and greet her with "Hello" where she gave no name', async () => {
    await sheOpensToday(16, 28, null);

    expect(whatItSays(homeHeaderAvatarTestID)).toBe('');
    expect(whatItSays(homeGreetingTestID)).toBe('Hello');
  });

  it('should open her month on today from the calendar button', async () => {
    const app = await sheOpensToday(16, 28);
    const calendar = screen.getByTestId(homeCalendarTestID);

    expect(calendar.props.accessibilityLabel).toBe('The calendar');
    await fireEvent.press(calendar);

    expect(app.pathname()).toBe('/calendar');
    expect(app.searchParams()['day']).toBe(today);
  });

  it('should no longer draw the strip of seven days', async () => {
    await sheOpensToday(16, 28);

    expect(screen.queryByTestId('home-week-strip')).toBeNull();
    expect(screen.queryByText('TODAY')).toBeNull();
    expect(screen.queryByTestId(`home-week-day-${today}`)).toBeNull();
  });
});

describe('the ring of Today', () => {
  it('should write the four phase names along their arcs', async () => {
    await sheOpensToday(16, 28);

    expect(phaseNames.map((phase) => screen.getByTestId(ringNameTestID(phase)).props.fill)).toEqual(
      phaseNames.map((phase) => theFillOf(colour[phaseNameInk[phase]])),
    );
    expect(phaseNames.map((phase) => whatItSays(ringNameTestID(phase)))).toEqual([
      'PERIOD',
      'FOLLICULAR',
      'OVULATION',
      'LUTEAL',
    ]);
  });

  it('should say the full phase name, "Day 16" and "of about 28" in the middle', async () => {
    await sheOpensToday(16, 28);

    expect(whatItSays(ringCentrePhaseTestID)).toBe('Ovulation phase');
    expect(whatItSays(ringCentreDayTestID)).toBe('Day 16');
    expect(whatItSays(ringCentreLengthTestID)).toBe('of about 28');
  });

  it('should write the whole name on a follicular arc of 2 days, which once fell back to "F"', async () => {
    // A 22 day cycle with a 5 day period leaves the follicular arc 2 days, days 6 and 7.
    await sheOpensToday(3, 22);

    expect(whatItSays(ringNameTestID('follicular'))).toBe('FOLLICULAR');
    expect(whatItSays(ringNameTestID('luteal'))).toBe('LUTEAL');
  });
});

describe('the fallback for a short arc', () => {
  /** One arc of a cycle, as the ring of Today draws it. */
  function theArc(cycleLengthDays: number, periodDays: number, phase: PhaseName) {
    const phases = phasesOf(shapeFromLength(cycleLengthDays, periodDays));
    const arc = ringGeometry({ cycleLengthDays, day: 1, phases }).arcs.find(
      (each) => each.phase === phase,
    );
    if (arc === undefined) {
      throw new Error(`a cycle of ${cycleLengthDays} days draws no ${phase} arc`);
    }
    return arc;
  }

  it('should write the whole name where the arc holds it', () => {
    expect(phaseNameOnArc(theArc(28, 5, 'follicular'), 'Follicular')).toEqual({
      fit: 'name',
      written: 'FOLLICULAR',
    });
  });

  it('should write the first letter where only a letter fits', () => {
    expect(phaseNameOnArc(theArc(22, 5, 'follicular'), 'Follicular')).toEqual({
      fit: 'initial',
      written: 'F',
    });
  });

  it('should write nothing where not even a letter fits', () => {
    // A one day period in a 45 day cycle is an arc of about 16 points.
    expect(phaseNameOnArc(theArc(45, 1, 'period'), 'Period')).toEqual({
      fit: 'none',
      written: '',
    });
  });

  it('should measure the name in her language, so a longer word can fall back alone', () => {
    const arc = theArc(24, 5, 'follicular');

    expect(phaseNameOnArc(arc, 'Folicular').fit).toBe('name');
    expect(phaseNameOnArc(arc, 'Фолликулярная').fit).toBe('initial');
  });
});

describe('the contrast of each name on its arc', () => {
  it.each(phaseNames)('should hold the %s name at or above 4.5 to 1 on its arc', (phase) => {
    const ratio = contrastBetween(colour[phaseNameInk[phase]], colour[phasePalette[phase].fill]);

    expect(ratio).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
    expect(CONTRAST_FLOOR).toBe(4.5);
  });

  it('should fit the ring and its margins on the smallest supported phone', () => {
    expect(NAMED_RING_DIAMETER + 2 * space.margin).toBeLessThanOrEqual(aSmallIPhone.width);
  });
});

describe('the phase card under the ring', () => {
  it.each([
    { cycleLengthDays: 28, cycleDay: 2, says: 'During your period, days 1 to 5' },
    { cycleLengthDays: 28, cycleDay: 9, says: 'After your period, days 6 to 13' },
    { cycleLengthDays: 28, cycleDay: 16, says: 'Around ovulation, days 14 to 18' },
    { cycleLengthDays: 28, cycleDay: 20, says: 'Before your period, days 19 to 28' },
    { cycleLengthDays: 33, cycleDay: 9, says: 'After your period, days 6 to 18' },
    { cycleLengthDays: 33, cycleDay: 20, says: 'Around ovulation, days 19 to 23' },
    { cycleLengthDays: 33, cycleDay: 30, says: 'Before your period, days 24 to 33' },
  ])(
    'should say "$says" on day $cycleDay of a $cycleLengthDays day cycle',
    async ({ cycleLengthDays, cycleDay, says }) => {
      await sheOpensToday(cycleDay, cycleLengthDays);

      expect(whatItSays(phaseCardDaysTestID)).toBe(says);
    },
  );

  it('should carry the sentence of the board, say the phase is an estimate, and offer what may help', async () => {
    await sheOpensToday(16, 28);

    expect(whatItSays(phaseCardLineTestID)).toBe(
      'Energy is often at its highest. This phase is an estimate. How you may feel and what may help.',
    );
  });

  it('should no longer name the phase on the card, now that the middle of the ring names it', async () => {
    await sheOpensToday(20, 28);

    expect(whatItSays(phaseCardDaysTestID)).not.toContain('Luteal');
    expect(whatItSays(ringCentrePhaseTestID)).toBe('Luteal phase');
  });

  it('should be a button now that the Cycle phase page exists, and open it', async () => {
    const app = await sheOpensToday(16, 28);
    const card = screen.getByTestId(phaseCardTestID);

    expect(screen.getByTestId(phaseCardPressTestID).props.accessibilityRole).toBe('button');
    expect(within(card).getByTestId(phaseCardChevronTestID)).toBeTruthy();
    await fireEvent.press(card);

    expect(app.pathname()).toBe('/phase');
  });
});

describe('the tab bar', () => {
  it('should draw Today as a calendar and Log as a drop', () => {
    expect(tabs.map((tab) => tab.icon)).toEqual(['calendar', 'drop', 'chart', 'shield']);
  });
});
