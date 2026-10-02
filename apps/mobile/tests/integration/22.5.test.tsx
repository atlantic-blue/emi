import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { MINIMUM_TAP_TARGET, colour, radius, textStyle, typeScale } from '@emi/tokens';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Chip } from '../../src/components/Chip';
import {
  MultiChoiceRow,
  SingleChoiceRow,
  rowCheckTestID,
  rowDiscTestID,
  rowRingTestID,
} from '../../src/components/ChoiceRow';
import {
  SelectableTile,
  tileBeadTestID,
  tileCheckTestID,
  tileWellTestID,
} from '../../src/components/SelectableTile';
import { Stepper, stepperReadingTestID } from '../../src/components/Stepper';
import { TextField } from '../../src/components/TextField';
import { controlsTooSmallToPress } from '../fixtures/tapTargets';

/**
 * She answers a question and knows which answer she gave, without reading a word.
 *
 * A chosen row is the only filled row on the screen and it carries a check, so the answer she gave
 * is never carried by colour alone. A chosen chip is the only filled pill. A chosen tile is tinted
 * and carries a check in its corner. Nothing here types a measurement: each case reads the token
 * the part should have drawn from and holds the rendered style against it.
 *
 * The approved prototype of 2026-10-01 is the source of the two label sizes this step adds to the
 * type scale, so three cases read those sizes out of its markup rather than restating a number
 * this file chose.
 */

const repositoryRoot = resolve(__dirname, '..', '..', '..', '..');
const prototype = join('docs', 'design', 'prototype');

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

function theDrawingIn(testID: string): string {
  return String(screen.getByTestId(testID).props['xml']);
}

/** Everything on the screen a thumb can land on, which is what contract SEE-3 measures. */
function everythingPressable(): { props: Record<string, unknown> }[] {
  return [
    ...screen.queryAllByRole('button'),
    ...screen.queryAllByRole('radio'),
    ...screen.queryAllByRole('checkbox'),
  ] as unknown as { props: Record<string, unknown> }[];
}

/**
 * The size and the weight the prototype paints on one part, read off the inline style of the one
 * element that carries every mark given.
 *
 * The prototype writes every style inline, so a part is found by the marks that make it: its
 * ground, its corner and its height. A screen that stops painting that part returns nothing and
 * the case fails, rather than quietly measuring nothing.
 */
function painted(screenFile: string, marks: readonly string[]): { size: number; weight: number } {
  const markup = readFileSync(join(repositoryRoot, prototype, screenFile), 'utf8');
  const found = (markup.match(/style="[^"]*"/g) ?? []).filter((style) =>
    marks.every((mark) => style.toLowerCase().includes(mark.toLowerCase())),
  );

  if (found.length === 0) {
    throw new Error(`nothing in ${screenFile} carries ${marks.join(' and ')}, so nothing was read`);
  }

  const size = found[0]?.match(/font-size: (\d+)px/);
  const weight = found[0]?.match(/font-weight: (\d+)/);

  if (size === null || size === undefined || weight === null || weight === undefined) {
    throw new Error(`the part in ${screenFile} names no size and no weight`);
  }

  return { size: Number(size[1]), weight: Number(weight[1]) };
}

/** Three answers of which she may hold one, which is what a real question hands the row. */
function OneOfThese({ answers }: { readonly answers: readonly string[] }): React.ReactNode {
  const [held, setHeld] = useState(answers[0]);

  return (
    <View>
      {answers.map((answer) => (
        <SingleChoiceRow
          isChosen={held === answer}
          key={answer}
          label={answer}
          onPress={() => {
            setHeld(answer);
          }}
          testID={answer}
        />
      ))}
    </View>
  );
}

describe('the option rows and chips take the redesign look', () => {
  describe('the answer she chose', () => {
    it('fills with the one colour that acts, and carries a check on a white disc', async () => {
      await render(
        <SingleChoiceRow isChosen label="No, it moves" onPress={nothing} testID="row" />,
      );

      expect(theStyleOf('row')).toMatchObject({
        backgroundColor: colour.accent,
        borderRadius: radius.md,
      });
      expect(theStyleOfTheWordsIn('row')).toMatchObject({
        color: colour.onAccent,
        ...textStyle('choice-lg'),
      });
      expect(theStyleOf(rowDiscTestID('row'))).toMatchObject({
        backgroundColor: colour.onAccent,
        borderRadius: radius.full,
      });
      expect(theDrawingIn(rowCheckTestID('row'))).toContain(colour.accent);
    });

    it('is the only filled row on the screen, so she finds it without reading one', async () => {
      await render(<OneOfThese answers={['Yes, most months', 'No, it moves', 'I do not know']} />);

      const filled = ['Yes, most months', 'No, it moves', 'I do not know'].filter(
        (answer) => theStyleOf(answer)['backgroundColor'] === colour.accent,
      );

      expect(filled).toEqual(['Yes, most months']);
    });
  });

  describe('an answer she did not choose', () => {
    it('keeps the quiet ground and the words she reads everywhere else', async () => {
      await render(
        <SingleChoiceRow
          isChosen={false}
          label="Yes, most months"
          onPress={nothing}
          testID="row"
        />,
      );

      expect(theStyleOf('row')).toMatchObject({ backgroundColor: colour.field });
      expect(theStyleOfTheWordsIn('row')).toMatchObject({
        color: colour.text,
        ...textStyle('choice-lg'),
      });
      expect(screen.queryByTestId(rowDiscTestID('row'))).toBeNull();
    });

    it('shows an empty ring where she may hold more than one answer at once', async () => {
      await render(
        <View>
          <MultiChoiceRow isChosen={false} label="Symptoms" onPress={nothing} testID="resting" />
          <MultiChoiceRow isChosen label="My period" onPress={nothing} testID="held" />
        </View>,
      );

      expect(theStyleOf(rowRingTestID('resting'))).toMatchObject({
        borderColor: colour.disabledLabel,
        borderRadius: radius.full,
      });
      expect(theStyleOf(rowRingTestID('resting'))['backgroundColor']).toBeUndefined();
      expect(screen.queryByTestId(rowRingTestID('held'))).toBeNull();
      expect(theDrawingIn(rowCheckTestID('held'))).toContain(colour.accent);
    });

    it('still says which control it is, one of a set or any number of a set', async () => {
      await render(
        <View>
          <SingleChoiceRow isChosen label="Regular" onPress={nothing} testID="one" />
          <MultiChoiceRow isChosen={false} label="Symptoms" onPress={nothing} testID="any" />
        </View>,
      );

      expect(screen.getByRole('radio')).toBeTruthy();
      expect(screen.getByRole('checkbox')).toBeTruthy();
      expect(screen.getByTestId('one').props['accessibilityState']).toMatchObject({
        checked: true,
      });
      expect(screen.getByTestId('any').props['accessibilityState']).toMatchObject({
        checked: false,
      });
    });
  });

  describe('the word she turns on and off', () => {
    it('is a pill on the plain surface inside an outline, and fills when she turns it on', async () => {
      await render(
        <View>
          <Chip isChosen={false} label="Anxious" onPress={nothing} testID="resting" />
          <Chip isChosen label="Low" onPress={nothing} testID="chosen" />
        </View>,
      );

      expect(theStyleOf('resting')).toMatchObject({
        backgroundColor: colour.card,
        borderColor: colour.line,
        borderRadius: radius.full,
      });
      expect(theStyleOfTheWordsIn('resting')).toMatchObject({
        color: colour.text,
        ...textStyle('choice-lg'),
      });
      expect(theStyleOf('chosen')).toMatchObject({
        backgroundColor: colour.accent,
        borderColor: colour.accent,
        borderRadius: radius.full,
      });
      expect(theStyleOfTheWordsIn('chosen')).toMatchObject({ color: colour.onAccent });
    });
  });

  describe('the category she chooses', () => {
    it('is white inside an outline, with its drawing in a round well', async () => {
      await render(
        <SelectableTile
          icon="mood"
          isChosen={false}
          onPress={nothing}
          testID="tile"
          title="Mood"
        />,
      );

      expect(theStyleOf('tile')).toMatchObject({
        backgroundColor: colour.card,
        borderColor: colour.line,
        borderRadius: radius.xl,
      });
      expect(theStyleOf(tileWellTestID('tile'))).toMatchObject({
        backgroundColor: colour.accentTile,
        borderRadius: radius.full,
      });
      expect(StyleSheet.flatten(screen.getByText('Mood').props.style)).toMatchObject({
        color: colour.text,
        ...textStyle('choice-sm'),
      });
      expect(screen.queryByTestId(tileBeadTestID('tile'))).toBeNull();
    });

    it('takes the soft tint and a check in its corner once she chooses it', async () => {
      await render(
        <SelectableTile icon="sleep" isChosen onPress={nothing} testID="tile" title="Sleep" />,
      );

      expect(theStyleOf('tile')).toMatchObject({
        backgroundColor: colour.accentSoft,
        borderColor: colour.accent,
      });
      expect(theStyleOf(tileBeadTestID('tile'))).toMatchObject({
        backgroundColor: colour.accent,
        borderRadius: radius.full,
      });
      expect(theDrawingIn(tileCheckTestID('tile'))).toContain(colour.onAccent);
    });
  });

  describe('the line she types into', () => {
    it('draws the box at the control corner, tall enough to reach with a thumb', async () => {
      await render(<TextField label="Your name" onChange={nothing} testID="field" value="Maria" />);

      expect(theStyleOf('field')).toMatchObject({
        backgroundColor: colour.card,
        borderColor: colour.line,
        borderRadius: radius.md,
      });
      expect(Number(theStyleOf('field')['minHeight'])).toBeGreaterThanOrEqual(MINIMUM_TAP_TARGET);
    });

    it('takes the colour that acts as its border while she is in it, and never a glow', async () => {
      await render(<TextField label="Your name" onChange={nothing} testID="field" value="Maria" />);

      const resting = Number(theStyleOf('field')['borderWidth']);

      await act(async () => {
        fireEvent(screen.getByTestId('field'), 'focus');
      });

      expect(theStyleOf('field')).toMatchObject({ borderColor: colour.accent });
      expect(Number(theStyleOf('field')['borderWidth'])).toBeGreaterThan(resting);
      expect(theStyleOf('field')['boxShadow']).toBeUndefined();
    });
  });

  describe('the number she is holding', () => {
    it('sits the number she holds on a band of the soft tint, at the size the prototype reads it', async () => {
      await render(
        <Stepper
          canGoDown
          canGoUp
          downLabel="Shorter"
          onDown={nothing}
          onUp={nothing}
          reading="28 days"
          testID="days"
          upLabel="Longer"
        />,
      );

      expect(theStyleOf('days')).toMatchObject({
        backgroundColor: colour.accentSoft,
        borderRadius: radius.lg,
      });
      expect(
        StyleSheet.flatten(screen.getByTestId(stepperReadingTestID('days')).props.style),
      ).toMatchObject({ color: colour.text, ...textStyle('display-lg-mobile') });
    });
  });

  describe('the selection logic of today, which this step does not touch', () => {
    it('hands her the answer she presses, and takes the one she held before', async () => {
      await render(<OneOfThese answers={['Yes, most months', 'No, it moves', 'I do not know']} />);

      await act(async () => {
        fireEvent.press(screen.getByTestId('No, it moves'));
      });

      expect(theStyleOf('No, it moves')['backgroundColor']).toBe(colour.accent);
      expect(theStyleOf('Yes, most months')['backgroundColor']).toBe(colour.field);
      expect(screen.getByTestId('No, it moves').props['accessibilityState']).toMatchObject({
        checked: true,
      });
      expect(screen.queryByTestId(rowDiscTestID('No, it moves'))).toBeTruthy();
      expect(screen.queryByTestId(rowDiscTestID('Yes, most months'))).toBeNull();
    });

    it('reaches the handler of a chip and of a tile, once for one press', async () => {
      const pressed: string[] = [];

      await render(
        <View>
          <Chip
            isChosen={false}
            label="Cramps"
            onPress={() => pressed.push('Cramps')}
            testID="chip"
          />
          <SelectableTile
            icon="mood"
            isChosen={false}
            onPress={() => pressed.push('Mood')}
            testID="tile"
            title="Mood"
          />
        </View>,
      );

      await act(async () => {
        fireEvent.press(screen.getByTestId('chip'));
        fireEvent.press(screen.getByTestId('tile'));
      });

      expect(pressed).toEqual(['Cramps', 'Mood']);
    });
  });

  describe('every one of the five, measured against contract SEE-3', () => {
    it('is at least forty four points on both axes', async () => {
      await render(
        <View>
          <SingleChoiceRow isChosen label="Regular" onPress={nothing} testID="one" />
          <MultiChoiceRow isChosen={false} label="Symptoms" onPress={nothing} testID="any" />
          <Chip isChosen={false} label="Low" onPress={nothing} testID="chip" />
          <SelectableTile
            icon="mood"
            isChosen={false}
            onPress={nothing}
            testID="tile"
            title="Mood"
          />
          <TextField label="Your name" onChange={nothing} testID="field" value="Maria" />
          <Stepper
            canGoDown
            canGoUp
            downLabel="Shorter"
            onDown={nothing}
            onUp={nothing}
            reading="28 days"
            testID="days"
            upLabel="Longer"
          />
        </View>,
      );

      const pressable = everythingPressable();

      expect(pressable).toHaveLength(6);
      expect(controlsTooSmallToPress(pressable)).toEqual([]);
      expect(Number(theStyleOf('field')['minHeight'])).toBeGreaterThanOrEqual(MINIMUM_TAP_TARGET);
    });
  });

  describe('the two label sizes, read off the approved prototype', () => {
    it('sets the label of a row at the size and the weight the prototype paints it', () => {
      const { size, weight } = painted('regularity.dc.html', [
        `background: ${colour.field}`,
        'border-radius: 14px',
        'min-height: 54px',
      ]);

      expect(typeScale['choice-lg'].size).toBe(size);
      expect(typeScale['choice-lg'].weight).toBe(weight);
    });

    it('sets the label of a chip at the same size and weight, which the prototype paints too', () => {
      const { size, weight } = painted('logSymptoms.dc.html', [
        'border-radius: 999px',
        `background: ${colour.card}`,
        'min-height: 44px',
      ]);

      expect(typeScale['choice-lg'].size).toBe(size);
      expect(typeScale['choice-lg'].weight).toBe(weight);
    });

    it('sets the title of a tile at the size and the weight the prototype paints it', () => {
      const { size, weight } = painted('focus.dc.html', [
        'border-radius: 18px',
        'min-height: 92px',
      ]);

      expect(typeScale['choice-sm'].size).toBe(size);
      expect(typeScale['choice-sm'].weight).toBe(weight);
    });
  });
});
