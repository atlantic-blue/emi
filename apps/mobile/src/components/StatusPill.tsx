import { type ColourName, colour, radius, space, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

/**
 * Two words that say the state of a figure: what Emi knows about it, or how wide it is.
 *
 * A pill takes no press and says nothing a screen reader has to be told twice, so it is read as
 * part of the words around it rather than as a control, and the tap floor of contract SEE-3 does
 * not apply to it.
 *
 * Its tone is one of a closed set, and each tone is a ground with the one ink the palette measured
 * on that ground. A screen names a tone and never a colour, so a pill cannot be painted in a pair
 * nobody measured.
 */

/** The three tones the prototype paints: what acts, what is warm, and what is quiet. */
export type PillTone = 'accent' | 'apricot' | 'quiet';

/** The tones as data, so a test can walk every one of them. */
export const pillTones: readonly PillTone[] = ['accent', 'apricot', 'quiet'];

interface PillPair {
  readonly ground: ColourName;
  readonly ink: ColourName;
}

/**
 * The pair each tone draws from, by name and never by value. Every pair here is in the palette's
 * own `textOn` list, so `packages/tokens/tests/contrast.test.ts` measures it with the rest.
 *
 * The apricot pair is the warm stop of the wash, painted flat. A gradient has no one ratio, which
 * is why a wash is never a ground for text; a flat surface has one value and one ratio, and that
 * is the surface a pill draws.
 */
export const pillPalette: Readonly<Record<PillTone, PillPair>> = {
  accent: { ground: 'accentSoft', ink: 'accentSoftInk' },
  apricot: { ground: 'washWarm', ink: 'ovulationInk' },
  quiet: { ground: 'field', ink: 'secondaryText' },
};

interface Props {
  readonly label: string;
  readonly tone: PillTone;
  readonly testID?: string;
}

export function StatusPill({ label, tone, testID }: Props): ReactNode {
  return (
    <View style={[styles.pill, grounds[tone]]} testID={testID}>
      <Text style={[styles.words, inks[tone]]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // The pill is as wide as its words and no wider, so a row of them reads as words and not as
  // buttons.
  pill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    justifyContent: 'center',
    paddingHorizontal: space.spaceMd,
    paddingVertical: space.spaceXs,
  },
  words: textStyle('label-sm'),
});

/** One entry per tone, each read out of the pair above, so a value is never written twice. */
const grounds = StyleSheet.create({
  accent: { backgroundColor: colour[pillPalette.accent.ground] },
  apricot: { backgroundColor: colour[pillPalette.apricot.ground] },
  quiet: { backgroundColor: colour[pillPalette.quiet.ground] },
});

const inks = StyleSheet.create({
  accent: { color: colour[pillPalette.accent.ink] },
  apricot: { color: colour[pillPalette.apricot.ink] },
  quiet: { color: colour[pillPalette.quiet.ink] },
});
