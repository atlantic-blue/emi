import {
  CYCLES_BEFORE_A_FORECAST,
  DAYS_EITHER_SIDE_WHILE_LEARNING,
  type Forecast,
  cyclesFrom,
  forecastFrom,
} from '@emi/cycle';
import { render, screen } from '@testing-library/react-native';

import { daysLate } from '../../../src/features/forecast/daysLate';
import {
  FirstForecast,
  firstForecastDayTestID,
  firstForecastDaysTestID,
  firstForecastLateTestID,
  firstForecastLearningTestID,
  firstForecastNeedsTestID,
  firstForecastRangeTestID,
  firstForecastTitleTestID,
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

  it('reads the length she gave and the width off the answer, never a number of its own', async () => {
    await sheReads({
      kind: 'learning',
      completeCycles: 1,
      needsCycles: 2,
      start: { from: '2026-06-03', to: '2026-06-09' },
    });

    expect(textIn(screen.getByTestId(firstForecastWhyTestID)).at(-1)).toBe(
      'The start date can change from one cycle to the next. Emi counted the 28 days you gave from the start of your last period. The range runs 3 days either side of that day.',
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

  it('says the start can change and names the cycles the median was taken over, from three periods she gave', async () => {
    const answer = forecastFromHerAnswers({
      periods: [
        { startedOn: '2026-10-08', lengthDays: 5 },
        { startedOn: '2026-09-10', lengthDays: 5 },
        { startedOn: '2026-08-12', lengthDays: 5 },
      ],
      cycleLengthDays: 28,
    });

    expect(answer).toMatchObject({ kind: 'forecast', fromCycles: 2 });

    await sheReads(answer);

    expect(textIn(screen.getByTestId(firstForecastWhyTestID)).slice(-2)).toEqual([
      'Why more than one date?',
      'The start date can change from one cycle to the next. Emi estimated these dates from your last 2 cycles.',
    ]);
  });

  it('reads the count of cycles off the forecast, six where six cycles carry it', async () => {
    await sheReads(aForecastFromSixCycles());

    expect(textIn(screen.getByTestId(firstForecastWhyTestID)).at(-1)).toBe(
      'The start date can change from one cycle to the next. Emi estimated these dates from your last 6 cycles.',
    );
  });

  it('names no confidence word, because the count of cycles is what she can check', async () => {
    await sheReads(aForecastFromSixCycles());

    expect(textIn(screen.getByTestId(firstForecastWhyTestID)).join(' ')).not.toMatch(
      /confidence|high|medium|low/i,
    );
  });
});

describe('a first forecast whose window has passed', () => {
  const theWindowHasPassed = forecastFromHerAnswers({
    periods: [
      { startedOn: '2026-09-18', lengthDays: 5 },
      { startedOn: '2026-08-21', lengthDays: 5 },
      { startedOn: '2026-07-24', lengthDays: 5 },
    ],
    cycleLengthDays: 28,
  });

  async function sheReadsItOn(today: string): Promise<void> {
    await render(
      <OnAPhone>
        <FirstForecast
          cycleLengthDays={28}
          daysLate={daysLate(theWindowHasPassed, today)}
          forecast={theWindowHasPassed}
          onContinue={() => undefined}
        />
      </OnAPhone>,
    );
  }

  it('gives the window from the 15th to the 17th of October, which has passed by the 19th', () => {
    expect(theWindowHasPassed).toMatchObject({
      kind: 'forecast',
      start: { from: '2026-10-15', to: '2026-10-17' },
    });
    expect(daysLate(theWindowHasPassed, '2026-10-19')).toBe(2);
  });

  it('says her period is late in the words Home uses, in place of the range that passed', async () => {
    await sheReadsItOn('2026-10-19');

    expect(textIn(screen.getByTestId(firstForecastTitleTestID))).toEqual(['Your next period']);
    expect(textIn(screen.getByTestId(firstForecastLateTestID))).toEqual([
      'Your period is 2 days late',
    ]);
    expect(screen.queryByTestId(firstForecastRangeTestID)).toBeNull();
  });

  it('keeps the why card with the days that passed, and no tag or learning line', async () => {
    await sheReadsItOn('2026-10-19');

    expect(screen.getByTestId(firstForecastWhyTestID)).toBeTruthy();
    expect(
      ['2026-10-15', '2026-10-16', '2026-10-17'].map((day) =>
        screen.queryByTestId(firstForecastDayTestID(day), theHiddenCircles),
      ),
    ).not.toContain(null);
    expect(screen.queryByTestId(firstForecastLearningTestID)).toBeNull();
    expect(screen.queryByTestId(firstForecastNeedsTestID)).toBeNull();
  });

  it('still gives the range on the last day of the window', async () => {
    await sheReadsItOn('2026-10-17');

    expect(screen.queryByTestId(firstForecastLateTestID)).toBeNull();
    expect(textIn(screen.getByTestId(firstForecastRangeTestID))).toEqual([
      'Between the 15th and the 17th of October',
    ]);
  });
});

describe('a learning first forecast whose range has passed', () => {
  const oneLearningPeriod = forecastFromHerAnswers({
    periods: [{ startedOn: '2026-09-14', lengthDays: 5 }],
    cycleLengthDays: 28,
  });

  beforeEach(async () => {
    await render(
      <OnAPhone>
        <FirstForecast
          cycleLengthDays={28}
          daysLate={daysLate(oneLearningPeriod, '2026-10-28')}
          forecast={oneLearningPeriod}
          onContinue={() => undefined}
        />
      </OnAPhone>,
    );
  });

  it('gives the range from the 9th to the 15th of October, 13 days behind the 28th', () => {
    expect(oneLearningPeriod).toMatchObject({
      kind: 'learning',
      start: { from: '2026-10-09', to: '2026-10-15' },
    });
    expect(daysLate(oneLearningPeriod, '2026-10-28')).toBe(13);
  });

  it('says the period is late and keeps the tag, the why card with the passed days and the learning line', () => {
    expect(textIn(screen.getByTestId(firstForecastLateTestID))).toEqual([
      'Your period is 13 days late',
    ]);
    expect(screen.queryByTestId(firstForecastRangeTestID)).toBeNull();
    expect(textIn(screen.getByTestId(firstForecastLearningTestID))).toEqual(['Still learning']);
    expect(screen.getByTestId(firstForecastWhyTestID)).toBeTruthy();
    expect(
      theDaysOf({ from: '2026-10-09', to: '2026-10-15' }).map((day) =>
        screen.queryByTestId(firstForecastDayTestID(day), theHiddenCircles),
      ),
    ).not.toContain(null);
    expect(textIn(screen.getByTestId(firstForecastNeedsTestID)).join(' ')).toEqual(
      'Emi needs 2 complete cycles before it forecasts from your own cycles, so this is still learning.',
    );
  });
});
