import type { ReactElement } from 'react';
import { MAXIMUM_TEXT_GROWTH } from '@emi/tokens';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import type { Metrics } from 'react-native-safe-area-context';

import { fluidGridWordTestID } from '../../src/components/FluidGrid';
import {
  HygieneProductsPage,
  hygienePageProductsTestID,
  productTileNameTestID,
} from '../../src/features/hygiene/HygieneProductsPage';
import { productOrder } from '../../src/features/hygiene/products';
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
    `Rendered, not observed: drawn from the tree the guide produced under the test runner with`,
    `the phone language set to ${name}, at 375 by 667 points, which is the glass of an iPhone SE, with`,
    'every run of text grown by 1.3 times, the limit the largest text size reaches. The width of each',
    `word of the product names is the one the iPhone SE simulator reported at the largest text size,`,
    `handed to the screen as the phone hands it. The page is ${picture}.`,
    'Reproduce with: npm run generate:guide-largest-text-picture.',
  ].join(' ');
}

const theSmallestIPhone: PhoneSize = { width: 375, height: 667 };

const theSmallestIPhoneMetrics: Metrics = {
  frame: { x: 0, y: 0, ...theSmallestIPhone },
  insets: { bottom: 0, left: 0, right: 0, top: 20 },
};

/** Points, read on the iPhone SE simulator at the largest text size. */
const theRow = 335;

const theWords: Readonly<Record<Language, Readonly<Record<string, number>>>> = {
  en: {
    Panty: 45.5,
    liner: 34,
    Pad: 29.5,
    Reusable: 70.5,
    cloth: 40,
    pad: 29.5,
    Tampon: 63.5,
    Period: 50.5,
    underwear: 84,
    Menstrual: 77.5,
    cup: 29,
    disc: 32,
    Sponge: 59.5,
  },
  es: {
    Salvaslip: 68.5,
    Compresa: 80,
    de: 19.5,
    tela: 29.5,
    reutilizable: 86,
    Tampón: 63.5,
    Ropa: 40,
    interior: 57.5,
    menstrual: 78,
    Copa: 41.5,
    Disco: 43.5,
    Esponja: 61.5,
  },
  ru: {
    Ежедневная: 107.5,
    прокладка: 95.5,
    Прокладка: 98,
    Многоразовая: 127,
    тканевая: 80.5,
    Тампон: 65.5,
    Менструальные: 138,
    трусы: 52,
    Менструальная: 135.5,
    чаша: 47,
    Менструальный: 139.5,
    диск: 40.5,
    Спонж: 58.5,
  },
};

function theScreen(): ReactElement {
  return (
    <OnAPhone metrics={theSmallestIPhoneMetrics}>
      <HygieneProductsPage
        onBack={() => undefined}
        onOpen={() => undefined}
        onQuiz={() => undefined}
      />
    </OnAPhone>
  );
}

async function drawn(language: Language): Promise<DrawnScreen> {
  const view = await render(theScreen());

  await fireEvent(screen.getByTestId(hygienePageProductsTestID), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: theRow, height: 400 } },
  });
  const words = new Set(
    productOrder.flatMap((slug) =>
      String(screen.getByTestId(productTileNameTestID(slug)).props.children).split(/\s+/),
    ),
  );

  for (const word of words) {
    await fireEvent(
      screen.getByTestId(fluidGridWordTestID(hygienePageProductsTestID, word), {
        includeHiddenElements: true,
      }),
      'layout',
      { nativeEvent: { layout: { x: 0, y: 0, width: theWords[language][word] ?? 0, height: 20 } } },
    );
  }

  const tree = atTextSize(theScreenIn(view), MAXIMUM_TEXT_GROWTH);

  view.unmount();

  return {
    title: 'The guide, the eight products',
    note: 'The grid takes the most columns whose width holds the widest word of a name with a gap, so no word breaks and no name shrinks.',
    tree,
  };
}

/**
 * The guide at the largest text size on the iPhone SE, in the language the phone of the calling
 * picture file reads. Each language has its own file, because the catalogue is read once, when the
 * screen is first imported.
 */
export function drawTheGuideAtTheLargestTextSize(language: Language): void {
  const name = theNames[language];
  const screens: DrawnScreen[] = [];

  describe(`the guide at the largest text size in ${name}, drawn for somebody to look at`, () => {
    beforeEach(() => {
      jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('renders the eight products', async () => {
      screens.push(await drawn(language));
    });

    it('draws it into one picture', () => {
      expect(screens).toHaveLength(1);

      const picture = `guide-largest-text-${name.toLowerCase()}`;
      const result = drawOrCheck({
        name: picture,
        screens,
        caveat: theCaveat(name, picture),
        script: 'generate:guide-largest-text-picture',
        size: theSmallestIPhone,
        language: language === 'en' ? undefined : language,
      });

      expect(result.problems).toEqual([]);
      console.log(result.said);
    });
  });
}
