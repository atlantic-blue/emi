import { colour } from '../../packages/tokens/src/colour.ts';

import { DOT, letters, STEM_TOP, type Command, type Letter } from './letters.ts';

/**
 * The gap opens at the upper left, so the eye reads a motion that continues rather than a
 * circle that broke.
 */
export const GAP_BEARING_DEGREES = 135;

/**
 * The design drew the gap at 40 degrees and it holds. At 16 points, the smallest the mark is
 * ever drawn, the ground still runs through it in a channel 1.26 pixels wide, so a pixel of
 * ground survives the antialiasing rather than greying over. Narrowing it below about 32
 * degrees takes the channel under a pixel and the ring starts to read as closed.
 */
export const GAP_DEGREES = 40;

/**
 * The centre line radius, counted in stroke widths. Below about 1.5 the hole is narrower
 * than the stroke and the mark reads as a thick crescent rather than as a ring.
 */
export const RADIUS_IN_STROKES = 1.7;

/** The air above the i, and the air around the lockup, are both counted in stroke widths. */
export const AIR_ABOVE_STEM_IN_STROKES = 1;
export const LOCKUP_AIR_IN_STROKES = 2;

/** The serifs sit at both ends of the i, so the stem is measured between them. */
const STEM_BAND = { from: 0.3, to: 0.7 } as const;

/** Enough segments that a curve anywhere in this mark stays smooth to within a unit. */
const FLATTENING_STEPS = 24;

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Ring {
  readonly centreX: number;
  readonly centreY: number;
  /** The centre line of the stroke, half way through it. */
  readonly radius: number;
  readonly stroke: number;
  readonly outerRadius: number;
  readonly innerRadius: number;
  readonly gapDegrees: number;
  readonly bearingDegrees: number;
}

export interface Drawing {
  readonly width: number;
  readonly height: number;
  /** Every outline in the drawing, flattened, with y running down as svg does. */
  readonly contours: readonly (readonly Point[])[];
  readonly ring: Ring;
  readonly svg: string;
}

export function flatten(contour: readonly Command[]): Point[] {
  const points: Point[] = [];
  let x = 0;
  let y = 0;
  for (const command of contour) {
    if (command.type === 'M' || command.type === 'L') {
      points.push({ x: command.x, y: command.y });
      x = command.x;
      y = command.y;
    } else if (command.type === 'Q') {
      for (let step = 1; step <= FLATTENING_STEPS; step++) {
        const t = step / FLATTENING_STEPS;
        const m = 1 - t;
        points.push({
          x: m * m * x + 2 * m * t * command.x1 + t * t * command.x,
          y: m * m * y + 2 * m * t * command.y1 + t * t * command.y,
        });
      }
      x = command.x;
      y = command.y;
    }
  }
  return points;
}

function crossingsAt(points: readonly Point[], y: number): number[] {
  const xs: number[] = [];
  for (let k = 0; k < points.length; k++) {
    const a = points[k] as Point;
    const b = points[(k + 1) % points.length] as Point;
    if ((a.y <= y && b.y > y) || (b.y <= y && a.y > y)) {
      xs.push(a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x));
    }
  }
  return xs.sort((one, other) => one - other);
}

function letterOf(character: string): Letter {
  const found = letters.find((letter) => letter.character === character);
  if (found === undefined) {
    throw new Error(`the wordmark has no letter ${character}`);
  }
  return found;
}

/**
 * The narrowest the i is between its serifs. The ring's stroke is this, so the ring carries
 * the weight of ink the letter it grew out of carries.
 */
export function stemWidth(): number {
  const stem = letterOf('i').contours[0];
  if (stem === undefined) {
    throw new Error('the i has no stem');
  }
  const points = flatten(stem);
  const top = Math.max(...points.map((point) => point.y));
  const bottom = Math.min(...points.map((point) => point.y));
  let narrowest = Infinity;
  for (let step = 0; step <= 20; step++) {
    const along = STEM_BAND.from + ((STEM_BAND.to - STEM_BAND.from) * step) / 20;
    const xs = crossingsAt(points, bottom + (top - bottom) * along);
    if (xs.length === 2) {
      narrowest = Math.min(narrowest, (xs[1] as number) - (xs[0] as number));
    }
  }
  if (!Number.isFinite(narrowest)) {
    throw new Error('the i stem was never crossed twice, so it has no width');
  }
  return narrowest;
}

export function ring(gapDegrees: number = GAP_DEGREES): Ring {
  const stroke = stemWidth();
  const radius = stroke * RADIUS_IN_STROKES;
  const outerRadius = radius + stroke / 2;
  return {
    centreX: DOT.centreX,
    centreY: STEM_TOP + stroke * AIR_ABOVE_STEM_IN_STROKES + outerRadius,
    radius,
    stroke,
    outerRadius,
    innerRadius: radius - stroke / 2,
    gapDegrees,
    bearingDegrees: GAP_BEARING_DEGREES,
  };
}

/** The outline of the stroked arc, out along the outer edge and back along the inner one. */
export function ringOutline(subject: Ring): Point[] {
  const half = subject.gapDegrees / 2;
  const from = subject.bearingDegrees + half;
  const to = subject.bearingDegrees - half + 360;
  const steps = 240;
  const points: Point[] = [];
  const at = (degrees: number, radius: number): Point => {
    const radians = (degrees * Math.PI) / 180;
    return {
      x: subject.centreX + radius * Math.cos(radians),
      y: subject.centreY + radius * Math.sin(radians),
    };
  };
  for (let step = 0; step <= steps; step++) {
    points.push(at(from + ((to - from) * step) / steps, subject.outerRadius));
  }
  for (let step = steps; step >= 0; step--) {
    points.push(at(from + ((to - from) * step) / steps, subject.innerRadius));
  }
  return points;
}

const number = (value: number): string => String(Math.round(value * 100) / 100);

/**
 * Font units put the baseline at zero and count upwards; svg counts down from the top left.
 * A place turns one into the other, and carries whatever air the drawing sits in.
 */
interface Place {
  readonly left: number;
  readonly top: number;
  readonly air: number;
}

const acrossIn = (place: Place, x: number): number => x - place.left + place.air;
const downIn = (place: Place, y: number): number => place.top - y + place.air;

function letterPathData(place: Place): string {
  const x = (value: number): string => number(acrossIn(place, value));
  const y = (value: number): string => number(downIn(place, value));
  let data = '';
  for (const letter of letters) {
    for (const contour of letter.contours) {
      for (const command of contour) {
        if (command.type === 'M') data += `M${x(command.x)} ${y(command.y)}`;
        else if (command.type === 'L') data += `L${x(command.x)} ${y(command.y)}`;
        else if (command.type === 'Q')
          data += `Q${x(command.x1)} ${y(command.y1)} ${x(command.x)} ${y(command.y)}`;
        else data += 'Z';
      }
    }
  }
  return data;
}

function ringPathData(subject: Ring, place: Place): string {
  const half = subject.gapDegrees / 2;
  const at = (degrees: number): string => {
    const radians = (degrees * Math.PI) / 180;
    const x = acrossIn(place, subject.centreX + subject.radius * Math.cos(radians));
    const y = downIn(place, subject.centreY + subject.radius * Math.sin(radians));
    return `${number(x)} ${number(y)}`;
  };
  const sweptMoreThanHalf = 360 - subject.gapDegrees > 180 ? 1 : 0;
  // The bearings are read off a y that rises, and svg draws down one, so the arc runs the
  // way svg calls negative. Sweeping the other way puts the ring on the far side of its ends.
  return (
    `M${at(subject.bearingDegrees + half)}` +
    `A${number(subject.radius)} ${number(subject.radius)} 0 ${sweptMoreThanHalf} 0 ` +
    `${at(subject.bearingDegrees - half + 360)}`
  );
}

function placed(points: readonly Point[], place: Place): Point[] {
  return points.map((point) => ({ x: acrossIn(place, point.x), y: downIn(place, point.y) }));
}

/** The y axis turns over, so a bearing that pointed up now points down by as much. */
function ringPlaced(subject: Ring, place: Place): Ring {
  return {
    ...subject,
    centreX: acrossIn(place, subject.centreX),
    centreY: downIn(place, subject.centreY),
    bearingDegrees: -subject.bearingDegrees,
  };
}

function open(width: number, height: number): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${number(width)} ${number(height)}" ` +
    `width="${number(width)}" height="${number(height)}">`
  );
}

function letterBounds(): { left: number; right: number; bottom: number; top: number } {
  const points = letters.flatMap((letter) =>
    letter.contours.flatMap((contour) => flatten(contour)),
  );
  return {
    left: Math.min(...points.map((point) => point.x)),
    right: Math.max(...points.map((point) => point.x)),
    bottom: Math.min(...points.map((point) => point.y)),
    top: Math.max(...points.map((point) => point.y)),
  };
}

function wordmarkPlace(
  subject: Ring,
  air: number,
): { place: Place; width: number; height: number } {
  const bounds = letterBounds();
  const left = Math.min(bounds.left, subject.centreX - subject.outerRadius);
  const right = Math.max(bounds.right, subject.centreX + subject.outerRadius);
  const bottom = Math.min(bounds.bottom, subject.centreY - subject.outerRadius);
  const top = Math.max(bounds.top, subject.centreY + subject.outerRadius);
  return {
    place: { left, top, air },
    width: right - left + air * 2,
    height: top - bottom + air * 2,
  };
}

function wordmarkDrawing(gapDegrees: number, air: number, ground: boolean): Drawing {
  const subject = ring(gapDegrees);
  const { place, width, height } = wordmarkPlace(subject, air);
  const svg =
    open(width, height) +
    (ground
      ? `<rect width="${number(width)}" height="${number(height)}" fill="${colour.stone}"/>`
      : '') +
    `<path d="${letterPathData(place)}" fill="${colour.ember}"/>` +
    `<path d="${ringPathData(subject, place)}" fill="none" stroke="${colour.ember}" ` +
    `stroke-width="${number(subject.stroke)}"/>` +
    '</svg>\n';
  return {
    width,
    height,
    contours: [
      ...letters.flatMap((letter) =>
        letter.contours.map((contour) => placed(flatten(contour), place)),
      ),
      ringOutline(ringPlaced(subject, place)),
    ],
    ring: ringPlaced(subject, place),
    svg,
  };
}

export function wordmark(gapDegrees: number = GAP_DEGREES): Drawing {
  return wordmarkDrawing(gapDegrees, 0, false);
}

export function lockup(gapDegrees: number = GAP_DEGREES): Drawing {
  return wordmarkDrawing(gapDegrees, ring(gapDegrees).stroke * LOCKUP_AIR_IN_STROKES, true);
}

export function ringAlone(gapDegrees: number = GAP_DEGREES): Drawing {
  const subject = ring(gapDegrees);
  const size = subject.outerRadius * 2;
  const place: Place = {
    left: subject.centreX - subject.outerRadius,
    top: subject.centreY + subject.outerRadius,
    air: 0,
  };
  const svg =
    open(size, size) +
    `<path d="${ringPathData(subject, place)}" fill="none" stroke="${colour.ember}" ` +
    `stroke-width="${number(subject.stroke)}"/>` +
    '</svg>\n';
  const drawn = ringPlaced(subject, place);
  return { width: size, height: size, contours: [ringOutline(drawn)], ring: drawn, svg };
}

/** The three files this step draws, so the generator and the test read one list. */
export const drawings = [
  { file: 'emi-wordmark.svg', draw: wordmark },
  { file: 'emi-ring.svg', draw: ringAlone },
  { file: 'emi-lockup.svg', draw: lockup },
] as const;
