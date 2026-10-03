import { OnAPhone, theScreenIn } from '../fixtures/theSafeArea';

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
import { herPatterns } from '../../src/features/home/herPatterns';
import { herTrend } from '../../src/features/home/herTrend';
import { type DrawnScreen, phoneSize } from '../../../../brand/screens/asHtml';
import { drawOrCheck } from '../../../../brand/screens/picture';
import { daysLogged, readDay } from '../fixtures/cycleCache';
import { recordedAt } from '../fixtures/forecast';
import { daysOfHerRepeatingSymptoms } from '../fixtures/herRepeatingSymptoms';

/**
 * One frame of the screen she opens, scrolled to what came back.
 *
 * The home screen picture draws sixteen frames side by side, and a reader who wants this one has to
 * open a page over six thousand pixels wide. This draws the same screen at the same offset, alone,
 * so the two cards, the line under them and the way to Insights can be looked at.
 *
 * It is not part of the suite: the file is named for a picture rather than for a test, and the
 * runner is pointed at it by `npm run generate:patterns-picture`.
 */

/** The length she gave at the first run, which no card reads. */
const sheSaidHerCycleRuns = 31;

/** The day she opens it, which is the day the fixture places her symptoms against. */
const theDaySheOpensIt = recordedAt.toISOString().slice(0, 10);

/**
 * Points to move the screen up by, so the cards are in the frame. They sit about 1,700 points down
 * the screen, under the chart, and a frame clips at 844.
 */
const theCardsSitThisFarDown = 1620;

const theCaveat = [
  'Rendered from the tree the home screen produced under the test runner, at 390 by 844 points,',
  'and not captured from a phone. The page loads the same font files the application loads, so the',
  'words are drawn in Figtree. Reproduce with: npm run generate:patterns-picture.',
  'The room kept at the top and the bottom is the room an iPhone with a dynamic island keeps for',
  `itself. The screen is laid out whole and moved up ${String(theCardsSitThisFarDown)} points, which is what`,
  'scrolling does, so the foot of it is in the frame.',
].join(' ');

/**
 * Her six cycles, with cramps two days before five of her periods and bloating on day 12 of four of
 * them. A third symptom sits in two cycles, which is the count Emi refuses to call a pattern, so it
 * is on no card.
 */
async function drawn(): Promise<DrawnScreen> {
  const database = daysLogged(daysOfHerRepeatingSymptoms(theDaySheOpensIt), recordedAt);
  const cycles = listCycles(database);
  const forecast = forecastOf(cycles, sheSaidHerCycleRuns);
  const records = recordedDays(database, readDay);
  const readBack = {
    cycles,
    records,
    today: theDaySheOpensIt,
    statedCycleLengthDays: sheSaidHerCycleRuns,
  };

  const view = await render(
    <OnAPhone>
      <View
        style={{
          height: phoneSize.height + theCardsSitThisFarDown,
          marginTop: -theCardsSitThisFarDown,
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
          onOpenPattern={() => undefined}
          onOpenPatterns={() => undefined}
          onPeriod={() => undefined}
          onSymptoms={() => undefined}
          patterns={herPatterns(readBack)}
          ring={ringInputFor(readBack)}
          today={theDaySheOpensIt}
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
    title: 'What came back, on the screen she opens',
    note: `Two symptoms named, one refused. Offset up ${String(theCardsSitThisFarDown)} points.`,
    tree,
  };
}

const screens: DrawnScreen[] = [];

describe('what came back, drawn for somebody to look at', () => {
  beforeEach(() => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the screen she opens, scrolled to her cards', async () => {
    screens.push(await drawn());
  });

  it('draws it into one picture', async () => {
    expect(screens).toHaveLength(1);

    const result = drawOrCheck({
      name: 'home-screen-patterns',
      screens: screens,
      caveat: theCaveat,
      script: 'generate:patterns-picture',
    });

    expect(result.problems).toEqual([]);
    console.log(result.said);
  });
});
