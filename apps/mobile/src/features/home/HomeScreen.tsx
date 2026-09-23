import type { Regularity } from '@emi/crypto';
import type { ForecastResult } from '@emi/cycle';
import { MINIMUM_TAP_TARGET, colour, radius, space, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CycleRing } from '../../components/CycleRing';
import { Screen } from '../../components/Screen';
import { cycleCopy } from '../cycle/copy';
import type { RingInput } from '../cycle/ringInput';
import { NextPeriodOrLearning } from '../forecast/Learning';
import { greeting, homeCopy } from './copy';

/**
 * The one screen she opens. The ring carries the meaning and the words underneath it stay small,
 * which is design section 9.1: she reads everything and a stranger beside her reads nothing.
 *
 * The forecast arrives already worked out. This screen does no arithmetic of its own, so what the
 * arcs draw and what the sentence names are the same answer read twice.
 */

export const logTodayTestID = 'home-log-today';
export const logTodayLabel = homeCopy.logToday;

export const historyTestID = 'home-history';
export const historyLabel = homeCopy.history;

export const exportTestID = 'home-export';
export const exportLabel = homeCopy.export;

export const settingsTestID = 'home-settings';
export const settingsLabel = homeCopy.settings;

export const homeScreenTestID = 'home-screen';
export const homeNoRingTestID = 'home-no-ring';
export const homeForecastTestID = 'home-forecast';
export const homeGreetingTestID = 'home-greeting';

interface Props {
  /** The cycle she is in, or nothing at all before a day is recorded. */
  readonly ring: RingInput | undefined;
  readonly forecast: ForecastResult;
  /** The length she gave at the first run, which the learning state counts by. */
  readonly cycleLengthDays: number;
  /**
   * The name in her profile, and nothing at all where she skipped the question or gave none. Then
   * no greeting is drawn, because a woman who kept her name is not greeted by a blank line.
   */
  readonly name?: string;
  /**
   * How steady she said her cycle is, and nothing at all where she skipped the question. It moves
   * one sentence under the forecast and nothing else on this screen.
   */
  readonly regularity?: Regularity;
  readonly onLogToday: () => void;
  /** The way into what she has already written, which is what the logging is for. */
  readonly onHistory: () => void;
  /** The way out, because a record she cannot take with her is not hers. */
  readonly onExport: () => void;
  readonly onSettings: () => void;
}

export function HomeScreen({
  ring,
  forecast,
  cycleLengthDays,
  name,
  regularity,
  onLogToday,
  onHistory,
  onExport,
  onSettings,
}: Props): ReactNode {
  return (
    <Screen testID={homeScreenTestID}>
      <ScrollView contentContainerStyle={styles.body} style={styles.scroll}>
        <Text accessibilityRole="header" style={styles.wordmark}>
          {homeCopy.wordmark}
        </Text>

        {name === undefined ? null : (
          <Text style={styles.greeting} testID={homeGreetingTestID}>
            {greeting(name)}
          </Text>
        )}

        {ring ? (
          <CycleRing {...ring} />
        ) : (
          <View style={styles.noRing} testID={homeNoRingTestID}>
            <Text accessibilityRole="header" style={styles.noRingTitle}>
              {cycleCopy.noRing.title}
            </Text>
            <Text style={styles.noRingLine}>{cycleCopy.noRing.line}</Text>
          </View>
        )}

        <View style={styles.forecast} testID={homeForecastTestID}>
          <NextPeriodOrLearning
            cycleLengthDays={cycleLengthDays}
            regularity={regularity}
            result={forecast}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={onLogToday}
          style={styles.action}
          testID={logTodayTestID}
        >
          <Text style={styles.actionLabel}>{logTodayLabel}</Text>
        </Pressable>

        <View style={styles.links}>
          <Pressable
            accessibilityRole="button"
            onPress={onHistory}
            style={styles.history}
            testID={historyTestID}
          >
            <Text style={styles.historyLabel}>{historyLabel}</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={onExport}
            style={styles.history}
            testID={exportTestID}
          >
            <Text style={styles.historyLabel}>{exportLabel}</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={onSettings}
            style={styles.history}
            testID={settingsTestID}
          >
            <Text style={styles.historyLabel}>{settingsLabel}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: 'center',
    backgroundColor: colour.surfaceTint,
    borderRadius: radius.md,
    justifyContent: 'center',
    marginTop: space.spaceXl,
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.spaceLg,
  },
  actionLabel: {
    color: colour.surfaceContainerLowest,
    ...textStyle('body-lg'),
  },
  body: {
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: space.spaceXl,
  },
  forecast: { marginTop: space.spaceLg },
  // Under the wordmark and above the ring, and small, because SCREEN-2 keeps the home screen
  // unreadable from an arm's length away and her name is the one word on it that is hers.
  greeting: {
    color: colour.onSurfaceVariant,
    ...textStyle('body-sm'),
    marginBottom: space.spaceLg,
  },
  history: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.spaceLg,
  },
  historyLabel: {
    color: colour.onSurfaceVariant,
    ...textStyle('body-sm'),
  },
  links: { flexDirection: 'row', gap: space.spaceMd, marginTop: space.spaceSm },
  noRing: { alignItems: 'center', paddingHorizontal: space.spaceLg },
  // The line says what to do next, and it names a thing SCREEN-2 keeps under 14 points, so it
  // takes the small size rather than the body size a sentence would otherwise get.
  noRingLine: {
    color: colour.onSurfaceVariant,
    ...textStyle('body-sm'),
    textAlign: 'center',
  },
  noRingTitle: {
    color: colour.onSurface,
    ...textStyle('headline-md'),
    marginBottom: space.spaceXs,
  },
  // The scroll fills the screen so the block inside it sits in the middle of the glass rather than
  // against the top of it, which is where a container sized to its own content would leave it.
  scroll: { flex: 1 },
  wordmark: {
    color: colour.onSurface,
    ...textStyle('headline-lg'),
    marginBottom: space.spaceLg,
  },
});
