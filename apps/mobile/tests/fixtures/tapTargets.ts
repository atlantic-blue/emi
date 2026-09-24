import { MINIMUM_TAP_TARGET } from '@emi/tokens';
import { StyleSheet } from 'react-native';

/**
 * SEE-3, measured off what a screen actually rendered. A control is named with its own size when
 * it falls under the floor, because a failure that says only `false` sends the reader back to the
 * screen to work out which one.
 *
 * What is measured is what takes a touch, so the slop a control is given counts towards its size.
 * A thumb is not a cursor, and a control drawn smaller than the floor still meets it where the
 * slop carries the touch the rest of the way.
 *
 * A day square of a calendar month is the one exception the contract names. Seven squares of the
 * floor do not fit across a phone, so a square takes the width of its column and keeps the height,
 * and its touch reaches half the gap on each side. `daySquaresLeavingTheRowDead` is what holds it
 * to that.
 */

export interface Control {
  readonly props: {
    readonly testID?: unknown;
    readonly accessibilityLabel?: unknown;
    readonly style?: unknown;
    readonly hitSlop?: unknown;
  };
}

interface Size {
  readonly name: string;
  readonly width: number;
  readonly height: number;
  /** True where the control declares no width of its own, because the row it stands in gives it one. */
  readonly widthIsTheRowsToGive: boolean;
}

function styleOf(control: Control): Record<string, unknown> {
  return (StyleSheet.flatten(control.props.style) ?? {}) as Record<string, unknown>;
}

function nameOf(control: Control): string {
  return String(control.props.testID ?? control.props.accessibilityLabel ?? 'unnamed');
}

function sizeIn(style: Record<string, unknown>, keys: readonly string[]): number {
  for (const key of keys) {
    const held = style[key];
    if (typeof held === 'number') {
      return held;
    }
  }
  return 0;
}

/** The points a control's slop adds on one side of it, from either shape React Native takes. */
function slopOn(slop: unknown, side: string): number {
  if (typeof slop === 'number') {
    return slop;
  }

  if (slop === null || typeof slop !== 'object') {
    return 0;
  }

  const held = (slop as Record<string, unknown>)[side];

  return typeof held === 'number' ? held : 0;
}

/** The points a control's slop adds along one axis. */
function slopAcross(slop: unknown, sides: readonly string[]): number {
  return sides.reduce((total, side) => total + slopOn(slop, side), 0);
}

function measured(control: Control): Size {
  const style = styleOf(control);
  const slop = control.props.hitSlop;
  const ownWidth = sizeIn(style, ['width', 'minWidth']);

  return {
    name: nameOf(control),
    width: ownWidth + slopAcross(slop, ['left', 'right']),
    height: sizeIn(style, ['height', 'minHeight']) + slopAcross(slop, ['top', 'bottom']),
    widthIsTheRowsToGive: ownWidth === 0 && sizeIn(style, ['flexGrow', 'flex']) > 0,
  };
}

/**
 * A measurement of nothing is not a pass, so an empty list of controls is refused.
 *
 * A control whose width its row decides is measured on its height here, which is the exception
 * SEE-3 names and the only one it names. This reads the styles a tree carries and never lays the
 * tree out, so the width that row hands down is not a number it holds.
 * `controlsSizedByTheirRow` names every one of them, and the row that sizes them is measured where
 * the row is drawn.
 */
export function controlsTooSmallToPress(controls: readonly Control[]): string[] {
  if (controls.length === 0) {
    throw new Error('a screen holding nothing to press was measured for tap targets');
  }

  return controls
    .map(measured)
    .filter(
      (size) =>
        size.height < MINIMUM_TAP_TARGET ||
        (!size.widthIsTheRowsToGive && size.width < MINIMUM_TAP_TARGET),
    )
    .map(({ name, width, height }) => `${name} is ${width} by ${height}`);
}

/**
 * Every control on the screen that takes its width from the row it stands in, named. Nothing here
 * is a failure. The list is asserted where a screen is measured, so a control cannot come to be
 * sized by its row without somebody deciding that it should be.
 */
export function controlsSizedByTheirRow(controls: readonly Control[]): string[] {
  if (controls.length === 0) {
    throw new Error('a screen holding nothing to press was measured for tap targets');
  }

  return controls
    .map(measured)
    .filter((size) => size.widthIsTheRowsToGive)
    .map(({ name }) => name);
}

/**
 * Every day square of a calendar row whose touch leaves a point of that row belonging to no
 * square, named with the points it leaves dead.
 *
 * Two neighbouring squares stand a gap apart, so a touch that reaches half the gap on each side
 * meets its neighbour's in the middle of the gap and every point of the row belongs to a square. A
 * square given less than that leaves a strip where her thumb lands on nothing, which is the second
 * error SEE-3 names.
 *
 * The squares measured are the ones `controlsSizedByTheirRow` names, so the exception cannot widen
 * to a control nobody decided about.
 */
export function daySquaresLeavingTheRowDead(row: Control, squares: readonly Control[]): string[] {
  const sizedByTheRow = new Set(controlsSizedByTheirRow(squares));

  if (sizedByTheRow.size === 0) {
    throw new Error('a row holding no square that takes its width from it was measured');
  }

  const gap = sizeIn(styleOf(row), ['columnGap', 'gap']);
  const halfTheGap = gap / 2;

  return squares
    .filter((square) => sizedByTheRow.has(nameOf(square)))
    .map((square) => ({
      name: nameOf(square),
      left: slopOn(square.props.hitSlop, 'left'),
      right: slopOn(square.props.hitSlop, 'right'),
    }))
    .filter(({ left, right }) => left < halfTheGap || right < halfTheGap)
    .map(
      ({ name, left, right }) =>
        `${name} touches ${left} and ${right} either side of a gap of ${gap}`,
    );
}
