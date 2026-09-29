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
  fontFamily: 'PlusJakartaSans-Regular',
  fontSize: 16,
  letterSpacing: 0,
  lineHeight: 24,
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
    it('holds eleven roles, and body-md is not one of them', () => {
      expect(typeRoleNames).toHaveLength(11);
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

  describe('the row she picks', () => {
    it('draws the words of an unpicked row at the size and the face they drew at before', async () => {
      await render(
        <SingleChoiceRow isChosen={false} label="Every day" onPress={nothing} testID="row" />,
      );

      expect(theStyleOfTheWordsIn('row')).toMatchObject(whatTheyDrewBefore);
    });

    it('draws the words of a picked row at the same size and face, so picking moves no type', async () => {
      await render(
        <SingleChoiceRow isChosen={true} label="Every day" onPress={nothing} testID="row" />,
      );

      expect(theStyleOfTheWordsIn('row')).toMatchObject(whatTheyDrewBefore);
    });

    it('draws the words of a row she can pick many of at the same size and face', async () => {
      await render(
        <MultiChoiceRow isChosen={false} label="Cramps" onPress={nothing} testID="row" />,
      );

      expect(theStyleOfTheWordsIn('row')).toMatchObject(whatTheyDrewBefore);
    });
  });
});
