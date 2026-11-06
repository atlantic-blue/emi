import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { TextLink } from '../../components/Button';
import { RoundIconButton } from '../../components/RoundIconButton';
import { ScreenHeader } from '../../components/ScreenHeader';

/**
 * The top of the log, the log opened on the symptoms and a day she already lived, as the log and
 * day boards draw it: a round way out on the left, the day in the middle, and Done on the right.
 *
 * The log is a tab, so its way out is a cross. A day she opened is a screen pushed over the month,
 * so its way out is the chevron that points back.
 */

export const logHeaderTestID = 'log-header';
export const logHeaderLeaveTestID = 'log-header-leave';

/** The set holds one chevron, pointing the way on, so the way back is the same drawing turned. */
const TURNED_AROUND = [{ rotate: '180deg' }] as const;

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
  return (
    <ScreenHeader
      end={<TextLink label={props.doneLabel} onPress={props.onDone} testID={props.doneTestID} />}
      start={
        <View style={props.leave === 'back' ? styles.turned : undefined}>
          <RoundIconButton
            accessibilityLabel={props.leaveLabel}
            icon={props.leave === 'back' ? 'chevron' : 'close'}
            onPress={props.onLeave}
            testID={logHeaderLeaveTestID}
          />
        </View>
      }
      testID={logHeaderTestID}
      title={props.title}
      titleTestID={props.titleTestID}
    />
  );
}

const styles = StyleSheet.create({
  turned: { transform: TURNED_AROUND },
});
