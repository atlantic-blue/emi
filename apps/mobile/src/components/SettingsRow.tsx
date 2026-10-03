import { MINIMUM_TAP_TARGET, type IconName, colour, radius, space, textStyle } from '@emi/tokens';
import { Icon } from '@emi/ui';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

/**
 * One row of a settings list: a drawing in a tile, what it opens, and the mark that points the way
 * on.
 *
 * The drawing sits in a tile of its own so a column of rows reads as a column of symbols before it
 * reads as a column of words. The mark at the end is drawn only where the row opens something, so
 * a row that opens nothing cannot look pressable.
 *
 * The row draws no rule under itself. The hairline the design system names sits between a row and
 * the row under it, which is the list's business, and a row that drew its own would draw one under
 * the last row too.
 *
 * A screen reader is given the three parts separately: what the row opens as its label, the
 * reading at its end as its value, and the quiet line as its hint. Reading the words in place
 * would lose them, because the whole row is one element once it takes a press.
 */

interface Props {
  /**
   * Left out by a list whose rows carry no symbol, which is the screen that reads her eight answers
   * back: the prototype draws a tile on the rows of Privacy and on none of those.
   */
  readonly icon?: IconName;
  readonly label: string;
  /** What the row opens, under its name. Left out where there is nothing true to say yet. */
  readonly line?: string;
  /** What it is set to now, read at the end of the row. Left out where the row holds no reading. */
  readonly value?: string;
  /** Left out by a row that opens nothing, and then no mark pointing on is drawn. */
  readonly onPress?: () => void;
  readonly testID?: string;
}

/** Points. The height the prototype draws the row at, well above the tap floor of SEE-3. */
const ROW_HEIGHT = 56;

/** Points. The tile the drawing sits in. */
const TILE_SIZE = 36;

/** Points. The drawing inside that tile, on the twenty four point grid of the icon set. */
const ROW_ICON = 20;

/** Points. The mark at the end of the row, read smaller than the drawing at its start. */
const CHEVRON_SIZE = 18;

/** The tile the drawing sits in, named so a test can read the ground behind it. */
export function rowTileTestID(testID: string): string {
  return `${testID}-tile`;
}

/** The drawing in that tile, named so a test can read the colour it is stroked in. */
export function rowDrawingTestID(testID: string): string {
  return `${testID}-drawing`;
}

/** The mark that points the way on, named so a test can read the colour it is stroked in. */
export function rowChevronTestID(testID: string): string {
  return `${testID}-chevron`;
}

function RowBody({
  icon,
  label,
  line,
  value,
  opens,
  testID,
}: {
  readonly icon?: IconName;
  readonly label: string;
  readonly line?: string;
  readonly value?: string;
  readonly opens: boolean;
  readonly testID?: string;
}): ReactNode {
  return (
    <>
      {icon === undefined ? null : (
        <View style={styles.tile} testID={testID === undefined ? undefined : rowTileTestID(testID)}>
          <Icon
            colour={colour.text}
            name={icon}
            size={ROW_ICON}
            testID={testID === undefined ? undefined : rowDrawingTestID(testID)}
          />
        </View>
      )}
      <View style={styles.words}>
        <Text style={styles.label}>{label}</Text>
        {line === undefined ? null : <Text style={styles.line}>{line}</Text>}
      </View>
      {value === undefined ? null : <Text style={styles.value}>{value}</Text>}
      {opens ? (
        <Icon
          colour={colour.quietIcon}
          name="chevron"
          size={CHEVRON_SIZE}
          testID={testID === undefined ? undefined : rowChevronTestID(testID)}
        />
      ) : null}
    </>
  );
}

export function SettingsRow({ icon, label, line, value, onPress, testID }: Props): ReactNode {
  const body = (
    <RowBody
      icon={icon}
      label={label}
      line={line}
      opens={onPress !== undefined}
      testID={testID}
      value={value}
    />
  );

  if (onPress === undefined) {
    return (
      <View style={styles.row} testID={testID}>
        {body}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityHint={line}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityValue={value === undefined ? undefined : { text: value }}
      onPress={onPress}
      style={styles.row}
      testID={testID}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colour.text,
    ...textStyle('choice-lg'),
  },
  line: {
    color: colour.secondaryText,
    ...textStyle('body-sm'),
  },
  row: {
    alignItems: 'center',
    gap: space.spaceMd,
    flexDirection: 'row',
    minHeight: ROW_HEIGHT,
    minWidth: MINIMUM_TAP_TARGET,
    paddingVertical: space.spaceSm,
  },
  tile: {
    alignItems: 'center',
    backgroundColor: colour.field,
    borderRadius: radius.DEFAULT,
    height: TILE_SIZE,
    justifyContent: 'center',
    width: TILE_SIZE,
  },
  value: {
    color: colour.secondaryText,
    ...textStyle('body-sm'),
  },
  // The words take what is left after the tile, the reading and the mark, so a long name wraps
  // rather than pushing the mark off the end of the row.
  words: {
    flexShrink: 1,
    flexGrow: 1,
    rowGap: space.spaceXs,
  },
});
