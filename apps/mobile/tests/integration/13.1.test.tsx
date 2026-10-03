import { washTestID } from '@emi/ui';
import { render } from '@testing-library/react-native';

import {
  ThePromise,
  promiseActionTestID,
  promiseLineTestID,
  thePromiseTestID,
} from '../../src/features/onboarding/ThePromise';
import { OnAPhone } from '../fixtures/theSafeArea';
import {
  partsMissing,
  partsMissingFromTheScreen,
  theIdentifiersDrawn,
  theIdentifiersOfAPart,
  thePartsOfTheMockup,
} from '../fixtures/theMockupScreen';

/**
 * The promise drawing places three parts. The count is written out so that a comparison which
 * read nothing cannot pass as a comparison every part answered.
 *
 * The promise is the screen this reads because it was built before the drawings arrived and this
 * step changes nothing about it. A match here is the comparison working rather than a screen bent
 * to fit the drawing. Its key is written out at each call, because a key built at run time is a
 * key the check on the stage cannot read.
 */
const theDrawingHasParts = 3;

async function sheReadsThePromise(): Promise<void> {
  await render(
    <OnAPhone>
      <ThePromise onContinue={() => {}} />
    </OnAPhone>,
  );
}

describe('a rendered screen is held against the mockup screen it names', () => {
  describe('the drawing the comparison reads', () => {
    it('names the parts of the promise screen, in the order the drawing places them', () => {
      expect(thePartsOfTheMockup('thePromise').map((part) => part.name)).toEqual([
        'ThePromise',
        'Card',
        'PrimaryButton',
      ]);
    });

    it('says what each of those parts is built under', () => {
      expect(
        thePartsOfTheMockup('thePromise').filter((part) => part.builtUnder.length === 0),
      ).toEqual([]);
    });
  });

  describe('the promise screen she reads', () => {
    beforeEach(async () => {
      await sheReadsThePromise();
    });

    it('draws every part the drawing names, in the order the drawing names them', () => {
      expect(partsMissingFromTheScreen('thePromise')).toEqual([]);
    });

    it('is read by the identifiers it carries rather than by its words', () => {
      // The wash across the top is colour and carries no words, so it is read out of the list the
      // comparison walks rather than held as a part of the screen.
      expect(theIdentifiersDrawn().filter((drawn) => !drawn.startsWith(washTestID))).toEqual([
        thePromiseTestID,
        promiseLineTestID('encrypted'),
        promiseLineTestID('noTracking'),
        promiseLineTestID('delete'),
        promiseActionTestID,
      ]);
    });
  });

  describe('a part the screen does not answer for', () => {
    beforeEach(async () => {
      await sheReadsThePromise();
    });

    it('is named, with what it is built under and where the comparison had reached', () => {
      const moved = { ...theIdentifiersOfAPart, PrimaryButton: ['a-button-nobody-drew'] };

      expect(partsMissingFromTheScreen('thePromise', moved)).toEqual([
        'the drawing names PrimaryButton, built under a-button-nobody-drew, and the screen draws none of them after promise-encrypted',
      ]);
    });

    it('is named when nothing says what it is built under, which is a part nobody built yet', () => {
      const unbuilt = { ...theIdentifiersOfAPart, Card: [] };

      expect(partsMissingFromTheScreen('thePromise', unbuilt)).toEqual([
        'the drawing names Card, and nothing says which test identifier it is built under',
      ]);
    });

    it('is named when the screen draws it before the part ahead of it', () => {
      const outOfOrder = { ...theIdentifiersOfAPart, PrimaryButton: [thePromiseTestID] };

      expect(partsMissingFromTheScreen('thePromise', outOfOrder)).toEqual([
        `the drawing names PrimaryButton, built under ${thePromiseTestID}, and the screen draws none of them after promise-encrypted`,
      ]);
    });

    it('is named as drawn nowhere at all when the screen answers for none of the drawing', () => {
      expect(partsMissing(thePartsOfTheMockup('thePromise'), [])).toHaveLength(theDrawingHasParts);
      expect(partsMissing(thePartsOfTheMockup('thePromise'), [])[0]).toContain(
        'anywhere on the screen',
      );
    });
  });

  describe('a comparison of nothing', () => {
    it('is refused rather than passed, because it reads the same as every part answering', () => {
      expect(() => partsMissing([], [])).toThrow('a drawing naming no part was compared');
    });
  });
});
