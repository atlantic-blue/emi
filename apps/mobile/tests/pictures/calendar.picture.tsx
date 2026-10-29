import type { DayRecord } from '@emi/crypto';
import { addDays } from '@emi/cycle';
import { render } from '@testing-library/react-native';

import { listCycles } from '../../src/data/cycleRepository';
import { CalendarScreen } from '../../src/features/calendar/CalendarScreen';
import { herMonth } from '../../src/features/calendar/herMonth';
import { theDayPhaseOn } from '../../src/features/calendar/herMonthPhases';
import {
  type HerReading,
  type WhatTheSheetSays,
  whatTheSheetSays,
} from '../../src/features/calendar/theDaySheet';
import { theCyclesAhead } from '../../src/features/calendar/forecastAhead';
import { type TheWait, theWaitForHerNextPeriod } from '../../src/features/calendar/theWait';
import { herDaysOn } from '../../src/features/cycle/herWeek';
import { recordedDays } from '../../src/features/cycle/rebuild';
import { forecastOf } from '../../src/features/forecast/fromCache';
import { startOfMonth } from '../../src/features/onboarding/days';
import { defaultCycleLengthDays } from '../../src/features/onboarding/firstRun';
import type { DrawnScreen } from '../../../../brand/screens/asHtml';
import { iPhone16Size } from '../../../../brand/screens/asHtml';
import { drawOrCheck } from '../../../../brand/screens/picture';
import { daysLogged } from '../fixtures/cycleCache';
import { herVault } from '../fixtures/herVault';
import { OnAPhone, theScreenIn } from '../fixtures/theSafeArea';

/**
 * The month she opens, drawn from days written into a database of its own, so every cycle day and
 * every mark on the page is the one her own records produce.
 *
 * It is not part of the suite: the file is named for a picture rather than for a test, and the
 * runner is pointed at it by `npm run generate:calendar-picture`.
 */

const theCaveat = [
  'Rendered from the tree the month screen produced under the test runner, at 393 by 852 points,',
  'which is the glass of an iPhone 16, and not captured from a phone. The page loads the same font',
  'files the application loads, so the words are drawn in Figtree. Reproduce with:',
  'npm run generate:calendar-picture.',
  'The room kept at the top and the bottom of each screen is the room an iPhone with a dynamic',
  'island keeps for itself, which is 59 points and 34 points.',
].join(' ');

const recordedAt = new Date('2026-09-18T20:00:00.000Z');

/** Her period starts, and how many days she bled on each of them. */
const herPeriodStarts = ['2026-07-25', '2026-08-14', '2026-09-03'];
const herPeriodRunsFor = 5;

/** The day she opens the month on, which is day sixteen of her cycle. */
const theDaySheOpensIt = '2026-09-18';
/** A day she bled on, in the month before. */
const aDaySheWasBleedingOn = '2026-08-18';

/** What she marked on the day she presses, so the card at the foot has something to read back. */
const sheMarked = ['cramps', 'low-mood'];

function herDays(): DayRecord[] {
  const bled = herPeriodStarts.flatMap((start) =>
    Array.from({ length: herPeriodRunsFor + 1 }, (_unused, offset) => {
      const day = addDays(start, offset);

      return {
        day,
        flow: offset === herPeriodRunsFor ? ('none' as const) : ('medium' as const),
        recordedAt: `${day}T08:00:00.000Z`,
      };
    }),
  );

  return [
    ...bled,
    {
      day: theDaySheOpensIt,
      symptoms: sheMarked,
      recordedAt: `${theDaySheOpensIt}T09:00:00.000Z`,
    },
  ];
}

function herReading(): HerReading {
  const database = daysLogged(herDays(), recordedAt);

  return {
    cycles: listCycles(database),
    records: recordedDays(database, (payload) => herVault().open(payload)),
    today: theDaySheOpensIt,
    statedCycleLengthDays: defaultCycleLengthDays,
    statedPeriodLengthDays: herPeriodRunsFor,
  };
}

/** The forecast period that starts in the month after, which that month opens its card on. */
function herForecastPeriodInTheMonthAfter(): string {
  const next = theCyclesAhead(herReading()).find((cycle) => cycle.startsOn.startsWith('2026-10'));

  if (next === undefined) {
    throw new Error('her three cycles produced no forecast period in the month after');
  }

  return next.startsOn;
}

/** The line above the legend, counted from the day she opens the month. */
function theWaitFor(from: HerReading): { waitForNextPeriod?: TheWait } {
  const wait = theWaitForHerNextPeriod(
    forecastOf(from.cycles, from.statedCycleLengthDays),
    theDaySheOpensIt,
  );

  return wait === undefined ? {} : { waitForNextPeriod: wait };
}

/** The card as the screen works it out, for the day she pressed. */
function theSheetFor(state: State): WhatTheSheetSays {
  const from = herReading();
  const hers = herDaysOn(from, [state.shePressed])[0];

  if (hers === undefined) {
    throw new Error(`${state.shePressed} gave no day`);
  }

  return whatTheSheetSays(
    from,
    hers,
    from.records.find((record) => record.day === state.shePressed),
  );
}

interface State {
  readonly title: string;
  readonly note: string;
  /** The month drawn, named by any day in it. */
  readonly month: string;
  /** The day she pressed, which the card at the foot names. */
  readonly shePressed: string;
}

const theStates: readonly State[] = [
  {
    title: 'The month she is in, with today named at the foot',
    note: 'Day sixteen. A line above the legend says how many days until her next period is likely to start. The five days she bled are filled, today is ringed, and the next forecast period starts again at day 1, its most likely days in dashed rings and the days either side in dotted rings. The card names today, its cycle day, its phase and what she marked on it, over Edit my period and Record sex.',
    month: theDaySheOpensIt,
    shePressed: theDaySheOpensIt,
  },
  {
    title: 'The month after, with the first day of a forecast period pressed',
    note: 'A month she has not lived. The most likely days of each forecast period are dashed rings and the days either side are dotted rings, the cycle day starts again at 1 on each of them, and the fertile window is tinted with the ovulation day filled. The card says when that period is likely to start. It has no open button, because there is nothing to record on a day ahead of her.',
    month: '2026-10-01',
    shePressed: herForecastPeriodInTheMonthAfter(),
  },
  {
    title: 'The month before, with a day she bled on pressed',
    note: 'Her period ran from the fourteenth. The picked day carries a ring of its own, and the card says its cycle day, its phase and that nothing else is logged. The round button opens that day, and Record sex opens the Sex page of that day. Remove period day sits on the next line, under the edge of this frame, and takes the bleeding off that day alone.',
    month: aDaySheWasBleedingOn,
    shePressed: aDaySheWasBleedingOn,
  },
];

async function drawn(state: State): Promise<DrawnScreen> {
  const from = herReading();
  const view = await render(
    <OnAPhone>
      <CalendarScreen
        days={herMonth(from, startOfMonth(state.month))}
        month={startOfMonth(state.month)}
        onBack={() => undefined}
        onEarlierMonth={() => undefined}
        onEditPeriod={() => undefined}
        onLaterMonth={() => undefined}
        onOpenDay={() => undefined}
        onRecordSex={() => undefined}
        onRemovePeriodDay={() => undefined}
        onPressDay={() => undefined}
        onToday={() => undefined}
        phaseOn={(day) => theDayPhaseOn(from, day)}
        shePressed={theSheetFor(state)}
        today={theDaySheOpensIt}
        {...theWaitFor(from)}
      />
    </OnAPhone>,
  );
  const tree: unknown = theScreenIn(view);

  view.unmount();

  return { title: state.title, note: state.note, tree };
}

const screens: DrawnScreen[] = [];

describe('the month she opens, drawn for somebody to look at', () => {
  for (const state of theStates) {
    it(`renders ${state.title.toLowerCase()}`, async () => {
      screens.push(await drawn(state));
    });
  }

  it('draws them into one picture', async () => {
    expect(screens).toHaveLength(theStates.length);

    const result = drawOrCheck({
      name: 'calendar',
      screens: screens,
      caveat: theCaveat,
      script: 'generate:calendar-picture',
      size: iPhone16Size,
    });

    expect(result.problems).toEqual([]);
    console.log(result.said);
  });
});
