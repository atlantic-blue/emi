import { OnAPhone, theScreenIn } from '../fixtures/theSafeArea';

import type { DayRecord, Feeling, Goal, Regularity } from '@emi/crypto';
import { type ForecastResult, addDays } from '@emi/cycle';
import { render } from '@testing-library/react-native';
import { AccessibilityInfo, View } from 'react-native';

import { listCycles } from '../../src/data/cycleRepository';
import { herWeek } from '../../src/features/cycle/herWeek';
import { recordedDays } from '../../src/features/cycle/rebuild';
import { ringInputFor } from '../../src/features/cycle/ringInput';
import { rangeSentence } from '../../src/features/forecast/copy';
import { forecastOf } from '../../src/features/forecast/fromCache';
import { HomeScreen } from '../../src/features/home/HomeScreen';
import { herCycles } from '../../src/features/home/herCycles';
import { herPatterns } from '../../src/features/home/herPatterns';
import { herTrend } from '../../src/features/home/herTrend';
import { herNumbers } from '../../src/features/home/herNumbers';
import type { RecordedSet } from '../../../../packages/cycle/tests/fixtures/recordedSets';
import {
  daysOf,
  genuinelyIrregular,
  oneCycleComplete,
  oneLongCycle,
  twoCyclesExactly,
  veryRegular,
} from '../../../../packages/cycle/tests/fixtures/recordedSets';
import { type DrawnScreen, phoneSize } from '../../../../brand/screens/asHtml';
import { drawOrCheck } from '../../../../brand/screens/picture';
import { daysLogged, migratedDatabase, readDay } from '../fixtures/cycleCache';
import { recordedAt } from '../fixtures/forecast';
import { daysOfHerRepeatingSymptoms } from '../fixtures/herRepeatingSymptoms';

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

/** The day the frame with nothing recorded is drawn on, which is the day the sets are counted from. */
const theDayWithNothingRecorded = recordedAt.toISOString().slice(0, 10);

const theCaveat = [
  'Rendered from the tree the home screen produced under the test runner, at 390 by 844 points,',
  'and not captured from a phone. The page loads the same font files the application loads, so the',
  'words are drawn in Plus Jakarta Sans. Reproduce with: npm run generate:home-picture.',
  'The room kept at the top and the bottom of each screen is the room an iPhone with a dynamic',
  'island keeps for itself, which is 59 points and 34 points.',
  'The last three frames draw the same screen offset upward, because a frame is 844 points tall',
  'and her strips, her trend and her cards all sit below that. Each caption says by how much.',
  'Nothing else about them differs.',
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
  /** Left out where she passed the question by, and then no line is offered to her. */
  readonly feeling?: Feeling;
  /** Left out where she passed the question by, and then neither card is drawn for her. */
  readonly goals?: readonly Goal[];
  /** The day of the cycle this frame is drawn on, where it is not the day the rest are drawn on. */
  readonly onDay?: number;
  /** The days she recorded, where the recorded sets cannot express them. */
  readonly days?: readonly DayRecord[];
  /** How long she said her period runs, which is what a day ahead of her is drawn against. */
  readonly periodRunsFor?: number;
  /**
   * Points to offset the screen upward by, where this frame holds the foot of the screen rather
   * than the head of it. A frame clips at 844 points, so a section further down than that is drawn
   * and never seen. The screen is laid out whole and the box is moved, which is what scrolling does.
   */
  readonly offsetPoints?: number;
}

/**
 * Her period started on a Monday and she has recorded four days of it, today being the fourth.
 * The recorded sets cannot express this: each one closes every period it writes, and a period
 * that is closed leaves no day ahead of her for the strip to draw as expected.
 */
const herPeriodStartedOnAMonday = '2026-09-14';
const sheRecordedFourDaysOfIt: readonly DayRecord[] = Array.from(
  { length: 4 },
  (_unused, index) => {
    const day = addDays(herPeriodStartedOnAMonday, index);

    return { day, flow: 'medium', recordedAt: `${day}T08:00:00.000Z` };
  },
);

/**
 * The same period, with today left unlogged, and then today carrying the two symptoms the drawing
 * of the screen she comes back to names. The two frames are the pair step 15.6 builds: the row is
 * absent on the first and reads back her marks on the second.
 */
const sheRecordedTheThreeDaysBehindToday: readonly DayRecord[] = sheRecordedFourDaysOfIt.slice(
  0,
  3,
);

const sheThenMarkedTwoSymptoms: readonly DayRecord[] = [
  ...sheRecordedTheThreeDaysBehindToday,
  {
    day: addDays(herPeriodStartedOnAMonday, 3),
    symptoms: ['cramps', 'low-mood'],
    recordedAt: `${addDays(herPeriodStartedOnAMonday, 3)}T19:00:00.000Z`,
  },
];

/**
 * The points the last frame is offset by. Her strips sit under her three numbers, which is further
 * down the screen than a frame reaches, so the box is moved down the screen by this much.
 */
const theStripsSitThisFarDown = 700;

/** The points the trend frame is offset by, measured the same way: her chart sits below her strips. */
const theTrendSitsThisFarDown = 1450;

/** The points the cards are offset by. They sit under the chart, which is further down again. */
const theCardsSitThisFarDown = 1780;

/**
 * The day the frame of her cards is counted from, which is the day every other frame counts from.
 * The fixture places her symptoms against it, so the cards name the cycles the fixture names.
 */
const theDaySheOpensHerCards = theDayWithNothingRecorded;

const theRecordedSets: readonly Recorded[] = [
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
  {
    title: 'Day 2 of a period she said is hard',
    set: veryRegular,
    feeling: 'hard',
    onDay: 2,
  },
  {
    title: 'Six cycles, and she asked for both cards',
    set: veryRegular,
    goals: ['fertileWindow', 'doctorRecord'],
  },
  {
    title: 'Four recorded period days, and the week she reads them in',
    set: veryRegular,
    days: sheRecordedFourDaysOfIt,
    onDay: 4,
    periodRunsFor: 5,
  },
  {
    title: 'Day 4, and she has marked nothing today',
    set: veryRegular,
    days: sheRecordedTheThreeDaysBehindToday,
    onDay: 4,
    periodRunsFor: 5,
  },
  {
    title: 'The two symptoms she marked today, read back under the line',
    set: veryRegular,
    days: sheThenMarkedTwoSymptoms,
    onDay: 4,
    periodRunsFor: 5,
  },
  // The frames above land on a period day or a follicular one, so none of them shows the line in a
  // phase contract SCREEN-2 says nothing about. This is the other half of that question.
  { title: 'Day 21, in the luteal phase', set: veryRegular, onDay: 21 },
  {
    title: `Her cycle strips, offset upward by ${String(theStripsSitThisFarDown)} points`,
    set: genuinelyIrregular,
    offsetPoints: theStripsSitThisFarDown,
  },
  {
    title: `Her trend over the published band, offset upward by ${String(theTrendSitsThisFarDown)} points`,
    set: genuinelyIrregular,
    offsetPoints: theTrendSitsThisFarDown,
  },
  // The only frame drawn from days that carry symptoms. The recorded sets hold bleeding alone, so
  // no other frame can show a card, and a screen with nothing to name draws no section at all.
  {
    title: `What came back, offset upward by ${String(theCardsSitThisFarDown)} points`,
    set: veryRegular,
    days: daysOfHerRepeatingSymptoms(theDaySheOpensHerCards),
    offsetPoints: theCardsSitThisFarDown,
  },
];

/** What the frame is captioned with: the day she is on, and the sentence the screen names. */
function noteFor(
  day: number | undefined,
  forecast: ForecastResult,
  offsetPoints: number | undefined,
): string {
  if (offsetPoints !== undefined) {
    return `Offset up ${String(offsetPoints)} points, so the foot of the screen is in the frame.`;
  }

  if (day === undefined) {
    return 'Nothing recorded, so there is no ring and no forecast.';
  }

  return forecast.kind === 'forecast'
    ? `Day ${day}. ${rangeSentence(forecast.start)}.`
    : `Day ${day}. Emi is still learning.`;
}

async function drawn(recorded: Recorded): Promise<DrawnScreen> {
  const onDay = recorded.onDay ?? theDaySheOpensIt;
  const database =
    recorded.recorded === 'nothing'
      ? migratedDatabase()
      : daysLogged(recorded.days ?? daysOf(recorded.set), recordedAt);
  const cycles = listCycles(database);
  const open = cycles[cycles.length - 1];
  const forecast = forecastOf(cycles, sheSaidHerCycleRuns);
  const records = recordedDays(database, readDay);
  // A woman with nothing recorded still has a week, so the frame that draws no ring is drawn on
  // the same day the recorded sets are counted from.
  const today = open === undefined ? theDayWithNothingRecorded : addDays(open.startedOn, onDay - 1);
  const ring =
    open === undefined
      ? undefined
      : ringInputFor({
          cycles,
          records,
          today,
          statedCycleLengthDays: sheSaidHerCycleRuns,
          statedPeriodLengthDays: recorded.periodRunsFor,
        });

  // Today as she left it, picked out of the days this frame was drawn from, which is what the
  // route hands the screen.
  const loggedToday = recorded.days?.find((day) => day.day === today);

  const screen = (
    <HomeScreen
      cycleLengthDays={sheSaidHerCycleRuns}
      feeling={recorded.feeling}
      forecast={forecast}
      goals={recorded.goals}
      loggedToday={loggedToday}
      name={recorded.name}
      numbers={herNumbers(cycles, forecast)}
      cycles={herCycles({ cycles, records })}
      onExport={() => undefined}
      onFigures={() => undefined}
      onLogPain={() => undefined}
      onOpenCycle={() => undefined}
      onOpenCycles={() => undefined}
      onOpenPattern={() => undefined}
      onOpenPatterns={() => undefined}
      onPeriod={() => undefined}
      onSymptoms={() => undefined}
      patterns={herPatterns({ cycles, records })}
      regularity={recorded.regularity}
      ring={ring}
      today={today}
      trend={herTrend({ cycles, records })}
      week={herWeek({
        cycles,
        records,
        today,
        statedCycleLengthDays: sheSaidHerCycleRuns,
        statedPeriodLengthDays: recorded.periodRunsFor,
      })}
    />
  );
  // The whole screen is laid out, in a box as tall as it needs, and the box is moved up inside the
  // frame. A screen left at the height of the frame would clip the strips rather than scroll to them.
  const view = await render(
    <OnAPhone>
      {recorded.offsetPoints === undefined ? (
        screen
      ) : (
        <View
          style={{
            height: phoneSize.height + recorded.offsetPoints,
            marginTop: -recorded.offsetPoints,
          }}
        >
          {screen}
        </View>
      )}
    </OnAPhone>,
  );
  // A copy, taken before the screen is torn down. The runner holds one screen at a time, so a tree
  // kept by reference is the tree of whatever was rendered last.
  const tree: unknown = theScreenIn(view);

  view.unmount();

  return {
    title: recorded.title,
    note: noteFor(ring === undefined ? undefined : onDay, forecast, recorded.offsetPoints),
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

  for (const recorded of theRecordedSets) {
    it(`renders the home screen from ${recorded.title.toLowerCase()}`, async () => {
      screens.push(await drawn(recorded));
    });
  }

  it('draws them into one picture', async () => {
    expect(screens).toHaveLength(theRecordedSets.length);

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
