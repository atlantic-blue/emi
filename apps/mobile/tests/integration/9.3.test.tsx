import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

import { MINIMUM_TAP_TARGET, colour, radius, space, stroke, textStyle } from '@emi/tokens';
import { dockPanelTestID, floatingShadow } from '@emi/ui';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, View } from 'react-native';

import { PrimaryButton, SecondaryButton, TextLink } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import {
  MultiChoiceRow,
  SingleChoiceRow,
  checkboxMarkTestID,
} from '../../src/components/ChoiceRow';
import { Chip } from '../../src/components/Chip';
import { ProgressBar, progressFillTestID } from '../../src/components/ProgressBar';
import { SelectableTile, tileBeadTestID } from '../../src/components/SelectableTile';
import {
  Stepper,
  stepperDownTestID,
  stepperReadingTestID,
  stepperUpTestID,
} from '../../src/components/Stepper';
import { TextField } from '../../src/components/TextField';
import { controlsTooSmallToPress } from '../fixtures/tapTargets';

/**
 * The shared components, held to the design system one token at a time, and the lint rule that
 * keeps a colour out of every one of them.
 *
 * Nothing here types a measurement. Each case reads the token the component should have drawn from
 * and holds the rendered style against it, so a component that drifts from the design system fails
 * and a design system that moves carries the components with it.
 */

const repositoryRoot = resolve(__dirname, '..', '..', '..', '..');
const componentsDirectory = join('apps', 'mobile', 'src', 'components');
const eslintCommandLine = join(repositoryRoot, 'node_modules', 'eslint', 'bin', 'eslint.js');

/** The message the rule of contract TOKEN-1 gives, which names where a colour belongs. */
const theColourRule =
  'A colour belongs in packages/tokens. Import it from @emi/tokens instead of writing a hex value here.';

/**
 * The source is fed through standard input under a made up path, so the repository's real
 * configuration decides the answer and no probe file is ever left in the tree.
 */
function lintMessagesFor(file: string, code: string): string[] {
  const run = spawnSync(
    process.execPath,
    [
      eslintCommandLine,
      '--stdin',
      '--stdin-filename',
      file,
      '--format',
      'json',
      '--no-warn-ignored',
    ],
    { cwd: repositoryRoot, encoding: 'utf8', input: code },
  );

  if (run.stdout.trim().length === 0) {
    throw new Error(`eslint said nothing about ${file}: ${run.stderr}`);
  }

  const results = JSON.parse(run.stdout) as { messages: { message: string }[] }[];

  return results.flatMap((result) => result.messages).map((message) => message.message);
}

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
  return [
    ...screen.queryAllByRole('button'),
    ...screen.queryAllByRole('radio'),
    ...screen.queryAllByRole('checkbox'),
    ...screen.queryAllByRole('link'),
  ] as unknown as { props: Record<string, unknown> }[];
}

const nothing = (): void => undefined;

describe('a component that writes a colour of its own fails the lint', () => {
  describe('the lint rule of contract TOKEN-1, over a component of this set', () => {
    it('refuses a chip that writes its own ground instead of asking the tokens for one', () => {
      // The probe is built from a real token, so this file holds no hex of its own and the sweep
      // below can cover it along with everything else.
      const written = [
        "import { StyleSheet } from 'react-native';",
        '',
        'export const styles = StyleSheet.create({',
        `  chip: { backgroundColor: '${colour.surfaceContainer}' },`,
        '});',
        '',
      ].join('\n');

      expect(lintMessagesFor(join(componentsDirectory, 'Probe.tsx'), written)).toEqual([
        theColourRule,
      ]);
    });

    it('accepts the same chip once it draws that ground from the token package', () => {
      const asked = [
        "import { colour } from '@emi/tokens';",
        "import { StyleSheet } from 'react-native';",
        '',
        'export const styles = StyleSheet.create({',
        '  chip: { backgroundColor: colour.surfaceContainer },',
        '});',
        '',
      ].join('\n');

      expect(lintMessagesFor(join(componentsDirectory, 'Probe.tsx'), asked)).toEqual([]);
    });

    it('passes over every component in the set, with no exception added for any of them', () => {
      const files = readdirSync(join(repositoryRoot, componentsDirectory)).filter((name) =>
        ['.ts', '.tsx'].includes(extname(name)),
      );

      expect(files.length).toBeGreaterThan(8);

      const written = files.filter((name) =>
        /#[0-9a-fA-F]{3,8}\b/.test(
          readFileSync(join(repositoryRoot, componentsDirectory, name), 'utf8'),
        ),
      );

      expect(written).toEqual([]);
    });
  });

  describe('the three ways Emi asks her to do something', () => {
    const label = 'Save';

    it('draws the affirmative action on the accent, in the words measured against it', async () => {
      await render(<PrimaryButton label={label} onPress={nothing} testID="action" />);

      expect(theStyleOf('action')).toMatchObject({
        backgroundColor: colour.primaryContainer,
        borderRadius: radius.lg,
      });
      expect(theStyleOfTheWordsIn('action')).toMatchObject({
        color: colour.onPrimary,
        ...textStyle('label-md'),
      });
    });

    it('steps the affirmative action to the darker primary while her thumb is down', async () => {
      await render(<PrimaryButton label={label} onPress={nothing} testID="action" />);

      await act(async () => {
        fireEvent(screen.getByTestId('action'), 'pressIn');
      });

      expect(theStyleOf('action')).toMatchObject({ backgroundColor: colour.primary });

      await act(async () => {
        fireEvent(screen.getByTestId('action'), 'pressOut');
      });

      expect(theStyleOf('action')).toMatchObject({ backgroundColor: colour.primaryContainer });
    });

    it('draws a spent action as a measured pair rather than fading it', async () => {
      const pressed: string[] = [];

      await render(
        <PrimaryButton
          isReady={false}
          label={label}
          onPress={() => pressed.push(label)}
          testID="action"
        />,
      );

      // An opacity nobody measured is a contrast ratio nobody knows, which is what TOKEN-2 stops.
      expect(theStyleOf('action')['opacity']).toBeUndefined();
      expect(theStyleOf('action')).toMatchObject({ backgroundColor: colour.surfaceContainer });
      expect(theStyleOfTheWordsIn('action')).toMatchObject({ color: colour.onSurfaceVariant });

      fireEvent.press(screen.getByTestId('action'));
      expect(pressed).toEqual([]);
    });

    it('holds the action beside it in a hairline, because it carries no fill of its own', async () => {
      await render(<SecondaryButton label={label} onPress={nothing} testID="beside" />);

      expect(theStyleOf('beside')).toMatchObject({
        backgroundColor: colour.surfaceContainerLowest,
        borderColor: colour.outlineVariant,
        borderRadius: radius.lg,
        borderWidth: stroke.hairline,
      });
      expect(theStyleOfTheWordsIn('beside')).toMatchObject({ color: colour.onSurface });
    });

    it('steps the action beside it to the recessed ground while her thumb is down', async () => {
      await render(<SecondaryButton label={label} onPress={nothing} testID="beside" />);

      await act(async () => {
        fireEvent(screen.getByTestId('beside'), 'pressIn');
      });

      expect(theStyleOf('beside')).toMatchObject({ backgroundColor: colour.surfaceContainer });
    });

    it('draws the quiet action as words with a rule under them, and no ground at all', async () => {
      await render(<TextLink label={label} onPress={nothing} testID="quiet" />);

      const [, rule] = screen.getByTestId('quiet').children;

      expect(theStyleOf('quiet')['backgroundColor']).toBeUndefined();
      expect(theStyleOf('quiet')['borderWidth']).toBeUndefined();
      expect(theStyleOfTheWordsIn('quiet')).toMatchObject({ color: colour.onSurface });
      expect(
        StyleSheet.flatten((rule as unknown as { props: { style?: unknown } }).props.style),
      ).toMatchObject({
        backgroundColor: colour.onSurface,
        height: stroke.hairline,
        marginTop: 4,
      });
    });
  });

  describe('the line she types into', () => {
    it('draws the box on the card ground, at the control corner, inside a hairline', async () => {
      await render(<TextField label="Name" onChange={nothing} testID="field" value="" />);

      expect(theStyleOf('field')).toMatchObject({
        backgroundColor: colour.surfaceContainerLowest,
        borderColor: colour.outlineVariant,
        borderRadius: radius.lg,
        borderWidth: stroke.hairline,
        color: colour.onSurface,
        padding: space.spaceMd,
        ...textStyle('body-md'),
      });
    });

    it('takes the accent as its border while she is in it, and never a glow', async () => {
      await render(<TextField label="Name" onChange={nothing} testID="field" value="" />);

      await act(async () => {
        fireEvent(screen.getByTestId('field'), 'focus');
      });

      expect(theStyleOf('field')).toMatchObject({ borderColor: colour.primaryContainer });
      expect(theStyleOf('field')['boxShadow']).toBeUndefined();
    });

    it('sets the question above the box in the display face, as a prompt and not a form label', async () => {
      await render(<TextField label="Name" onChange={nothing} testID="field" value="" />);

      expect(StyleSheet.flatten(screen.getByText('Name').props.style)).toMatchObject({
        color: colour.onSurface,
        ...textStyle('headline-sm'),
      });
    });
  });

  describe('the number she moves one step at a time', () => {
    const stepper = 'days';

    async function theStepper(canGoDown = true, canGoUp = true): Promise<void> {
      await render(
        <Stepper
          canGoDown={canGoDown}
          canGoUp={canGoUp}
          downLabel="Shorter"
          onDown={nothing}
          onUp={nothing}
          reading="28 days"
          testID={stepper}
          upLabel="Longer"
        />,
      );
    }

    it('stands the two circles on the card ground, inside a recessed well', async () => {
      await theStepper();

      expect(theStyleOf(stepper)).toMatchObject({
        backgroundColor: colour.surfaceContainer,
        borderRadius: radius.xl,
        padding: space.spaceMd,
      });
      expect(theStyleOf(stepperDownTestID(stepper))).toMatchObject({
        backgroundColor: colour.surfaceContainerLowest,
        borderRadius: radius.full,
        height: MINIMUM_TAP_TARGET,
        width: MINIMUM_TAP_TARGET,
      });
    });

    it('sets the number in the monospaced face, so a digit holds its place as she presses', async () => {
      await theStepper();

      expect(
        StyleSheet.flatten(screen.getByTestId(stepperReadingTestID(stepper)).props.style),
      ).toMatchObject({ color: colour.onSurface, ...textStyle('data-lg') });
    });

    it('keeps a button at its boundary in place, spent rather than gone', async () => {
      await theStepper(true, false);

      expect(screen.getByTestId(stepperUpTestID(stepper))).toBeTruthy();
      expect(theStyleOf(stepperUpTestID(stepper))).toMatchObject({
        backgroundColor: colour.surfaceContainerHigh,
      });
      expect(theStyleOfTheWordsIn(stepperUpTestID(stepper))).toMatchObject({
        color: colour.onSurfaceVariant,
      });
    });
  });

  describe('the rows she picks from', () => {
    it('steps the ground up and the words on, so a chosen row is never colour alone', async () => {
      await render(
        <View>
          <SingleChoiceRow isChosen label="Regular" onPress={nothing} testID="chosen" />
          <SingleChoiceRow isChosen={false} label="Varied" onPress={nothing} testID="resting" />
        </View>,
      );

      expect(theStyleOf('chosen')).toMatchObject({
        backgroundColor: colour.surfaceContainerHigh,
        borderRadius: radius.lg,
      });
      expect(theStyleOf('resting')).toMatchObject({
        backgroundColor: colour.surfaceContainerLow,
      });
      expect(theStyleOfTheWordsIn('chosen')).toMatchObject({ color: colour.onSurface });
      expect(theStyleOfTheWordsIn('resting')).toMatchObject({ color: colour.onSurfaceVariant });
    });

    it('says which control it is, so a screen reader hears one of a set or any of a set', async () => {
      await render(
        <View>
          <SingleChoiceRow isChosen label="Regular" onPress={nothing} testID="one" />
          <MultiChoiceRow isChosen={false} label="Symptoms" onPress={nothing} testID="any" />
        </View>,
      );

      expect(screen.getByTestId('one').props['accessibilityState']).toMatchObject({
        checked: true,
      });
      expect(screen.getByTestId('any').props['accessibilityState']).toMatchObject({
        checked: false,
      });
      expect(screen.getByRole('radio')).toBeTruthy();
      expect(screen.getByRole('checkbox')).toBeTruthy();
    });

    it('draws a ticked box at the tightest corner, with its mark in the accent', async () => {
      await render(<MultiChoiceRow isChosen label="Symptoms" onPress={nothing} testID="any" />);

      // The mark is a drawing from the icon set rather than a written character, so the colour it
      // is stroked in is read off the drawing itself.
      expect(theStyleOf('any')).toBeTruthy();
      expect(String(screen.getByTestId(checkboxMarkTestID('any')).props['xml'])).toContain(
        colour.primaryContainer,
      );
    });
  });

  describe('the word she turns on and off', () => {
    it('rests on the recessed ground and takes the accent as its border when she picks it', async () => {
      await render(
        <View>
          <Chip isChosen={false} label="Today" onPress={nothing} testID="resting" />
          <Chip isChosen label="Yesterday" onPress={nothing} testID="chosen" />
        </View>,
      );

      expect(theStyleOf('resting')).toMatchObject({
        backgroundColor: colour.surfaceContainer,
        borderColor: colour.outlineVariant,
        borderRadius: radius.lg,
        borderWidth: stroke.hairline,
      });
      expect(theStyleOf('chosen')).toMatchObject({
        backgroundColor: colour.surfaceContainerHigh,
        borderColor: colour.primaryContainer,
      });
      expect(theStyleOfTheWordsIn('resting')).toMatchObject({ color: colour.onSurface });
    });
  });

  describe('the category she logs a day from', () => {
    it('carries a bead as well as a ground, because the grid is read at a glance', async () => {
      await render(
        <View>
          <SelectableTile
            icon="sleep"
            isChosen
            note="8 hours"
            onPress={nothing}
            testID="chosen"
            title="Rest"
          />
          <SelectableTile
            icon="mood"
            isChosen={false}
            note="Nothing recorded"
            onPress={nothing}
            testID="resting"
            title="Mood"
          />
        </View>,
      );

      expect(theStyleOf('chosen')).toMatchObject({
        backgroundColor: colour.surfaceContainerHigh,
        borderRadius: radius.xl,
      });
      expect(theStyleOf('resting')).toMatchObject({
        backgroundColor: colour.surfaceContainerLow,
      });
      expect(theStyleOf(tileBeadTestID('chosen'))).toMatchObject({
        backgroundColor: colour.primaryContainer,
      });
      expect(screen.queryByTestId(tileBeadTestID('resting'))).toBeNull();
    });
  });

  describe('the three layers', () => {
    it('draws a card at the container corner, inside a hairline, on the card ground', async () => {
      await render(<Card testID="card">{null}</Card>);

      expect(theStyleOf('card')).toMatchObject({
        backgroundColor: colour.surfaceContainerLowest,
        borderColor: colour.outlineVariant,
        borderRadius: radius.xl,
        borderWidth: stroke.hairline,
        padding: space.spaceLg,
      });
    });

    it('recesses a supplementary panel by a tonal step and nothing else', async () => {
      await render(
        <Card layer="recessed" testID="card">
          {null}
        </Card>,
      );

      expect(theStyleOf('card')).toMatchObject({ backgroundColor: colour.surfaceContainer });
      expect(theStyleOf('card')['boxShadow']).toBeUndefined();
    });

    it('casts the one shadow this design system allows, and only on a floating sheet', async () => {
      await render(
        <Card layer="floating" testID="card">
          {null}
        </Card>,
      );

      expect(theStyleOf('card')['boxShadow']).toBe(floatingShadow);
    });
  });

  describe('how far along she is', () => {
    it('fills the track from the accent, and says the whole of it out loud', async () => {
      await render(<ProgressBar label="Step 2 of 3" step={2} testID="bar" total={3} />);

      expect(theStyleOf('bar')).toMatchObject({
        backgroundColor: colour.surfaceContainer,
        borderRadius: radius.full,
      });
      expect(theStyleOf(progressFillTestID('bar'))).toMatchObject({
        backgroundColor: colour.primaryContainer,
        width: `${(2 / 3) * 100}%`,
      });
      expect(screen.getByTestId('bar').props['accessibilityValue']).toEqual({
        max: 3,
        min: 0,
        now: 2,
      });
    });

    it('draws nothing at the start and the whole track at the end', async () => {
      const drawn = await render(
        <ProgressBar label="Step 0 of 3" step={0} testID="bar" total={3} />,
      );

      expect(theStyleOf(progressFillTestID('bar'))['width']).toBe('0%');

      await drawn.rerender(<ProgressBar label="Step 3 of 3" step={3} testID="bar" total={3} />);

      expect(theStyleOf(progressFillTestID('bar'))['width']).toBe('100%');
    });
  });

  describe('the bottom tab bar', () => {
    it('is layer 2 and carries the hairline with it, which the dock test measures', () => {
      // The dock is drawn under the navigator, so the whole of it is measured in
      // tests/integration/chrome.test.tsx. What belongs here is that it is named as a layer.
      expect(dockPanelTestID).toBe('bottom-navigation-panel');
      expect(floatingShadow).toContain(colour.onSurface);
    });
  });

  describe('every control in the set, measured against contract SEE-3', () => {
    it('is at least forty four points on both axes', async () => {
      await render(
        <View>
          <PrimaryButton label="Save" onPress={nothing} testID="primary" />
          <SecondaryButton label="Cancel" onPress={nothing} testID="secondary" />
          <TextLink label="Export" onPress={nothing} testID="link" />
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
          <SingleChoiceRow isChosen label="Regular" onPress={nothing} testID="one" />
          <MultiChoiceRow isChosen={false} label="Symptoms" onPress={nothing} testID="any" />
          <Chip isChosen={false} label="Today" onPress={nothing} testID="chip" />
          <SelectableTile
            icon="sleep"
            isChosen={false}
            note="8 hours"
            onPress={nothing}
            testID="tile"
            title="Rest"
          />
        </View>,
      );

      const pressable = everythingPressable();

      expect(pressable.length).toBe(9);
      expect(controlsTooSmallToPress(pressable)).toEqual([]);
    });
  });
});
