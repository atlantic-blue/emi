import { render } from '@testing-library/react-native';
import { OnAPhone, theScreenIn } from '../fixtures/theSafeArea';

import { FirstForecast } from '../../src/features/onboarding/FirstForecast';
import { forecastFromHerAnswers } from '../../src/features/onboarding/firstRun';
import type { DrawnScreen } from '../../../../brand/screens/asHtml';
import { iPhone16Size } from '../../../../brand/screens/asHtml';
import { drawOrCheck } from '../../../../brand/screens/picture';

/**
 * The first thing Emi says back to her, drawn for somebody to look at, in the three shapes her
 * answers make: the day she gave and the length she stated, the same with the period before it as
 * well, and no day at all. Every forecast is worked out by the arithmetic the screen itself reads,
 * so the days in the picture are the days a woman answering this way is shown.
 *
 * It is not part of the suite: the file is named for a picture rather than for a test, and the
 * runner is pointed at it by `npm run generate:first-forecast-picture`.
 */

const theCaveat = [
  'Rendered from the trees the first forecast screen produced under the test runner, at 393 by',
  '852 points, which is the glass of an iPhone 16, and not captured from a phone.',
  'Each screen is drawn for a woman who gave her name as Ada, which the title reads back to her.',
  'Reproduce with: npm run generate:first-forecast-picture.',
  'The room kept at the top and the bottom of each screen is the room an iPhone with a dynamic',
  'island keeps for itself, which is 59 points and 34 points.',
].join(' ');

const herPeriodStarted = '2026-05-09';
const theOneBefore = '2026-04-11';
const sheSaidHerCycleRuns = 28;

/** The name she typed at the second question, which the title of the forecast greets her by. */
const sheIsCalled = 'Ada';

const screens: DrawnScreen[] = [];

/**
 * The answer the arithmetic gives for the days she named, counted the way the screen counts it. No
 * day at all is an answer too, and it is the one that carries no range.
 */
function herForecast(answers: {
  readonly periodStartedOn?: string;
  readonly periodBeforeStartedOn?: string;
}) {
  return forecastFromHerAnswers({ ...answers, cycleLengthDays: sheSaidHerCycleRuns });
}

async function drawn(
  title: string,
  note: string,
  answers: { readonly periodStartedOn?: string; readonly periodBeforeStartedOn?: string },
): Promise<void> {
  const view = await render(
    <OnAPhone>
      <FirstForecast
        cycleLengthDays={sheSaidHerCycleRuns}
        forecast={herForecast(answers)}
        name={sheIsCalled}
        onContinue={() => undefined}
      />
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
      { periodStartedOn: herPeriodStarted },
    );
  });

  it('renders the screen a woman who remembered the period before reads', async () => {
    await drawn(
      'Two periods, one whole cycle behind her',
      'The cycle she lived does not move the range: until two are complete it is counted from the length she gave.',
      { periodBeforeStartedOn: theOneBefore, periodStartedOn: herPeriodStarted },
    );
  });

  it('renders the screen a woman who gave no date at all reads', async () => {
    await drawn(
      'No date to count from',
      'She passed the question about her last period, so there is nothing to count from and no range. The screen says what it has, and what logging her next period will do.',
      {},
    );
  });

  it('draws them into one picture', () => {
    expect(screens).toHaveLength(3);

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
