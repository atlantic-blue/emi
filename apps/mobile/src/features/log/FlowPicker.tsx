import { flowValues } from '@emi/crypto';
import type { Flow } from '@emi/cycle';
import { MINIMUM_TAP_TARGET, colour, radius, space, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

/**
 * The five values of design section 6.2, in the order she reads them, from nothing to the heaviest
 * day. One press is the whole action: there is no save button here, because the most common thing
 * anybody does in this product is not worth two presses.
 */

export const flowLabel: Readonly<Record<Flow, string>> = {
  none: 'None',
  spotting: 'Spotting',
  light: 'Light',
  medium: 'Medium',
  heavy: 'Heavy',
};

export const flowPickerTestID = 'flow-picker';

export function flowOptionTestID(flow: Flow): string {
  return `flow-option-${flow}`;
}

interface Props {
  readonly chosen?: Flow;
  readonly onPick: (flow: Flow) => void;
}

export function FlowPicker({ chosen, onPick }: Props): ReactNode {
  return (
    <View accessibilityRole="radiogroup" style={styles.options} testID={flowPickerTestID}>
      {flowValues.map((flow) => {
        const isChosen = flow === chosen;

        return (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: isChosen }}
            key={flow}
            onPress={() => onPick(flow)}
            style={[styles.option, isChosen ? styles.optionChosen : styles.optionPlain]}
            testID={flowOptionTestID(flow)}
          >
            <Text style={[styles.label, isChosen && styles.labelChosen]}>{flowLabel[flow]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colour.body,
    ...textStyle('body-lg'),
    textAlign: 'center',
  },
  labelChosen: { color: colour.ink },
  option: {
    alignItems: 'center',
    borderRadius: radius.chip,
    borderWidth: 1,
    justifyContent: 'center',
    // SEE-3. The option itself is the tap target, so the floor decides its size and the padding
    // only ever pushes a longer word past that.
    maxWidth: '100%',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.snug,
    paddingVertical: space.tight,
  },
  optionChosen: { backgroundColor: colour.emberTint, borderColor: colour.ember },
  optionPlain: { backgroundColor: colour.sunk, borderColor: colour.sunk },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: space.tight },
});
