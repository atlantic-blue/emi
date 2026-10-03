import type { PhaseName } from '@emi/tokens';
import { MINIMUM_TAP_TARGET, colour, phasePalette, radius, space, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@emi/ui';

import type { ReadCycle } from '../cycle/cyclesRead';
import { cycleLengthSentence, cycleSentence } from '../history/copy';

/**
 * One cycle she had, drawn as a strip: the days it covers, how long it ran, and the four phase
 * fills sized by the days of each phase.
 *
 * The two lines come from the same sentences the Insights screen writes, so the same cycle reads
 * the same way wherever she meets it. Every word is drawn at the small size, because the second
 * line carries the word bleeding and contract SCREEN-2 keeps that word under a stranger's reading
 * on this screen.
 *
 * A fill carries no text at all, which is contract SEE-2: three of the four fail as a background
 * for words, so the shape of a cycle is colour and the words sit above it.
 */

/** Points. The mark that says a strip opens, read at the size every other row reads it at. */
const theMarkOnward = 18;

export const homeCyclesTestID = 'home-cycles';

export function cycleStripTestID(startedOn: string): string {
  return `home-cycle-${startedOn}`;
}

export function cycleStripLengthTestID(startedOn: string): string {
  return `home-cycle-length-${startedOn}`;
}

export function cycleStripBarTestID(startedOn: string): string {
  return `home-cycle-bar-${startedOn}`;
}

export function cycleStripFillTestID(startedOn: string, phase: PhaseName): string {
  return `home-cycle-fill-${startedOn}-${phase}`;
}

interface Props {
  readonly cycles: readonly ReadCycle[];
  /** The way to that cycle on the Insights screen, named by the day the cycle began. */
  readonly onOpenCycle: (startedOn: string) => void;
}

function PhaseFills({ cycle }: { readonly cycle: ReadCycle }): ReactNode {
  return (
    <View style={styles.bar} testID={cycleStripBarTestID(cycle.startedOn)}>
      {cycle.phases
        .filter((span) => span.days > 0)
        .map((span) => (
          <View
            key={span.phase}
            style={[
              styles.fill,
              { backgroundColor: colour[phasePalette[span.phase].fill], flexGrow: span.days },
            ]}
            testID={cycleStripFillTestID(cycle.startedOn, span.phase)}
          />
        ))}
    </View>
  );
}

function CycleStrip({
  cycle,
  onOpenCycle,
}: {
  readonly cycle: ReadCycle;
  readonly onOpenCycle: (startedOn: string) => void;
}): ReactNode {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onOpenCycle(cycle.startedOn)}
      style={styles.strip}
      testID={cycleStripTestID(cycle.startedOn)}
    >
      <View style={styles.said}>
        <Text style={styles.days}>{cycleSentence(cycle.startedOn, cycle.endedOn)}</Text>
        <Text style={styles.length} testID={cycleStripLengthTestID(cycle.startedOn)}>
          {cycleLengthSentence(cycle.lengthDays, cycle.periodLengthDays)}
        </Text>
        <PhaseFills cycle={cycle} />
      </View>
      <Icon colour={colour.quietIcon} name="chevron" size={theMarkOnward} />
    </Pressable>
  );
}

export function CycleStrips({ cycles, onOpenCycle }: Props): ReactNode {
  if (cycles.length === 0) {
    return null;
  }

  return (
    <View style={styles.strips} testID={homeCyclesTestID}>
      {cycles.map((cycle) => (
        <CycleStrip cycle={cycle} key={cycle.startedOn} onOpenCycle={onOpenCycle} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // The bar grows by the days of each phase, so a strip carries the shape of that cycle as well as
  // its colour, and the two lines above it carry every word.
  bar: {
    borderRadius: radius.sm,
    flexDirection: 'row',
    height: space.spaceSm,
    marginTop: space.spaceSm,
    overflow: 'hidden',
    width: '100%',
  },
  days: {
    color: colour.text,
    ...textStyle('body-sm'),
  },
  fill: { flexBasis: 0, height: '100%' },
  length: {
    color: colour.secondaryText,
    ...textStyle('body-sm'),
  },
  // Plain paper with no line drawn around it, which is the card of the redesign: a column of
  // strips reads as a journal rather than as a column of boxes.
  strip: {
    alignItems: 'center',
    backgroundColor: colour.card,
    borderRadius: radius.xl,
    columnGap: space.spaceSm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    padding: space.spaceMd,
  },
  // The words and the bar take whatever width the chevron leaves, so a long date wraps inside the
  // strip rather than pushing the mark off the card.
  said: { flexShrink: 1, flexGrow: 1 },
  strips: { alignSelf: 'stretch', gap: space.spaceSm },
});
