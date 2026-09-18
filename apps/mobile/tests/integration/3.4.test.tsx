import { resolve } from 'node:path';

import { render, screen } from '@testing-library/react-native';

import {
  FertileWindow,
  fertileWindowEstimateTestID,
  fertileWindowRangeTestID,
  fertileWindowTestID,
} from '../../src/features/forecast/FertileWindow';
import { forecastCopy, ordinal } from '../../src/features/forecast/copy';
import {
  genuinelyIrregular,
  oneLongCycle,
  twoCyclesExactly,
  veryRegular,
} from '../../../../packages/cycle/tests/fixtures/recordedSets';
import type { RecordedSet } from '../../../../packages/cycle/tests/fixtures/recordedSets';
import {
  approvedDenials,
  describeClaim,
  forbiddenWording,
} from '../../../../tools/pipeline/forbiddenClaims';
import {
  interfaceClaimsIn,
  interfaceClaimsUnder,
  scannedInterfaceFiles,
} from '../../../../tools/pipeline/interfaceClaims';
import { forecastFromRecorded } from '../fixtures/forecast';
import { daysNamedIn, textIn } from '../fixtures/renderedText';

const repositoryRoot = resolve(__dirname, '..', '..', '..', '..');

const theFertileWindow = 'apps/mobile/src/features/forecast/FertileWindow.tsx';

// The word is read off the list rather than written out, so this file makes no claim of its own and
// the repository wide scan can read it with everything else.
function theWordStartingWith(beginning: string, list: readonly string[]): string {
  const found = list.find((wording) => wording.startsWith(beginning));

  if (found === undefined) {
    throw new Error(`no wording on the list starts with "${beginning}"`);
  }

  return found;
}

const aPregnancyClaim = theWordStartingWith('contracept', forbiddenWording);
const theDenial = theWordStartingWith('Emi never says', approvedDenials);

interface WhatSheSees {
  readonly recorded: string;
  readonly set: RecordedSet;
  readonly window: string;
  readonly estimate: string;
}

/**
 * The four recorded sets, with the words each one puts on the screen written out by hand. The
 * arithmetic is not the judge of its own answer, so nothing below is computed.
 */
const sixRegularCycles: WhatSheSees = {
  recorded: 'six cycles of 28 days',
  set: veryRegular,
  window: 'Between the 2nd and the 8th of July',
  estimate: 'An estimate from your last 6 cycles.',
};

const oneLongCycleAmongSix: WhatSheSees = {
  recorded: 'the same six cycles with one of 40 days among them',
  set: oneLongCycle,
  window: 'Between the 14th and the 20th of July',
  estimate: 'An estimate from your last 6 cycles.',
};

const sixIrregularCycles: WhatSheSees = {
  recorded: 'six cycles running from 24 days to 41 days',
  set: genuinelyIrregular,
  window: 'Between the 25th and the 31st of July',
  estimate: 'An estimate from your last 6 cycles.',
};

const twoCyclesAndNoMore: WhatSheSees = {
  recorded: 'two cycles and nothing before them',
  set: twoCyclesExactly,
  window: 'Between the 10th and the 16th of May',
  estimate: 'An estimate from your last 2 cycles.',
};

const whatSheSees: readonly WhatSheSees[] = [
  sixRegularCycles,
  oneLongCycleAmongSix,
  sixIrregularCycles,
  twoCyclesAndNoMore,
];

async function sheOpensTheWindow(set: RecordedSet): Promise<void> {
  await render(<FertileWindow forecast={forecastFromRecorded(set)} />);
}

function theWordsOnTheScreen(): string {
  return textIn(screen.toJSON()).join(' ');
}

describe(`a ${aPregnancyClaim} claim anywhere fails the build`, () => {
  describe('the window she is shown', () => {
    for (const shown of whatSheSees) {
      it(`reads ${shown.window.toLowerCase()}, from ${shown.recorded}`, async () => {
        await sheOpensTheWindow(shown.set);

        expect(screen.getByText(forecastCopy.fertileWindow)).toBeTruthy();
        expect(screen.getByTestId(fertileWindowRangeTestID)).toHaveTextContent(shown.window);
      });
    }

    for (const shown of whatSheSees) {
      it(`is called an estimate, from ${shown.recorded}`, async () => {
        await sheOpensTheWindow(shown.set);

        expect(screen.getByTestId(fertileWindowEstimateTestID)).toHaveTextContent(
          `${shown.estimate} ${theDenial}`,
        );
      });
    }

    for (const shown of whatSheSees) {
      it(`runs seven days and never one, from ${shown.recorded}`, async () => {
        const forecast = forecastFromRecorded(shown.set);
        await render(<FertileWindow forecast={forecast} />);
        const days =
          Date.parse(forecast.fertileWindow.to) - Date.parse(forecast.fertileWindow.from);

        expect(days / (24 * 60 * 60 * 1000)).toEqual(6);
        expect(daysNamedIn(theWordsOnTheScreen())).toHaveLength(2);
      });
    }

    for (const shown of whatSheSees) {
      it(`names neither the day it counted from nor a year, from ${shown.recorded}`, async () => {
        const forecast = forecastFromRecorded(shown.set);
        await render(<FertileWindow forecast={forecast} />);
        const theDayItCountedFrom = ordinal(Number(forecast.estimatedOvulation.slice(8, 10)));

        expect(daysNamedIn(theWordsOnTheScreen())).not.toContain(theDayItCountedFrom);
        expect(theWordsOnTheScreen()).not.toMatch(/\d{4}-\d{2}-\d{2}/);
      });
    }
  });

  describe('what the screen says about what the window is worth', () => {
    it('denies the claim in the words she reads, and makes none of its own', async () => {
      await sheOpensTheWindow(sixRegularCycles.set);
      const words = theWordsOnTheScreen();

      expect(words).toContain(theDenial);
      expect(interfaceClaimsIn(theFertileWindow, words).map(describeClaim)).toEqual([]);
    });

    it('carries the label, the two days and that sentence, and nothing else', async () => {
      await sheOpensTheWindow(sixRegularCycles.set);

      expect(screen.getByTestId(fertileWindowTestID)).toBeTruthy();
      expect(textIn(screen.toJSON())).toEqual([
        forecastCopy.fertileWindow,
        sixRegularCycles.window,
        `${sixRegularCycles.estimate} ${theDenial}`,
      ]);
    });

    for (const shown of whatSheSees) {
      it(`makes no claim for any other set either, from ${shown.recorded}`, async () => {
        await sheOpensTheWindow(shown.set);

        expect(interfaceClaimsIn(theFertileWindow, theWordsOnTheScreen())).toEqual([]);
      });
    }
  });

  describe('every file the application is built from', () => {
    const scanned = scannedInterfaceFiles(repositoryRoot);

    it('makes the claim in none of them, and says how much it read', () => {
      expect(interfaceClaimsUnder(repositoryRoot, scanned).map(describeClaim)).toEqual([]);
      expect(scanned.length).toBeGreaterThan(20);
    });

    it('would fail the build the moment one of them made it', () => {
      const screenSaying = `export const line = 'Emi is the ${aPregnancyClaim} you can trust';\n`;

      expect(interfaceClaimsIn(theFertileWindow, screenSaying).map(describeClaim)).toHaveLength(1);
    });
  });
});
