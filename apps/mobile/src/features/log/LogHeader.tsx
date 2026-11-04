import { MINIMUM_TAP_TARGET, colour, space, textStyle } from '@emi/tokens';
import { type ReactNode, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { CappedText as Text } from '@emi/ui';

import { TextLink } from '../../components/Button';
import { RoundIconButton } from '../../components/RoundIconButton';

/**
 * The top of the log, the log opened on the symptoms and a day she already lived, as the log and
 * day boards draw it: a round way out on the left, the day in the middle, and Done on the right.
 *
 * The log is a tab, so its way out is a cross. A day she opened is a screen pushed over the month,
 * so its way out is the chevron that points back.
 */

export const logHeaderTestID = 'log-header';
export const logHeaderLeaveTestID = 'log-header-leave';
export const logHeaderEndTestID = 'log-header-end';
export const logHeaderDoneRoomTestID = 'log-header-done-room';

/** The set holds one chevron, pointing the way on, so the way back is the same drawing turned. */
const TURNED_AROUND = [{ rotate: '180deg' }] as const;

/**
 * Points. The board gives each end of the header this width. Both ends grow alike past it when the
 * title leaves room, so the title stays in the middle. When the row is short, the way out gives
 * its room first, and the end is never narrower than Done drawn whole, so Done keeps
 * its size in a longer language or at a larger text size.
 */
export const HEADER_END = 64;

/** Points. The least the way out keeps when the row is short: its button and a gap before the title. */
export const HEADER_START_AT_LEAST = MINIMUM_TAP_TARGET + space.spaceSm;

function keepsItsRoom(): void {}

interface Props {
  readonly title: string;
  readonly titleTestID: string;
  readonly leave: 'close' | 'back';
  readonly leaveLabel: string;
  readonly onLeave: () => void;
  readonly doneLabel: string;
  readonly onDone: () => void;
  readonly doneTestID: string;
}

export function LogHeader(props: Props): ReactNode {
  const [doneWidth, setDoneWidth] = useState(0);

  return (
    <View style={styles.header} testID={logHeaderTestID}>
      {/* An end that grows from nothing has no floor at the width of its word, so Done is measured apart. */}
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        onLayout={(event) => setDoneWidth(event.nativeEvent.layout.width)}
        pointerEvents="none"
        style={styles.room}
        testID={logHeaderDoneRoomTestID}
      >
        <TextLink
          label={props.doneLabel}
          onPress={keepsItsRoom}
          testID={`${props.doneTestID}-room`}
        />
      </View>
      <View style={styles.start}>
        <View style={props.leave === 'back' ? styles.turned : undefined}>
          <RoundIconButton
            accessibilityLabel={props.leaveLabel}
            icon={props.leave === 'back' ? 'chevron' : 'close'}
            onPress={props.onLeave}
            testID={logHeaderLeaveTestID}
          />
        </View>
      </View>
      <Text
        accessibilityRole="header"
        numberOfLines={1}
        style={styles.title}
        testID={props.titleTestID}
      >
        {props.title}
      </Text>
      <View
        style={[styles.end, { minWidth: Math.max(HEADER_END, doneWidth) }]}
        testID={logHeaderEndTestID}
      >
        <TextLink label={props.doneLabel} onPress={props.onDone} testID={props.doneTestID} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  end: { alignItems: 'flex-end', flexBasis: 0, flexGrow: 1, minWidth: HEADER_END },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: MINIMUM_TAP_TARGET,
  },
  room: { height: 0, left: 0, overflow: 'hidden', position: 'absolute', top: 0 },
  start: { alignItems: 'flex-start', flexBasis: 0, flexGrow: 1, minWidth: HEADER_START_AT_LEAST },
  title: { color: colour.text, flexShrink: 1, textAlign: 'center', ...textStyle('headline-sm') },
  turned: { transform: TURNED_AROUND },
});
