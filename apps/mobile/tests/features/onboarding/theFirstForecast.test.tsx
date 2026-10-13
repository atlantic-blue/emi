import {
  CYCLES_BEFORE_A_FORECAST,
  DAYS_EITHER_SIDE_WHILE_LEARNING,
  type Forecast,
  cyclesFrom,
  forecastFrom,
} from '@emi/cycle';
import { render, screen } from '@testing-library/react-native';

import {
  FirstForecast,
  firstForecastDaysTestID,
  firstForecastLearningTestID,
  firstForecastNeedsTestID,
  firstForecastWhyTestID,
  theDaysOf,
} from '../../../src/features/onboarding/FirstForecast';
import { forecastFromHerAnswers } from '../../../src/features/onboarding/firstRun';
import { textIn } from '../../fixtures/renderedText';
import { OnAPhone } from '../../fixtures/theSafeArea';

/**
 * The counts on the first forecast, held against the rule in the cycle package. The board said
 * "Emi has read 1 complete cycle" and "Emi needs 2 complete cycles before it forecasts" over a
 * drawn range, so each sentence here is checked against the answer the arithmetic gives.
 */

const theHiddenCircles = { includeHiddenElements: true } as const;
const herPeriodStarted = '2026-05-09';
const theOneBefore = '2026-04-11';

async function sheReads(forecast: Parameters<typeof FirstForecast>[0]['forecast']): Promise<void> {
  await render(
    <OnAPhone>
      <FirstForecast cycleLengthDays={28} forecast={forecast} onContinue={() => undefined} />
    </OnAPhone>,
  );
}

/** Six cycles of 28 days, which is a forecast from her own cycles and no longer a learning range. */
function aForecastFromSixCycles(): Forecast {
  const starts = Array.from({ length: 7 }, (_, at) =>
    new Date(Date.UTC(2026, 0, 1 + at * 28)).toISOString().slice(0, 10),
  );
  const answer = forecastFrom(cyclesFrom(starts.map((day) => ({ day, flow: 'medium' as const }))));

  if (answer.kind !== 'forecast') {
    throw new Error('six complete cycles should give a forecast');
  }

  return answer;
}

describe('the first forecast says only what the arithmetic answered', () => {
  it('is always still learning at the first run, because two answers make at most one complete cycle', () => {
    const answer = forecastFromHerAnswers({
      periods: [
        { startedOn: herPeriodStarted, lengthDays: 1 },
        { startedOn: theOneBefore, lengthDays: 1 },
      ],
      cycleLengthDays: 28,
    });

    expect(answer).toMatchObject({ kind: 'learning', completeCycles: 1, needsCycles: 2 });
    expect(CYCLES_BEFORE_A_FORECAST).toBe(2);
  });

  it('draws a circle for every day the range names, which is seven while the spread is three days', () => {
    expect(DAYS_EITHER_SIDE_WHILE_LEARNING).toBe(3);
    expect(theDaysOf({ from: '2026-06-03', to: '2026-06-09' })).toHaveLength(7);
    expect(theDaysOf({ from: '2026-06-29', to: '2026-07-02' })).toEqual([
      '2026-06-29',
      '2026-06-30',
      '2026-07-01',
      '2026-07-02',
    ]);
  });

  it('draws the circles across a month end with the day of each month', async () => {
    await sheReads({
      kind: 'learning',
      completeCycles: 0,
      needsCycles: 2,
      start: { from: '2026-06-28', to: '2026-07-04' },
    });

    expect(textIn(screen.getByTestId(firstForecastDaysTestID, theHiddenCircles))).toEqual([
      '28',
      '29',
      '30',
      '1',
      '2',
      '3',
      '4',
    ]);
  });

  it('reads the count of complete cycles off the answer, never a number of its own', async () => {
    await sheReads({
      kind: 'learning',
      completeCycles: 1,
      needsCycles: 2,
      start: { from: '2026-06-03', to: '2026-06-09' },
    });

    expect(textIn(screen.getByTestId(firstForecastWhyTestID)).at(-1)).toBe(
      'Emi has read 1 complete cycle. Until it reads 2, it counts the 28 days you gave from your last period. The range runs 3 days either side of that day.',
    );
  });

  it('drops the tag and the learning line where the answer is a forecast from her own cycles', async () => {
    await sheReads(aForecastFromSixCycles());

    expect(screen.queryByTestId(firstForecastLearningTestID)).toBeNull();
    expect(screen.queryByTestId(firstForecastNeedsTestID)).toBeNull();
    expect(textIn(screen.getByTestId(firstForecastWhyTestID)).join(' ')).not.toMatch(
      /still learning|needs 2|has read/i,
    );
  });
});
