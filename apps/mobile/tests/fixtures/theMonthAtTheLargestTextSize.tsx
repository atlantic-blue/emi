import { MAXIMUM_TEXT_GROWTH } from '@emi/tokens';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import type { Metrics } from 'react-native-safe-area-context';

import {
  screenHeaderAfterTitleTestID,
  screenHeaderBeforeTitleTestID,
  screenHeaderWholeTitleTestID,
  screenHeaderWordTestID,
} from '../../src/components/ScreenHeader';
import {
  CalendarScreen,
  calendarHeaderEndTestID,
  calendarHeaderStartTestID,
  calendarHeaderTestID,
} from '../../src/features/calendar/CalendarScreen';
import { monthLabel } from '../../src/features/onboarding/days';
import type { Language } from '../../src/language/language';
import type { DrawnScreen, PhoneSize } from '../../../../brand/screens/asHtml';
import { atTextSize } from '../../../../brand/screens/asHtml';
import { drawOrCheck } from '../../../../brand/screens/picture';
import { theNovember, theNovemberSheReads } from './theNovemberSheReads';
import { OnAPhone, theScreenIn } from './theSafeArea';

const theNames: Readonly<Record<Language, string>> = {
  en: 'English',
  es: 'Spanish',
  ru: 'Russian',
};

function theCaveat(name: string, picture: string): string {
  return [
    `Rendered, not observed: drawn from the tree the month screen produced under the test runner with`,
    `the phone language set to ${name}, at 375 by 667 points, which is the glass of an iPhone SE, with`,
    'every run of text grown by 1.3 times, the limit the largest text size reaches. The width of the',
    'header, of the way back, of Today, of the arrows and of each word of the month is the one the iPhone SE',
    `simulator reported at the largest text size, handed to the screen as the phone hands it. The page is ${picture}.`,
    'Reproduce with: npm run generate:calendar-largest-text-picture.',
  ].join(' ');
}

const theSmallestIPhone: PhoneSize = { width: 375, height: 667 };

const theSmallestIPhoneMetrics: Metrics = {
  frame: { x: 0, y: 0, ...theSmallestIPhone },
  insets: { bottom: 0, left: 0, right: 0, top: 20 },
};

/** Points, read on the iPhone SE simulator at the largest text size. */
const theHeader = 343;
const theWayBack = 44;
const theToday: Readonly<Record<Language, number>> = { en: 56, es: 44, ru: 82.5 };
const month = theNovember;
/** The month on one line: its words and the space between them at that size. */
const theWholeMonth: Readonly<Record<Language, number>> = { en: 177.5, es: 184, ru: 153.5 };

const theWords: Readonly<Record<Language, Readonly<Record<string, number>>>> = {
  en: { November: 115.5, 2026: 56.5 },
  es: { Noviembre: 122, 2026: 56.5 },
  ru: { Ноябрь: 91.5, 2026: 56.5 },
};

async function drawn(language: Language): Promise<DrawnScreen> {
  const view = await render(
    <OnAPhone metrics={theSmallestIPhoneMetrics}>
      <CalendarScreen {...theNovemberSheReads()} />
    </OnAPhone>,
  );

  for (const [at, width] of [
    [calendarHeaderTestID, theHeader],
    [calendarHeaderStartTestID, theWayBack],
    [calendarHeaderEndTestID, theToday[language]],
    [screenHeaderBeforeTitleTestID(calendarHeaderTestID), theWayBack],
    [screenHeaderAfterTitleTestID(calendarHeaderTestID), theWayBack],
    [screenHeaderWholeTitleTestID(calendarHeaderTestID), theWholeMonth[language]],
    ...monthLabel(month)
      .split(/\s+/)
      .map(
        (word) =>
          [
            screenHeaderWordTestID(calendarHeaderTestID, word),
            theWords[language][word] ?? 0,
          ] as const,
      ),
  ] as const) {
    await fireEvent(screen.getByTestId(at, { includeHiddenElements: true }), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width, height: 30 } },
    });
  }

  const tree = atTextSize(theScreenIn(view), MAXIMUM_TEXT_GROWTH);

  view.unmount();

  return {
    title: monthLabel(month),
    note: 'The month is drawn whole with an arrow on each side, and the way back, Today and the arrows keep their full size.',
    tree,
  };
}

/**
 * The month at the largest text size on the iPhone SE, in the language the phone of the calling
 * picture file reads. Each language has its own file, because the catalogue is read once, when the
 * screen is first imported.
 */
export function drawTheMonthAtTheLargestTextSize(language: Language): void {
  const name = theNames[language];
  const screens: DrawnScreen[] = [];

  describe(`the month at the largest text size in ${name}, drawn for somebody to look at`, () => {
    beforeEach(() => {
      jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('renders November', async () => {
      screens.push(await drawn(language));
    });

    it('draws it into one picture', () => {
      expect(screens).toHaveLength(1);

      const picture = `calendar-largest-text-${name.toLowerCase()}`;
      const result = drawOrCheck({
        name: picture,
        screens,
        caveat: theCaveat(name, picture),
        script: 'generate:calendar-largest-text-picture',
        size: theSmallestIPhone,
        language: language === 'en' ? undefined : language,
      });

      expect(result.problems).toEqual([]);
      console.log(result.said);
    });
  });
}
