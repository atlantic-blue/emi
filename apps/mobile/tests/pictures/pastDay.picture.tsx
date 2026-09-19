import type { DayRecord, Flow } from '@emi/cycle';
import { addDays } from '@emi/cycle';
import { render } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { listCycles } from '../../src/data/cycleRepository';
import { recordedDays } from '../../src/features/cycle/rebuild';
import type { RingInput } from '../../src/features/cycle/ringInput';
import { ringInputFor } from '../../src/features/cycle/ringInput';
import { DayRefused } from '../../src/features/log/DayRefused';
import { LogFlow } from '../../src/features/log/LogFlow';
import { refusalFor } from '../../src/features/log/editDay';
import { daysOf, veryRegular } from '../../../../packages/cycle/tests/fixtures/recordedSets';
import type { DrawnScreen } from '../../../../brand/screens/asHtml';
import { drawOrCheck } from '../../../../brand/screens/picture';
import { daysLogged, readDay } from '../fixtures/cycleCache';
import { recordedAt } from '../fixtures/forecast';

/**
 * A day she already lived, opened from its own address. Each frame is drawn from days written into
 * a database of its own, so the ring beside the corrected day is the ring her correction produces
 * rather than the one before it copied across.
 *
 * It is not part of the suite: the file is named for a picture rather than for a test, and the
 * runner is pointed at it by `npm run generate:past-day-picture`.
 */

const theCaveat = [
  'Rendered from the tree the day screen produced under the test runner, at 390 by 844 points, and',
  'not captured from a phone. The page loads the same font files the application loads, so the',
  'words are drawn in Plus Jakarta Sans. Reproduce with: npm run generate:past-day-picture.',
].join(' ');

/** The day of her cycle she opens Emi on, and the day behind it she goes back to. */
const theDaySheOpensIt = 8;
const theDaySheForgot = 3;
const sheSaidHerCycleRuns = 28;

const asSheRecordedThem = daysOf(veryRegular);
const firstCycles = listCycles(daysLogged(asSheRecordedThem, recordedAt));
const open = firstCycles[firstCycles.length - 1];

if (open === undefined) {
  throw new Error('the recorded set holds no cycle, so there is no day to go back to');
}

const today = addDays(open.startedOn, theDaySheOpensIt - 1);
const thatDay = addDays(open.startedOn, theDaySheForgot - 1);
const asSheLeftIt = asSheRecordedThem.find((record) => record.day === thatDay)?.flow;

if (asSheLeftIt === undefined) {
  throw new Error(`her records hold no flow on ${thatDay}, so there is nothing to reopen`);
}

/** The ring the home screen would draw today, from the days the database holds in this frame. */
function ringFrom(days: readonly DayRecord[]): RingInput | undefined {
  const database = daysLogged(days, recordedAt);
  const cycles = listCycles(database);

  return ringInputFor({
    cycles,
    records: recordedDays(database, readDay),
    today,
    statedCycleLengthDays: sheSaidHerCycleRuns,
  });
}

function corrected(days: readonly DayRecord[], flow: Flow): DayRecord[] {
  return days.map((record) => (record.day === thatDay ? { ...record, flow } : record));
}

interface State {
  readonly title: string;
  readonly note: string;
  readonly days: readonly DayRecord[];
  readonly chosen?: Flow;
  /** A day she has not lived yet, which the screen refuses instead of opening. */
  readonly refused?: string;
}

const theStates: readonly State[] = [
  {
    title: 'The day she goes back to',
    note: `Day ${theDaySheForgot}, holding the flow her records already carry. The ring is today, not that day.`,
    days: asSheRecordedThem,
    chosen: asSheLeftIt,
  },
  {
    title: 'She corrects it to light',
    note: 'Drawn from her corrected days. The ring stands still: the cycle still starts where it started.',
    days: corrected(asSheRecordedThem, 'light'),
    chosen: 'light',
  },
  {
    title: 'A day she has not lived',
    note: 'The rule sits in the write and not only on the screen, so no path can record a day ahead.',
    days: asSheRecordedThem,
    refused: addDays(today, 2),
  },
];

async function drawn(state: State): Promise<DrawnScreen> {
  const refusal =
    state.refused === undefined ? undefined : refusalFor({ day: state.refused, today });
  const view = await render(
    refusal === undefined ? (
      <LogFlow
        chosen={state.chosen}
        day={thatDay}
        marked={false}
        onDone={() => undefined}
        onMark={() => undefined}
        onPick={() => undefined}
        ring={ringFrom(state.days)}
        today={today}
      />
    ) : (
      <DayRefused onBack={() => undefined} refusal={refusal} />
    ),
  );
  // A copy, taken before the screen is torn down. The runner holds one screen at a time, so a tree
  // kept by reference is the tree of whatever was rendered last.
  const tree: unknown = JSON.parse(JSON.stringify(view.toJSON()));

  view.unmount();

  return { title: state.title, note: state.note, tree };
}

const screens: DrawnScreen[] = [];

describe('a past day, drawn for somebody to look at', () => {
  beforeEach(() => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  for (const state of theStates) {
    it(`renders ${state.title.toLowerCase()}`, async () => {
      screens.push(await drawn(state));
    });
  }

  it('draws them into one picture', () => {
    expect(screens).toHaveLength(theStates.length);

    const result = drawOrCheck({
      name: 'past-day',
      screens,
      caveat: theCaveat,
      script: 'generate:past-day-picture',
    });

    expect(result.problems).toEqual([]);
    console.log(result.said);
  });
});
