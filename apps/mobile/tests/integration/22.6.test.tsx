import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import {
  CONTRAST_FLOOR,
  MINIMUM_TAP_TARGET,
  colour,
  colours,
  contrastRatio,
  radius,
  space,
  textStyle,
} from '@emi/tokens';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card } from '../../src/components/Card';
import { LockLine, lockLineIconTestID } from '../../src/components/LockLine';
import {
  SettingsRow,
  rowChevronTestID,
  rowDrawingTestID,
  rowTileTestID,
} from '../../src/components/SettingsRow';
import { StatusPill, pillPalette, pillTones } from '../../src/components/StatusPill';
import { controlsTooSmallToPress } from '../fixtures/tapTargets';

/**
 * The surfaces a section of a screen is raised onto, and the three small parts that sit on them.
 *
 * A card is plain white paper with no line around it, so a screen reads as a journal rather than
 * as a form. One surface reverses, and it is where Emi says who can read her days. A row says it
 * opens something: a drawing at one end, words, and a mark pointing the way on. A pill says the
 * state of a figure in two words, in a pair of colours somebody measured. The lock line puts a
 * lock beside the sentence about her privacy.
 *
 * Nothing here types a measurement. Each case reads the token the part should have drawn from and
 * holds the rendered style against it, so a part that drifts from the design system fails.
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

function theStyleOfTheWords(words: string): Record<string, unknown> {
  return (StyleSheet.flatten(screen.getByText(words).props.style) ?? {}) as Record<string, unknown>;
}

function theDrawingIn(testID: string): string {
  return String(screen.getByTestId(testID).props['xml']);
}

function everythingPressable(): { props: Record<string, unknown> }[] {
  return [...screen.queryAllByRole('button')] as unknown as { props: Record<string, unknown> }[];
}

/**
 * Every inline style the prototype paints a pill with, on the screen named. The prototype writes
 * its styles into the markup, so a pill is found by the marks that make one: the full corner and a
 * size of its own. A screen that stops painting a pill returns nothing and the case fails, rather
 * than quietly measuring nothing.
 */
function thePillsPaintedOn(screenFile: string): string[] {
  const markup = readFileSync(join(repositoryRoot, prototype, screenFile), 'utf8');
  const found = (markup.match(/style="[^"]*"/g) ?? []).filter(
    (style) => style.includes('border-radius: 999px') && style.includes('font-size'),
  );

  if (found.length === 0) {
    throw new Error(`${screenFile} paints no pill, so nothing was read from it`);
  }

  return found;
}

/** The lock row of Privacy, which she presses to turn the lock on and reads the answer from. */
function TheLockRow(): React.ReactNode {
  const [isOn, setIsOn] = useState(false);

  return (
    <View>
      <SettingsRow
        icon="lock"
        label="Lock"
        line="With your face or your passcode"
        onPress={() => {
          setIsOn(true);
        }}
        testID="lock-row"
        value={isOn ? 'On' : 'Off'}
      />
    </View>
  );
}

describe('the cards and rows take the redesign look', () => {
  describe('the plain surface a section is raised onto', () => {
    it('is white paper at the one corner a card takes, with no line around it', async () => {
      await render(<Card testID="card">{null}</Card>);

      expect(theStyleOf('card')).toMatchObject({
        backgroundColor: colour.card,
        borderRadius: radius.xl,
        padding: space.spaceLg,
      });
      expect(theStyleOf('card')['borderWidth']).toBeUndefined();
      expect(theStyleOf('card')['borderColor']).toBeUndefined();
    });

    it('draws no shadow, because only a floating sheet is allowed one', async () => {
      await render(<Card testID="card">{null}</Card>);

      expect(theStyleOf('card')['boxShadow']).toBeUndefined();
    });

    it('recesses a supplementary panel by a tonal step, and still draws no line', async () => {
      await render(
        <Card layer="recessed" testID="card">
          {null}
        </Card>,
      );

      expect(theStyleOf('card')).toMatchObject({ backgroundColor: colour.field });
      expect(theStyleOf('card')['borderWidth']).toBeUndefined();
    });
  });

  describe('the one surface that reverses', () => {
    it('paints the dark card colour, at the corner every card takes', async () => {
      await render(
        <Card layer="dark" testID="card">
          {null}
        </Card>,
      );

      expect(theStyleOf('card')).toMatchObject({
        backgroundColor: colour.darkCard,
        borderRadius: radius.xl,
      });
      expect(theStyleOf('card')['borderWidth']).toBeUndefined();
    });

    it('carries the white the palette measured on it, and nothing nobody measured', () => {
      expect(colours.onAccent.textOn).toContain('darkCard');
      expect(contrastRatio(colour.onAccent, colour.darkCard)).toBeGreaterThanOrEqual(
        CONTRAST_FLOOR,
      );
      expect(colours.text.textOn).not.toContain('darkCard');
    });
  });

  describe('a row that opens what she already told Emi', () => {
    it('carries a drawing in a tile, its words, and the mark that points the way on', async () => {
      await render(<SettingsRow icon="lock" label="Lock" onPress={nothing} testID="row" />);

      expect(theStyleOf(rowTileTestID('row'))).toMatchObject({
        backgroundColor: colour.field,
        borderRadius: radius.DEFAULT,
      });
      expect(theDrawingIn(rowDrawingTestID('row'))).toContain(colour.text);
      expect(theStyleOfTheWords('Lock')).toMatchObject({
        color: colour.text,
        ...textStyle('choice-lg'),
      });
      expect(theDrawingIn(rowChevronTestID('row'))).toContain(colour.quietIcon);
    });

    it('writes the quiet line and the reading at its end in the quieter ink', async () => {
      await render(
        <SettingsRow
          icon="lock"
          label="Lock"
          line="With your face or your passcode"
          onPress={nothing}
          testID="row"
          value="On"
        />,
      );

      expect(theStyleOfTheWords('With your face or your passcode')).toMatchObject({
        color: colour.secondaryText,
        ...textStyle('body-sm'),
      });
      expect(theStyleOfTheWords('On')).toMatchObject({
        color: colour.secondaryText,
        ...textStyle('body-sm'),
      });
    });

    it('draws no mark pointing on where the row opens nothing', async () => {
      await render(<SettingsRow icon="lock" label="Lock" testID="row" />);

      expect(screen.queryByTestId(rowChevronTestID('row'))).toBeNull();
      expect(screen.queryAllByRole('button')).toEqual([]);
      expect(screen.getByTestId(rowTileTestID('row'))).toBeTruthy();
    });

    it('reaches her thumb, because no row is under the tap floor', async () => {
      await render(<TheLockRow />);

      expect(everythingPressable()).toHaveLength(1);
      expect(controlsTooSmallToPress(everythingPressable())).toEqual([]);
      expect(Number(theStyleOf('lock-row')['minHeight'])).toBeGreaterThanOrEqual(
        MINIMUM_TAP_TARGET,
      );
    });

    it('answers her press, and still says out loud what it opens', async () => {
      await render(<TheLockRow />);

      expect(screen.getByText('Off')).toBeTruthy();

      await act(async () => {
        fireEvent.press(screen.getByTestId('lock-row'));
      });

      expect(screen.getByText('On')).toBeTruthy();
      expect(screen.queryByText('Off')).toBeNull();
      expect(screen.getByLabelText('Lock')).toBeTruthy();
      expect(theDrawingIn(rowChevronTestID('lock-row'))).toContain(colour.quietIcon);
    });
  });

  describe('a pill that says the state of a figure', () => {
    it('is small, round at both ends, and written in the one small label role', async () => {
      await render(<StatusPill label="Still learning" testID="pill" tone="accent" />);

      expect(theStyleOf('pill')).toMatchObject({
        borderRadius: radius.full,
        paddingHorizontal: space.spaceMd,
        paddingVertical: space.spaceXs,
      });
      expect(theStyleOfTheWords('Still learning')).toMatchObject(textStyle('label-sm'));
      expect(theStyleOf('pill')['minHeight']).toBeUndefined();
    });

    it('draws each of its three tones in the pair of colours that tone names', async () => {
      await render(
        <View>
          {pillTones.map((tone) => (
            <StatusPill key={tone} label={tone} testID={tone} tone={tone} />
          ))}
        </View>,
      );

      for (const tone of pillTones) {
        const pair = pillPalette[tone];

        expect(theStyleOf(tone)).toMatchObject({ backgroundColor: colour[pair.ground] });
        expect(theStyleOfTheWords(tone)).toMatchObject({ color: colour[pair.ink] });
      }
    });

    it('takes every tone from a pair the palette approves, over the contrast floor', () => {
      expect(pillTones).toHaveLength(3);

      const unmeasured = pillTones.filter(
        (tone) => !colours[pillPalette[tone].ink].textOn.includes(pillPalette[tone].ground),
      );

      expect(unmeasured).toEqual([]);

      const under = pillTones.filter(
        (tone) =>
          contrastRatio(colour[pillPalette[tone].ink], colour[pillPalette[tone].ground]) <
          CONTRAST_FLOOR,
      );

      expect(under).toEqual([]);
    });

    it('takes the apricot tone the approved prototype paints, and not one of its own', () => {
      expect(pillPalette.apricot).toEqual({ ground: 'washWarm', ink: 'ovulationInk' });

      const painted = thePillsPaintedOn('today.dc.html').filter(
        (style) =>
          style.toLowerCase().includes(colour.washWarm.toLowerCase()) &&
          style.toLowerCase().includes(colour.ovulationInk.toLowerCase()),
      );

      expect(painted).not.toEqual([]);
    });
  });

  describe('the line about her privacy', () => {
    it('puts the drawing of a lock beside its words, both in the quieter ink', async () => {
      await render(<LockLine testID="promise" words="Only you can read this." />);

      expect(theDrawingIn(lockLineIconTestID('promise'))).toContain(colour.secondaryText);
      expect(theStyleOfTheWords('Only you can read this.')).toMatchObject({
        color: colour.secondaryText,
        ...textStyle('body-sm'),
      });
      expect(theStyleOf('promise')).toMatchObject({
        alignItems: 'center',
        flexDirection: 'row',
        gap: space.spaceSm,
      });
    });
  });
});
