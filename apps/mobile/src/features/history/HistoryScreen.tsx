import type { PhaseName } from '@emi/tokens';
import {
  MINIMUM_TAP_TARGET,
  colour,
  phaseLabel,
  phasePalette,
  radius,
  space,
  textStyle,
} from '@emi/tokens';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../components/Screen';
import type { History, HistoryCycle, HistoryPattern } from './historyNow';
import { historyNeedsCycles } from './historyNow';
import {
  cycleLengthSentence,
  cycleSentence,
  historyCopy,
  patternSentence,
  patternsWaitingSentence,
} from './copy';

/**
 * Six cycles read back, and what came back with them. The value of logging arrives here: a woman
 * who has written down a year of days is owed the shape of it.
 *
 * Every phase colour on this screen is a fill and carries no text, which is contract SEE-2. The
 * written phase name beside a pattern is drawn in that phase's ink partner, measured above the
 * contrast floor, because three of the four fills fail as text.
 */

export const historyScreenTestID = 'history-screen';
export const historyBackTestID = 'history-back';
export const historyCyclesTestID = 'history-cycles';
export const historyPatternsTestID = 'history-patterns';
export const historyNoCyclesTestID = 'history-no-cycles';
export const historyWaitingTestID = 'history-waiting';

/** One cycle row, addressed by the day it began, so a test presses the cycle it seeded. */
export function historyCycleTestID(startedOn: string): string {
  return `history-cycle-${startedOn}`;
}

/** One symptom row, addressed by the slug, which is the part of a symptom that never changes. */
export function historyPatternTestID(slug: string): string {
  return `history-pattern-${slug}`;
}

/** One arc of a cycle row, so a test can read the days a phase covers off the drawing itself. */
export function historyArcTestID(startedOn: string, phase: PhaseName): string {
  return `history-arc-${startedOn}-${phase}`;
}

export function historyPatternPhaseTestID(slug: string): string {
  return `history-pattern-phase-${slug}`;
}

interface Props {
  readonly history: History;
  /** A press opens the day itself, because a pattern she disagrees with is a day she can correct. */
  readonly onOpenDay: (day: string) => void;
  readonly onBack: () => void;
}

function PhaseBar({ cycle }: { readonly cycle: HistoryCycle }): ReactNode {
  return (
    <View style={styles.bar}>
      {cycle.phases
        .filter((span) => span.days > 0)
        .map((span) => (
          <View
            key={span.phase}
            style={[
              styles.arc,
              { backgroundColor: colour[phasePalette[span.phase].fill], flexGrow: span.days },
            ]}
            testID={historyArcTestID(cycle.startedOn, span.phase)}
          />
        ))}
    </View>
  );
}

function CycleRow({
  cycle,
  onOpenDay,
}: {
  readonly cycle: HistoryCycle;
  readonly onOpenDay: (day: string) => void;
}): ReactNode {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onOpenDay(cycle.startedOn)}
      style={styles.row}
      testID={historyCycleTestID(cycle.startedOn)}
    >
      <Text style={styles.rowTitle}>{cycleSentence(cycle.startedOn, cycle.endedOn)}</Text>
      <Text style={styles.rowLine}>
        {cycleLengthSentence(cycle.lengthDays, cycle.periodLengthDays)}
      </Text>
      <PhaseBar cycle={cycle} />
    </Pressable>
  );
}

function PatternRow({
  pattern,
  onOpenDay,
}: {
  readonly pattern: HistoryPattern;
  readonly onOpenDay: (day: string) => void;
}): ReactNode {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onOpenDay(pattern.lastDay)}
      style={styles.row}
      testID={historyPatternTestID(pattern.slug)}
    >
      <Text style={styles.rowTitle}>{pattern.name}</Text>
      <Text style={styles.rowLine}>
        {patternSentence(pattern.anchor, pattern.day, pattern.cyclesWithIt, pattern.cyclesRead)}
      </Text>
      <Text
        style={[styles.phaseName, { color: colour[phasePalette[pattern.phase].ink] }]}
        testID={historyPatternPhaseTestID(pattern.slug)}
      >
        {phaseLabel[pattern.phase]}
      </Text>
    </Pressable>
  );
}

export function HistoryScreen({ history, onOpenDay, onBack }: Props): ReactNode {
  return (
    <Screen testID={historyScreenTestID}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text accessibilityRole="header" style={styles.title}>
          {historyCopy.title}
        </Text>

        <Text accessibilityRole="header" style={styles.heading}>
          {historyCopy.patterns}
        </Text>
        {history.patterns.length === 0 ? (
          <Text style={styles.rowLine} testID={historyWaitingTestID}>
            {history.completeCycles < historyNeedsCycles
              ? patternsWaitingSentence(history.completeCycles, historyNeedsCycles)
              : historyCopy.nothingRepeats}
          </Text>
        ) : (
          <View style={styles.list} testID={historyPatternsTestID}>
            {history.patterns.map((pattern) => (
              <PatternRow key={pattern.slug} onOpenDay={onOpenDay} pattern={pattern} />
            ))}
          </View>
        )}

        <Text accessibilityRole="header" style={styles.heading}>
          {historyCopy.cycles}
        </Text>
        {history.cycles.length === 0 ? (
          <Text style={styles.rowLine} testID={historyNoCyclesTestID}>
            {historyCopy.noCycles}
          </Text>
        ) : (
          <View style={styles.list} testID={historyCyclesTestID}>
            {history.cycles.map((cycle) => (
              <CycleRow cycle={cycle} key={cycle.startedOn} onOpenDay={onOpenDay} />
            ))}
          </View>
        )}

        <Pressable
          accessibilityRole="button"
          onPress={onBack}
          style={styles.back}
          testID={historyBackTestID}
        >
          <Text style={styles.backLabel}>{historyCopy.back}</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // The arc grows by the days of its phase, so the row carries the shape of that cycle and the
  // colour of it, and never a word on top of either.
  arc: { flexBasis: 0, height: '100%' },
  back: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colour.surfaceContainer,
    borderRadius: radius.md,
    justifyContent: 'center',
    marginTop: space.spaceLg,
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.spaceMd,
  },
  backLabel: {
    color: colour.onSurfaceVariant,
    ...textStyle('body-lg'),
  },
  bar: {
    borderRadius: radius.sm,
    flexDirection: 'row',
    height: space.spaceSm,
    marginTop: space.spaceSm,
    overflow: 'hidden',
    width: '100%',
  },
  body: { padding: space.spaceLg },
  heading: {
    color: colour.onSurface,
    ...textStyle('headline-md'),
    marginBottom: space.spaceSm,
    marginTop: space.spaceLg,
  },
  list: { gap: space.spaceSm },
  phaseName: {
    ...textStyle('label-sm'),
    marginTop: space.spaceXs,
  },
  row: {
    backgroundColor: colour.surfaceContainerLowest,
    borderColor: colour.outlineVariant,
    borderRadius: radius.lg,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    padding: space.spaceMd,
  },
  rowLine: {
    color: colour.onSurfaceVariant,
    ...textStyle('body-sm'),
  },
  rowTitle: {
    color: colour.onSurface,
    ...textStyle('body-lg'),
  },
  title: {
    color: colour.onSurface,
    ...textStyle('headline-lg'),
  },
});
