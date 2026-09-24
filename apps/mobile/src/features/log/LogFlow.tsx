import { type Flow, type SymptomGroup, isBleeding, symptomsInGroup } from '@emi/cycle';
import { MINIMUM_TAP_TARGET, colour, radius, space, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CycleRing } from '../../components/CycleRing';
import { Screen } from '../../components/Screen';
import { cycleCopy } from '../cycle/copy';
import type { RingInput } from '../cycle/ringInput';
import { words } from '../../language';
import { dayLabel } from '../onboarding/days';
import { FlowPicker } from './FlowPicker';
import { SymptomGroupSection, groupHeadings } from './SymptomGroup';
import { UnexpectedBleeding } from './UnexpectedBleeding';

/**
 * The ring sits above the picker, so the thing her answer changes is the thing she is looking at
 * while she answers. Design section 9.7 sets the words: say what happens, and never congratulate.
 */
export const logFlowCopy = {
  title: words('log.flow.title'),
  saved: words('log.flow.saved'),
  noRing: cycleCopy.noRing,
  done: words('log.flow.done'),
} as const;

export const logFlowTestID = 'log-flow';
export const logFlowDoneTestID = 'log-flow-done';
export const logFlowNoRingTestID = 'log-flow-no-ring';
export const logFlowSavedTestID = 'log-flow-saved';

/** The section one group is drawn in, named after the group so a test presses the group it means. */
export function logFlowGroupTestID(group: SymptomGroup): string {
  return `symptom-group-${group}`;
}

interface Props {
  readonly day: string;
  readonly today: string;
  readonly ring: RingInput | undefined;
  readonly chosen?: Flow;
  readonly marked: boolean;
  /**
   * The one group the log was asked to open on, and nothing at all where it was asked for none.
   * It is drawn above the flow, because a woman who came here by a line offering that group came
   * for it and not for the picker.
   */
  readonly group?: SymptomGroup;
  /** What the day already carries. Empty where it carries nothing, never left out. */
  readonly symptoms?: readonly string[];
  readonly onPick: (flow: Flow) => void;
  readonly onMark: (marked: boolean) => void;
  readonly onToggleSymptom?: (slug: string) => void;
  readonly onDone: () => void;
}

export function LogFlow({
  day,
  today,
  ring,
  chosen,
  marked,
  group,
  symptoms = [],
  onPick,
  onMark,
  onToggleSymptom,
  onDone,
}: Props): ReactNode {
  // The mark answers a question about bleeding, so it is offered on the days that carry some. The
  // test is the arithmetic's own, which is why a spot can be marked and a day of nothing cannot.
  const sheBled = chosen !== undefined && isBleeding({ day, flow: chosen });

  return (
    <Screen testID={logFlowTestID}>
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
        {group === undefined ? null : (
          <SymptomGroupSection
            heading={groupHeadings[group]}
            onToggle={(slug) => onToggleSymptom?.(slug)}
            picked={symptoms}
            symptoms={symptomsInGroup(group)}
            testID={logFlowGroupTestID(group)}
          />
        )}
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.spaceMd, padding: space.spaceLg, paddingTop: space.spaceXl },
  done: {
    alignItems: 'center',
    backgroundColor: colour.surfaceTint,
    borderRadius: radius.md,
    justifyContent: 'center',
    margin: space.spaceLg,
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.spaceLg,
  },
  doneLabel: {
    color: colour.surfaceContainerLowest,
    ...textStyle('body-lg'),
  },
  line: {
    color: colour.onSurfaceVariant,
    ...textStyle('body-lg'),
  },
  noRingTitle: {
    color: colour.onSurface,
    ...textStyle('headline-md'),
    marginBottom: space.spaceSm,
  },
  ring: { alignItems: 'center', marginBottom: space.spaceMd },
  title: {
    color: colour.onSurface,
    ...textStyle('headline-lg'),
  },
  when: {
    color: colour.onSurfaceVariant,
    ...textStyle('label-sm'),
  },
});
