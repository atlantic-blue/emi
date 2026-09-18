import { render, screen } from '@testing-library/react-native';

import { listCycles } from '../../src/data/cycleRepository';
import type { Database } from '../../src/data/database';
import {
  NextPeriodOrLearning,
  learningCyclesWantedTestID,
  learningStatedLengthTestID,
  learningTestID,
} from '../../src/features/forecast/Learning';
import {
  nextPeriodConfidenceTestID,
  nextPeriodRangeTestID,
  nextPeriodTestID,
} from '../../src/features/forecast/NextPeriod';
import { confidenceWords, learningCopy } from '../../src/features/forecast/copy';
import { forecastOf } from '../../src/features/forecast/fromCache';
import { statedCycleLengthDays } from '../../src/features/onboarding/firstRun';
import {
  noCycleComplete,
  oneCycleComplete,
  twoCyclesComplete,
} from '../../../../packages/cycle/tests/fixtures/recordedSets';
import type { RecordedSet } from '../../../../packages/cycle/tests/fixtures/recordedSets';
import { asSheLoggedIt } from '../fixtures/forecast';
import { daysNamedIn, textIn } from '../fixtures/renderedText';

/**
 * The length she gave during the first run. It is not 28, which is the default the first run
 * offers, and it is not the length of any cycle in the sets below, so a screen showing 31 days can
 * only have read her own answer.
 */
const sheSaidHerCycleRuns = 31;

interface WhatSheHasLogged {
  readonly recorded: string;
  readonly set: RecordedSet;
  readonly completeCycles: number;
}

const nothingButTheFirstRun: WhatSheHasLogged = {
  recorded: 'the first run and the period she gave it',
  set: noCycleComplete,
  completeCycles: 0,
};

const onePeriodAfterThat: WhatSheHasLogged = {
  recorded: 'one more period after the one she gave',
  set: oneCycleComplete,
  completeCycles: 1,
};

const twoPeriodsAfterThat: WhatSheHasLogged = {
  recorded: 'two more periods after the one she gave',
  set: twoCyclesComplete,
  completeCycles: 2,
};

const asSheGoes: readonly WhatSheHasLogged[] = [
  nothingButTheFirstRun,
  onePeriodAfterThat,
  twoPeriodsAfterThat,
];

function herDatabase(has: WhatSheHasLogged): Database {
  return asSheLoggedIt(has.set, sheSaidHerCycleRuns);
}

/** Her own screen: the cycles the cache holds, the length she gave, and nothing typed out here. */
async function sheOpensEmi(has: WhatSheHasLogged): Promise<void> {
  const database = herDatabase(has);
  const stated = statedCycleLengthDays(database);

  if (stated === undefined) {
    throw new Error('the first run wrote no cycle length, so the screen has no length to count by');
  }

  await render(
    <NextPeriodOrLearning cycleLengthDays={stated} result={forecastOf(listCycles(database))} />,
  );
}

function theWordsOnTheScreen(): string {
  return textIn(screen.toJSON()).join(' ');
}

describe('Emi says it is still learning until the second cycle completes', () => {
  describe('the cycles she has actually completed', () => {
    for (const has of asSheGoes) {
      it(`number ${has.completeCycles}, from ${has.recorded}`, () => {
        const result = forecastOf(listCycles(herDatabase(has)));

        expect(result.kind === 'learning' ? result.completeCycles : result.fromCycles).toEqual(
          has.completeCycles,
        );
      });
    }
  });

  describe('what she reads before the second cycle completes', () => {
    for (const has of [nothingButTheFirstRun, onePeriodAfterThat]) {
      it(`says Emi is still learning, from ${has.recorded}`, async () => {
        await sheOpensEmi(has);

        expect(screen.getByTestId(learningTestID)).toBeTruthy();
        expect(screen.getByText(learningCopy.stillLearning)).toBeTruthy();
      });
    }

    it('asks for 2 more cycles when she has none complete', async () => {
      await sheOpensEmi(nothingButTheFirstRun);

      expect(screen.getByTestId(learningCyclesWantedTestID)).toHaveTextContent(
        'Emi needs 2 more complete cycles before it forecasts.',
      );
    });

    it('asks for 1 more cycle when she has one complete', async () => {
      await sheOpensEmi(onePeriodAfterThat);

      expect(screen.getByTestId(learningCyclesWantedTestID)).toHaveTextContent(
        'Emi needs 1 more complete cycle before it forecasts.',
      );
    });

    for (const has of [nothingButTheFirstRun, onePeriodAfterThat]) {
      it(`counts by the 31 days she gave at the first run, from ${has.recorded}`, async () => {
        await sheOpensEmi(has);

        expect(screen.getByTestId(learningStatedLengthTestID)).toHaveTextContent(
          `Until then Emi counts a cycle of ${sheSaidHerCycleRuns} days, the length you gave at the first run.`,
        );
      });
    }

    it('names no day at all, because there is no day to name', async () => {
      await sheOpensEmi(nothingButTheFirstRun);

      expect(daysNamedIn(theWordsOnTheScreen())).toEqual([]);
      expect(theWordsOnTheScreen()).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    });

    it('reads as three lines, and the screen carries nothing else', async () => {
      await sheOpensEmi(onePeriodAfterThat);

      expect(textIn(screen.toJSON())).toEqual([
        'Still learning',
        'Emi needs 1 more complete cycle before it forecasts.',
        `Until then Emi counts a cycle of ${sheSaidHerCycleRuns} days, the length you gave at the first run.`,
      ]);
    });
  });

  describe('how sure Emi says it is', () => {
    for (const has of [nothingButTheFirstRun, onePeriodAfterThat]) {
      it(`says nothing at all about confidence, from ${has.recorded}`, async () => {
        await sheOpensEmi(has);
        const words = theWordsOnTheScreen();

        expect(screen.queryByTestId(nextPeriodConfidenceTestID)).toBeNull();
        expect(words).not.toMatch(/confidence/i);
        expect(words).not.toContain('%');
        expect(Object.values(confidenceWords).filter((word) => words.includes(word))).toEqual([]);
      });
    }

    it('says it once the second cycle completes', async () => {
      await sheOpensEmi(twoPeriodsAfterThat);

      expect(screen.getByTestId(nextPeriodConfidenceTestID)).toHaveTextContent(
        'High confidence, from your last 2 cycles',
      );
    });
  });

  describe('the interface moves at exactly two cycles', () => {
    for (const has of asSheGoes) {
      const learning = has.completeCycles < 2;

      it(`shows ${learning ? 'the learning state' : 'the forecast'}, from ${has.recorded}`, async () => {
        await sheOpensEmi(has);

        expect(screen.queryByTestId(learningTestID) === null).toEqual(!learning);
        expect(screen.queryByTestId(nextPeriodTestID) === null).toEqual(learning);
      });
    }

    it('draws the two days of the range on the cycle after that', async () => {
      await sheOpensEmi(twoPeriodsAfterThat);

      expect(screen.getByTestId(nextPeriodRangeTestID)).toHaveTextContent(
        'Between the 10th and the 12th of October',
      );
      expect(daysNamedIn(theWordsOnTheScreen())).toHaveLength(2);
    });

    it('stops saying it is learning once the forecast arrives', async () => {
      await sheOpensEmi(twoPeriodsAfterThat);

      expect(screen.queryByText(learningCopy.stillLearning)).toBeNull();
      expect(theWordsOnTheScreen()).not.toMatch(/learning/i);
      expect(theWordsOnTheScreen()).not.toContain(String(sheSaidHerCycleRuns));
    });
  });
});
