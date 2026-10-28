import { flowValues } from '@emi/crypto';
import type { Flow } from '@emi/cycle';
import { MINIMUM_TAP_TARGET, colour, radius, space, textStyle } from '@emi/tokens';
import { Icon, CappedText as Text } from '@emi/ui';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { words } from '../../language';

/**
 * The five values of design section 6.2, in the order she reads them, from nothing to the heaviest
 * day, each a round disc with its drops as the log board draws them. One press is the whole action:
 * there is no save button here, because the most common thing anybody does in this product is not
 * worth two presses.
 */

export const flowLabel: Readonly<Record<Flow, string>> = {
  none: words('log.flow.none'),
  spotting: words('log.flow.spotting'),
  light: words('log.flow.light'),
  medium: words('log.flow.medium'),
  heavy: words('log.flow.heavy'),
};

export const flowPickerTestID = 'flow-picker';

export function flowOptionTestID(flow: Flow): string {
  return `flow-option-${flow}`;
}

interface Props {
  readonly chosen?: Flow;
  readonly onPick: (flow: Flow) => void;
}

/** Points. The disc each value is drawn in on the log board, and the drawings inside it. */
const FLOW_DISC = 54;
const FLOW_DISC_BORDER = 1.5;
const DROP_SIZE = 13;
const NONE_SIZE = 14;

/** How many drops each value is drawn with. None is drawn as a cross, so it carries no drop. */
export const dropsOf: Readonly<Record<Flow, number>> = {
  none: 0,
  spotting: 1,
  light: 1,
  medium: 2,
  heavy: 3,
};

export function FlowPicker({ chosen, onPick }: Props): ReactNode {
  return (
    <View accessibilityRole="radiogroup" style={styles.options} testID={flowPickerTestID}>
      {flowValues.map((flow) => {
        const isChosen = flow === chosen;
        const ink = isChosen ? colour.onAccent : colour.accent;

        return (
          <Pressable
            accessibilityLabel={flowLabel[flow]}
            accessibilityRole="radio"
            accessibilityState={{ checked: isChosen }}
            key={flow}
            onPress={() => onPick(flow)}
            style={styles.option}
            testID={flowOptionTestID(flow)}
          >
            <View style={[styles.disc, isChosen ? styles.discChosen : styles.discPlain]}>
              {flow === 'none' ? (
                <Icon
                  colour={isChosen ? colour.onAccent : colour.secondaryText}
                  name="close"
                  size={NONE_SIZE}
                />
              ) : (
                Array.from({ length: dropsOf[flow] }, (_unused, at) => (
                  <Icon colour={ink} key={at} name="drop" size={DROP_SIZE} />
                ))
              )}
            </View>
            <Text style={styles.label}>{flowLabel[flow]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  disc: {
    alignItems: 'center',
    borderRadius: radius.full,
    borderWidth: FLOW_DISC_BORDER,
    flexDirection: 'row',
    height: FLOW_DISC,
    justifyContent: 'center',
    width: FLOW_DISC,
  },
  discChosen: { backgroundColor: colour.accent, borderColor: colour.accent },
  discPlain: { backgroundColor: colour.card, borderColor: colour.line },
  label: {
    color: colour.text,
    ...textStyle('label-md'),
    textAlign: 'center',
  },
  // SEE-3. The disc and its word together are the tap target, and the disc alone is past the floor.
  option: {
    alignItems: 'center',
    gap: space.spaceXs,
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
  },
  options: { flexDirection: 'row', justifyContent: 'space-between' },
});
