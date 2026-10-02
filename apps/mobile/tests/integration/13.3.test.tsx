import { typeRoleNames, typeScale } from '@emi/tokens';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { MultiChoiceRow, SingleChoiceRow } from '../../src/components/ChoiceRow';
import { TextField } from '../../src/components/TextField';

/**
 * The two parts that drew at `body-md` before it was retired, read back after it.
 *
 * The values here are written out rather than read from the token package. A case that asserts a
 * rendered style against the token it was drawn from agrees with itself whatever the token says,
 * so it would have passed just as well had the retirement moved the text to another size. These
 * four numbers are what the two parts measured before the change, and that is the whole claim:
 * one of the two names went, and no screen moved.
 */
const whatTheyDrewBefore = {
  fontFamily: 'Figtree-Regular',
  fontSize: 16,
  letterSpacing: 0,
  lineHeight: 24,
} as const;

/**
 * What a row's words measure since the redesign of 2026-10-01, written out for the same reason as
 * the four above: read from the token the row drew from, the case would agree with itself.
 */
const whatARowDrawsAtNow = {
  fontFamily: 'Figtree-SemiBold',
  fontSize: 15,
  letterSpacing: 0,
  lineHeight: 21,
} as const;

function nothing(): void {}

function theStyleOf(testID: string): Record<string, unknown> {
  return (StyleSheet.flatten(screen.getByTestId(testID).props.style) ?? {}) as Record<
    string,
    unknown
  >;
}

/** The words of a row are the first child of it, which is where the row sets the type role. */
function theStyleOfTheWordsIn(testID: string): Record<string, unknown> {
  const [words] = screen.getByTestId(testID).children;

  return (StyleSheet.flatten((words as unknown as { props: { style?: unknown } }).props.style) ??
    {}) as Record<string, unknown>;
}

describe('the body-md role retires into body-lg', () => {
  describe('the role list the design system names', () => {
    it('holds fifteen roles, and body-md is not one of them', () => {
      expect(typeRoleNames).toHaveLength(15);
      expect(typeRoleNames).not.toContain('body-md');
      expect(Object.keys(typeScale)).not.toContain('body-md');
    });

    it('keeps body-lg at the size and the line height the retired name carried', () => {
      expect(typeScale['body-lg'].size).toBe(whatTheyDrewBefore.fontSize);
      expect(typeScale['body-lg'].lineHeight).toBe(whatTheyDrewBefore.lineHeight);
      expect(typeScale['body-lg'].face).toBe('text');
      expect(typeScale['body-lg'].weight).toBe(400);
    });
  });

  describe('the line she types into', () => {
    it('draws what she types at the size and the face it drew at before', async () => {
      await render(<TextField label="Name" onChange={nothing} testID="field" value="" />);

      expect(theStyleOf('field')).toMatchObject(whatTheyDrewBefore);
    });
  });

  // The redesign of 2026-10-01 moved a row's words onto a role of their own, so the row no longer
  // witnesses this retirement. What it must still do is stay off the retired name, and draw the
  // same words whether she has picked the row or not.
  describe('the row she picks, which the redesign moved onto a role of its own', () => {
    it('draws the words of an unpicked row at the role the redesign names, not the retired one', async () => {
      await render(
        <SingleChoiceRow isChosen={false} label="Every day" onPress={nothing} testID="row" />,
      );

      expect(theStyleOfTheWordsIn('row')).toMatchObject(whatARowDrawsAtNow);
      expect(theStyleOfTheWordsIn('row')['fontSize']).not.toBe(whatTheyDrewBefore.fontSize);
    });

    it('draws the words of a picked row at the same size and face, so picking moves no type', async () => {
      await render(
        <SingleChoiceRow isChosen={true} label="Every day" onPress={nothing} testID="row" />,
      );

      expect(theStyleOfTheWordsIn('row')).toMatchObject(whatARowDrawsAtNow);
    });

    it('draws the words of a row she can pick many of at the same size and face', async () => {
      await render(
        <MultiChoiceRow isChosen={false} label="Cramps" onPress={nothing} testID="row" />,
      );

      expect(theStyleOfTheWordsIn('row')).toMatchObject(whatARowDrawsAtNow);
    });
  });
});
