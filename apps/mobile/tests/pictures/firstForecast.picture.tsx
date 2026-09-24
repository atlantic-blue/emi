import { render } from '@testing-library/react-native';
import { OnAPhone, theScreenIn } from '../fixtures/theSafeArea';

import { FirstForecast } from '../../src/features/onboarding/FirstForecast';
import { forecastFromHerAnswers } from '../../src/features/onboarding/firstRun';
import type { DrawnScreen } from '../../../../brand/screens/asHtml';
import { iPhone16Size } from '../../../../brand/screens/asHtml';
import { drawOrCheck } from '../../../../brand/screens/picture';

/**
 * The first thing Emi says back to her, drawn for somebody to look at, in the two shapes her
 * answers make: the day she gave and the length she stated, and the same with the period before it
 * as well. The two ranges are worked out by the arithmetic the screen itself reads, so the days in
 * the picture are the days a woman answering this way is shown.
 *
 * It is not part of the suite: the file is named for a picture rather than for a test, and the
 * runner is pointed at it by `npm run generate:first-forecast-picture`.
 */

const theCaveat = [
  'Rendered from the trees the first forecast screen produced under the test runner, at 393 by',
  '852 points, which is the glass of an iPhone 16, and not captured from a phone.',
  'Reproduce with: npm run generate:first-forecast-picture.',
  'The room kept at the top and the bottom of each screen is the room an iPhone with a dynamic',
  'island keeps for itself, which is 59 points and 34 points.',
].join(' ');

const herPeriodStarted = '2026-05-09';
const theOneBefore = '2026-04-11';
const sheSaidHerCycleRuns = 28;

const screens: DrawnScreen[] = [];

/** The range her answers make, counted the way the screen counts it. */
function herRange(periodBeforeStartedOn?: string) {
  const forecast = forecastFromHerAnswers({
    periodStartedOn: herPeriodStarted,
    periodBeforeStartedOn,
    cycleLengthDays: sheSaidHerCycleRuns,
  });

  if (forecast.start === undefined) {
    throw new Error('her answers left the arithmetic with no range to draw');
  }

  return forecast.start;
}

async function drawn(title: string, note: string, periodBeforeStartedOn?: string): Promise<void> {
  const view = await render(
    <OnAPhone>
      <FirstForecast onContinue={() => undefined} start={herRange(periodBeforeStartedOn)} />
    </OnAPhone>,
  );
  const tree: unknown = theScreenIn(view);

  view.unmount();

  screens.push({ title, note, tree });
}

describe('her first forecast, drawn for somebody to look at', () => {
  it('renders the screen a woman who gave one period reads', async () => {
    await drawn(
      'One period, and the length she gave',
      'The range is her last start plus the 28 days she stated, three days either side.',
    );
  });

  it('renders the screen a woman who remembered the period before reads', async () => {
    await drawn(
      'Two periods, one whole cycle behind her',
      'The cycle she lived does not move the range: until two are complete it is counted from the length she gave.',
      theOneBefore,
    );
  });

  it('draws them into one picture', () => {
    expect(screens).toHaveLength(2);

    const result = drawOrCheck({
      name: 'first-forecast',
      screens,
      caveat: theCaveat,
      script: 'generate:first-forecast-picture',
      size: iPhone16Size,
    });

    expect(result.problems).toEqual([]);
    console.log(result.said);
  });
});
