import { OnAPhone, theScreenIn } from '../fixtures/theSafeArea';

import type { Regularity } from '@emi/crypto';
import type { ForecastResult } from '@emi/cycle';
import { addDays } from '@emi/cycle';
import { render } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { listCycles } from '../../src/data/cycleRepository';
import { recordedDays } from '../../src/features/cycle/rebuild';
import { ringInputFor } from '../../src/features/cycle/ringInput';
import { rangeSentence } from '../../src/features/forecast/copy';
import { forecastOf } from '../../src/features/forecast/fromCache';
import { HomeScreen } from '../../src/features/home/HomeScreen';
import type { RecordedSet } from '../../../../packages/cycle/tests/fixtures/recordedSets';
import {
  daysOf,
  genuinelyIrregular,
  oneCycleComplete,
  oneLongCycle,
  twoCyclesExactly,
  veryRegular,
} from '../../../../packages/cycle/tests/fixtures/recordedSets';
import type { DrawnScreen } from '../../../../brand/screens/asHtml';
import { drawOrCheck } from '../../../../brand/screens/picture';
import { daysLogged, migratedDatabase, readDay } from '../fixtures/cycleCache';
import { recordedAt } from '../fixtures/forecast';

/**
 * The picture contract SCREEN-2 asks a person to look at. It renders the screen the application
 * ships, at the four recorded sets, and draws the tree that came back. Nothing here restates the
 * layout, so a change to the screen changes the picture.
 *
 * It is not part of the suite: the file is named for a picture rather than for a test, and the
 * runner is pointed at it by `npm run generate:home-picture`.
 */

/** The day of the cycle each screen is drawn on, and the length she gave at the first run. */
const theDaySheOpensIt = 8;
const sheSaidHerCycleRuns = 31;

const theCaveat = [
  'Rendered from the tree the home screen produced under the test runner, at 390 by 844 points,',
  'and not captured from a phone. The page loads the same font files the application loads, so the',
  'words are drawn in Plus Jakarta Sans. Reproduce with: npm run generate:home-picture.',
  'The room kept at the top and the bottom of each screen is the room an iPhone with a dynamic',
  'island keeps for itself, which is 59 points and 34 points.',
].join(' ');

interface Recorded {
  readonly title: string;
  readonly set: RecordedSet;
  /** Left out where she has recorded nothing at all, which draws no ring. */
  readonly recorded?: 'nothing';
  /** Left out where she gave no name, and then the screen greets her with nothing. */
  readonly name?: string;
  /** Left out where she passed the question by, and then nothing is said about the width. */
  readonly regularity?: Regularity;
}

const theFourSets: readonly Recorded[] = [
  { title: 'Her first day, nothing recorded', set: veryRegular, recorded: 'nothing' },
  { title: 'One cycle recorded, still learning', set: oneCycleComplete },
  { title: 'Six cycles of 28 days, and she gave her name', set: veryRegular, name: 'Ada' },
  { title: 'Six cycles, one of them 40 days', set: oneLongCycle },
  { title: 'Six cycles from 24 to 41 days', set: genuinelyIrregular },
  { title: 'The two cycles she has', set: twoCyclesExactly },
  {
    title: 'Six cycles of 28 days, and she said her cycle moves',
    set: veryRegular,
    regularity: 'moves',
  },
];

/** What the frame is captioned with: the day she is on, and the sentence the screen names. */
function noteFor(day: number | undefined, forecast: ForecastResult): string {
  if (day === undefined) {
    return 'Nothing recorded, so there is no ring and no forecast.';
  }

  return forecast.kind === 'forecast'
    ? `Day ${day}. ${rangeSentence(forecast.start)}.`
    : `Day ${day}. Emi is still learning.`;
}

async function drawn(recorded: Recorded): Promise<DrawnScreen> {
  const database =
    recorded.recorded === 'nothing'
      ? migratedDatabase()
      : daysLogged(daysOf(recorded.set), recordedAt);
  const cycles = listCycles(database);
  const open = cycles[cycles.length - 1];
  const forecast = forecastOf(cycles);
  const ring =
    open === undefined
      ? undefined
      : ringInputFor({
          cycles,
          records: recordedDays(database, readDay),
          today: addDays(open.startedOn, theDaySheOpensIt - 1),
          statedCycleLengthDays: sheSaidHerCycleRuns,
        });

  const view = await render(
    <OnAPhone>
      <HomeScreen
        cycleLengthDays={sheSaidHerCycleRuns}
        forecast={forecast}
        name={recorded.name}
        onExport={() => undefined}
        onHistory={() => undefined}
        onLogToday={() => undefined}
        onSettings={() => undefined}
        regularity={recorded.regularity}
        ring={ring}
      />
    </OnAPhone>,
  );
  // A copy, taken before the screen is torn down. The runner holds one screen at a time, so a tree
  // kept by reference is the tree of whatever was rendered last.
  const tree: unknown = theScreenIn(view);

  view.unmount();

  return {
    title: recorded.title,
    note: noteFor(ring === undefined ? undefined : theDaySheOpensIt, forecast),
    tree,
  };
}

/** Each screen is rendered in a case of its own, so the runner tears one down before it mounts the
 * next and no tree is read while another is still arriving. */
const screens: DrawnScreen[] = [];

describe('the home screen, drawn for somebody to look at', () => {
  beforeEach(() => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  for (const recorded of theFourSets) {
    it(`renders the home screen from ${recorded.title.toLowerCase()}`, async () => {
      screens.push(await drawn(recorded));
    });
  }

  it('draws them into one picture', async () => {
    expect(screens).toHaveLength(theFourSets.length);

    const result = drawOrCheck({
      name: 'home-screen',
      screens: screens,
      caveat: theCaveat,
      script: 'generate:home-picture',
    });

    expect(result.problems).toEqual([]);
    console.log(result.said);
  });
});
