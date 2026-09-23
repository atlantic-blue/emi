/**
 * The rules in README.md, as a check the generator runs before it writes anything.
 *
 * The committed set is held to these by the test in apps/mobile/tests/integration/1.5.test.ts. This
 * file is the same rules at the other end, so a drawing that breaks one never reaches the token
 * module at all, and the person who drew it is told on the run rather than on the pipeline.
 */

import { stroke } from '../../packages/tokens/src/space.ts';

/** The grid every drawing is laid out on, in points, on both axes. */
export const ICON_GRID = 24;

/** The corner a rectangle inside a drawing is rounded to, on that grid. */
export const ICON_CORNER = 2;

/** The one weight the whole set is drawn at. */
export const ICON_STROKE = stroke.icon;

export function strokeWidthsIn(source: string): readonly number[] {
  return [...source.matchAll(/stroke-width="([^"]+)"/g)].map((found) => Number(found[1]));
}

function attributeOf(source: string, attribute: string): string | undefined {
  return new RegExp(`(?<![\\w-])${attribute}="([^"]*)"`).exec(source)?.[1];
}

function fillsIn(source: string): readonly string[] {
  return [...source.matchAll(/fill="([^"]*)"/g)].map((found) => found[1] as string);
}

function rectanglesIn(source: string): readonly string[] {
  return [...source.matchAll(/<rect[^>]*>/g)].map((found) => found[0]);
}

/**
 * Every rule the drawing breaks, each as a sentence naming the file and what was found. An empty
 * list is a drawing that belongs in the set.
 */
export function problemsWith(file: string, source: string): readonly string[] {
  const problems: string[] = [];
  const widths = strokeWidthsIn(source);

  if (widths.length === 0) {
    problems.push(`${file} names no stroke width, so nothing says which weight it was drawn at`);
  }

  for (const width of new Set(widths)) {
    if (width !== ICON_STROKE) {
      problems.push(
        `${file} is drawn at ${width}, and the set carries one weight of ${ICON_STROKE}: a second ` +
          `weight reads as a second hand`,
      );
    }
  }

  const box = `0 0 ${ICON_GRID} ${ICON_GRID}`;

  if (attributeOf(source, 'viewBox') !== box) {
    problems.push(`${file} is not laid out on ${box}, so it does not share the grid`);
  }

  for (const side of ['width', 'height'] as const) {
    if (attributeOf(source, side) !== String(ICON_GRID)) {
      problems.push(`${file} is ${side} ${attributeOf(source, side)} rather than ${ICON_GRID}`);
    }
  }

  for (const end of ['stroke-linecap', 'stroke-linejoin'] as const) {
    if (attributeOf(source, end) !== 'round') {
      problems.push(`${file} does not set ${end} to round`);
    }
  }

  const fills = fillsIn(source);

  if (fills.length === 0 || fills.some((fill) => fill !== 'none')) {
    problems.push(`${file} fills something, and the drawing is the line`);
  }

  if (attributeOf(source, 'stroke') !== 'currentColor') {
    problems.push(
      `${file} does not take its colour from the screen, so it cannot follow the tokens`,
    );
  }

  if (/#[0-9a-fA-F]{3,8}/.test(source)) {
    problems.push(`${file} writes a colour into the drawing`);
  }

  for (const rectangle of rectanglesIn(source)) {
    if (attributeOf(rectangle, 'rx') !== String(ICON_CORNER)) {
      problems.push(`${file} holds a rectangle that is not rounded to ${ICON_CORNER}`);
    }
  }

  return problems;
}
