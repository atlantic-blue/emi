import type { ReactNode } from 'react';

import type { TrendCycle } from './herTrend';

/**
 * Where her cycles are drawn over the published range. Nothing is drawn yet, so the section holds
 * no band, no point and no caption, and every case that reads one fails.
 */

/** The plot, in the units the drawing of this screen uses. The glass decides the width. */
export const PLOT_WIDTH = 264;
export const PLOT_HEIGHT = 130;

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

export function CycleTrend(_props: { readonly cycles: readonly TrendCycle[] }): ReactNode {
  return null;
}
