import { act, fireEvent, render } from '@testing-library/react-native';

import { Paywall, paywallActionTestID } from '../../src/features/paywall/Paywall';
import { planRowTestID } from '../../src/features/paywall/PlanRow';
import type { APlanInTheStore } from '../../src/services/store/thePlans';
import { theMonthlyPlan, theYearlyPlan } from '../../src/services/store/theProducts';
import type { BuysInTheStore } from '../../src/services/store/thePurchase';
import type { HoldsTheAnswer } from '../../src/services/store/theAnswerThePhoneHolds';
import type { DrawnScreen } from '../../../../brand/screens/asHtml';
import { drawOrCheck } from '../../../../brand/screens/picture';
import {
  theAddressesTheBoardPressesTo,
  theWordsTheBoardWrites,
  wordsMissingFromTheScreen,
} from '../fixtures/theBoardOfThePaywall';
import { visibleTextIn } from '../fixtures/renderedText';
import { OnAPhone, theScreenIn } from '../fixtures/theSafeArea';

/**
 * The paywall, drawn for somebody to look at, and held to the board it was approved as.
 *
 * It is not part of the suite: the file is named for a picture rather than for a test, and the
 * runner is pointed at it by `npm run generate:paywall-picture`.
 *
 * The store in front of it quotes the amounts the board was drawn with, so the picture is the board
 * and the comparison means something. A store quoting anything else draws a true screen and a
 * picture nobody can hold to a drawing.
 */

const theCaveat = [
  'Rendered from the tree the paywall produced under the test runner, at 390 by 844 points, and not',
  'captured from a phone. The page loads the same font files the application loads, so the words are',
  'drawn in Figtree. The amounts are the ones the approved board was drawn with, quoted by a stand in',
  'for the App Store rather than read from a real storefront, which quotes her own currency. The room',
  'kept at the top and the bottom of each screen is the room an iPhone with a dynamic island keeps',
  'for itself, which is 59 points and 34 points. Reproduce with: npm run generate:paywall-picture.',
].join(' ');

/** What the store quoted on the day the board was drawn. */
const theYearlyPrice = '39 euros';
const theMonthlyPrice = '5 euros';

const thePlansTheStoreNamed: readonly APlanInTheStore[] = [
  { product: theYearlyPlan, priceInWords: theYearlyPrice, currency: 'EUR' },
  { product: theMonthlyPlan, priceInWords: theMonthlyPrice, currency: 'EUR' },
];

const aStoreNobodyPresses = {
  open: () => Promise.resolve(true),
  whatSheHolds: () => Promise.resolve([]),
  whenATransactionArrives: () => ({ remove: () => undefined }),
  buy: () => Promise.reject(new Error('nothing in a picture presses a plan')),
  restore: () => Promise.resolve(),
} satisfies BuysInTheStore;

const nothingIsHeld: HoldsTheAnswer = { read: () => null, hold: () => undefined };

interface State {
  readonly title: string;
  readonly note: string;
  /** Which row she presses before the picture is taken, or none for the board as drawn. */
  readonly presses: 'monthly' | null;
}

const theStates: readonly State[] = [
  {
    title: 'The paywall, as the board draws it',
    note: 'The yearly plan is chosen for her, so the free month and the words that go with it are the first thing she reads. There is no way off this screen but a purchase or a restore.',
    presses: null,
  },
  {
    title: 'The monthly plan chosen',
    note: 'Pressing the second row moves the button and the sentence under it. Neither one promises a free month, because the App Store gives one introductory offer to one woman and the yearly plan holds it.',
    presses: 'monthly',
  },
];

async function drawn(state: State): Promise<DrawnScreen> {
  const view = await render(
    <OnAPhone>
      <Paywall
        buying={aStoreNobodyPresses}
        holding={nothingIsHeld}
        now={() => new Date('2026-11-25T09:00:00.000Z')}
        onPaid={() => undefined}
        openThePage={() => undefined}
        plans={thePlansTheStoreNamed}
      />
    </OnAPhone>,
  );

  if (state.presses !== null) {
    await act(async () => {
      await fireEvent.press(view.getByTestId(planRowTestID(state.presses)));
    });
  }

  const tree: unknown = theScreenIn(view);

  await view.unmount();

  return { note: state.note, title: state.title, tree };
}

const screens: DrawnScreen[] = [];
let theWordsOfTheBoardAsDrawn: string[] = [];

describe('the paywall, drawn for somebody to look at', () => {
  for (const state of theStates) {
    it(`renders ${state.title.toLowerCase()}`, async () => {
      screens.push(await drawn(state));

      if (state.presses === null) {
        theWordsOfTheBoardAsDrawn = visibleTextIn(screens[screens.length - 1]?.tree);
      }
    });
  }

  describe('the board it was approved as', () => {
    it('writes every sentence the screen draws, in the order the board writes them', () => {
      const said = theWordsTheBoardWrites();

      expect(said.length).toBeGreaterThan(10);
      expect(theWordsOfTheBoardAsDrawn.length).toBeGreaterThan(10);
      expect(wordsMissingFromTheScreen(said, theWordsOfTheBoardAsDrawn)).toEqual([]);
    });

    it('presses to the two addresses the screen presses to', () => {
      expect(theAddressesTheBoardPressesTo()).toEqual([
        'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/',
        'https://myemi.app/en/privacy-policy/',
      ]);
    });

    it('draws the action the board draws, with the yearly plan chosen for her', () => {
      expect(theWordsOfTheBoardAsDrawn).toContain('Start the free month');
      expect(theWordsTheBoardWrites()).toContain('Start the free month');
      expect(paywallActionTestID).toBe('paywall-action');
    });
  });

  it('draws them into one picture', () => {
    expect(screens).toHaveLength(theStates.length);

    const result = drawOrCheck({
      caveat: theCaveat,
      name: 'paywall',
      screens,
      script: 'generate:paywall-picture',
    });

    expect(result.problems).toEqual([]);
    console.log(result.said);
  });
});
