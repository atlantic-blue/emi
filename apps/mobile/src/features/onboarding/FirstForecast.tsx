import type { DayRange } from '@emi/cycle';
import { colour, space, stroke, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../../components/Button';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { rangeSentence } from '../forecast/copy';
import { firstRunCopy } from './copy';

/**
 * The first thing Emi says back to her, after twelve questions and before the hold that writes
 * them. It carries no bar, because it asks her nothing: the questions are behind her.
 *
 * The range is worked out from the answers she is still holding in memory, by the arithmetic the
 * home screen reads, so the days on this screen are the days on the one she lands on afterwards.
 * Nothing is written yet, and the two cards say what the range is worth and where it was worked
 * out, because those are the two things a woman is right to ask of a forecast.
 */

export const firstForecastTestID = 'onboarding-first-forecast';
export const firstForecastRangeTestID = 'first-forecast-range';
export const firstForecastLearningTestID = 'first-forecast-learning';
export const firstForecastWhyTestID = 'first-forecast-why';
export const firstForecastOnThisPhoneTestID = 'first-forecast-on-this-phone';
export const firstForecastActionTestID = 'first-forecast-action';

interface Props {
  /** The two days her next period is counted to, which is never one day. */
  readonly start: DayRange;
  readonly onContinue: () => void;
}

export function FirstForecast({ start, onContinue }: Props): ReactNode {
  return (
    <Screen testID={firstForecastTestID}>
      <ScrollView contentContainerStyle={styles.body} style={styles.scroll}>
        <View>
          <Text accessibilityRole="header" style={styles.title}>
            {firstRunCopy.firstForecast.title}
          </Text>
          <Text style={styles.range} testID={firstForecastRangeTestID}>
            {rangeSentence(start)}
          </Text>
          <Text style={styles.learning} testID={firstForecastLearningTestID}>
            {firstRunCopy.firstForecast.learning}
          </Text>
        </View>

        <View style={styles.cards}>
          <Card testID={firstForecastWhyTestID}>
            <Text style={styles.cardTitle}>{firstRunCopy.firstForecast.why.title}</Text>
            <Text style={styles.cardLine}>{firstRunCopy.firstForecast.why.line}</Text>
          </Card>

          <Card testID={firstForecastOnThisPhoneTestID}>
            <Text style={styles.cardTitle}>{firstRunCopy.firstForecast.onThisPhone.title}</Text>
            <Text style={styles.cardLine}>{firstRunCopy.firstForecast.onThisPhone.line}</Text>
          </Card>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label={firstRunCopy.firstForecast.action}
          onPress={onContinue}
          testID={firstForecastActionTestID}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // The middle grows and the two ends do not, so the button sits where it sits on every question
  // she has just answered.
  body: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingBottom: space.spaceLg,
    paddingHorizontal: space.spaceLg,
    paddingTop: space.spaceXl,
  },
  cardLine: {
    color: colour.onSurfaceVariant,
    ...textStyle('body-lg'),
  },
  cardTitle: {
    color: colour.onSurface,
    ...textStyle('label-md'),
    marginBottom: space.spaceXs,
  },
  cards: { gap: space.spaceMd, marginTop: space.spaceXl },
  footer: {
    borderTopColor: colour.outlineVariant,
    borderTopWidth: stroke.hairline,
    padding: space.spaceLg,
  },
  // Under the range rather than beside it, because it says what the two days are worth and a
  // woman reads the days first.
  learning: {
    color: colour.onSurfaceVariant,
    ...textStyle('body-lg'),
  },
  // The accent, and the largest thing on the screen, because the range is what she came through
  // twelve questions to read.
  range: {
    color: colour.primary,
    ...textStyle('headline-md'),
    marginBottom: space.spaceSm,
  },
  scroll: { flex: 1 },
  title: {
    color: colour.onSurface,
    ...textStyle('headline-lg'),
    marginBottom: space.spaceMd,
  },
});
