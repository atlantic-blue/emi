import { CYCLES_BEFORE_A_FORECAST, type DayRange, type ForecastResult } from '@emi/cycle';
import { colour, space, stroke, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../../components/Button';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { learningCopy, rangeSentence, statedLengthSentence } from '../forecast/copy';
import { cyclesBeforeAForecastSentence, firstForecastTitle, firstRunCopy } from './copy';

/**
 * The first thing Emi says back to her, after twelve questions and before the hold that writes
 * them. It carries no bar, because it asks her nothing: the questions are behind her.
 *
 * Everything on it is worked out from the answers she is still holding in memory, by the
 * arithmetic the home screen reads, so what this screen says is what the one she lands on
 * afterwards says. Nothing is written yet.
 *
 * The answer the arithmetic gives decides which of the two states she reads. A range is two days,
 * and the two cards under it say what the range is worth and where it was worked out, because
 * those are the two things a woman is right to ask of a forecast. No range means she gave no day,
 * and then Emi says so: a guess on day one would be a false sentence on day one.
 */

export const firstForecastTestID = 'onboarding-first-forecast';
export const firstForecastTitleTestID = 'first-forecast-title';
export const firstForecastLinesTestID = 'first-forecast-lines';
export const firstForecastStillLearningTestID = 'first-forecast-still-learning';
export const firstForecastNoGuessTestID = 'first-forecast-no-guess';
export const firstForecastRangeTestID = 'first-forecast-range';
export const firstForecastLearningTestID = 'first-forecast-learning';
export const firstForecastWhyTestID = 'first-forecast-why';
export const firstForecastOnThisPhoneTestID = 'first-forecast-on-this-phone';
export const firstForecastActionTestID = 'first-forecast-action';

interface Props {
  /** What the arithmetic answered for the days she gave, which carries no range where she gave none. */
  readonly forecast: ForecastResult;
  /** The length she gave at the cycle length question, named while Emi has no cycle of hers. */
  readonly cycleLengthDays: number;
  /** Nothing at all where she gave no name, and then the forecast reads the plain sentence. */
  readonly name: string | undefined;
  readonly onContinue: () => void;
}

export function FirstForecast({ cycleLengthDays, forecast, name, onContinue }: Props): ReactNode {
  const start = forecast.start;

  return (
    <Screen drawsTheWash testID={firstForecastTestID}>
      <ScrollView contentContainerStyle={styles.body} style={styles.scroll}>
        {start === undefined ? (
          <WithNoDate cycleLengthDays={cycleLengthDays} />
        ) : (
          <WithARange name={name} start={start} />
        )}
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

function WithARange({
  name,
  start,
}: {
  readonly name: string | undefined;
  readonly start: DayRange;
}): ReactNode {
  return (
    <>
      <View>
        <Text accessibilityRole="header" style={styles.title} testID={firstForecastTitleTestID}>
          {firstForecastTitle(name)}
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
    </>
  );
}

/**
 * What she reads where she passed the question about her last period. There is nothing to count
 * from, so there is no range anywhere on it, and the two cards that explain a range are not drawn.
 *
 * The count comes from the arithmetic's own number rather than from a number written here, and the
 * length is the one she gave, said in the sentence the home screen says it in.
 */
function WithNoDate({ cycleLengthDays }: { readonly cycleLengthDays: number }): ReactNode {
  return (
    <>
      <View>
        <Text accessibilityRole="header" style={styles.title} testID={firstForecastTitleTestID}>
          {firstRunCopy.firstForecast.noDate.title}
        </Text>
        <View style={styles.lines} testID={firstForecastLinesTestID}>
          <Text style={styles.line}>{firstRunCopy.firstForecast.noDate.first}</Text>
          <Text style={styles.line}>{statedLengthSentence(cycleLengthDays)}</Text>
        </View>
      </View>

      <View style={styles.cards}>
        <Card testID={firstForecastStillLearningTestID}>
          <Text style={styles.cardTitle}>{learningCopy.stillLearning}</Text>
          <Text style={styles.cardLine}>
            {cyclesBeforeAForecastSentence(CYCLES_BEFORE_A_FORECAST)}
          </Text>
        </Card>

        <Text style={styles.noGuess} testID={firstForecastNoGuessTestID}>
          {firstRunCopy.firstForecast.noDate.guess}
        </Text>
      </View>
    </>
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
    color: colour.secondaryText,
    ...textStyle('body-lg'),
  },
  cardTitle: {
    color: colour.text,
    ...textStyle('label-md'),
    marginBottom: space.spaceXs,
  },
  cards: { gap: space.spaceMd, marginTop: space.spaceXl },
  footer: {
    borderTopColor: colour.line,
    borderTopWidth: stroke.hairline,
    padding: space.spaceLg,
  },
  line: {
    color: colour.secondaryText,
    ...textStyle('body-lg'),
  },
  lines: { gap: space.spaceSm },
  // Under the range rather than beside it, because it says what the two days are worth and a
  // woman reads the days first.
  learning: {
    color: colour.secondaryText,
    ...textStyle('body-lg'),
  },
  // Outside the card and in the ink the body reads at, because it is the one sentence on the
  // screen about what Emi refuses to do, and a card would read as another aside.
  noGuess: {
    color: colour.text,
    ...textStyle('body-lg'),
  },
  // The accent, and the largest thing on the screen, because the range is what she came through
  // twelve questions to read.
  range: {
    color: colour.accent,
    ...textStyle('headline-md'),
    marginBottom: space.spaceSm,
  },
  scroll: { flex: 1 },
  title: {
    color: colour.text,
    ...textStyle('headline-lg'),
    marginBottom: space.spaceMd,
  },
});
