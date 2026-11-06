import type { ReactElement } from 'react';
import { cyclePhaseDays } from '@emi/cycle';
import { MAXIMUM_TEXT_GROWTH, phaseNames } from '@emi/tokens';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import type { Metrics } from 'react-native-safe-area-context';

import { fluidGridWordTestID } from '../../src/components/FluidGrid';
import { phaseBarGridTestID, phaseBarLabelTestID } from '../../src/features/phase/PhaseBar';
import { PhasePage } from '../../src/features/phase/PhasePage';
import type { PhaseNow } from '../../src/features/phase/phaseNow';
import type { Language } from '../../src/language/language';
import type { DrawnScreen, PhoneSize } from '../../../../brand/screens/asHtml';
import { atTextSize } from '../../../../brand/screens/asHtml';
import { drawOrCheck } from '../../../../brand/screens/picture';
import { OnAPhone, theScreenIn } from './theSafeArea';

const theNames: Readonly<Record<Language, string>> = {
  en: 'English',
  es: 'Spanish',
  ru: 'Russian',
};

function theCaveat(name: string, picture: string): string {
  return [
    `Rendered, not observed: drawn from the tree the phase page produced under the test runner with`,
    `the phone language set to ${name}, at 375 by 667 points, which is the glass of an iPhone SE, with`,
    'every run of text grown by 1.3 times, the limit the largest text size reaches. The width of each',
    `word of the phase bar is the one the iPhone SE simulator reported at the largest text size,`,
    `handed to the screen as the phone hands it. The page is ${picture}.`,
    'Reproduce with: npm run generate:phase-largest-text-picture.',
  ].join(' ');
}

const theSmallestIPhone: PhoneSize = { width: 375, height: 667 };

const theSmallestIPhoneMetrics: Metrics = {
  frame: { x: 0, y: 0, ...theSmallestIPhone },
  insets: { bottom: 0, left: 0, right: 0, top: 20 },
};

/** Points, read on the iPhone SE simulator at the largest text size. */
const theRow = 341;

type Measured = Readonly<Record<string, number>>;

const theDigits: Measured = { 1: 12.5, 3: 14.5, 4: 15.5, 13: 21, 14: 22, 18: 21.5, 19: 21, 28: 24 };

const theWords: Readonly<Record<Language, Measured>> = {
  en: {
    ...theDigits,
    Period: 51,
    Follicular: 69,
    Ovulation: 73.5,
    Luteal: 48.5,
    days: 38.5,
    to: 21,
  },
  es: { ...theDigits, Periodo: 59.5, Folicular: 65, Ovulación: 75.5, Lútea: 45, días: 34, a: 14 },
  ru: {
    ...{ 1: 15, 3: 15, 4: 15, 13: 24, 14: 24, 18: 24, 19: 24, 28: 24 },
    Месячные: 83,
    Фолликулярная: 129.5,
    Овуляция: 80.5,
    Лютеиновая: 102,
    дни: 34.5,
    с: 14,
    по: 25,
  },
};

const now: PhaseNow = {
  phase: 'luteal',
  day: 19,
  cycleLengthDays: 28,
  ovulationDay: 16,
  phaseDays: cyclePhaseDays({ cycleLengthDays: 28, periodLengthDays: 3, ovulationDay: 16 }),
  estimate: { kind: 'learning' },
};

function theScreen(): ReactElement {
  return (
    <OnAPhone metrics={theSmallestIPhoneMetrics}>
      <PhasePage
        now={now}
        onAllSymptoms={() => undefined}
        onBack={() => undefined}
        onNote={() => undefined}
        onPress={() => undefined}
        past={{ kind: 'waiting' }}
        today={undefined}
      />
    </OnAPhone>
  );
}

async function drawn(language: Language): Promise<DrawnScreen> {
  const view = await render(theScreen());

  await fireEvent(screen.getByTestId(phaseBarGridTestID), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: theRow, height: 100 } },
  });
  const words = new Set(
    phaseNames.flatMap((phase) =>
      String(screen.getByTestId(phaseBarLabelTestID(phase)).props.children).split(/\s+/),
    ),
  );

  for (const word of words) {
    await fireEvent(
      screen.getByTestId(fluidGridWordTestID(phaseBarGridTestID, word), {
        includeHiddenElements: true,
      }),
      'layout',
      { nativeEvent: { layout: { x: 0, y: 0, width: theWords[language][word] ?? 0, height: 20 } } },
    );
  }

  const tree = atTextSize(theScreenIn(view), MAXIMUM_TEXT_GROWTH);

  view.unmount();

  return {
    title: 'The luteal phase, day 19 of 28',
    note: 'The widest word of a phase does not fit a quarter of the row in Russian, so the bar takes two lines of two, in phase order.',
    tree,
  };
}

/**
 * The phase page at the largest text size on the iPhone SE, in the language the phone of the
 * calling picture file reads. Each language has its own file, because the catalogue is read once,
 * when the screen is first imported.
 */
export function drawThePhasePageAtTheLargestTextSize(language: Language): void {
  const name = theNames[language];
  const screens: DrawnScreen[] = [];

  describe(`the phase page at the largest text size in ${name}, drawn for somebody to look at`, () => {
    beforeEach(() => {
      jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('renders the luteal phase', async () => {
      screens.push(await drawn(language));
    });

    it('draws it into one picture', () => {
      expect(screens).toHaveLength(1);

      const picture = `phase-largest-text-${name.toLowerCase()}`;
      const result = drawOrCheck({
        name: picture,
        screens,
        caveat: theCaveat(name, picture),
        script: 'generate:phase-largest-text-picture',
        size: theSmallestIPhone,
        language: language === 'en' ? undefined : language,
      });

      expect(result.problems).toEqual([]);
      console.log(result.said);
    });
  });
}
