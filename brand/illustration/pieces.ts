/**
 * The three onboarding pieces, as numbers. Each one is two or three soft edged shapes in the phase
 * colours, overlapping on the stone ground, and nothing else. Section 9.6 of the design sets the
 * range the colours are laid down at, and section 9.1 says why the shapes stay abstract.
 */

import { colour, type ColourName } from '../../packages/tokens/src/colour.ts';

import { refusalsIn, sentenceFor } from './refusals.ts';

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** The four phase colours, the only colours a piece is drawn in. */
export type PhaseColour = 'period' | 'follicular' | 'ovulation' | 'luteal';

export const phaseColours: readonly PhaseColour[] = ['period', 'follicular', 'ovulation', 'luteal'];

/** The range a shape is laid down at. Below the floor it disappears; above the ceiling it states. */
export const TRANSLUCENT_FLOOR = 0.2;
export const TRANSLUCENT_CEILING = 0.3;

export const GROUND: ColourName = 'stone';

export const PIECE_WIDTH = 320;
export const PIECE_HEIGHT = 220;

/** The points a shape is sampled at before its outline is smoothed. */
const SAMPLES = 24;

export interface Shape {
  readonly name: string;
  readonly colour: PhaseColour;
  readonly opacity: number;
  readonly centre: Point;
  readonly radius: number;
  /** How many times the outline swells and falls on one turn, which is what makes it organic. */
  readonly lobes: number;
  /** How far it swells, as a share of the radius. */
  readonly wobble: number;
  /** Where the first swell sits, in degrees. */
  readonly turn: number;
  /** The soft edge, as the deviation of the blur in drawing units. */
  readonly blur: number;
}

export interface Piece {
  readonly name: string;
  /** The first run screen it was drawn for. */
  readonly screen: string;
  /** What the arrangement carries, which is never a picture of a thing. */
  readonly says: string;
  readonly shapes: readonly Shape[];
}

export const pieces: readonly Piece[] = [
  {
    name: 'welcome',
    screen: 'welcome',
    says: 'three colours crossing, so the whole cycle is one movement rather than four states',
    shapes: [
      {
        name: 'dawn',
        colour: 'follicular',
        opacity: 0.24,
        centre: { x: 108, y: 96 },
        radius: 70,
        lobes: 3,
        wobble: 0.18,
        turn: 18,
        blur: 5,
      },
      {
        name: 'noon',
        colour: 'ovulation',
        opacity: 0.26,
        centre: { x: 176, y: 120 },
        radius: 62,
        lobes: 3,
        wobble: 0.15,
        turn: 140,
        blur: 6,
      },
      {
        name: 'dusk',
        colour: 'luteal',
        opacity: 0.22,
        centre: { x: 232, y: 92 },
        radius: 56,
        lobes: 3,
        wobble: 0.17,
        turn: 250,
        blur: 4,
      },
    ],
  },
  {
    name: 'last-period',
    screen: 'lastPeriod',
    says: 'one shape settling into a wider one, so a start reads as a moment inside something longer',
    shapes: [
      {
        name: 'field',
        colour: 'luteal',
        opacity: 0.2,
        centre: { x: 128, y: 116 },
        radius: 74,
        lobes: 3,
        wobble: 0.15,
        turn: 200,
        blur: 6,
      },
      {
        name: 'mark',
        colour: 'period',
        opacity: 0.28,
        centre: { x: 196, y: 104 },
        radius: 52,
        lobes: 3,
        wobble: 0.14,
        turn: 40,
        blur: 4,
      },
    ],
  },
  {
    name: 'cycle-length',
    screen: 'cycleLength',
    says: 'three shapes of one size at one spacing, so a length reads as a rhythm she can count',
    shapes: [
      {
        name: 'first',
        colour: 'follicular',
        opacity: 0.22,
        centre: { x: 96, y: 110 },
        radius: 52,
        lobes: 3,
        wobble: 0.14,
        turn: 0,
        blur: 5,
      },
      {
        name: 'second',
        colour: 'ovulation',
        opacity: 0.26,
        centre: { x: 160, y: 110 },
        radius: 52,
        lobes: 3,
        wobble: 0.14,
        turn: 120,
        blur: 5,
      },
      {
        name: 'third',
        colour: 'luteal',
        opacity: 0.22,
        centre: { x: 224, y: 110 },
        radius: 52,
        lobes: 3,
        wobble: 0.14,
        turn: 240,
        blur: 5,
      },
    ],
  },
];

export function fileOf(piece: Piece): string {
  return `${piece.name}.svg`;
}

export function pictureOf(piece: Piece): string {
  return `${piece.name}.png`;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function outlineOf(shape: Shape): readonly Point[] {
  const turn = (shape.turn * Math.PI) / 180;

  return Array.from({ length: SAMPLES }, (_unused, index) => {
    const angle = (index / SAMPLES) * 2 * Math.PI;
    const radius = shape.radius * (1 + shape.wobble * Math.sin(shape.lobes * angle + turn));

    return {
      x: shape.centre.x + radius * Math.cos(angle),
      y: shape.centre.y + radius * Math.sin(angle),
    };
  });
}

/**
 * A closed outline drawn as curves rather than corners. Each segment takes its handles from the
 * points either side of it, which is what keeps a swell from arriving as an angle.
 */
export function pathOf(shape: Shape): string {
  const points = outlineOf(shape);
  const at = (index: number): Point => points[(index + points.length) % points.length] as Point;
  const start = at(0);
  const segments: string[] = [`M ${round(start.x)} ${round(start.y)}`];

  for (let index = 0; index < points.length; index++) {
    const before = at(index - 1);
    const from = at(index);
    const to = at(index + 1);
    const after = at(index + 2);
    const first = {
      x: from.x + (to.x - before.x) / 6,
      y: from.y + (to.y - before.y) / 6,
    };
    const second = {
      x: to.x - (after.x - from.x) / 6,
      y: to.y - (after.y - from.y) / 6,
    };

    segments.push(
      `C ${round(first.x)} ${round(first.y)} ${round(second.x)} ${round(second.y)} ` +
        `${round(to.x)} ${round(to.y)}`,
    );
  }

  return `${segments.join(' ')} Z`;
}

/** The name of the blur a shape is softened by, which the shape alone refers to. */
export function blurOf(piece: Piece, shape: Shape): string {
  return `${piece.name}-${shape.name}-soft`;
}

function markupOf(piece: Piece): string {
  const filters = piece.shapes
    .map(
      (shape) =>
        `    <filter id="${blurOf(piece, shape)}" x="-30%" y="-30%" width="160%" height="160%">\n` +
        `      <feGaussianBlur stdDeviation="${shape.blur}" />\n` +
        `    </filter>`,
    )
    .join('\n');
  const shapes = piece.shapes
    .map(
      (shape) =>
        `  <path d="${pathOf(shape)}" fill="${colour[shape.colour]}" ` +
        `fill-opacity="${shape.opacity}" filter="url(#${blurOf(piece, shape)})" />`,
    )
    .join('\n');

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PIECE_WIDTH} ${PIECE_HEIGHT}" ` +
    `width="${PIECE_WIDTH}" height="${PIECE_HEIGHT}">\n` +
    `  <title>${piece.name}</title>\n` +
    `  <desc>${piece.says}</desc>\n` +
    `  <defs>\n${filters}\n  </defs>\n` +
    `  <rect width="${PIECE_WIDTH}" height="${PIECE_HEIGHT}" fill="${colour[GROUND]}" />\n` +
    `${shapes}\n` +
    `</svg>\n`
  );
}

/** The shapes one piece may hold. One shape is a symbol, and four is a pattern. */
export const FEWEST_SHAPES = 2;
export const MOST_SHAPES = 3;

/**
 * Everything the style refuses about a piece. An empty list is a piece that may be written. The
 * generator reads this before it writes, so a refusal reaches the person drawing.
 */
export function problemsWith(piece: Piece, markup: string): readonly string[] {
  const file = fileOf(piece);
  const problems = refusalsIn(file, markup).map(sentenceFor);

  if (piece.shapes.length < FEWEST_SHAPES || piece.shapes.length > MOST_SHAPES) {
    problems.push(
      `${file} lays down ${piece.shapes.length} shapes. A piece holds ${FEWEST_SHAPES} or ${MOST_SHAPES}.`,
    );
  }

  for (const shape of piece.shapes) {
    if (shape.opacity < TRANSLUCENT_FLOOR || shape.opacity > TRANSLUCENT_CEILING) {
      problems.push(
        `${file} lays ${shape.name} down at ${shape.opacity}, outside ${TRANSLUCENT_FLOOR} to ${TRANSLUCENT_CEILING}.`,
      );
    }
    if (!phaseColours.includes(shape.colour)) {
      problems.push(`${file} draws ${shape.name} in ${shape.colour}, which is not a phase colour.`);
    }
    if (shape.blur <= 0) {
      problems.push(`${file} draws ${shape.name} with a hard edge. Every edge here is soft.`);
    }
  }

  return problems;
}

/** The drawing, or nothing at all. A piece that breaks the style is never written. */
export function drawingOf(piece: Piece): string {
  const markup = markupOf(piece);
  const problems = problemsWith(piece, markup);

  if (problems.length > 0) {
    throw new Error(problems.join('\n'));
  }

  return markup;
}
