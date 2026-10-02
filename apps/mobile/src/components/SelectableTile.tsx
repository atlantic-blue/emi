import { MINIMUM_TAP_TARGET, type IconName, colour, radius, space, textStyle } from '@emi/tokens';
import { Icon } from '@emi/ui';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

/**
 * One category in the grid she logs a day from. A drawing, what it is, and what is recorded there
 * today, in a box the whole of which takes the press.
 *
 * The drawing sits in a round well of its own, so the grid reads as a row of symbols before it
 * reads as a row of words. A chosen tile is marked twice over: the box takes the soft tint, and a
 * check sits in its corner, because the grid is read at a glance and a tint alone at that size is a
 * colour difference and nothing more.
 */

interface Props {
  readonly icon: IconName;
  readonly title: string;
  /**
   * What is recorded here today, in the monospaced face, because most of them are measurements.
   * Left out where the tile records nothing, and then no second line is drawn at all.
   */
  readonly note?: string;
  readonly isChosen: boolean;
  readonly onPress: () => void;
  readonly testID?: string;
}

/** Points. The height the document draws the tile at, which holds a well and two lines. */
const TILE_HEIGHT = 92;

/** Points. The round well the drawing sits in. */
const WELL_SIZE = 40;

/** Points. The drawing inside that well. */
const TILE_ICON = 22;

/** Points. The bead that says a tile is chosen, which holds the check. */
const BEAD_SIZE = 20;

/** Points. The check inside that bead, on the twenty four point grid of the icon set. */
const CHECK_SIZE = 12;

/**
 * Points. The outline of the box. The document draws it between the hairline of a rule and the
 * stroke of a drawing, so it is neither token and it is named here.
 */
const TILE_BORDER = 1.5;

export function tileBeadTestID(testID: string): string {
  return `${testID}-bead`;
}

/** The check inside that bead, named so a test can read the colour it is drawn in. */
export function tileCheckTestID(testID: string): string {
  return `${testID}-check`;
}

/** The round well the drawing sits in, named so a test can read the tint behind it. */
export function tileWellTestID(testID: string): string {
  return `${testID}-well`;
}

export function SelectableTile({
  icon,
  title,
  note,
  isChosen,
  onPress,
  testID = 'tile',
}: Props): ReactNode {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isChosen }}
      onPress={onPress}
      style={isChosen ? [styles.tile, styles.chosen] : styles.tile}
      testID={testID}
    >
      {isChosen ? (
        <View style={styles.bead} testID={tileBeadTestID(testID)}>
          <Icon
            colour={colour.onAccent}
            name="check"
            size={CHECK_SIZE}
            testID={tileCheckTestID(testID)}
          />
        </View>
      ) : null}
      <View style={styles.well} testID={tileWellTestID(testID)}>
        <Icon
          colour={isChosen ? colour.accent : colour.secondaryText}
          name={icon}
          size={TILE_ICON}
        />
      </View>
      <Text style={styles.title}>{title}</Text>
      {note === undefined ? null : (
        <Text style={isChosen ? styles.noteChosen : styles.note}>{note}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // The bead sits over the corner of the box rather than in the column, so the drawing and the
  // words stay centred whether she has chosen the tile or not.
  bead: {
    alignItems: 'center',
    backgroundColor: colour.accent,
    borderRadius: radius.full,
    height: BEAD_SIZE,
    justifyContent: 'center',
    position: 'absolute',
    right: space.spaceSm,
    top: space.spaceSm,
    width: BEAD_SIZE,
  },
  chosen: {
    backgroundColor: colour.accentSoft,
    borderColor: colour.accent,
  },
  note: {
    color: colour.secondaryText,
    textAlign: 'center',
    ...textStyle('data-sm'),
  },
  // The quiet grey of a note falls under the contrast floor on the soft tint, so a chosen tile
  // writes its note in the ink measured against that tint.
  noteChosen: {
    color: colour.accentSoftInk,
    textAlign: 'center',
    ...textStyle('data-sm'),
  },
  tile: {
    alignItems: 'center',
    backgroundColor: colour.card,
    borderColor: colour.line,
    borderRadius: radius.xl,
    borderWidth: TILE_BORDER,
    gap: space.spaceSm,
    justifyContent: 'center',
    minHeight: TILE_HEIGHT,
    minWidth: MINIMUM_TAP_TARGET,
    padding: space.spaceSm,
  },
  title: {
    color: colour.text,
    textAlign: 'center',
    ...textStyle('choice-sm'),
  },
  well: {
    alignItems: 'center',
    backgroundColor: colour.accentTile,
    borderRadius: radius.full,
    height: WELL_SIZE,
    justifyContent: 'center',
    width: WELL_SIZE,
  },
});
