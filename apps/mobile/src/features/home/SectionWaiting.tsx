import { colour, radius, space, textStyle } from '@emi/tokens';
import { Icon } from '@emi/ui';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

/**
 * A section of the screen she opens that her own days cannot fill yet.
 *
 * Emi holds no sample data, so the section says what it needs and how far off she is instead of
 * drawing somebody else's numbers under a label in small type. The count it names is a count Emi
 * read out of her phone, never a count Emi chose, because a number she cannot check is a number she
 * has to take on trust.
 *
 * Nothing here draws a chart, a strip, a row or a card. A shape with no days behind it is the thing
 * this section exists instead of.
 */

/** The three sections of the screen she opens that her days fill, each named by what it draws. */
export type WaitingSection = 'cycles' | 'trend' | 'patterns';

/** The order the drawing places them in, which is the order the screen draws them. */
export const waitingSections: readonly WaitingSection[] = ['cycles', 'trend', 'patterns'];

export function sectionWaitingTestID(section: WaitingSection): string {
  return `home-waiting-${section}`;
}

export function sectionWaitingHeadingTestID(section: WaitingSection): string {
  return `${sectionWaitingTestID(section)}-heading`;
}

/** The line that says what the section needs before it can be drawn. */
export function sectionWaitingNeedsTestID(section: WaitingSection): string {
  return `${sectionWaitingTestID(section)}-needs`;
}

/** The line that names the count Emi read, where the sentence above it does not carry one. */
export function sectionWaitingReadTestID(section: WaitingSection): string {
  return `${sectionWaitingTestID(section)}-read`;
}

/** The tile at the head of the card, which carries the mark that says the section is not open yet. */
export function sectionWaitingTileTestID(section: WaitingSection): string {
  return `${sectionWaitingTestID(section)}-tile`;
}

interface Props {
  readonly section: WaitingSection;
  /** The heading over it, which is the heading the filled section would have carried. */
  readonly heading: string;
  /** What the section needs before Emi can draw it. */
  readonly needs: string;
  /**
   * How far off she is, and nothing at all where the sentence above carries the count inside it.
   * Then one line is drawn rather than an empty second one.
   */
  readonly read?: string;
}

export function SectionWaiting({ section, heading, needs, read }: Props): ReactNode {
  return (
    <View style={styles.section}>
      <View style={styles.tile} testID={sectionWaitingTileTestID(section)}>
        <Icon colour={colour.secondaryText} name="lock" size={theMarkInTheTile} />
      </View>

      <View style={styles.what}>
        <Text
          accessibilityRole="header"
          style={styles.heading}
          testID={sectionWaitingHeadingTestID(section)}
        >
          {heading}
        </Text>

        <View style={styles.said} testID={sectionWaitingTestID(section)}>
          <Text style={styles.needs} testID={sectionWaitingNeedsTestID(section)}>
            {needs}
          </Text>
          {read === undefined ? null : (
            <Text style={styles.read} testID={sectionWaitingReadTestID(section)}>
              {read}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

/** Points. The lock inside the tile, drawn under the width of the tile that carries it. */
const theMarkInTheTile = 20;

/** Points. The tile, which is narrower than a tap target because nothing in it is pressed. */
const theTileIsThisWide = 40;

const styles = StyleSheet.create({
  // The heading sits over the two lines, where the drawing puts it, so the section she cannot read
  // yet is named the same way the filled one will be.
  heading: {
    color: colour.text,
    ...textStyle('label-md'),
    marginBottom: space.spaceXs,
  },
  // What it needs takes the ink of the surface, because that is the sentence she came away with.
  needs: {
    color: colour.text,
    ...textStyle('label-md'),
  },
  // How far off she is takes the quieter ink, so the two lines are read in the order they matter.
  read: {
    color: colour.secondaryText,
    ...textStyle('body-sm'),
  },
  said: { rowGap: space.spaceXs },
  // The whole section is one card, with the mark beside what it says rather than above it, which
  // is the shape every other card of the redesign is drawn in.
  section: {
    alignSelf: 'stretch',
    backgroundColor: colour.card,
    borderRadius: radius.xl,
    flexDirection: 'row',
    gap: space.spaceMd,
    marginTop: space.spaceLg,
    padding: space.spaceLg,
  },
  // The lock says the section is closed rather than empty, and it takes the recessed ground so it
  // reads as part of the card rather than as a second thing on it.
  tile: {
    alignItems: 'center',
    backgroundColor: colour.field,
    borderRadius: radius.DEFAULT,
    height: theTileIsThisWide,
    justifyContent: 'center',
    width: theTileIsThisWide,
  },
  // The words take the room the tile leaves, so a long sentence wraps inside the card.
  what: { flexShrink: 1 },
});
