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
import { CycleStrips } from './CycleStrip';
import { CycleTrend } from './CycleTrend';
import { HomeHeader } from './HomeHeader';
import { LoggedToday } from './LoggedToday';
import { PhaseLine } from './PhaseLine';
import { RoundAction, type RoundActionName } from './RoundAction';
import { SectionWaiting } from './SectionWaiting';
import { WeekStrip } from './WeekStrip';
import { MeasuredRows } from './MeasuredRow';
import { PatternCards } from './PatternCard';
import { cyclesOutsideReads, cyclesWaitingReads, homeCopy, trendWaitingReads } from './copy';
import type { ReadCycle } from '../cycle/cyclesRead';
import type { MeasuredNumber } from './herNumbers';
import { type TrendCycle, cyclesBeforeATrend, cyclesOutsideTheBand } from './herTrend';
import type { ReadPattern } from '../cycle/patternsRead';
import { theFertileWindowIsOffered, theRecordForHerDoctorIsOffered } from './homeCards';
import { thePainLineIsOffered } from './painLine';
import { patternsWaiting } from '../cycle/patternsWaiting';

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
export { sectionWaitingTestID, waitingSections } from './SectionWaiting';

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
export const homeTrendCountTestID = 'home-trend-count';
export const homeTrendPressTestID = 'home-trend-press';
export const homePatternsLineTestID = 'home-patterns-line';
export const homePatternsPressTestID = 'home-patterns-press';

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
   * How many of her cycles are complete, counted off the rows the rest of this screen is read from.
   * Every section that cannot be filled yet names it, so the number she is told to wait for is one
   * Emi read rather than one it chose.
   *
   * Nothing at all where the caller counted no rows, and then no waiting section is drawn either. A
   * sentence saying how far off she is stands on a count Emi read, so without one there is nothing
   * truthful to say and the section stays absent.
   */
  readonly completeCycles?: number;
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
   * Her recent cycles, the one she is in first, and nothing at all where the cache holds none.
   * Each one arrives already divided into its four phases, so this screen and the Insights screen
   * cannot draw one cycle two ways.
   */
  readonly cycles?: readonly ReadCycle[];
  /**
   * Her last complete cycles, oldest first, and nothing at all before two of them are complete.
   * They are the six cycles the forecast takes its median over, so the shape she reads and the
   * range she is given cannot stand on two different readings of her days.
   */
  readonly trend?: readonly TrendCycle[];
  /**
   * The symptoms that came back, most repeated first, and nothing at all where none of them came
   * back in enough of her cycles. Emi holds no sample data, so a section it cannot fill is absent.
   */
  readonly patterns?: readonly ReadPattern[];
  /**
   * The way to the page that already lists those same cycles in full. The link under the chart
   * is not drawn where the caller offers none.
   */
  readonly onOpenCycles?: () => void;
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
  /** The way to one cycle on the Insights screen, which a strip takes her by. */
  readonly onOpenCycle?: (startedOn: string) => void;
  /** The way to one symptom on the Insights screen, which a card takes her by. */
  readonly onOpenPattern?: (slug: string) => void;
  /**
   * The way to every symptom that came back, in full. The link under the cards is not drawn where
   * the caller offers none.
   */
  readonly onOpenPatterns?: () => void;
}

export function HomeScreen({
  ring,
  week,
  today,
  loggedToday,
  forecast,
  cycleLengthDays,
  completeCycles,
  name,
  regularity,
  feeling,
  goals,
  numbers,
  cycles,
  trend,
  patterns,
  onFigures,
  onOpenCycles,
  onPeriod,
  onSymptoms,
  onLogPain,
  onExport,
  onOpenMonth,
  onOpenCycle,
  onOpenPattern,
  onOpenPatterns,
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

        {numbers !== undefined || completeCycles === undefined ? null : (
          <View style={styles.waiting}>
            <SectionWaiting
              heading={homeCopy.waiting.cycles}
              section="cycles"
              {...cyclesWaitingReads(completeCycles)}
            />
          </View>
        )}

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

        {cycles === undefined || onOpenCycle === undefined ? null : (
          <View style={styles.cycles}>
            <CycleStrips cycles={cycles} onOpenCycle={onOpenCycle} />
            <Text style={styles.cyclesLine} testID={homeCyclesLineTestID}>
              {homeCopy.cycles.line}
            </Text>
          </View>
        )}

        {trend !== undefined || completeCycles === undefined ? null : (
          <View style={styles.waiting}>
            <SectionWaiting
              heading={homeCopy.waiting.trend}
              section="trend"
              {...trendWaitingReads(cyclesBeforeATrend)}
            />
          </View>
        )}

        {trend === undefined ? null : (
          <View style={styles.trend}>
            <CycleTrend cycles={trend} />
            <Text style={styles.trendCount} testID={homeTrendCountTestID}>
              {cyclesOutsideReads(cyclesOutsideTheBand(trend), trend.length)}
            </Text>
            {onOpenCycles === undefined ? null : (
              <Pressable
                accessibilityRole="button"
                onPress={onOpenCycles}
                style={styles.trendPress}
                testID={homeTrendPressTestID}
              >
                <Text style={styles.trendPressLabel}>{homeCopy.trend.press}</Text>
              </Pressable>
            )}
          </View>
        )}

        {patterns !== undefined || completeCycles === undefined ? null : (
          <View style={styles.waiting}>
            <SectionWaiting
              heading={homeCopy.waiting.patterns}
              section="patterns"
              {...patternsWaiting(completeCycles)}
            />
          </View>
        )}

        {patterns === undefined || onOpenPattern === undefined ? null : (
          <View style={styles.patterns}>
            <PatternCards onOpenPattern={onOpenPattern} patterns={patterns} />
            <Text style={styles.patternsLine} testID={homePatternsLineTestID}>
              {homeCopy.patterns.line}
            </Text>
            {onOpenPatterns === undefined ? null : (
              <Pressable
                accessibilityRole="button"
                onPress={onOpenPatterns}
                style={styles.patternsPress}
                testID={homePatternsPressTestID}
              >
                <Text style={styles.patternsPressLabel}>{homeCopy.patterns.press}</Text>
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
  // The content begins hard against the top of the glass, and the room at the foot is the larger of
  // the two whether her days fill the screen or not. On day one the three waiting sections carry the
  // body past the height of the glass, so there is no spare room to fall anywhere, and a foot equal
  // to the top would leave the last sentence reading against the edge of the dock.
  body: {
    alignItems: 'center',
    flexGrow: 1,
    paddingBottom: space.spaceXl + space.spaceLg,
    paddingTop: space.spaceXl,
  },
  // The line sits under the rows rather than beside them, and it says where the published figure
  // came from. The press under it is the way to the page that answers that.
  // Her own cycles sit under the numbers they were read from, because a strip is the shape of a
  // cycle and a number is one measurement of it, and she reads the measurement first.
  cycles: { alignSelf: 'stretch', marginTop: space.spaceLg, paddingHorizontal: space.spaceLg },
  // The line sits under the strips and says what a strip is, so nothing is drawn over a fill.
  cyclesLine: {
    color: colour.onSurfaceVariant,
    ...textStyle('body-sm'),
    marginTop: space.spaceSm,
  },
  // Her trend sits under the strips it was read from, because a strip is one cycle and the chart
  // is the shape of six, and she reads the one she is in before the shape of the six behind it.
  trend: { alignSelf: 'stretch', marginTop: space.spaceLg, paddingHorizontal: space.spaceLg },
  // What came back sits under the shape of her six cycles, because the chart is the measurement
  // and a card is what Emi makes of it, and she reads the measurement first.
  patterns: { alignSelf: 'stretch', marginTop: space.spaceLg, paddingHorizontal: space.spaceLg },
  // The line sits under the cards and says what Emi refuses to call a pattern, so the rule she is
  // reading the cards against is on the screen with them.
  patternsLine: {
    color: colour.onSurfaceVariant,
    ...textStyle('body-sm'),
    marginTop: space.spaceSm,
  },
  // The link sits under that line, left aligned with the cards rather than centred like the ways
  // off the screen, which is where the drawing of this screen places it.
  patternsPress: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
  },
  patternsPressLabel: {
    color: colour.primary,
    ...textStyle('body-sm'),
  },
  trendCount: {
    color: colour.onSurface,
    ...textStyle('body-sm'),
    marginTop: space.spaceSm,
  },
  // The link sits under the sentence, where the drawing of this screen places it, left aligned
  // with the chart rather than centred like the ways off the screen.
  trendPress: {
    alignItems: 'flex-start',
    justifyContent: 'center',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
  },
  trendPressLabel: {
    color: colour.primary,
    ...textStyle('body-sm'),
  },
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
  // A section she has not earned yet is held to the width the filled sections take, so the screen
  // keeps one left edge whether her days fill it or not.
  waiting: { alignSelf: 'stretch', paddingHorizontal: space.spaceLg },
  // The scroll fills the screen, so the spare room belongs to the body and falls under the last
  // thing on it. A container sized to its own content would leave that room outside the body.
  scroll: { flex: 1 },
});
