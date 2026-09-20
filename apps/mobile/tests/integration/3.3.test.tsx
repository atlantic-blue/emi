import { resolve } from 'node:path';

import { render, screen } from '@testing-library/react-native';

import {
  NextPeriod,
  nextPeriodConfidenceTestID,
  nextPeriodRangeTestID,
} from '../../src/features/forecast/NextPeriod';
import { confidenceWords, forecastCopy, ordinal } from '../../src/features/forecast/copy';
import {
  genuinelyIrregular,
  oneLongCycle,
  twoCyclesExactly,
  veryRegular,
} from '../../../../packages/cycle/tests/fixtures/recordedSets';
import type { RecordedSet } from '../../../../packages/cycle/tests/fixtures/recordedSets';
import {
  describeSingleDayUse,
  interfaceFilesOf,
  singleDayUsesUnder,
} from '../../../../tools/pipeline/singleDayForecast';
import { forecastFromRecorded } from '../fixtures/forecast';
import { daysNamedIn, textIn } from '../fixtures/renderedText';

const repositoryRoot = resolve(__dirname, '..', '..', '..', '..');

interface WhatSheSees {
  readonly recorded: string;
  readonly set: RecordedSet;
  readonly range: string;
  readonly confidence: string;
}

/**
 * The four recorded sets, with the words each one puts on the screen written out by hand. The
 * arithmetic is not the judge of its own answer, so nothing below is computed.
 */
const sixRegularCycles: WhatSheSees = {
  recorded: 'six cycles of 28 days',
  set: veryRegular,
  range: 'Between the 19th and the 21st of July',
  confidence: 'High confidence, from your last 6 cycles',
};

const oneLongCycleAmongSix: WhatSheSees = {
  recorded: 'the same six cycles with one of 40 days among them',
  set: oneLongCycle,
  range: 'Between the 27th of July and the 6th of August',
  confidence: 'Medium confidence, from your last 6 cycles',
};

const sixIrregularCycles: WhatSheSees = {
  recorded: 'six cycles running from 24 days to 41 days',
  set: genuinelyIrregular,
  range: 'Between the 6th and the 18th of August',
  confidence: 'Low confidence, from your last 6 cycles',
};

const twoCyclesAndNoMore: WhatSheSees = {
  recorded: 'two cycles and nothing before them',
  set: twoCyclesExactly,
  range: 'Between the 27th and the 29th of May',
  confidence: 'High confidence, from your last 2 cycles',
};

const whatSheSees: readonly WhatSheSees[] = [
  sixRegularCycles,
  oneLongCycleAmongSix,
  sixIrregularCycles,
  twoCyclesAndNoMore,
];

async function sheOpensTheForecast(set: RecordedSet): Promise<void> {
  await render(<NextPeriod forecast={forecastFromRecorded(set)} />);
}

function theWordsOnTheScreen(): string {
  return textIn(screen.toJSON()).join(' ');
}

describe('the forecast is never shown as a single day', () => {
  describe('the days she is given', () => {
    for (const shown of whatSheSees) {
      it(`read ${shown.range.toLowerCase()}, from ${shown.recorded}`, async () => {
        await sheOpensTheForecast(shown.set);

        expect(screen.getByText(forecastCopy.nextPeriod)).toBeTruthy();
        expect(screen.getByTestId(nextPeriodRangeTestID)).toHaveTextContent(shown.range);
      });
    }

    for (const shown of whatSheSees) {
      it(`are two days and never one, from ${shown.recorded}`, async () => {
        const forecast = forecastFromRecorded(shown.set);
        await render(<NextPeriod forecast={forecast} />);

        expect(forecast.start.to).not.toEqual(forecast.start.from);
        expect(daysNamedIn(theWordsOnTheScreen())).toHaveLength(2);
      });
    }

    for (const shown of whatSheSees) {
      it(`never name the day between those two, from ${shown.recorded}`, async () => {
        const forecast = forecastFromRecorded(shown.set);
        await render(<NextPeriod forecast={forecast} />);
        const theDayInTheMiddle = ordinal(Number(forecast.expectedStart.slice(8, 10)));

        expect(daysNamedIn(theWordsOnTheScreen())).not.toContain(theDayInTheMiddle);
      });
    }

    it('are written for a woman and never for a machine', async () => {
      await sheOpensTheForecast(sixIrregularCycles.set);

      expect(theWordsOnTheScreen()).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    });
  });

  describe('how sure Emi says it is', () => {
    for (const shown of whatSheSees) {
      it(`reads ${shown.confidence.toLowerCase()}, from ${shown.recorded}`, async () => {
        await sheOpensTheForecast(shown.set);

        expect(screen.getByTestId(nextPeriodConfidenceTestID)).toHaveTextContent(shown.confidence);
      });
    }

    for (const shown of whatSheSees) {
      it(`is a word and never a percentage, from ${shown.recorded}`, async () => {
        await sheOpensTheForecast(shown.set);
        const words = theWordsOnTheScreen();

        expect(words).not.toContain('%');
        expect(words).not.toMatch(/percent/i);
        expect(Object.values(confidenceWords).filter((word) => words.includes(word))).toHaveLength(
          1,
        );
      });
    }

    it('sits under the two days, and nothing else is on the screen', async () => {
      await sheOpensTheForecast(sixRegularCycles.set);

      expect(textIn(screen.toJSON())).toEqual([
        forecastCopy.nextPeriod,
        sixRegularCycles.range,
        sixRegularCycles.confidence,
      ]);
    });
  });

  describe('every module the application draws a screen from', () => {
    const files = interfaceFilesOf(repositoryRoot);

    it('names the middle of the range in none of them, and says how much it read', () => {
      expect(singleDayUsesUnder(repositoryRoot, files).map(describeSingleDayUse)).toEqual([]);
      expect(files.length).toBeGreaterThan(20);
    });

    it('reads the forecast beside the rest of the application', () => {
      expect(files).toContain('apps/mobile/src/features/forecast/NextPeriod.tsx');
      expect(files).toContain('apps/mobile/src/features/forecast/copy.ts');
      expect(files).toContain('apps/mobile/src/app/(tabs)/index.tsx');
    });
  });
});
