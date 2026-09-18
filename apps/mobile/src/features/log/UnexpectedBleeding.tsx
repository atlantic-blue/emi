import { MINIMUM_TAP_TARGET, colour, radius, space, typeScale } from '@emi/tokens';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { unexpectedBleedingCopy } from './copy';

/**
 * Her own mark on a day she bled, and the only way Emi ever learns that a bleed was not a period.
 * The arithmetic reads the mark and nothing else, so a day she never marks is a period however
 * light it was, and a day she marks is not one however heavy it was.
 *
 * The control sits with the flow because it is an answer about the bleeding she has just described,
 * and a day with no bleeding on it has nothing to mark.
 */

export const unexpectedBleedingTestID = 'unexpected-bleeding';
export const unexpectedBleedingMarkTestID = 'unexpected-bleeding-mark';
export const unexpectedBleedingLineTestID = 'unexpected-bleeding-line';

interface Props {
  readonly marked: boolean;
  readonly onMark: (marked: boolean) => void;
}

export function UnexpectedBleeding({ marked, onMark }: Props): ReactNode {
  return (
    <View style={styles.block} testID={unexpectedBleedingTestID}>
      <Text style={styles.line} testID={unexpectedBleedingLineTestID}>
        {marked ? unexpectedBleedingCopy.marked : unexpectedBleedingCopy.invitation}
      </Text>
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: marked }}
        onPress={() => onMark(!marked)}
        style={[styles.mark, marked ? styles.markChosen : styles.markPlain]}
        testID={unexpectedBleedingMarkTestID}
      >
        <Text style={[styles.markLabel, marked && styles.markLabelChosen]}>
          {unexpectedBleedingCopy.mark}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    borderTopColor: colour.hairline,
    borderTopWidth: 1,
    gap: space.tight,
    marginTop: space.tight,
    paddingTop: space.snug,
  },
  line: {
    color: colour.body,
    fontSize: typeScale.small.size,
    lineHeight: typeScale.small.lineHeight,
  },
  mark: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.chip,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.snug,
    paddingVertical: space.tight,
  },
  markChosen: { backgroundColor: colour.emberTint, borderColor: colour.ember },
  markLabel: {
    color: colour.body,
    fontSize: typeScale.body.size,
    lineHeight: typeScale.body.lineHeight,
  },
  markLabelChosen: { color: colour.ink },
  markPlain: { backgroundColor: colour.sunk, borderColor: colour.sunk },
});
