import type { DayRecord } from '@emi/crypto';
import { addDays } from '@emi/cycle';
import { render } from '@testing-library/react-native';

import { listCycles } from '../../src/data/cycleRepository';
import { CalendarScreen } from '../../src/features/calendar/CalendarScreen';
import { herMonth } from '../../src/features/calendar/herMonth';
import {
  type HerReading,
  type WhatTheSheetSays,
  whatTheSheetSays,
} from '../../src/features/calendar/theDaySheet';
import { recordedDays } from '../../src/features/cycle/rebuild';
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
  'files the application loads, so the words are drawn in Plus Jakarta Sans. Reproduce with:',
  'npm run generate:calendar-picture.',
  'The room kept at the top and the bottom of each screen is the room an iPhone with a dynamic',
  'island keeps for itself, which is 59 points and 34 points.',
].join(' ');

const recordedAt = new Date('2026-09-18T20:00:00.000Z');

/** Her period starts, and how many days she bled on each of them. */
const herPeriodStarts = ['2026-07-25', '2026-08-14', '2026-09-03'];
const herPeriodRunsFor = 5;

/** The two days she opens the month on: day sixteen of her cycle, and day five of the one before. */
const theDaySheOpensIt = '2026-09-18';
const aDaySheWasBleedingOn = '2026-08-18';

/** What she marked on the day she presses, so the sheet at the foot has something to read back. */
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

function herReadingOn(today: string): { from: HerReading; days: ReturnType<typeof herMonth> } {
  const database = daysLogged(herDays(), recordedAt);
  const from = {
    cycles: listCycles(database),
    records: recordedDays(database, (payload) => herVault().open(payload)),
    today,
    statedCycleLengthDays: defaultCycleLengthDays,
    statedPeriodLengthDays: herPeriodRunsFor,
  };

  return { from, days: herMonth(from, startOfMonth(today)) };
}

/** The sheet as the screen works it out, for the state that shows a day she pressed. */
function theSheetFor(state: State): WhatTheSheetSays | undefined {
  if (state.shePressed === undefined) {
    return undefined;
  }

  const { from, days } = herReadingOn(state.today);
  const hers = days.find((day) => day.day === state.shePressed);

  if (hers === undefined) {
    throw new Error(`${state.shePressed} is not a day of the month this state draws`);
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
  readonly today: string;
  /** The day she pressed, and nothing at all in the state she has pressed none. */
  readonly shePressed?: string;
}

const theStates: readonly State[] = [
  {
    title: 'The month she is in, with the day she pressed named at the foot',
    note: 'Day sixteen. The five days she bled are filled, the days her next period is expected on are outlined, and the sheet names the day she pressed, its cycle day, its phase and what she marked on it. Pressing the sheet opens that day.',
    today: theDaySheOpensIt,
    shePressed: theDaySheOpensIt,
  },
  {
    title: 'The month before, while she was bleeding, pressed nowhere',
    note: 'Her period ran from the fourteenth. The day she is reading it on is ringed, and the days behind it are filled. She has pressed no day, so the foot names none.',
    today: aDaySheWasBleedingOn,
  },
];

async function drawn(state: State): Promise<DrawnScreen> {
  const view = await render(
    <OnAPhone>
      <CalendarScreen
        days={herReadingOn(state.today).days}
        month={startOfMonth(state.today)}
        onBack={() => undefined}
        onEarlierMonth={() => undefined}
        onEditPeriod={() => undefined}
        onLaterMonth={() => undefined}
        onOpenDay={() => undefined}
        onPressDay={() => undefined}
        onToday={() => undefined}
        today={state.today}
        {...(theSheetFor(state) === undefined ? {} : { shePressed: theSheetFor(state) })}
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
