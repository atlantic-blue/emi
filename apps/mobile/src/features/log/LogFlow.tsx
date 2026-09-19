import { type Flow, isBleeding } from '@emi/cycle';
import { MINIMUM_TAP_TARGET, colour, radius, space, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CycleRing } from '../../components/CycleRing';
import type { RingInput } from '../cycle/ringInput';
import { dayLabel } from '../onboarding/days';
import { FlowPicker } from './FlowPicker';
import { UnexpectedBleeding } from './UnexpectedBleeding';

/**
 * The ring sits above the picker, so the thing her answer changes is the thing she is looking at
 * while she answers. Design section 9.7 sets the words: say what happens, and never congratulate.
 */
export const logFlowCopy = {
  title: 'Your flow',
  saved: 'Saved on this phone.',
  noRing: {
    title: 'Nothing to draw yet',
    line: 'The ring needs a period. Log a day you bled and it appears.',
  },
  done: 'Done',
} as const;

export const logFlowTestID = 'log-flow';
export const logFlowDoneTestID = 'log-flow-done';
export const logFlowNoRingTestID = 'log-flow-no-ring';
export const logFlowSavedTestID = 'log-flow-saved';

interface Props {
  readonly day: string;
  readonly today: string;
  readonly ring: RingInput | undefined;
  readonly chosen?: Flow;
  readonly marked: boolean;
  readonly onPick: (flow: Flow) => void;
  readonly onMark: (marked: boolean) => void;
  readonly onDone: () => void;
}

export function LogFlow({
  day,
  today,
  ring,
  chosen,
  marked,
  onPick,
  onMark,
  onDone,
}: Props): ReactNode {
  // The mark answers a question about bleeding, so it is offered on the days that carry some. The
  // test is the arithmetic's own, which is why a spot can be marked and a day of nothing cannot.
  const sheBled = chosen !== undefined && isBleeding({ day, flow: chosen });

  return (
    <View style={styles.screen} testID={logFlowTestID}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.ring}>
          {ring ? (
            <CycleRing {...ring} />
          ) : (
            <View testID={logFlowNoRingTestID}>
              <Text accessibilityRole="header" style={styles.noRingTitle}>
                {logFlowCopy.noRing.title}
              </Text>
              <Text style={styles.line}>{logFlowCopy.noRing.line}</Text>
            </View>
          )}
        </View>

        <Text style={styles.when}>{dayLabel(day, today)}</Text>
        <Text accessibilityRole="header" style={styles.title}>
          {logFlowCopy.title}
        </Text>
        <FlowPicker chosen={chosen} onPick={onPick} />
        {sheBled && <UnexpectedBleeding marked={marked} onMark={onMark} />}
        {chosen !== undefined && (
          <Text style={styles.line} testID={logFlowSavedTestID}>
            {logFlowCopy.saved}
          </Text>
        )}
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        onPress={onDone}
        style={styles.done}
        testID={logFlowDoneTestID}
      >
        <Text style={styles.doneLabel}>{logFlowCopy.done}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.snug, padding: space.base, paddingTop: space.loose },
  done: {
    alignItems: 'center',
    backgroundColor: colour.ember,
    borderRadius: radius.chip,
    justifyContent: 'center',
    margin: space.base,
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.base,
  },
  doneLabel: {
    color: colour.surface,
    ...textStyle('body-lg'),
  },
  line: {
    color: colour.body,
    ...textStyle('body-lg'),
  },
  noRingTitle: {
    color: colour.ink,
    ...textStyle('headline-md'),
    marginBottom: space.tight,
  },
  ring: { alignItems: 'center', marginBottom: space.snug },
  screen: { backgroundColor: colour.stone, flex: 1 },
  title: {
    color: colour.ink,
    ...textStyle('headline-lg'),
  },
  when: {
    color: colour.muted,
    ...textStyle('label-sm'),
  },
});
