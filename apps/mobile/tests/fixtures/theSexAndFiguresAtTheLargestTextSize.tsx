import type { ReactElement } from 'react';
import { type PublishedMeasurement, publishedFigures } from '@emi/cycle';
import { MAXIMUM_TEXT_GROWTH } from '@emi/tokens';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import type { Metrics } from 'react-native-safe-area-context';

import { headingRowEndTestID, headingRowMeasureTestID } from '../../src/components/HeadingRow';
import { FiguresScreen, citationLeadTestID } from '../../src/features/cycle/CitationRow';
import { sexDayHeading, sexQuestion } from '../../src/features/sex/copy';
import { SexPage, sexPageDayRowTestID } from '../../src/features/sex/SexPage';
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
    `Rendered, not observed: drawn from the tree the sex page and the figures page produced under the`,
    `test runner with the phone language set to ${name}, at 375 by 667 points, which is the glass of an`,
    'iPhone SE, with every run of text grown by 1.3 times, the limit the largest text size reaches. The',
    'width of each heading and of the link or value beside it is the one the iPhone SE simulator',
    `reported at the largest text size, handed to the screen as the phone hands it. The page is ${picture}.`,
    'Reproduce with: npm run generate:sex-figures-largest-text-picture.',
  ].join(' ');
}

const theSmallestIPhone: PhoneSize = { width: 375, height: 667 };

const theSmallestIPhoneMetrics: Metrics = {
  frame: { x: 0, y: 0, ...theSmallestIPhone },
  insets: { bottom: 0, left: 0, right: 0, top: 20 },
};

interface Top {
  readonly heading: number;
  readonly end: number;
}

/** Points, read on the iPhone SE simulator at the largest text size. */
const theDateRow = 335;
const theFigureRow = 311;

const theDates: Readonly<Record<Language, Top>> = {
  en: { heading: 176.5, end: 164.5 },
  es: { heading: 218.5, end: 113.5 },
  ru: { heading: 187, end: 192 },
};

const theFigures: Readonly<Record<Language, Readonly<Record<PublishedMeasurement, Top>>>> = {
  en: {
    'cycle-length': { heading: 103, end: 106 },
    'period-duration': { heading: 108.5, end: 95.5 },
    'cycle-length-variation': { heading: 178, end: 64.5 },
  },
  es: {
    'cycle-length': { heading: 145, end: 116.5 },
    'period-duration': { heading: 160.5, end: 92.5 },
    'cycle-length-variation': { heading: 267, end: 59.5 },
  },
  ru: {
    'cycle-length': { heading: 117.5, end: 142 },
    'period-duration': { heading: 246.5, end: 83 },
    'cycle-length-variation': { heading: 195.5, end: 61 },
  },
};

const theDay = '2026-11-06';

async function layOut(testID: string, row: number, top: Top): Promise<void> {
  for (const [at, width] of [
    [testID, row],
    [headingRowMeasureTestID(testID), top.heading],
    [headingRowEndTestID(testID), top.end],
  ] as const) {
    await fireEvent(screen.getByTestId(at, { includeHiddenElements: true }), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width, height: 24 } },
    });
  }
}

async function drawnOnThePhone(
  page: ReactElement,
  layOutThePage: () => Promise<void>,
): Promise<unknown> {
  const view = await render(<OnAPhone metrics={theSmallestIPhoneMetrics}>{page}</OnAPhone>);

  await layOutThePage();

  const tree = atTextSize(theScreenIn(view), MAXIMUM_TEXT_GROWTH);

  view.unmount();

  return tree;
}

async function theSexPage(language: Language): Promise<DrawnScreen> {
  const tree = await drawnOnThePhone(
    <SexPage
      day={theDay}
      heading={sexDayHeading(theDay)}
      held={{}}
      onBack={() => undefined}
      onChooseDay={() => undefined}
      onHighlight={() => undefined}
      onSave={() => undefined}
      question={sexQuestion(theDay, theDay)}
      today={theDay}
    />,
    () => layOut(sexPageDayRowTestID, theDateRow, theDates[language]),
  );

  return {
    title: 'The sex page, today',
    note: 'When the date and Choose another day do not fit on one line, the link moves under the date.',
    tree,
  };
}

async function theFiguresPage(language: Language): Promise<DrawnScreen> {
  const tree = await drawnOnThePhone(
    <FiguresScreen figures={publishedFigures} onBack={() => undefined} />,
    async () => {
      for (const figure of publishedFigures) {
        await layOut(
          citationLeadTestID(figure.measures),
          theFigureRow,
          theFigures[language][figure.measures],
        );
      }
    },
  );

  return {
    title: 'Where these figures come from',
    note: 'When a label and its value do not fit on one line, the value moves under the label.',
    tree,
  };
}

/**
 * The sex page and the figures page at the largest text size on the iPhone SE, in the language the
 * phone of the calling picture file reads. Each language has its own file, because the catalogue is
 * read once, when the screen is first imported.
 */
export function drawTheSexAndFiguresAtTheLargestTextSize(language: Language): void {
  const name = theNames[language];
  const screens: DrawnScreen[] = [];

  describe(`the sex and figures pages at the largest text size in ${name}, drawn for somebody to look at`, () => {
    beforeEach(() => {
      jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('renders the sex page', async () => {
      screens.push(await theSexPage(language));
    });

    it('renders the figures page', async () => {
      screens.push(await theFiguresPage(language));
    });

    it('draws them into one picture', () => {
      expect(screens).toHaveLength(2);

      const picture = `sex-figures-largest-text-${name.toLowerCase()}`;
      const result = drawOrCheck({
        name: picture,
        screens,
        caveat: theCaveat(name, picture),
        script: 'generate:sex-figures-largest-text-picture',
        size: theSmallestIPhone,
        language: language === 'en' ? undefined : language,
      });

      expect(result.problems).toEqual([]);
      console.log(result.said);
    });
  });
}
