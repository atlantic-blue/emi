import {
  MINIMUM_TAP_TARGET,
  type PhaseName,
  colour,
  fontNameFor,
  radius,
  space,
  stroke,
  textStyle,
} from '@emi/tokens';
import { Icon, CappedText as Text } from '@emi/ui';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type TextStyle, type ViewStyle } from 'react-native';

import type { DayMark } from '../cycle/herWeek';
import { monthWeeks, weekdayColumnNames } from '../onboarding/days';
import { monthLegendCopy } from './copy';

/**
 * The month grid, drawn once for every screen that shows a month.
 *
 * It has two modes, and the mode is the role a square carries. One picks a single day: the first
 * run asks which day her last period started on, so its squares are the options of one choice. The
 * other picks a range: the period picker asks which days she bled on, so each square is a day she
 * turns on and off on its own. The calendar screen picks neither and opens the day she presses.
 *
 * What a square draws and what it does when she presses it arrive from the screen; the columns, the
 * rows and the size of a square are the grid's own.
 */

export function dayTestID(day: string): string {
  return `day-${day}`;
}

export function cycleDayTestID(day: string): string {
  return `calendar-cycle-day-${day}`;
}

export function dateTestID(day: string): string {
  return `calendar-date-${day}`;
}

/** The round disc the date sits in, which is where a square carries its fill and its outline. */
export function dateDiscTestID(day: string): string {
  return `calendar-disc-${day}`;
}

/** The ring around the disc of the day she pressed. */
export function pickedRingTestID(day: string): string {
  return `calendar-picked-${day}`;
}

/** The small heart on the disc of a day she recorded sex on. */
export function sexMarkTestID(day: string): string {
  return `calendar-sex-${day}`;
}

/** The legend above the columns, which the screen reading a phase asks for. */
export const monthLegendTestID = 'calendar-legend';

/** The four things the legend names. */
export type LegendEntry = 'period' | 'forecast' | 'possible' | 'fertile';

/** One entry of that legend: a dot and the word beside it. */
export function legendTestID(of: LegendEntry): string {
  return `calendar-legend-${of}`;
}

/** The entry of the legend that names the heart, which only the calendar screen draws. */
export const legendSexTestID = 'calendar-legend-sex';

/** The dot of an entry, which is the colour or the line the grid uses for those days. */
export function legendDotTestID(of: LegendEntry): string {
  return `calendar-legend-dot-${of}`;
}

export const weekTestID = 'calendar-week';
export const emptyCellTestID = 'calendar-empty';

/** The seven boxes a week row sizes: the days it holds, and a box where the month has no day. */
export const weekCellTestIDs = new RegExp(`^(${dayTestID('\\d')}|${emptyCellTestID})`);

/**
 * The tick the chosen day carries. It is the cue that survives a screen read in grey, so it sits
 * under the disc rather than inside it, where the fill would be the only thing saying anything.
 */
export const chosenDayMarkTestID = 'calendar-chosen-mark';

/** Points. The tick sits under a number in a square, so it is drawn smaller than the number. */
const SQUARE_MARK_SIZE = 12;

/** Points. The heart of a day with sex, and the round ground it sits on at the edge of the disc. */
const SEX_MARK_SIZE = 12;
const SEX_MARK_GROUND = 18;

/**
 * Points. How wide and how tall the disc around a date is drawn.
 *
 * The prototype draws it at forty inside a column of forty seven. Emi keeps a gap between two
 * squares, and on the narrowest phone it is built for a column is forty one points, so a disc of
 * forty would leave two filled days touching and reading as one bar.
 */
const THE_DATE_IS_A_DISC_OF = 36;

/** Points. The dot that ties a word of the legend to the days it describes. */
const LEGEND_DOT = 10;

/**
 * Seven squares of 44 points, a gutter each side and the padding of the calendar want 414 points
 * across, and an iPhone 16 has 393. So a square takes the width the row leaves it rather than a
 * width of its own, and keeps the height a thumb needs.
 *
 * What it takes a touch on is widened by half the gap on each side, so every point between two
 * squares belongs to the nearer one and no part of the row is dead.
 */
const HALF_THE_GAP_BETWEEN_SQUARES = space.spaceXs / 2;
const SQUARE_TOUCH = {
  bottom: 0,
  left: HALF_THE_GAP_BETWEEN_SQUARES,
  right: HALF_THE_GAP_BETWEEN_SQUARES,
  top: 0,
} as const;

/** One square of the month, as the screen drawing it asks for it. */
export interface MonthSquare {
  /** The day of her cycle, drawn above the date. Nothing where the screen counts no cycle. */
  readonly cycleDay?: number;
  /** What happened on that date, or what is expected on it. */
  readonly mark: DayMark;
  /**
   * The phase that date fell in, where the screen reads a phase over its month. Nothing at all on a
   * grid that asks her to pick a day, and then no date carries a phase ground.
   */
  readonly phase?: PhaseName;
  /** True inside the fertile window, which is wider than the ovulation phase and marked apart. */
  readonly fertile?: boolean;
  /** True on the one day of that phase the forecast names as the estimated ovulation. */
  readonly ovulating?: boolean;
  /** The day she picked, where the screen asks her to pick one. */
  readonly chosen?: boolean;
  /**
   * The day she pressed on a screen where a press opens a card, which carries a ring around the
   * disc rather than a fill, so a day she bled keeps its fill while she reads it.
   */
  readonly picked?: boolean;
  /** A day the screen draws and will not take, which is dimmed rather than left out. */
  readonly outOfReach?: boolean;
  /** A day she recorded sex on, which carries a small heart on the edge of the disc. */
  readonly hadSex?: boolean;
  /** What a screen reader says about the square. */
  readonly label: string;
  /** Nothing where the square takes no press, and then it is read and never pressed. */
  readonly onPress?: () => void;
  /**
   * What the square is to somebody listening. A screen asking her to pick one day of the month
   * offers a set of options, a screen picking a range offers a tick she turns on and off, and a
   * screen where a day opens something offers a button.
   */
  readonly role?: 'radio' | 'checkbox' | 'button';
}

interface SquareProps {
  readonly day: string;
  readonly square: MonthSquare;
}

/**
 * One square. A day the screen would refuse stays on the grid and takes no press, because a month
 * drawn with holes in it cannot be read as a month.
 *
 * Every cue is a shape as well as a colour, which is design section 3. A day she bled is filled, a
 * day her period is expected on is a broken line, today is a solid ring, and the day she picked
 * fills and carries a tick under the number.
 */
function Square({ day, square }: SquareProps): ReactNode {
  const chosen = square.chosen === true;
  const inside = (
    <>
      {square.cycleDay === undefined ? null : (
        <Text style={styles.cycleDay} testID={cycleDayTestID(day)}>
          {square.cycleDay}
        </Text>
      )}
      <View
        style={[styles.pickedRing, square.picked === true && styles.pickedRingDrawn]}
        testID={pickedRingTestID(day)}
      >
        <View
          style={[
            styles.disc,
            theGroundOfThePhase(square),
            theMark[square.mark],
            chosen && styles.discChosen,
          ]}
          testID={dateDiscTestID(day)}
        >
          <Text style={theNumber(square, chosen)} testID={dateTestID(day)}>
            {Number(day.slice(8, 10))}
          </Text>
        </View>
        {square.hadSex === true ? (
          <View style={styles.sexMark} testID={sexMarkTestID(day)}>
            <Icon colour={colour.accent} name="heart" size={SEX_MARK_SIZE} />
          </View>
        ) : null}
      </View>
      {chosen ? (
        <View testID={chosenDayMarkTestID}>
          <Icon colour={colour.accent} name="check" size={SQUARE_MARK_SIZE} />
        </View>
      ) : null}
    </>
  );
  // The dim goes on the square rather than on the disc, so a day she cannot open keeps whatever
  // the disc inside it says: it is still a day her period is expected on.
  const style = [styles.day, square.outOfReach === true && styles.dayOutOfReach];

  // A square with nothing to press is read and never pressed, so it carries no role. A square the
  // screen refuses is the exception: it is a button she cannot use, and saying so is the only cue
  // a woman who is listening gets, because the dimming is not one.
  if (square.onPress === undefined) {
    return (
      <View
        accessibilityLabel={square.label}
        style={style}
        testID={dayTestID(day)}
        {...(square.outOfReach === true
          ? { accessibilityRole: 'button' as const, accessibilityState: { disabled: true } }
          : {})}
      >
        {inside}
      </View>
    );
  }

  // A tick is checked or it is not, and a choice among many is the one that is selected, so the two
  // modes are spoken differently. A screen reader says nothing at all about `selected` on a
  // checkbox, and the tick under the number is not a cue anybody listening gets.
  const role = square.role ?? 'radio';

  return (
    <Pressable
      accessibilityLabel={square.label}
      accessibilityRole={role}
      accessibilityState={
        role === 'checkbox'
          ? { checked: chosen, disabled: square.outOfReach === true }
          : { disabled: square.outOfReach === true, selected: chosen }
      }
      disabled={square.outOfReach === true}
      hitSlop={SQUARE_TOUCH}
      onPress={square.onPress}
      style={style}
      testID={dayTestID(day)}
    >
      {inside}
    </Pressable>
  );
}

/**
 * What the phase of a date puts under it. The window around ovulation is a tint and the one day of
 * ovulation is a fill, which is two shapes rather than two strengths of one colour.
 *
 * A day she bled fills the disc over the top of either of them, because what she recorded wins
 * over what Emi worked out.
 */
function theGroundOfThePhase(square: MonthSquare): ViewStyle | undefined {
  if (square.ovulating === true) {
    return styles.discOvulation;
  }

  return square.fertile === true ? styles.discFertile : undefined;
}

/**
 * The ink the date is drawn in. A number on a fill takes the ground colour rather than the ink of
 * the phase, because SEE-2 keeps a word off a fill and a figure on one is held to the same floor.
 */
function theNumber(square: MonthSquare, chosen: boolean): TextStyle[] | TextStyle {
  if (chosen || square.mark === 'bled') {
    return [styles.dayNumber, styles.dayNumberOnFill];
  }

  if (square.mark === 'forecast') {
    return [styles.dayNumber, styles.dayNumberForecast];
  }

  if (square.ovulating !== true && square.fertile === true) {
    return [styles.dayNumber, styles.dayNumberOnTheWindow];
  }

  return styles.dayNumber;
}

/** The four things the legend names, in the order the board places them. */
const theLegend: readonly { readonly of: LegendEntry; readonly dot: ViewStyle }[] = [
  { dot: { backgroundColor: colour.period }, of: 'period' },
  {
    dot: { borderColor: colour.period, borderStyle: 'dashed', borderWidth: stroke.icon },
    of: 'forecast',
  },
  {
    dot: { borderColor: colour.luteal, borderStyle: 'dotted', borderWidth: stroke.icon },
    of: 'possible',
  },
  {
    dot: {
      backgroundColor: colour.washWarm,
      borderColor: colour.ovulation,
      borderStyle: 'solid',
      borderWidth: stroke.hairline,
    },
    of: 'fertile',
  },
];

/**
 * What the marks of the grid mean, said in words above the columns.
 *
 * It is off unless a screen asks for it. Two screens draw this grid and the first run asks her to
 * pick a day, where a legend would explain marks that grid never draws.
 */
export function MonthLegend({ namesSex = false }: { readonly namesSex?: boolean }): ReactNode {
  return (
    <View style={styles.legend} testID={monthLegendTestID}>
      {theLegend.map(({ of, dot }) => (
        <View key={of} style={styles.legendEntry} testID={legendTestID(of)}>
          <View style={[styles.legendDot, dot]} testID={legendDotTestID(of)} />
          <Text style={styles.legendWord}>{monthLegendCopy[of]}</Text>
        </View>
      ))}
      {namesSex ? (
        <View style={styles.legendEntry} testID={legendSexTestID}>
          <Icon colour={colour.accent} name="heart" size={SEX_MARK_SIZE} />
          <Text style={styles.legendWord}>{monthLegendCopy.sex}</Text>
        </View>
      ) : null}
    </View>
  );
}

interface Props {
  /** What the grid is named on the glass, which each screen decides for itself. */
  readonly testID: string;
  /** The month drawn, named by any day in it. */
  readonly month: string;
  /** Drawn inside the grid above the columns, where a screen carries its own way to another month. */
  readonly heading?: ReactNode;
  /** Whether the two colours of a phase are named in words above the columns. */
  readonly legend?: boolean;
  readonly squareOf: (day: string) => MonthSquare;
}

/**
 * The month, seven columns wide. A cell is empty where the week runs outside the month, so one
 * weekday holds one column all the way down the grid.
 */
export function CycleMonth({ testID, month, heading, legend, squareOf }: Props): ReactNode {
  return (
    <View style={styles.calendar} testID={testID}>
      {heading}

      {legend === true ? <MonthLegend /> : null}

      <View style={styles.week} testID={weekTestID}>
        {weekdayColumnNames.map((weekday) => (
          <Text accessibilityLabel={weekday} key={weekday} style={styles.weekday}>
            {weekday.slice(0, 1)}
          </Text>
        ))}
      </View>

      {monthWeeks(month).map((week) => (
        <View key={week.join()} style={styles.week} testID={weekTestID}>
          {week.map((day, column) =>
            day === undefined ? (
              <View key={`${month} ${column}`} style={styles.empty} testID={emptyCellTestID} />
            ) : (
              <Square day={day} key={day} square={squareOf(day)} />
            ),
          )}
        </View>
      ))}
    </View>
  );
}

/**
 * What each state adds to a square. A filled day and a ringed day are told apart by a fill against a
 * line, an expected day by the line being broken, and a possible day by a lighter line of dots, so
 * none of them needs colour to be read.
 */
const theMark: Readonly<Record<DayMark, ViewStyle>> = StyleSheet.create({
  bled: { backgroundColor: colour.period, borderColor: colour.period },
  forecast: { borderColor: colour.period, borderStyle: 'dashed' },
  plain: {},
  possible: { borderColor: colour.luteal, borderStyle: 'dotted' },
  today: { borderColor: colour.accent, borderStyle: 'solid' },
});

const styles = StyleSheet.create({
  calendar: {
    backgroundColor: colour.card,
    borderRadius: radius.xl,
    marginTop: space.spaceMd,
    padding: space.spaceMd,
  },
  // The cycle day is the smallest and palest thing in a square, because it is the number she checks
  // rather than the number she looks for, and the date under it is what she scans the row by.
  cycleDay: {
    color: colour.dockQuiet,
    ...textStyle('label-sm'),
    fontFamily: fontNameFor('text', 400),
  },
  // The square is what her thumb finds and the disc inside it is what she reads, so the square
  // carries the height a thumb needs and no colour of its own at all.
  day: {
    alignItems: 'center',
    flex: 1,
    gap: space.spaceXs,
    justifyContent: 'center',
    minHeight: MINIMUM_TAP_TARGET,
  },
  dayNumber: {
    color: colour.text,
    ...textStyle('body-lg'),
  },
  dayNumberForecast: { color: colour.period, fontWeight: '800' },
  dayNumberOnFill: { color: colour.onAccent },
  dayNumberOnTheWindow: { color: colour.ovulationInk },
  dayOutOfReach: { opacity: 0.4 },
  // Every disc carries the line the ringed one carries, drawn in the ground of the card where it
  // carries none, so nothing moves by a point and a half when a date turns out to be today.
  disc: {
    alignItems: 'center',
    borderColor: colour.card,
    borderRadius: radius.full,
    borderWidth: stroke.icon,
    height: THE_DATE_IS_A_DISC_OF,
    justifyContent: 'center',
    width: THE_DATE_IS_A_DISC_OF,
  },
  discChosen: { backgroundColor: colour.accent, borderColor: colour.accentSoftInk },
  // The window around ovulation, which is a tint rather than a fill, because the one day inside it
  // is the fill and the two have to be told apart.
  discFertile: { backgroundColor: colour.washWarm, borderColor: colour.washWarm },
  discOvulation: { backgroundColor: colour.ovulation, borderColor: colour.ovulation },
  empty: { flex: 1, minHeight: MINIMUM_TAP_TARGET },
  // The ring of the day she pressed stands a little outside the disc, with the ground between,
  // so it is never read as the solid ring that says today.
  pickedRing: {
    alignItems: 'center',
    borderColor: 'transparent',
    borderRadius: radius.full,
    borderWidth: stroke.icon,
    justifyContent: 'center',
    padding: 1,
  },
  // A border with no style named is a border a browser does not draw, so the pictures would show
  // no ring at all.
  pickedRingDrawn: { borderColor: colour.text, borderStyle: 'solid' },
  // The heart sits over the edge of the disc rather than under it, so a week with sex in it is no
  // taller than a week without, and its own ground keeps it legible on a filled day.
  sexMark: {
    alignItems: 'center',
    backgroundColor: colour.card,
    borderRadius: radius.full,
    bottom: -2,
    height: SEX_MARK_GROUND,
    justifyContent: 'center',
    position: 'absolute',
    right: -2,
    width: SEX_MARK_GROUND,
  },
  legend: {
    columnGap: space.spaceLg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: space.spaceMd,
    rowGap: space.spaceSm,
  },
  legendDot: { borderRadius: radius.full, height: LEGEND_DOT, width: LEGEND_DOT },
  legendEntry: { alignItems: 'center', flexDirection: 'row', gap: space.spaceSm },
  legendWord: {
    color: colour.secondaryText,
    ...textStyle('label-sm'),
  },
  week: { flexDirection: 'row', gap: space.spaceXs, marginBottom: space.spaceSm },
  weekday: {
    color: colour.secondaryText,
    flex: 1,
    ...textStyle('label-sm'),
    textAlign: 'center',
  },
});
