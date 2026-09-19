import type { ForecastResult } from '@emi/cycle';
import { MINIMUM_TAP_TARGET, colour, radius, space, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CycleRing } from '../../components/CycleRing';
import { Screen } from '../../components/Screen';
import { cycleCopy } from '../cycle/copy';
import type { RingInput } from '../cycle/ringInput';
import { NextPeriodOrLearning } from '../forecast/Learning';
import { homeCopy } from './copy';

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

interface Props {
  /** The cycle she is in, or nothing at all before a day is recorded. */
  readonly ring: RingInput | undefined;
  readonly forecast: ForecastResult;
  /** The length she gave at the first run, which the learning state counts by. */
  readonly cycleLengthDays: number;
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
          <NextPeriodOrLearning cycleLengthDays={cycleLengthDays} result={forecast} />
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
    backgroundColor: colour.ember,
    borderRadius: radius.chip,
    justifyContent: 'center',
    marginTop: space.roomy,
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.base,
  },
  actionLabel: {
    color: colour.surface,
    ...textStyle('body-lg'),
  },
  body: {
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: space.roomy,
  },
  forecast: { marginTop: space.base },
  history: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.base,
  },
  historyLabel: {
    color: colour.body,
    ...textStyle('body-sm'),
  },
  links: { flexDirection: 'row', gap: space.snug, marginTop: space.tight },
  noRing: { alignItems: 'center', paddingHorizontal: space.base },
  // The line says what to do next, and it names a thing SCREEN-2 keeps under 14 points, so it
  // takes the small size rather than the body size a sentence would otherwise get.
  noRingLine: {
    color: colour.muted,
    ...textStyle('body-sm'),
    textAlign: 'center',
  },
  noRingTitle: {
    color: colour.ink,
    ...textStyle('headline-md'),
    marginBottom: space.hair,
  },
  // The scroll fills the screen so the block inside it sits in the middle of the glass rather than
  // against the top of it, which is where a container sized to its own content would leave it.
  scroll: { flex: 1 },
  wordmark: {
    color: colour.ink,
    ...textStyle('headline-lg'),
    marginBottom: space.base,
  },
});
