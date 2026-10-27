import type { SymptomGroup } from '@emi/cycle';
import { type IconName, MINIMUM_TAP_TARGET, colour, radius, space, textStyle } from '@emi/tokens';
import { Icon } from '@emi/ui';
import { type ReactNode, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { OneLabelScale, WholeWordsText } from '../../components/WholeWordsText';
import { groupHeadings } from './SymptomGroup';

/**
 * The nine symptom groups as the log board draws them: a tinted tile with a drawing, and the name
 * under it, four to a row. A press opens the symptoms of that group, so the log never lists all of
 * them at once.
 */

export const groupTilesTestID = 'group-tiles';

export function groupTileTestID(group: SymptomGroup): string {
  return `group-tile-${group}`;
}

export function groupTileNameTestID(group: SymptomGroup): string {
  return `group-name-${group}`;
}

interface TilePaint {
  readonly icon: IconName;
  readonly ground: keyof typeof colour;
  readonly ink: keyof typeof colour;
}

/** The drawing and the two colours the board gives each group. */
export const tilePaint: Readonly<Record<SymptomGroup, TilePaint>> = {
  mood: { icon: 'mood', ground: 'accentSoft', ink: 'accent' },
  energy: { icon: 'energy', ground: 'field', ink: 'warmIcon' },
  pain: { icon: 'pain', ground: 'accentSoft', ink: 'accent' },
  appetite: { icon: 'appetite', ground: 'field', ink: 'warmIcon' },
  digestive: { icon: 'digestion', ground: 'washWarm', ink: 'ovulationInk' },
  skin: { icon: 'skin', ground: 'washWarm', ink: 'ovulationInk' },
  sleep: { icon: 'sleep', ground: 'accentTile', ink: 'lutealInk' },
  head: { icon: 'headache', ground: 'field', ink: 'warmIcon' },
  libido: { icon: 'heart', ground: 'accentSoft', ink: 'accent' },
};

/** Points. The tile and the drawing inside it, as the board sizes them. */
const TILE = 52;
const TILE_ICON = 24;

/** The board lays the tiles four to a row. */
export const TILES_IN_A_ROW = 4;

/** Where a name is still cut at the smallest label size, the nine tiles take three rows of three. */
export const NARROW_TILES_IN_A_ROW = 3;

interface Props {
  /** The groups in the order she reads them. */
  readonly groups: readonly SymptomGroup[];
  readonly onOpen: (group: SymptomGroup) => void;
}

export function GroupTiles({ groups, onOpen }: Props): ReactNode {
  const [tilesInARow, setTilesInARow] = useState(TILES_IN_A_ROW);

  return (
    <OneLabelScale key={tilesInARow}>
      <View style={styles.grid} testID={groupTilesTestID}>
        {groups.map((group) => {
          const paint = tilePaint[group];

          return (
            <Pressable
              accessibilityRole="button"
              key={group}
              onPress={() => onOpen(group)}
              style={[styles.tile, { width: `${100 / tilesInARow}%` }]}
              testID={groupTileTestID(group)}
            >
              <View style={[styles.well, { backgroundColor: colour[paint.ground] }]}>
                <Icon colour={colour[paint.ink]} name={paint.icon} size={TILE_ICON} />
              </View>
              <WholeWordsText
                label={groupHeadings[group]}
                onWordCutAtTheFloor={() => setTilesInARow(NARROW_TILES_IN_A_ROW)}
                style={styles.name}
                testID={groupTileNameTestID(group)}
              />
            </Pressable>
          );
        })}
      </View>
    </OneLabelScale>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: space.spaceMd },
  name: { color: colour.text, textAlign: 'center', ...textStyle('label-md') },
  tile: {
    alignItems: 'center',
    gap: space.spaceXs,
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
  },
  well: {
    alignItems: 'center',
    borderRadius: radius.lg,
    height: TILE,
    justifyContent: 'center',
    width: TILE,
  },
});
