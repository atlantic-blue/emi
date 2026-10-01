import { OnAPhone, theScreenIn } from '../fixtures/theSafeArea';

import { addDays } from '@emi/cycle';
import { render } from '@testing-library/react-native';
import { AccessibilityInfo, View } from 'react-native';

import { listCycles } from '../../src/data/cycleRepository';
import { herWeek } from '../../src/features/cycle/herWeek';
import { recordedDays } from '../../src/features/cycle/rebuild';
import { ringInputFor } from '../../src/features/cycle/ringInput';
import { forecastOf } from '../../src/features/forecast/fromCache';
import { HomeScreen } from '../../src/features/home/HomeScreen';
import { herCycles } from '../../src/features/home/herCycles';
import { herNumbers } from '../../src/features/home/herNumbers';
import { herTrend } from '../../src/features/home/herTrend';
import { daysOf, genuinelyIrregular } from '../../../../packages/cycle/tests/fixtures/recordedSets';
import { type DrawnScreen, phoneSize } from '../../../../brand/screens/asHtml';
import { drawOrCheck } from '../../../../brand/screens/picture';
import { daysLogged, readDay } from '../fixtures/cycleCache';
import { recordedAt } from '../fixtures/forecast';

/**
 * One frame of the screen she opens, scrolled to the chart of her cycles.
 *
 * The home screen picture draws fifteen frames side by side, and a reader who wants this one has to
 * open a page over six thousand pixels wide. This draws the same screen at the same offset, alone,
 * so the chart, the sentence that counts her cycles and the way to Insights can be looked at.
 *
 * It is not part of the suite: the file is named for a picture rather than for a test, and the
 * runner is pointed at it by `npm run generate:trend-picture`.
 */

/** The day of the cycle the screen is drawn on, and the length she gave at the first run. */
const theDaySheOpensIt = 8;
const sheSaidHerCycleRuns = 31;

/**
 * Points to move the screen up by, so the chart is in the frame. Her chart sits about 1,500 points
 * down the screen and a frame clips at 844, so a screen drawn from the top would not reach it.
 */
const theTrendSitsThisFarDown = 1450;

const theCaveat = [
  'Rendered from the tree the home screen produced under the test runner, at 390 by 844 points,',
  'and not captured from a phone. The page loads the same font files the application loads, so the',
  'words are drawn in Plus Jakarta Sans. Reproduce with: npm run generate:trend-picture.',
  'The room kept at the top and the bottom is the room an iPhone with a dynamic island keeps for',
  `itself. The screen is laid out whole and moved up ${String(theTrendSitsThisFarDown)} points, which is what`,
  'scrolling does, so the foot of it is in the frame.',
].join(' ');

/** Her six cycles, which run from 24 to 41 days, so one of them falls outside the published band. */
async function drawn(): Promise<DrawnScreen> {
  const database = daysLogged(daysOf(genuinelyIrregular), recordedAt);
  const cycles = listCycles(database);
  const open = cycles[cycles.length - 1];
  const forecast = forecastOf(cycles, sheSaidHerCycleRuns);
  const records = recordedDays(database, readDay);
  const today = addDays(String(open?.startedOn), theDaySheOpensIt - 1);
  const readBack = { cycles, records, today, statedCycleLengthDays: sheSaidHerCycleRuns };

  const view = await render(
    <OnAPhone>
      <View
        style={{
          height: phoneSize.height + theTrendSitsThisFarDown,
          marginTop: -theTrendSitsThisFarDown,
        }}
      >
        <HomeScreen
          completeCycles={cycles.filter((cycle) => cycle.lengthDays !== null).length}
          cycleLengthDays={sheSaidHerCycleRuns}
          cycles={herCycles(readBack)}
          forecast={forecast}
          numbers={herNumbers(cycles, forecast)}
          onExport={() => undefined}
          onFigures={() => undefined}
          onLogPain={() => undefined}
          onLogToday={() => undefined}
          onOpenCycle={() => undefined}
          onOpenCycles={() => undefined}
          onPeriod={() => undefined}
          onSymptoms={() => undefined}
          ring={ringInputFor(readBack)}
          today={today}
          trend={herTrend(readBack)}
          week={herWeek(readBack)}
        />
      </View>
    </OnAPhone>,
  );
  // A copy, taken before the screen is torn down. The runner holds one screen at a time, so a tree
  // kept by reference is the tree of whatever was rendered last.
  const tree: unknown = theScreenIn(view);

  view.unmount();

  return {
    title: 'Her last six cycles over the published band',
    note: `Six complete cycles, 24 to 41 days. Offset up ${String(theTrendSitsThisFarDown)} points.`,
    tree,
  };
}

const screens: DrawnScreen[] = [];

describe('the chart of her cycles, drawn for somebody to look at', () => {
  beforeEach(() => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the screen she opens, scrolled to her chart', async () => {
    screens.push(await drawn());
  });

  it('draws it into one picture', async () => {
    expect(screens).toHaveLength(1);

    const result = drawOrCheck({
      name: 'home-screen-trend',
      screens: screens,
      caveat: theCaveat,
      script: 'generate:trend-picture',
    });

    expect(result.problems).toEqual([]);
    console.log(result.said);
  });
});
