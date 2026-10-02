import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { MINIMUM_TAP_TARGET, colour, radius, textStyle, typeScale } from '@emi/tokens';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, View } from 'react-native';

import { PrimaryButton, SecondaryButton, TextLink } from '../../src/components/Button';
import { RoundIconButton } from '../../src/components/RoundIconButton';
import { controlsTooSmallToPress } from '../fixtures/tapTargets';

/**
 * She reads one screen and knows which control writes her data.
 *
 * The affirmative action is a filled pill in the one colour that acts. The action beside it is a
 * quieter pill with no fill of its own. The quiet action is words alone. The round action is a disc
 * carrying a drawing. Nothing here types a measurement: each case reads the token the part should
 * have drawn from and holds the rendered style against it.
 *
 * The approved prototype of 2026-10-01 is the source of the two button label sizes, so two cases
 * read those sizes out of its markup rather than restating a number this file chose.
 */

const repositoryRoot = resolve(__dirname, '..', '..', '..', '..');
const prototypeScreen = join('docs', 'design', 'prototype', 'export.dc.html');

const nothing = (): void => undefined;

function theStyleOf(testID: string): Record<string, unknown> {
  return (StyleSheet.flatten(screen.getByTestId(testID).props.style) ?? {}) as Record<
    string,
    unknown
  >;
}

function theStyleOfTheWordsIn(testID: string): Record<string, unknown> {
  const [words] = screen.getByTestId(testID).children;

  return (StyleSheet.flatten((words as unknown as { props: { style?: unknown } }).props.style) ??
    {}) as Record<string, unknown>;
}

/** Everything on the screen a thumb can land on, which is what contract SEE-3 measures. */
function everythingPressable(): { props: Record<string, unknown> }[] {
  return [...screen.queryAllByRole('button'), ...screen.queryAllByRole('link')] as unknown as {
    props: Record<string, unknown>;
  }[];
}

/**
 * The size and the weight the prototype paints on a control, read off the inline style of the one
 * element whose ground is the colour given.
 *
 * The prototype writes every style inline, so a control is found by the ground it is painted in and
 * read for the two values a type role carries. A screen that stops painting that ground returns
 * nothing and the case fails, rather than quietly measuring nothing.
 */
function painted(markup: string, ground: string): { size: number; weight: number } {
  const styles = markup.match(/style="[^"]*"/g) ?? [];
  const found = styles.filter(
    (style) =>
      style.toLowerCase().includes(`background: ${ground.toLowerCase()}`) &&
      style.includes('border-radius: 999px') &&
      /min-height: \d+px/.test(style),
  );

  if (found.length === 0) {
    throw new Error(`no pill painted on ${ground} in ${prototypeScreen}, so nothing was read`);
  }

  const size = found[0]?.match(/font-size: (\d+)px/);
  const weight = found[0]?.match(/font-weight: (\d+)/);

  if (size === null || size === undefined || weight === null || weight === undefined) {
    throw new Error(`the pill on ${ground} in ${prototypeScreen} names no size and no weight`);
  }

  return { size: Number(size[1]), weight: Number(weight[1]) };
}

describe('the buttons take the redesign shapes', () => {
  describe('the action that writes her data', () => {
    it('draws a pill on the one colour that acts, in the words measured against it', async () => {
      await render(<PrimaryButton label="Save" onPress={nothing} testID="accent" />);

      expect(theStyleOf('accent')).toMatchObject({
        backgroundColor: colour.accent,
        borderRadius: radius.full,
      });
      expect(theStyleOfTheWordsIn('accent')).toMatchObject({
        color: colour.onAccent,
        ...textStyle('button-lg'),
      });
    });

    it('stands taller than the action beside it, so the two are told apart by size as well', async () => {
      await render(
        <View>
          <PrimaryButton label="Save" onPress={nothing} testID="accent" />
          <SecondaryButton label="Cancel" onPress={nothing} testID="quieter" />
        </View>,
      );

      expect(Number(theStyleOf('accent')['minHeight'])).toBeGreaterThan(
        Number(theStyleOf('quieter')['minHeight']),
      );
    });
  });

  describe('the action beside it', () => {
    it('draws a pill on the recessed ground, with no fill and no border of its own', async () => {
      await render(<SecondaryButton label="Cancel" onPress={nothing} testID="quieter" />);

      expect(theStyleOf('quieter')).toMatchObject({
        backgroundColor: colour.field,
        borderRadius: radius.full,
      });
      expect(theStyleOf('quieter')['borderWidth']).toBeUndefined();
      expect(theStyleOfTheWordsIn('quieter')).toMatchObject({
        color: colour.text,
        ...textStyle('button-md'),
      });
    });
  });

  describe('the quiet action', () => {
    it('is words in the colour that acts, with no ground, no border and no rule under them', async () => {
      await render(<TextLink label="I do not remember" onPress={nothing} testID="quiet" />);

      expect(theStyleOf('quiet')['backgroundColor']).toBeUndefined();
      expect(theStyleOf('quiet')['borderWidth']).toBeUndefined();
      expect(theStyleOfTheWordsIn('quiet')).toMatchObject({
        color: colour.accent,
        ...textStyle('button-md'),
      });
      expect(screen.getByTestId('quiet').children).toHaveLength(1);
    });
  });

  describe('the round action, which carries a drawing and no words', () => {
    it('draws a disc of the floor size on the plain surface', async () => {
      await render(
        <RoundIconButton
          accessibilityLabel="Go back"
          icon="chevron"
          onPress={nothing}
          testID="round"
        />,
      );

      expect(theStyleOf('round')).toMatchObject({
        backgroundColor: colour.card,
        borderRadius: radius.full,
        height: MINIMUM_TAP_TARGET,
        width: MINIMUM_TAP_TARGET,
      });
    });

    it('says out loud what it does, because it shows no words to read', async () => {
      await render(
        <RoundIconButton
          accessibilityLabel="Go back"
          icon="chevron"
          onPress={nothing}
          testID="round"
        />,
      );

      expect(screen.getByLabelText('Go back')).toBeTruthy();
      expect(screen.getByTestId('round').children).toHaveLength(1);
    });
  });

  describe('an action she cannot take yet', () => {
    it('keeps a measured pair rather than fading, and takes no press', async () => {
      const pressed: string[] = [];

      await render(
        <PrimaryButton
          isReady={false}
          label="Save"
          onPress={() => pressed.push('Save')}
          testID="accent"
        />,
      );

      expect(theStyleOf('accent')['opacity']).toBeUndefined();
      expect(theStyleOf('accent')).toMatchObject({
        backgroundColor: colour.field,
        borderRadius: radius.full,
      });
      expect(theStyleOfTheWordsIn('accent')).toMatchObject({ color: colour.secondaryText });

      fireEvent.press(screen.getByTestId('accent'));

      expect(pressed).toEqual([]);
    });
  });

  describe('every one of the four, measured against contract SEE-3', () => {
    it('is at least forty four points on both axes', async () => {
      await render(
        <View>
          <PrimaryButton label="Save" onPress={nothing} testID="accent" />
          <SecondaryButton label="Cancel" onPress={nothing} testID="quieter" />
          <TextLink label="I do not remember" onPress={nothing} testID="quiet" />
          <RoundIconButton
            accessibilityLabel="Go back"
            icon="chevron"
            onPress={nothing}
            testID="round"
          />
        </View>,
      );

      const pressable = everythingPressable();

      expect(pressable).toHaveLength(4);
      expect(controlsTooSmallToPress(pressable)).toEqual([]);
    });
  });

  describe('the two label sizes, read off the approved prototype', () => {
    const markup = readFileSync(join(repositoryRoot, prototypeScreen), 'utf8');

    it('sets the action that writes her data at the size the prototype paints it', () => {
      const { size, weight } = painted(markup, colour.accent);

      expect(typeScale['button-lg'].size).toBe(size);
      expect(typeScale['button-lg'].weight).toBe(weight);
    });

    it('sets the action beside it at the size the prototype paints it', () => {
      const { size, weight } = painted(markup, colour.field);

      expect(typeScale['button-md'].size).toBe(size);
      expect(typeScale['button-md'].weight).toBe(weight);
    });
  });
});
