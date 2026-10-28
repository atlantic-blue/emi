import {
  DAYS_EITHER_SIDE_WHILE_LEARNING,
  type DayRange,
  type ForecastResult,
  addDays,
  toDayNumber,
} from '@emi/cycle';
import { ICON_SIZE, colour, radius, space, stroke, textStyle } from '@emi/tokens';
import { Icon } from '@emi/ui';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { PrimaryButton } from '../../components/Button';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { StatusPill } from '../../components/StatusPill';
import { forecastCopy, lateSentence, rangeSentence } from '../forecast/copy';
import {
  countsFromTheFirstPeriodSentence,
  cyclesBeforeAForecastSentence,
  firstRunCopy,
  stillLearningSentence,
  whyFromHerCyclesSentences,
  whyFromTheLengthSheGaveSentences,
} from './copy';

/**
 * The first thing Emi says back to her, after the questions and before the hold that writes them.
 * Everything on it is worked out from the answers she is still holding in memory, by the
 * arithmetic the home screen reads. Nothing is written yet.
 *
 * At the first run the arithmetic has at most one complete cycle, so it always answers that it is
 * still learning. A range is then the length she gave counted from her last period, with the
 * cohort's spread either side, and every count on the screen is read off that answer.
 */

export const firstForecastTestID = 'onboarding-first-forecast';
export const firstForecastTitleTestID = 'first-forecast-title';
export const firstForecastLinesTestID = 'first-forecast-lines';
export const firstForecastStillLearningTestID = 'first-forecast-still-learning';
export const firstForecastNoGuessTestID = 'first-forecast-no-guess';
export const firstForecastRangeTestID = 'first-forecast-range';
export const firstForecastLateTestID = 'first-forecast-late';
export const firstForecastLearningTestID = 'first-forecast-learning';
export const firstForecastDaysTestID = 'first-forecast-days';
export const firstForecastWhyTestID = 'first-forecast-why';
export const firstForecastNeedsTestID = 'first-forecast-needs';
export const firstForecastRingTestID = 'first-forecast-ring';
export const firstForecastActionTestID = 'first-forecast-action';

export function firstForecastDayTestID(day: string): string {
  return `first-forecast-day-${day}`;
}

/** Every day of the range, both ends included, so a circle stands for each day it names. */
export function theDaysOf(range: DayRange): string[] {
  const count = toDayNumber(range.to) - toDayNumber(range.from) + 1;

  return Array.from({ length: count }, (_, offset) => addDays(range.from, offset));
}

interface Props {
  /** What the arithmetic answered for the days she gave, which carries no range where she gave none. */
  readonly forecast: ForecastResult;
  /** The length she gave at the cycle length question, and nothing where she gave none. */
  readonly cycleLengthDays: number | undefined;
  readonly daysLate?: number;
  readonly onContinue: () => void;
}

export function FirstForecast({
  cycleLengthDays,
  daysLate,
  forecast,
  onContinue,
}: Props): ReactNode {
  return (
    <Screen drawsTheWash testID={firstForecastTestID}>
      <ScrollView contentContainerStyle={styles.body} style={styles.scroll}>
        {daysLate !== undefined ? (
          <Late daysLate={daysLate} />
        ) : forecast.start === undefined ? (
          <WithNoDate
            cycleLengthDays={cycleLengthDays}
            needsCycles={forecast.kind === 'learning' ? forecast.needsCycles : 0}
          />
        ) : (
          <WithARange
            cycleLengthDays={cycleLengthDays}
            forecast={forecast}
            start={forecast.start}
          />
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

/**
 * What the why card says, each count read off a number the arithmetic used. It names no confidence
 * word: the word read as a verdict she could not check, and the count of cycles is what it rested on.
 */
function whyLines(forecast: ForecastResult, cycleLengthDays: number | undefined): string[] {
  if (forecast.kind === 'forecast') {
    return whyFromHerCyclesSentences(forecast.fromCycles);
  }

  if (cycleLengthDays === undefined) {
    return [];
  }

  return whyFromTheLengthSheGaveSentences({
    cycleLengthDays,
    daysEitherSide: DAYS_EITHER_SIDE_WHILE_LEARNING,
  });
}

function WithARange({
  cycleLengthDays,
  forecast,
  start,
}: {
  readonly cycleLengthDays: number | undefined;
  readonly forecast: ForecastResult;
  readonly start: DayRange;
}): ReactNode {
  const isLearning = forecast.kind === 'learning';

  return (
    <View style={styles.column}>
      <Text accessibilityRole="header" style={styles.label} testID={firstForecastTitleTestID}>
        {firstRunCopy.firstForecast.title}
      </Text>
      <Text style={styles.range} testID={firstForecastRangeTestID}>
        {rangeSentence(start)}
      </Text>
      {isLearning ? (
        <View style={styles.tagRow} testID={firstForecastLearningTestID}>
          <StatusPill label={firstRunCopy.firstForecast.stillLearning} tone="accent" />
        </View>
      ) : null}

      <View style={styles.cards}>
        <Card testID={firstForecastWhyTestID}>
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={styles.days}
            testID={firstForecastDaysTestID}
          >
            {theDaysOf(start).map((day) => (
              <View key={day} style={styles.day} testID={firstForecastDayTestID(day)}>
                <Text style={styles.dayNumber}>{String(Number(day.slice(8, 10)))}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.cardTitle}>{firstRunCopy.firstForecast.why.title}</Text>
          <Text style={styles.cardLine}>{whyLines(forecast, cycleLengthDays).join(' ')}</Text>
        </Card>
      </View>

      {forecast.kind === 'learning' ? (
        <Text style={styles.needs} testID={firstForecastNeedsTestID}>
          {stillLearningSentence(forecast.needsCycles)}
        </Text>
      ) : null}
    </View>
  );
}

function Late({ daysLate }: { readonly daysLate: number }): ReactNode {
  return (
    <View style={styles.column}>
      <Text accessibilityRole="header" style={styles.label} testID={firstForecastTitleTestID}>
        {forecastCopy.nextPeriod}
      </Text>
      <Text style={styles.range} testID={firstForecastLateTestID}>
        {lateSentence(daysLate)}
      </Text>
    </View>
  );
}

const RING_SIZE = 160;
const RING_BEAD = 14;

/** A ring of beads with a drop in it: a cycle that has not started to be counted. */
function TheEmptyRing(): ReactNode {
  const radiusOfRing = (RING_SIZE - RING_BEAD) / 2;
  // A whole number of beads, each a bead wide apart, so the ring closes with no seam.
  const circumference = 2 * Math.PI * radiusOfRing;
  const beadSpacing = circumference / Math.round(circumference / RING_BEAD);

  return (
    <View style={styles.ring} testID={firstForecastRingTestID}>
      <Svg height={RING_SIZE} width={RING_SIZE}>
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          fill="none"
          r={radiusOfRing}
          stroke={colour.emptyRing}
          strokeDasharray={`0.01 ${String(beadSpacing - 0.01)}`}
          strokeLinecap="round"
          strokeWidth={RING_BEAD}
        />
      </Svg>
      <View style={styles.ringDrop}>
        <Icon colour={colour.accent} name="drop" size={ICON_SIZE * 1.5} />
      </View>
    </View>
  );
}

/**
 * What she reads where she passed the question about her last period. There is nothing to count
 * from, so there is no range anywhere on it.
 */
function WithNoDate({
  cycleLengthDays,
  needsCycles,
}: {
  readonly cycleLengthDays: number | undefined;
  readonly needsCycles: number;
}): ReactNode {
  return (
    <View style={styles.column}>
      <TheEmptyRing />
      <Text accessibilityRole="header" style={styles.title} testID={firstForecastTitleTestID}>
        {firstRunCopy.firstForecast.noDate.title}
      </Text>
      <View style={styles.lines} testID={firstForecastLinesTestID}>
        <Text style={styles.firstLine}>{firstRunCopy.firstForecast.noDate.first}</Text>
        {cycleLengthDays === undefined ? null : (
          <Text style={styles.line}>{countsFromTheFirstPeriodSentence(cycleLengthDays)}</Text>
        )}
      </View>

      <View style={styles.cards}>
        <Card testID={firstForecastStillLearningTestID}>
          <StatusPill label={firstRunCopy.firstForecast.stillLearning} tone="accent" />
          <Text style={styles.cardHeading}>{cyclesBeforeAForecastSentence(needsCycles)}</Text>
          <Text style={styles.cardSmall} testID={firstForecastNoGuessTestID}>
            {firstRunCopy.firstForecast.noDate.guess}
          </Text>
        </Card>
      </View>
    </View>
  );
}

const DAY_SIZE = 36;

const styles = StyleSheet.create({
  body: {
    flexGrow: 1,
    paddingBottom: space.spaceLg,
    paddingHorizontal: space.spaceLg,
    paddingTop: space.spaceXl,
  },
  cardHeading: {
    color: colour.text,
    ...textStyle('choice-lg'),
    marginTop: space.spaceMd,
  },
  cardLine: {
    color: colour.secondaryText,
    ...textStyle('body-sm'),
  },
  cardSmall: {
    color: colour.secondaryText,
    ...textStyle('body-sm'),
    marginTop: space.spaceSm,
  },
  cardTitle: {
    color: colour.text,
    ...textStyle('headline-sm'),
    marginBottom: space.spaceXs,
  },
  cards: { alignSelf: 'stretch', gap: space.spaceMd, marginTop: space.spaceXl },
  column: { alignItems: 'center' },
  day: {
    alignItems: 'center',
    borderColor: colour.accent,
    borderRadius: radius.full,
    borderStyle: 'dashed',
    borderWidth: stroke.icon,
    height: DAY_SIZE,
    justifyContent: 'center',
    width: DAY_SIZE,
  },
  dayNumber: {
    color: colour.accent,
    ...textStyle('label-md'),
  },
  // The circles wrap rather than shrink, because a range the arithmetic widens is still one circle
  // a day.
  days: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.spaceXs,
    justifyContent: 'center',
    marginBottom: space.spaceLg,
  },
  firstLine: {
    color: colour.text,
    ...textStyle('choice-lg'),
    textAlign: 'center',
  },
  footer: {
    padding: space.spaceLg,
  },
  label: {
    color: colour.accent,
    ...textStyle('label-md'),
    marginBottom: space.spaceSm,
    textAlign: 'center',
  },
  line: {
    color: colour.secondaryText,
    ...textStyle('body-lg'),
    textAlign: 'center',
  },
  lines: { gap: space.spaceSm },
  needs: {
    color: colour.secondaryText,
    ...textStyle('body-sm'),
    marginTop: space.spaceXl,
    textAlign: 'center',
  },
  // The largest thing on the screen, because the range is what she came through the questions to
  // read.
  range: {
    color: colour.text,
    ...textStyle('headline-lg'),
    textAlign: 'center',
  },
  ring: {
    alignItems: 'center',
    height: RING_SIZE,
    justifyContent: 'center',
    marginBottom: space.spaceXl,
    width: RING_SIZE,
  },
  ringDrop: { position: 'absolute' },
  scroll: { flex: 1 },
  tagRow: { marginTop: space.spaceMd },
  title: {
    color: colour.text,
    ...textStyle('headline-lg'),
    marginBottom: space.spaceMd,
    textAlign: 'center',
  },
});
