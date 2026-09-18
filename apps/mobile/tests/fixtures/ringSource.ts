import { colour } from '@emi/tokens';

export interface RingDrawing {
  /** Degrees of the circle left open, measured at the centre. */
  readonly gap: number;
  /** Where the middle of the gap points, in degrees, counted anticlockwise from three o'clock. */
  readonly opensAt: number;
  /** Empty space around the ring inside the viewBox, as a fraction of the ring's own width. */
  readonly padding: number;
}

const DEFAULT: RingDrawing = { gap: 40, opensAt: 135, padding: 0 };

/**
 * Stands in for the drawn mark while a test runs, so a test never depends on the state of a file
 * another step owns. The colour comes from the token package, so no test writes a colour of its own.
 */
export function ringSource(drawing: Partial<RingDrawing> = {}): string {
  const { gap, opensAt, padding } = { ...DEFAULT, ...drawing };
  const outer = 100;
  const stroke = outer * 0.14;
  const radius = (outer - stroke) / 2;
  const pad = outer * padding;
  const side = outer + pad * 2;
  const centre = side / 2;

  const from = opensAt + gap / 2;
  const to = opensAt - gap / 2 + 360;
  const point = (degrees: number): string => {
    const radians = (degrees * Math.PI) / 180;
    const x = centre + radius * Math.cos(radians);
    const y = centre - radius * Math.sin(radians);
    return `${x.toFixed(4)} ${y.toFixed(4)}`;
  };

  const sweep = to - from;
  const path = `M ${point(from)} A ${radius} ${radius} 0 ${sweep > 180 ? 1 : 0} 0 ${point(to)}`;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${side.toFixed(4)} ${side.toFixed(4)}">`,
    `  <path d="${path}" fill="none" stroke="${colour.ember}" stroke-width="${stroke}" stroke-linecap="round"/>`,
    '</svg>',
  ].join('\n');
}
