import { MINIMUM_TAP_TARGET, type IconName, colour, radius, space, textStyle } from '@emi/tokens';
import { Icon } from '@emi/ui';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

/**
 * One category in the grid she logs a day from. A drawing, what it is, and what is recorded there
 * today, in a box the whole of which takes the press.
 *
 * A chosen tile carries a bead in the corner as well as a step in the ground, because the grid is
 * read at a glance and a fill alone at that size is a colour difference and nothing more.
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

/** Points. The height the document draws the tile at, which holds a drawing and two lines. */
const TILE_HEIGHT = 112;

/** Points. The drawing inside a tile, which is larger than the one in a row. */
const TILE_ICON = 26;

/** Points. The bead that says a tile is chosen. */
const BEAD_SIZE = 8;

export function tileBeadTestID(testID: string): string {
  return `${testID}-bead`;
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
      <View style={styles.top}>
        <Icon
          colour={isChosen ? colour.primary : colour.onSurfaceVariant}
          name={icon}
          size={TILE_ICON}
        />
        {isChosen ? <View style={styles.bead} testID={tileBeadTestID(testID)} /> : null}
      </View>
      <View>
        <Text style={styles.title}>{title}</Text>
        {note === undefined ? null : <Text style={styles.note}>{note}</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bead: {
    backgroundColor: colour.primaryContainer,
    borderRadius: radius.full,
    height: BEAD_SIZE,
    width: BEAD_SIZE,
  },
  chosen: { backgroundColor: colour.surfaceContainerHigh },
  note: {
    color: colour.onSurfaceVariant,
    ...textStyle('data-sm'),
  },
  tile: {
    backgroundColor: colour.surfaceContainerLow,
    borderRadius: radius.xl,
    height: TILE_HEIGHT,
    justifyContent: 'space-between',
    minWidth: MINIMUM_TAP_TARGET,
    padding: space.spaceMd,
  },
  title: {
    color: colour.onSurface,
    ...textStyle('label-md'),
  },
  top: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
});
