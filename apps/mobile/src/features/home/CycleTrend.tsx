import { CYCLE_LENGTH_HIGH_DAYS, CYCLE_LENGTH_LOW_DAYS } from '@emi/cycle';
import { colour, radius, space, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Polyline, Rect } from 'react-native-svg';

import { trendCaptionReads, trendSpokenLabel } from './copy';
import type { TrendCycle } from './herTrend';

/**
 * Her last complete cycles as a shape, over the range a paper reports.
 *
 * The band is the published range and the points are her own lengths, so she reads whether her
 * cycles sit inside what was published without Emi saying a word about it. Nothing here calls a
 * cycle normal, and nothing here calls one irregular.
 *
 * The axis is labelled at both ends with days, and the two labels sit outside the drawing: a
 * number inside the drawing could not inherit the face and the size the type scale gives it.
 *
 * The drawing is built from a rectangle, a path and circles alone. The page that pictures this
 * screen turns any other shape into a box of markup, and a box inside a drawing ends the drawing,
 * so every shape after it is lost.
 */

/** The plot, in the units the drawing of this screen uses. The glass decides the width. */
export const PLOT_WIDTH = 264;
export const PLOT_HEIGHT = 130;

/** The radius of one point, and the width of the line joining them, in the same units. */
const POINT_RADIUS = 4;
const JOIN_WIDTH = 2;

export const homeTrendTestID = 'home-trend';
export const trendBandTestID = 'home-trend-band';
export const trendJoinTestID = 'home-trend-join';
export const trendCaptionTestID = 'home-trend-caption';
export const trendPlotTestID = 'home-trend-plot';

export function trendPointTestID(startedOn: string): string {
  return `home-trend-point-${startedOn}`;
}

export type AxisEnd = 'low' | 'high';

export function trendAxisTestID(end: AxisEnd): string {
  return `home-trend-axis-${end}`;
}

/** One point of the chart: the cycle it stands for, and where in the plot it is drawn. */
export interface TrendPoint {
  readonly startedOn: string;
  readonly lengthDays: number;
  readonly x: number;
  readonly y: number;
}

/** The whole chart as numbers, so the drawing below holds no arithmetic of its own. */
export interface TrendPlot {
  /** The days the foot and the head of the axis stand for. */
  readonly lowDays: number;
  readonly highDays: number;
  /** The published range, where it falls in the plot. */
  readonly band: { readonly y: number; readonly height: number };
  readonly points: readonly TrendPoint[];
}

/** Two decimal places, so a coordinate read back off the drawing is the one the plot gave it. */
function rounded(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * The plot of her cycles.
 *
 * The axis stretches to hold the published range as well as her own lengths, so the band is always
 * inside the plot and a cycle that ran outside it is drawn outside it. An axis scaled to her
 * lengths alone would put the edge of the band off the drawing, and then a reader counting the
 * points outside the band would be counting nothing.
 */
export function trendPlot(cycles: readonly TrendCycle[]): TrendPlot {
  const lengths = cycles.map((cycle) => cycle.lengthDays);
  const lowDays = Math.min(CYCLE_LENGTH_LOW_DAYS, ...lengths);
  const highDays = Math.max(CYCLE_LENGTH_HIGH_DAYS, ...lengths);
  const at = (days: number): number =>
    rounded((PLOT_HEIGHT * (highDays - days)) / (highDays - lowDays));
  const slot = PLOT_WIDTH / cycles.length;
  const top = at(CYCLE_LENGTH_HIGH_DAYS);

  return {
    band: { height: rounded(at(CYCLE_LENGTH_LOW_DAYS) - top), y: top },
    highDays,
    lowDays,
    points: cycles.map((cycle, index) => ({
      lengthDays: cycle.lengthDays,
      startedOn: cycle.startedOn,
      x: rounded(slot * (index + 0.5)),
      y: at(cycle.lengthDays),
    })),
  };
}

/** The points as the line joining them reads them, oldest first. */
function joinOf(points: readonly TrendPoint[]): string {
  return points.map((point) => `${String(point.x)},${String(point.y)}`).join(' ');
}

export function CycleTrend({ cycles }: { readonly cycles: readonly TrendCycle[] }): ReactNode {
  const plot = trendPlot(cycles);

  return (
    <View style={styles.trend} testID={homeTrendTestID}>
      <View style={styles.chart}>
        <View style={styles.axis}>
          <Text style={styles.axisLabel} testID={trendAxisTestID('high')}>
            {String(plot.highDays)}
          </Text>
          <Text style={styles.axisLabel} testID={trendAxisTestID('low')}>
            {String(plot.lowDays)}
          </Text>
        </View>

        <Svg
          accessibilityLabel={trendSpokenLabel({
            cycles: cycles.length,
            high: CYCLE_LENGTH_HIGH_DAYS,
            longest: Math.max(...cycles.map((cycle) => cycle.lengthDays)),
            low: CYCLE_LENGTH_LOW_DAYS,
            shortest: Math.min(...cycles.map((cycle) => cycle.lengthDays)),
          })}
          accessibilityRole="image"
          height={PLOT_HEIGHT}
          style={styles.plot}
          testID={trendPlotTestID}
          viewBox={`0 0 ${PLOT_WIDTH} ${PLOT_HEIGHT}`}
        >
          <Rect
            fill={colour.field}
            height={plot.band.height}
            testID={trendBandTestID}
            width={PLOT_WIDTH}
            x={0}
            y={plot.band.y}
          />
          <Polyline
            fill="none"
            points={joinOf(plot.points)}
            stroke={colour.accent}
            strokeLinejoin="round"
            strokeWidth={JOIN_WIDTH}
            testID={trendJoinTestID}
          />
          {plot.points.map((point) => (
            <Circle
              cx={point.x}
              cy={point.y}
              fill={colour.accent}
              key={point.startedOn}
              r={POINT_RADIUS}
              testID={trendPointTestID(point.startedOn)}
            />
          ))}
        </Svg>
      </View>

      <Text style={styles.caption} testID={trendCaptionTestID}>
        {trendCaptionReads(cycles.length)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // The two labels hold the height of the plot and sit at its ends, so the number beside the top of
  // the drawing is the number the top of the drawing stands for.
  axis: {
    height: PLOT_HEIGHT,
    justifyContent: 'space-between',
  },
  axisLabel: {
    color: colour.secondaryText,
    ...textStyle('data-sm'),
    textAlign: 'right',
  },
  // The drawing takes whatever width the glass leaves after the labels, because a chart at a fixed
  // width would not fit the narrowest phone Emi is built for.
  chart: {
    alignItems: 'flex-start',
    columnGap: space.spaceXs,
    flexDirection: 'row',
  },
  caption: {
    color: colour.secondaryText,
    ...textStyle('body-sm'),
    marginTop: space.spaceSm,
  },
  plot: { flex: 1 },
  trend: {
    alignSelf: 'stretch',
    backgroundColor: colour.card,
    borderColor: colour.line,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: space.spaceMd,
  },
});
