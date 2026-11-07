import { MAXIMUM_TEXT_GROWTH } from '@emi/tokens';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import type { Metrics } from 'react-native-safe-area-context';

import {
  screenHeaderEndTestID,
  screenHeaderStartTestID,
  screenHeaderWordTestID,
} from '../../src/components/ScreenHeader';
import {
  EditPeriodScreen,
  editPeriodHeaderTestID,
  editPeriodTitleTestID,
} from '../../src/features/calendar/EditPeriodScreen';
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
    `Rendered, not observed: drawn from the tree Edit my period produced under the test runner with`,
    `the phone language set to ${name}, at 375 by 667 points, which is the glass of an iPhone SE, with`,
    'every run of text grown by 1.3 times, the limit the largest text size reaches. The width of the',
    'header, of Cancel and of each word of the title is the one the iPhone SE simulator reported at',
    `the largest text size, handed to the screen as the phone hands it. The page is ${picture}.`,
    'Reproduce with: npm run generate:edit-period-largest-text-picture.',
  ].join(' ');
}

const theSmallestIPhone: PhoneSize = { width: 375, height: 667 };

const theSmallestIPhoneMetrics: Metrics = {
  frame: { x: 0, y: 0, ...theSmallestIPhone },
  insets: { bottom: 0, left: 0, right: 0, top: 20 },
};

/** Points, read on the iPhone SE simulator at the largest text size. */
const theHeader = 343;
const theCancel: Readonly<Record<Language, number>> = { en: 58, es: 74.5, ru: 70.5 };
const theWords: Readonly<Record<Language, Readonly<Record<string, number>>>> = {
  en: { Edit: 44, my: 35, period: 71 },
  es: { Editar: 66, mi: 27.5, periodo: 84.5 },
  ru: { Изменить: 117, мои: 47, месячные: 119.5 },
};

const herPeriod = ['2026-11-03', '2026-11-04', '2026-11-05'];

async function drawn(language: Language): Promise<DrawnScreen> {
  const view = await render(
    <OnAPhone metrics={theSmallestIPhoneMetrics}>
      <EditPeriodScreen
        held={herPeriod}
        listed={herPeriod}
        onAddBefore={() => undefined}
        onCancel={() => undefined}
        onDelete={() => undefined}
        onSave={() => undefined}
        onToggle={() => undefined}
        ticked={herPeriod}
      />
    </OnAPhone>,
  );
  const title = String(screen.getByTestId(editPeriodTitleTestID).props.children);
  const widths: readonly (readonly [string, number])[] = [
    [editPeriodHeaderTestID, theHeader],
    [screenHeaderStartTestID(editPeriodHeaderTestID), theCancel[language]],
    [screenHeaderEndTestID(editPeriodHeaderTestID), 0],
    ...title
      .split(/\s+/)
      .map(
        (word) =>
          [
            screenHeaderWordTestID(editPeriodHeaderTestID, word),
            theWords[language][word] ?? 0,
          ] as const,
      ),
  ];

  for (const [at, width] of widths) {
    await fireEvent(screen.getByTestId(at, { includeHiddenElements: true }), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width, height: 30 } },
    });
  }

  const tree = atTextSize(theScreenIn(view), MAXIMUM_TEXT_GROWTH);

  view.unmount();

  return {
    title: 'Edit my period, three days held',
    note: 'The title is drawn whole in the middle, and Cancel keeps its full size on the glass.',
    tree,
  };
}

/**
 * Edit my period at the largest text size on the iPhone SE, in the language the phone of the
 * calling picture file reads. Each language has its own file, because the catalogue is read once,
 * when the screen is first imported.
 */
export function drawEditPeriodAtTheLargestTextSize(language: Language): void {
  const name = theNames[language];
  const screens: DrawnScreen[] = [];

  describe(`Edit my period at the largest text size in ${name}, drawn for somebody to look at`, () => {
    beforeEach(() => {
      jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('renders the period', async () => {
      screens.push(await drawn(language));
    });

    it('draws it into one picture', () => {
      expect(screens).toHaveLength(1);

      const picture = `edit-period-largest-text-${name.toLowerCase()}`;
      const result = drawOrCheck({
        name: picture,
        screens,
        caveat: theCaveat(name, picture),
        script: 'generate:edit-period-largest-text-picture',
        size: theSmallestIPhone,
        language: language === 'en' ? undefined : language,
      });

      expect(result.problems).toEqual([]);
      console.log(result.said);
    });
  });
}
