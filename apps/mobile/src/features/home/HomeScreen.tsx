import type { DayRecord, Feeling, Goal, Regularity } from '@emi/crypto';
import type { ForecastResult } from '@emi/cycle';
import { type IconName, MINIMUM_TAP_TARGET, colour, space, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CycleRing } from '../../components/CycleRing';
import { Screen } from '../../components/Screen';
import { cycleCopy } from '../cycle/copy';
import type { HerDay } from '../cycle/herWeek';
import type { RingInput } from '../cycle/ringInput';
import { FertileWindow } from '../forecast/FertileWindow';
import { NextPeriodOrLearning } from '../forecast/Learning';
import { whatSheMarkedOn } from '../log/copy';
import { HomeHeader } from './HomeHeader';
import { LoggedToday } from './LoggedToday';
import { PhaseLine } from './PhaseLine';
import { RoundAction, type RoundActionName } from './RoundAction';
import { WeekStrip } from './WeekStrip';
import { MeasuredRows } from './MeasuredRow';
import { homeCopy } from './copy';
import type { MeasuredNumber } from './herNumbers';
import { theFertileWindowIsOffered, theRecordForHerDoctorIsOffered } from './homeCards';
import { thePainLineIsOffered } from './painLine';

/**
 * The one screen she opens. The ring carries the meaning and the words underneath it stay small,
 * which is design section 9.1: she reads everything and a stranger beside her reads nothing.
 *
 * The forecast arrives already worked out. This screen does no arithmetic of its own, so what the
 * arcs draw and what the sentence names are the same answer read twice.
 */

export { homeGreetingTestID } from './HomeHeader';
export { roundActionTestID, roundActions } from './RoundAction';
export { loggedTodayTestID } from './LoggedToday';
export { phaseLineTestID } from './PhaseLine';
export { weekStripTestID } from './WeekStrip';

/**
 * The two actions and the drawing each one carries. The order is the order the drawing places
 * them in, and nothing else on this screen decides it.
 */
const theRoundActions: readonly { action: RoundActionName; icon: IconName }[] = [
  { action: 'period', icon: 'drop' },
  { action: 'symptoms', icon: 'sun' },
];

export const homeScreenTestID = 'home-screen';
export const homeNoRingTestID = 'home-no-ring';
export const homeForecastTestID = 'home-forecast';
export const homePainLineTestID = 'home-pain-line';
export const homeFertileWindowTestID = 'home-fertile-window';
export const homeDoctorRecordTestID = 'home-doctor-record';
export const homeFiguresLineTestID = 'home-figures-line';
export const homeFiguresPressTestID = 'home-figures-press';
export const homeCyclesLineTestID = 'home-cycles-line';

interface Props {
  /** The cycle she is in, or nothing at all before a day is recorded. */
  readonly ring: RingInput | undefined;
  /**
   * The week she is in, Monday to Sunday, worked out from the same cycle cache the ring is. It
   * arrives already worked out, so the strip and the ring cannot count her days two ways.
   */
  readonly week?: readonly HerDay[];
  /** Her own day, which is what a day of the strip is named against for a screen reader. */
  readonly today?: string;
  /**
   * Today as she left it, read out of the same days the ring and the strip are built from, and
   * nothing at all where she has written nothing today. It is read here and nowhere in the
   * arithmetic: the only thing it moves is the row under the phase line.
   */
  readonly loggedToday?: DayRecord;
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
  /**
   * How she said her period feels, and nothing at all where she skipped the question. It is read
   * here and nowhere in the arithmetic: the only thing it moves is the line below the ring.
   */
  readonly feeling?: Feeling;
  /**
   * What she said she came to Emi for, and nothing at all where she skipped the question. Each
   * goal draws one card, and a woman who asked for neither reads the screen as it was before.
   */
  readonly goals?: readonly Goal[];
  /**
   * Her three measurements beside the published figures, and nothing at all until her own days
   * carry all three. Emi holds no sample data, so a section it cannot fill is absent rather than
   * filled with somebody else's numbers.
   */
  readonly numbers?: readonly MeasuredNumber[];
  /**
   * The way to the page that says where each published figure comes from. Nothing at all where
   * the caller offers none, and then the press under the line is not drawn either.
   */
  readonly onFigures?: () => void;
  /** The way into the log, which the round action under the ring takes her by. */
  readonly onPeriod: () => void;
  /** The second round action. It reaches the log too until step 5 points it at the groups. */
  readonly onSymptoms: () => void;
  /** The way to the pain group of the log, which only the line below the ring takes her by. */
  readonly onLogPain: () => void;
  /** The way out, which only the card a woman who asked for it reads takes her by. */
  readonly onExport: () => void;
  /** The way into her month, which every day of her week takes her by, naming the day she pressed. */
  readonly onOpenMonth?: (day: string) => void;
}

export function HomeScreen({
  ring,
  week,
  today,
  loggedToday,
  forecast,
  cycleLengthDays,
  name,
  regularity,
  feeling,
  goals,
  numbers,
  onFigures,
  onPeriod,
  onSymptoms,
  onLogPain,
  onExport,
  onOpenMonth,
}: Props): ReactNode {
  const marked = whatSheMarkedOn(loggedToday);

  return (
    <Screen testID={homeScreenTestID}>
      <ScrollView contentContainerStyle={styles.body} style={styles.scroll}>
        <HomeHeader name={name} />

        {week === undefined || today === undefined ? null : (
          <View style={styles.week}>
            <WeekStrip days={week} onOpenMonth={onOpenMonth} today={today} />
          </View>
        )}

        {ring === undefined ? null : (
          <View style={styles.phaseLine}>
            <PhaseLine ring={ring} />
          </View>
        )}

        {marked === undefined ? null : (
          <View style={styles.logged}>
            <LoggedToday marked={marked} onPress={onSymptoms} />
          </View>
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

        <View style={styles.roundActions}>
          {theRoundActions.map((round) => (
            <RoundAction
              action={round.action}
              icon={round.icon}
              key={round.action}
              label={homeCopy.roundAction[round.action]}
              onPress={round.action === 'period' ? onPeriod : onSymptoms}
            />
          ))}
        </View>

        <View style={styles.forecast} testID={homeForecastTestID}>
          <NextPeriodOrLearning
            cycleLengthDays={cycleLengthDays}
            regularity={regularity}
            result={forecast}
          />
        </View>

        {theFertileWindowIsOffered(goals, forecast) ? (
          <View style={styles.card} testID={homeFertileWindowTestID}>
            <FertileWindow forecast={forecast} />
          </View>
        ) : null}

        {numbers === undefined ? null : (
          <View style={styles.numbers}>
            <MeasuredRows headings={homeCopy.numbers} numbers={numbers} />
            <Text style={styles.figuresLine} testID={homeFiguresLineTestID}>
              {homeCopy.numbers.line}
            </Text>
            {onFigures === undefined ? null : (
              <Pressable
                accessibilityRole="button"
                onPress={onFigures}
                style={styles.figuresPress}
                testID={homeFiguresPressTestID}
              >
                <Text style={styles.figuresPressLabel}>{homeCopy.numbers.press}</Text>
              </Pressable>
            )}
          </View>
        )}

        {theRecordForHerDoctorIsOffered(goals) ? (
          <Pressable
            accessibilityRole="button"
            onPress={onExport}
            style={styles.offer}
            testID={homeDoctorRecordTestID}
          >
            <Text style={styles.offerLabel}>{homeCopy.doctorRecord}</Text>
          </Pressable>
        ) : null}

        {thePainLineIsOffered(feeling, ring) ? (
          <Pressable
            accessibilityRole="button"
            onPress={onLogPain}
            style={styles.offer}
            testID={homePainLineTestID}
          >
            <Text style={styles.offerLabel}>{homeCopy.painLine}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // The card carries the window the ring already draws in colour, said in words, so it sits
  // under the forecast it is counted back from rather than beside the ways off the screen.
  card: { marginTop: space.spaceMd },
  body: {
    alignItems: 'center',
    flexGrow: 1,
    paddingVertical: space.spaceXl,
  },
  // The line sits under the rows rather than beside them, and it says where the published figure
  // came from. The press under it is the way to the page that answers that.
  figuresLine: {
    color: colour.onSurfaceVariant,
    ...textStyle('body-sm'),
    marginTop: space.spaceSm,
  },
  // The press sits under the line that names the paper, which is where the drawing of this screen
  // places it, and it is left aligned with the rows rather than centred like the ways off the screen.
  figuresPress: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
  },
  figuresPressLabel: {
    color: colour.primary,
    ...textStyle('body-sm'),
  },
  forecast: { marginTop: space.spaceLg },
  // The row sits between the line and the ring, which is where the drawing of this screen places
  // it: she reads the day she is on, then what she already said about it, then the ring.
  logged: {
    alignSelf: 'stretch',
    marginBottom: space.spaceLg,
    paddingHorizontal: space.margin,
  },
  noRing: { alignItems: 'center', paddingHorizontal: space.spaceLg },
  // Her three numbers sit under the forecast they were read from, and above the ways off the
  // screen, because they are something to read rather than somewhere to go.
  numbers: { alignSelf: 'stretch', paddingHorizontal: space.spaceLg },
  // The two actions sit between the ring and the forecast, which is where the drawing places
  // them: she reads the day she is on, then the one press she makes about it.
  roundActions: {
    flexDirection: 'row',
    gap: space.spaceXl,
    justifyContent: 'center',
    marginTop: space.spaceLg,
  },
  // The line sits between her week and the ring, which is where the drawing of this screen places
  // it: she reads the days, then the day she is on, then the ring that draws it.
  phaseLine: { alignSelf: 'stretch', marginBottom: space.spaceLg },
  // Her week sits between the header and the ring, which is where the drawing of this screen
  // places it, and it is the first thing she reads because it answers where she is.
  week: { alignSelf: 'stretch', marginBottom: space.spaceLg },
  // The line says what to do next, and it names a thing SCREEN-2 keeps under 14 points, so it
  // takes the small size rather than the body size a sentence would otherwise get.
  noRingLine: {
    color: colour.onSurfaceVariant,
    ...textStyle('body-sm'),
    textAlign: 'center',
  },
  // Both offers sit between the forecast and the way into the log, because each one takes her
  // somewhere and belongs beside the button it stands in front of. They stay at the small size,
  // which SCREEN-2 holds the whole screen to.
  offer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space.spaceLg,
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.spaceLg,
  },
  offerLabel: {
    color: colour.onSurfaceVariant,
    ...textStyle('body-sm'),
    textAlign: 'center',
  },
  noRingTitle: {
    color: colour.onSurface,
    ...textStyle('headline-md'),
    marginBottom: space.spaceXs,
  },
  // The scroll fills the screen, so the spare room belongs to the body and falls under the last
  // thing on it. A container sized to its own content would leave that room outside the body.
  scroll: { flex: 1 },
});
