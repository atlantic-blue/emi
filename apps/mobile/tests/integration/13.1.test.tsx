import { washTestID } from '@emi/ui';
import { render } from '@testing-library/react-native';

import {
  ConfirmRecoveryCode,
  recoveryEntryTestID,
} from '../../src/features/recovery/ConfirmRecoveryCode';
import {
  recoveryActionTestID,
  recoveryLinesTestID,
  recoveryTitleTestID,
} from '../../src/features/recovery/RecoveryScreen';
import { OnAPhone } from '../fixtures/theSafeArea';
import {
  type PartIdentifiers,
  partsMissing,
  partsMissingFromTheScreen,
  theIdentifiersDrawn,
  theIdentifiersOfAPart,
  thePartsOfTheMockup,
} from '../fixtures/theMockupScreen';

/**
 * The drawing of the screen that asks her to type her recovery code back places three parts. The
 * count is written out so that a comparison which read nothing cannot pass as a comparison every
 * part answered.
 *
 * This screen is the one this reads because its drawing names few parts, so a match here is the
 * comparison working rather than a long list happening to line up. Its key is written out at each
 * call, because a key built at run time is a key the check on the stage cannot read.
 */
const theDrawingHasParts = 3;

/** What each part of this one drawing is built under, on top of the parts every screen shares. */
const theIdentifiersOfTheConfirm: PartIdentifiers = {
  ...theIdentifiersOfAPart,
  PrimaryButton: [recoveryActionTestID],
  Text: [recoveryTitleTestID, recoveryLinesTestID],
  TextField: [recoveryEntryTestID],
};

async function sheTypesHerCodeBack(): Promise<void> {
  await render(
    <OnAPhone>
      <ConfirmRecoveryCode onConfirmed={() => {}} opensTheVault={() => true} />
    </OnAPhone>,
  );
}

describe('a rendered screen is held against the mockup screen it names', () => {
  describe('the drawing the comparison reads', () => {
    it('names the parts of the screen, in the order the drawing places them', () => {
      expect(
        thePartsOfTheMockup('recoveryConfirm', theIdentifiersOfTheConfirm).map((part) => part.name),
      ).toEqual(['Text', 'TextField', 'PrimaryButton']);
    });

    it('says what each of those parts is built under', () => {
      expect(
        thePartsOfTheMockup('recoveryConfirm', theIdentifiersOfTheConfirm).filter(
          (part) => part.builtUnder.length === 0,
        ),
      ).toEqual([]);
    });
  });

  describe('the screen she reads', () => {
    beforeEach(async () => {
      await sheTypesHerCodeBack();
    });

    it('draws every part the drawing names, in the order the drawing names them', () => {
      expect(partsMissingFromTheScreen('recoveryConfirm', theIdentifiersOfTheConfirm)).toEqual([]);
    });

    it('is read by the identifiers it carries rather than by its words', () => {
      // The wash across the top is colour and carries no words, so it is read out of the list the
      // comparison walks rather than held as a part of the screen.
      expect(theIdentifiersDrawn().filter((drawn) => !drawn.startsWith(washTestID))).toEqual([
        'recovery-confirm',
        recoveryTitleTestID,
        recoveryEntryTestID,
        recoveryLinesTestID,
        recoveryActionTestID,
      ]);
    });
  });

  describe('a part the screen does not answer for', () => {
    beforeEach(async () => {
      await sheTypesHerCodeBack();
    });

    it('is named, with what it is built under and where the comparison had reached', () => {
      const moved = { ...theIdentifiersOfTheConfirm, PrimaryButton: ['a-button-nobody-drew'] };

      expect(partsMissingFromTheScreen('recoveryConfirm', moved)).toEqual([
        `the drawing names PrimaryButton, built under a-button-nobody-drew, and the screen draws none of them after ${recoveryEntryTestID}`,
      ]);
    });

    it('is named when nothing says what it is built under, which is a part nobody built yet', () => {
      const unbuilt = { ...theIdentifiersOfTheConfirm, TextField: [] };

      expect(partsMissingFromTheScreen('recoveryConfirm', unbuilt)).toEqual([
        'the drawing names TextField, and nothing says which test identifier it is built under',
      ]);
    });

    it('is named when the screen draws it before the part ahead of it', () => {
      const outOfOrder = { ...theIdentifiersOfTheConfirm, PrimaryButton: [recoveryTitleTestID] };

      expect(partsMissingFromTheScreen('recoveryConfirm', outOfOrder)).toEqual([
        `the drawing names PrimaryButton, built under ${recoveryTitleTestID}, and the screen draws none of them after ${recoveryEntryTestID}`,
      ]);
    });

    it('is named as drawn nowhere at all when the screen answers for none of the drawing', () => {
      const parts = thePartsOfTheMockup('recoveryConfirm', theIdentifiersOfTheConfirm);

      expect(partsMissing(parts, [])).toHaveLength(theDrawingHasParts);
      expect(partsMissing(parts, [])[0]).toContain('anywhere on the screen');
    });
  });

  describe('a comparison of nothing', () => {
    it('is refused rather than passed, because it reads the same as every part answering', () => {
      expect(() => partsMissing([], [])).toThrow('a drawing naming no part was compared');
    });
  });
});
