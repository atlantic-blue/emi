import type { ReactElement } from 'react';
import { MAXIMUM_TEXT_GROWTH } from '@emi/tokens';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import type { Metrics } from 'react-native-safe-area-context';

import { fluidGridWordTestID } from '../../src/components/FluidGrid';
import {
  highlightGridTestID,
  highlightTitleTestID,
} from '../../src/features/highlight/HighlightRow';
import { periodHighlights } from '../../src/features/highlight/highlights';
import { PeriodPage, periodPageHighlightsTestID } from '../../src/features/period/PeriodPage';
import { dateWords } from '../../src/features/onboarding/days';
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
    `Rendered, not observed: drawn from the tree the period page produced under the test runner with`,
    `the phone language set to ${name}, at 375 by 667 points, which is the glass of an iPhone SE, with`,
    'every run of text grown by 1.3 times, the limit the largest text size reaches. The width of each',
    `word of the highlight titles is the one the iPhone SE simulator reported at the largest text size,`,
    `handed to the screen as the phone hands it. The page is ${picture}.`,
    'Reproduce with: npm run generate:period-largest-text-picture.',
  ].join(' ');
}

const theSmallestIPhone: PhoneSize = { width: 375, height: 667 };

const theSmallestIPhoneMetrics: Metrics = {
  frame: { x: 0, y: 0, ...theSmallestIPhone },
  insets: { bottom: 0, left: 0, right: 0, top: 20 },
};

/** Points, read on the iPhone SE simulator at the largest text size. */
const theRow = 208;

const theWords: Readonly<Record<Language, Readonly<Record<string, number>>>> = {
  en: { All: 17.5, about: 39.5, discharge: 66, Hygiene: 56, products: 60.5 },
  es: { Todo: 33.5, sobre: 38, el: 12, flujo: 30.5, Productos: 69, de: 17, higiene: 49.5 },
  ru: { Всё: 26, о: 9, выделениях: 89.5, Средства: 69.5, гигиены: 61 },
};

const theGrid = highlightGridTestID(periodPageHighlightsTestID);

function theScreen(): ReactElement {
  return (
    <OnAPhone metrics={theSmallestIPhoneMetrics}>
      <PeriodPage
        date="2026-11-06"
        day={dateWords('2026-11-06')}
        held={{}}
        onBack={() => undefined}
        onChooseDay={() => undefined}
        onHighlight={() => undefined}
        onSave={() => undefined}
        today="2026-11-06"
      />
    </OnAPhone>
  );
}

async function drawn(language: Language): Promise<DrawnScreen> {
  const view = await render(theScreen());

  await fireEvent(screen.getByTestId(theGrid), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: theRow, height: 120 } },
  });
  const words = new Set(
    periodHighlights.flatMap((slug) =>
      String(screen.getByTestId(highlightTitleTestID(slug)).props.children).split(/\s+/),
    ),
  );

  for (const word of words) {
    await fireEvent(
      screen.getByTestId(fluidGridWordTestID(theGrid, word), {
        includeHiddenElements: true,
      }),
      'layout',
      { nativeEvent: { layout: { x: 0, y: 0, width: theWords[language][word] ?? 0, height: 20 } } },
    );
  }

  const tree = atTextSize(theScreenIn(view), MAXIMUM_TEXT_GROWTH);

  view.unmount();

  return {
    title: 'The period page, its two highlights',
    note: 'Each highlight takes half of a row as wide as the tiles and their gaps, so each title keeps its words whole.',
    tree,
  };
}

/**
 * The period page at the largest text size on the iPhone SE, in the language the phone of the calling
 * picture file reads. Each language has its own file, because the catalogue is read once, when the
 * screen is first imported.
 */
export function drawThePeriodPageAtTheLargestTextSize(language: Language): void {
  const name = theNames[language];
  const screens: DrawnScreen[] = [];

  describe(`the period page at the largest text size in ${name}, drawn for somebody to look at`, () => {
    beforeEach(() => {
      jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('renders the period page', async () => {
      screens.push(await drawn(language));
    });

    it('draws it into one picture', () => {
      expect(screens).toHaveLength(1);

      const picture = `period-largest-text-${name.toLowerCase()}`;
      const result = drawOrCheck({
        name: picture,
        screens,
        caveat: theCaveat(name, picture),
        script: 'generate:period-largest-text-picture',
        size: theSmallestIPhone,
        language: language === 'en' ? undefined : language,
      });

      expect(result.problems).toEqual([]);
      console.log(result.said);
    });
  });
}
