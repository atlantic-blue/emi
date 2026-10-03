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
import { Icon } from '@emi/ui';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../components/Screen';
import { patternsWaitingSentence } from '../cycle/patternsWaiting';
import type { History, HistoryCycle, HistoryPattern } from './historyNow';
import { cycleLengthSentence, cycleSentence, historyCopy, patternSentence } from './copy';

/**
 * Six cycles read back, and what came back with them. The value of logging arrives here: a woman
 * who has written down a year of days is owed the shape of it.
 *
 * Every phase colour on this screen is a fill and carries no text, which is contract SEE-2. The
 * written phase name beside a pattern is drawn in that phase's ink partner, measured above the
 * contrast floor, because three of the four fills fail as text.
 */

/** Points. The mark that says a row opens, read at the size every other row reads it at. */
const theMarkOnward = 18;

export const historyScreenTestID = 'history-screen';
export const historyTitleTestID = 'history-title';
export const historyPatternsHeadingTestID = 'history-patterns-heading';
export const historyCyclesHeadingTestID = 'history-cycles-heading';
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
  /**
   * The cycle she arrived at, where she came from a strip on the screen she opens, and nothing at
   * all where she pressed the Insights column of the dock. That one row is marked, so she lands on
   * the cycle she pressed rather than on a list of four that look alike.
   */
  readonly openedAt?: string;
  /**
   * The symptom she arrived at, where she came from a card on the screen she opens, and nothing at
   * all where she pressed the Insights column of the dock. That one row is marked, so she lands on
   * the symptom she pressed rather than on a list of them.
   */
  readonly openedPattern?: string;
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
  opened,
  onOpenDay,
}: {
  readonly cycle: HistoryCycle;
  /** True for the one cycle she arrived at, which is drawn with a border she can see. */
  readonly opened: boolean;
  readonly onOpenDay: (day: string) => void;
}): ReactNode {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: opened }}
      onPress={() => onOpenDay(cycle.startedOn)}
      style={[styles.row, opened ? styles.opened : null]}
      testID={historyCycleTestID(cycle.startedOn)}
    >
      <View style={styles.said}>
        <Text style={styles.rowTitle}>{cycleSentence(cycle.startedOn, cycle.endedOn)}</Text>
        <Text style={styles.rowLine}>
          {cycleLengthSentence(cycle.lengthDays, cycle.periodLengthDays)}
        </Text>
        <PhaseBar cycle={cycle} />
      </View>
      <Icon colour={colour.quietIcon} name="chevron" size={theMarkOnward} />
    </Pressable>
  );
}

function PatternRow({
  pattern,
  opened,
  onOpenDay,
}: {
  readonly pattern: HistoryPattern;
  /** True for the one symptom she arrived at, which is drawn with a border she can see. */
  readonly opened: boolean;
  readonly onOpenDay: (day: string) => void;
}): ReactNode {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: opened }}
      onPress={() => onOpenDay(pattern.lastDay)}
      style={[styles.row, opened ? styles.opened : null]}
      testID={historyPatternTestID(pattern.slug)}
    >
      <View style={styles.said}>
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
      </View>
      <Icon colour={colour.quietIcon} name="chevron" size={theMarkOnward} />
    </Pressable>
  );
}

export function HistoryScreen({
  history,
  openedAt,
  openedPattern,
  onOpenDay,
  onBack,
}: Props): ReactNode {
  return (
    <Screen drawsTheWash testID={historyScreenTestID}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text accessibilityRole="header" style={styles.title} testID={historyTitleTestID}>
          {historyCopy.title}
        </Text>

        <Text
          accessibilityRole="header"
          style={styles.heading}
          testID={historyPatternsHeadingTestID}
        >
          {historyCopy.patterns}
        </Text>
        {history.patterns.length === 0 ? (
          <Text style={styles.rowLine} testID={historyWaitingTestID}>
            {patternsWaitingSentence(history.completeCycles)}
          </Text>
        ) : (
          <View style={styles.list} testID={historyPatternsTestID}>
            {history.patterns.map((pattern) => (
              <PatternRow
                key={pattern.slug}
                onOpenDay={onOpenDay}
                opened={pattern.slug === openedPattern}
                pattern={pattern}
              />
            ))}
          </View>
        )}

        <Text accessibilityRole="header" style={styles.heading} testID={historyCyclesHeadingTestID}>
          {historyCopy.cycles}
        </Text>
        {history.cycles.length === 0 ? (
          <Text style={styles.rowLine} testID={historyNoCyclesTestID}>
            {historyCopy.noCycles}
          </Text>
        ) : (
          <View style={styles.list} testID={historyCyclesTestID}>
            {history.cycles.map((cycle) => (
              <CycleRow
                cycle={cycle}
                key={cycle.startedOn}
                onOpenDay={onOpenDay}
                opened={cycle.startedOn === openedAt}
              />
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
    backgroundColor: colour.field,
    borderRadius: radius.full,
    justifyContent: 'center',
    marginTop: space.spaceLg,
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.spaceMd,
  },
  backLabel: {
    color: colour.secondaryText,
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
    color: colour.text,
    ...textStyle('headline-md'),
    marginBottom: space.spaceSm,
    marginTop: space.spaceLg,
  },
  list: { gap: space.spaceSm },
  phaseName: {
    ...textStyle('label-sm'),
    marginTop: space.spaceXs,
  },
  // Plain paper with no line drawn around it, which is the card of the redesign: a column of rows
  // reads as a journal rather than as a column of boxes.
  row: {
    alignItems: 'center',
    backgroundColor: colour.card,
    borderRadius: radius.xl,
    columnGap: space.spaceSm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    padding: space.spaceMd,
  },
  // The words take whatever width the mark leaves, so a long date wraps inside the row rather than
  // pushing the mark off the card.
  said: { flexGrow: 1, flexShrink: 1 },
  // The cycle or the symptom she arrived at from the screen she opens, drawn with the accent
  // border so she can see which row she asked for. The mark is a width as well as a colour.
  opened: {
    borderColor: colour.accent,
    borderWidth: 2,
  },
  rowLine: {
    color: colour.secondaryText,
    ...textStyle('body-sm'),
  },
  rowTitle: {
    color: colour.text,
    ...textStyle('body-lg'),
  },
  title: {
    color: colour.text,
    ...textStyle('headline-lg'),
  },
});
