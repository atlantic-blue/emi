import type { ReactElement } from 'react';
import { MAXIMUM_TEXT_GROWTH } from '@emi/tokens';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import type { Metrics } from 'react-native-safe-area-context';

import { fluidGridWordTestID } from '../../src/components/FluidGrid';
import { tileTitleTestID } from '../../src/components/SelectableTile';
import { Focus, focusGridTestID, focusTestID } from '../../src/features/onboarding/Focus';
import { focusChoices } from '../../src/features/onboarding/copy';
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
    `Rendered, not observed: drawn from the tree the focus question produced under the test runner with`,
    `the phone language set to ${name}, at 375 by 667 points, which is the glass of an iPhone SE, with`,
    'every run of text grown by 1.3 times, the limit the largest text size reaches. The width of each',
    `word of the group names is the one the iPhone SE simulator reported at the largest text size,`,
    `handed to the screen as the phone hands it. The page is ${picture}.`,
    'Reproduce with: npm run generate:focus-largest-text-picture.',
  ].join(' ');
}

const theSmallestIPhone: PhoneSize = { width: 375, height: 667 };

const theSmallestIPhoneMetrics: Metrics = {
  frame: { x: 0, y: 0, ...theSmallestIPhone },
  insets: { bottom: 0, left: 0, right: 0, top: 20 },
};

/** Points, read on the iPhone SE simulator at the largest text size. */
const theRow = 351;

const theWords: Readonly<Record<Language, Readonly<Record<string, number>>>> = {
  en: {
    Sleep: 70,
    Mood: 71,
    Energy: 82.5,
    Skin: 59,
    and: 54,
    hair: 55,
    Appetite: 97.5,
    Digestive: 102.5,
    symptoms: 111.5,
    Pain: 59,
  },
  es: {
    Sueño: 75.5,
    Ánimo: 78,
    Energía: 86.5,
    Piel: 53.5,
    y: 33.5,
    pelo: 59.5,
    Apetito: 87,
    Síntomas: 101.5,
    digestivos: 109.5,
    Dolor: 68.5,
  },
  ru: {
    Сон: 58.5,
    Настроение: 134.5,
    Энергия: 100.5,
    Кожа: 75,
    и: 34.5,
    волосы: 92.5,
    Аппетит: 100,
    Работа: 91,
    ЖКТ: 67,
    Боль: 69,
  },
};

function theScreen(): ReactElement {
  return (
    <OnAPhone metrics={theSmallestIPhoneMetrics}>
      <Focus
        chosen={['mood']}
        onBack={() => undefined}
        onContinue={() => undefined}
        onPress={() => undefined}
        onSkip={() => undefined}
      />
    </OnAPhone>
  );
}

async function drawn(language: Language): Promise<DrawnScreen> {
  const view = await render(theScreen());

  await fireEvent(screen.getByTestId(focusGridTestID), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: theRow, height: 400 } },
  });
  const words = new Set(
    focusChoices.flatMap((group) =>
      String(screen.getByTestId(tileTitleTestID(focusTestID(group))).props.children).split(/\s+/),
    ),
  );

  for (const word of words) {
    await fireEvent(
      screen.getByTestId(fluidGridWordTestID(focusGridTestID, word), {
        includeHiddenElements: true,
      }),
      'layout',
      { nativeEvent: { layout: { x: 0, y: 0, width: theWords[language][word] ?? 0, height: 20 } } },
    );
  }

  const tree = atTextSize(theScreenIn(view), MAXIMUM_TEXT_GROWTH);

  view.unmount();

  return {
    title: 'The focus question, mood picked',
    note: 'The grid takes the most tiles to a row whose width holds the widest word of a name, so no word breaks and no name shrinks.',
    tree,
  };
}

/**
 * The focus question at the largest text size on the iPhone SE, in the language the phone of the calling
 * picture file reads. Each language has its own file, because the catalogue is read once, when the
 * screen is first imported.
 */
export function drawTheFocusAtTheLargestTextSize(language: Language): void {
  const name = theNames[language];
  const screens: DrawnScreen[] = [];

  describe(`the focus question at the largest text size in ${name}, drawn for somebody to look at`, () => {
    beforeEach(() => {
      jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('renders the seven groups', async () => {
      screens.push(await drawn(language));
    });

    it('draws it into one picture', () => {
      expect(screens).toHaveLength(1);

      const picture = `focus-largest-text-${name.toLowerCase()}`;
      const result = drawOrCheck({
        name: picture,
        screens,
        caveat: theCaveat(name, picture),
        script: 'generate:focus-largest-text-picture',
        size: theSmallestIPhone,
        language: language === 'en' ? undefined : language,
      });

      expect(result.problems).toEqual([]);
      console.log(result.said);
    });
  });
}
