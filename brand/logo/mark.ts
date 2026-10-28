import { colour } from '../../packages/tokens/src/colour.ts';

import { capitals, CAPITALS_UNITS_PER_EM } from './capitals.ts';
import { GAP_DEGREES } from './geometry.ts';

/**
 * The application icon's mark: the letters EMI inside the open ring. Beta testers picked it from
 * three options in issue 331, because the ring alone was hard to find among other icons. All the
 * numbers are in a box 100 units wide, as the option was drawn.
 */
export const MARK_BOX = 100;

export const RING_RADIUS = 35;
export const RING_STROKE = 7;

/**
 * The gap runs from three o'clock to 40 degrees below it, so the ring opens where a lowercase e
 * opens.
 */
export const GAP_FROM_DEGREES = 0;

export const WORD_SIZE = 26;
export const WORD_BASELINE = 59.5;
export const LETTER_SPACING = 0.5;

const number = (value: number): string => String(Math.round(value * 100) / 100);

function ringPathData(): string {
  const centre = MARK_BOX / 2;
  const at = (degrees: number): string => {
    const radians = (degrees * Math.PI) / 180;
    return `${number(centre + RING_RADIUS * Math.cos(radians))} ${number(centre + RING_RADIUS * Math.sin(radians))}`;
  };
  return (
    `M${at(GAP_FROM_DEGREES + GAP_DEGREES)}` +
    `A${number(RING_RADIUS)} ${number(RING_RADIUS)} 0 1 1 ${at(GAP_FROM_DEGREES)}`
  );
}

function wordPathData(): string {
  const scale = WORD_SIZE / CAPITALS_UNITS_PER_EM;
  const advances = capitals.reduce((sum, capital) => sum + capital.advance * scale, 0);
  const width = advances + LETTER_SPACING * (capitals.length - 1);

  let pen = (MARK_BOX - width) / 2;
  let data = '';
  for (const capital of capitals) {
    const x = (value: number): string => number(pen + value * scale);
    const y = (value: number): string => number(WORD_BASELINE - value * scale);
    for (const contour of capital.contours) {
      for (const command of contour) {
        if (command.type === 'M') data += `M${x(command.x)} ${y(command.y)}`;
        else if (command.type === 'L') data += `L${x(command.x)} ${y(command.y)}`;
        else if (command.type === 'Q')
          data += `Q${x(command.x1)} ${y(command.y1)} ${x(command.x)} ${y(command.y)}`;
        else data += 'Z';
      }
    }
    pen += capital.advance * scale + LETTER_SPACING;
  }
  return data;
}

export function iconMark(): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MARK_BOX} ${MARK_BOX}" ` +
    `width="${MARK_BOX}" height="${MARK_BOX}">` +
    `<path d="${ringPathData()}" fill="none" stroke="${colour.onAccent}" ` +
    `stroke-width="${number(RING_STROKE)}"/>` +
    `<path d="${wordPathData()}" fill="${colour.onAccent}"/>` +
    '</svg>\n'
  );
}

export const ICON_MARK_FILE = 'emi-icon-mark.svg';
