import { StyleSheet } from 'react-native';

/**
 * What a row and the cells in it are given across the glass of a phone of a stated width.
 *
 * The runner draws a tree and never lays it out, so no width here is read off a rendered box. This
 * does along one axis what the layout engine does: each box between the glass and the row takes
 * its own margin, border and padding off the width, and the cells share what is left of it. The
 * numbers all come from the styles the components declare, so a screen that changes one of them
 * changes what this measures.
 *
 * A phone is the only judge of the real thing. This is the arithmetic a phone performs, run on the
 * numbers the application ships, which is as near as a run with no phone in it reaches.
 */

/** A node of the drawn tree. A host node lays out, and anything else stands between two that do. */
export interface Box {
  readonly type: unknown;
  readonly props: Record<string, unknown>;
  readonly parent: Box | null;
}

/** Points. The glass of one phone, named so a failure says which phone it was measured on. */
export interface Phone {
  readonly name: string;
  readonly width: number;
  readonly height: number;
}

/** The phone the calendar was seen to overrun. */
export const anIPhone16: Phone = { name: 'an iPhone 16', width: 393, height: 852 };

/** The narrowest glass Emi is built for, which is the one that overruns first. */
export const aSmallIPhone: Phone = { name: 'a small iPhone', width: 375, height: 667 };

type Style = Record<string, unknown>;

/**
 * A tenth of a point, which is finer than any phone draws. A share that divides into a run of
 * decimals is rounded here rather than by each reader, because the tail of it is arithmetic and
 * never a width, and a comparison against it fails on the tail alone.
 */
export function toATenthOfAPoint(points: number): number {
  return Math.round(points * 10) / 10;
}

/** The first of these the style names, because React Native reads the narrower name first. */
function held(style: Style, names: readonly string[]): number {
  for (const name of names) {
    const value = style[name];

    if (typeof value === 'number') {
      return value;
    }
  }

  return 0;
}

/** What a box keeps outside itself, which comes off the width its parent left it. */
function marginsOf(style: Style): number {
  return (
    held(style, ['marginLeft', 'marginHorizontal', 'margin']) +
    held(style, ['marginRight', 'marginHorizontal', 'margin'])
  );
}

/** What a box keeps inside itself, which comes off the width its children share. */
function insidesOf(style: Style): number {
  return (
    held(style, ['borderLeftWidth', 'borderWidth']) +
    held(style, ['borderRightWidth', 'borderWidth']) +
    held(style, ['paddingLeft', 'paddingHorizontal', 'padding']) +
    held(style, ['paddingRight', 'paddingHorizontal', 'padding'])
  );
}

function styleOf(box: Box): Style {
  return (StyleSheet.flatten(box.props.style) ?? {}) as Style;
}

/**
 * A scrolling view holds its children in a box of its own, and that box wears the style the view
 * was handed rather than one of its own, so the room it keeps is counted against the view.
 */
function innerStyleOf(box: Box): Style {
  if (box.type !== 'RCTScrollView') {
    return {};
  }

  return (StyleSheet.flatten(box.props.contentContainerStyle) ?? {}) as Style;
}

function laysOut(box: Box): boolean {
  return typeof box.type === 'string' && box.type !== '';
}

function upToTheGlass(box: Box): Box[] {
  const chain: Box[] = [];

  for (let at: Box | null = box; at !== null; at = at.parent) {
    if (laysOut(at)) {
      chain.unshift(at);
    }
  }

  return chain;
}

/** The width a box occupies, before its own border and padding come off it. */
export function widthGivenTo(box: Box, glassWidth: number): number {
  return upToTheGlass(box).reduce((width, node) => {
    const outside = width - marginsOf(styleOf(node));

    return node === box
      ? outside
      : outside - insidesOf(styleOf(node)) - insidesOf(innerStyleOf(node));
  }, glassWidth);
}

/** The width inside a box, which is what the children of that box share. */
export function widthInside(box: Box, glassWidth: number): number {
  return widthGivenTo(box, glassWidth) - insidesOf(styleOf(box)) - insidesOf(innerStyleOf(box));
}

export interface MeasuredRow {
  /** The width the cells share, inside the row. */
  readonly width: number;
  /** What each cell takes of it, in the order the cells were handed in. */
  readonly cellWidths: readonly number[];
  /** Where the right edge of the last cell falls, measured from the left edge inside the row. */
  readonly rightEdge: number;
}

/**
 * A row of cells that all grow. Each one takes an equal share of what the gaps leave, and never
 * less than a width it declares for itself, which is how a row comes to be overrun: a cell with a
 * floor under it stops sharing and the row runs past its own right edge.
 *
 * A cell that does not grow is refused, because its width is the width of its words and nothing
 * here can measure those.
 */
export function theRow(row: Box, cells: readonly Box[], glassWidth: number): MeasuredRow {
  if (cells.length === 0) {
    throw new Error('a row with no cells in it was measured');
  }

  const gap = held(styleOf(row), ['columnGap', 'gap']);
  const width = widthInside(row, glassWidth);
  const share = (width - gap * (cells.length - 1)) / cells.length;

  const cellWidths = cells.map((cell) => {
    const style = styleOf(cell);

    if (held(style, ['flexGrow', 'flex']) === 0) {
      throw new Error('a cell that does not grow was measured, and its width is its words');
    }

    return Math.max(share, held(style, ['width', 'minWidth']));
  });

  return {
    width: toATenthOfAPoint(width),
    cellWidths: cellWidths.map(toATenthOfAPoint),
    rightEdge: toATenthOfAPoint(
      cellWidths.reduce((total, one) => total + one, 0) + gap * (cells.length - 1),
    ),
  };
}

/** One cell of a row that is as wide as what it holds, and the width of the words it holds. */
export interface WordCell {
  readonly box: Box;
  /** Points. The words alone, before the cell's own border and padding are added to them. */
  readonly words: number;
}

export interface MeasuredWordRow {
  /** The width the cells share, inside the row. */
  readonly width: number;
  /** What each cell is drawn at, in the order the cells were handed in. */
  readonly cellWidths: readonly number[];
  /** Points between one cell and the next, in the same order. */
  readonly separations: readonly number[];
  /** Where the right edge of the last cell falls, measured from the left edge inside the row. */
  readonly rightEdge: number;
}

/** A cell as the row has to place it: what it asked for, what it will give up, and its floor. */
interface Placed {
  width: number;
  readonly shrink: number;
  readonly floor: number;
}

function placed(cell: WordCell): Placed {
  const style = styleOf(cell.box);
  const outside = marginsOf(style);

  return {
    floor: held(style, ['minWidth']) + outside,
    shrink: held(style, ['flexShrink']),
    width: Math.max(held(style, ['minWidth']), cell.words + insidesOf(style)) + outside,
  };
}

function widthAcross(cells: readonly Placed[]): number {
  return cells.reduce((total, cell) => total + cell.width, 0);
}

/**
 * Takes the overrun off the cells that declare `flexShrink`, in proportion to what each of them
 * asked for, and never below the floor a cell declares. A cell that declares none keeps its width,
 * which is how a row comes to overrun: React Native shrinks nothing unless a style says so.
 *
 * A cell that reaches its floor stops giving and the pass runs again, because what it could not
 * give still has to come off somewhere.
 */
function squeeze(cells: readonly Placed[], room: number): void {
  for (let pass = 0; pass < cells.length; pass += 1) {
    const overrun = widthAcross(cells) - room;
    const share = cells.reduce(
      (total, cell) => total + (cell.width > cell.floor ? cell.shrink * cell.width : 0),
      0,
    );

    if (overrun <= 0 || share === 0) {
      return;
    }

    for (const cell of cells) {
      cell.width = Math.max(cell.floor, cell.width - (overrun * cell.shrink * cell.width) / share);
    }
  }
}

/**
 * A row whose cells are as wide as the words inside them, which is the other shape a row comes in.
 * `theRow` measures cells that grow into an equal share of what is left; these carry a width of
 * their own and the row has to find room for all of them.
 *
 * Room left over is spread by `justifyContent`. The two the calendar uses are answered and the
 * others are refused rather than guessed at, because a wrong answer here reads as a measurement.
 */
export function theRowOfWords(
  row: Box,
  cells: readonly WordCell[],
  glassWidth: number,
): MeasuredWordRow {
  if (cells.length < 2) {
    throw new Error('a row of fewer than two cells has nothing between its cells to measure');
  }

  const rowStyle = styleOf(row);
  const spread = rowStyle.justifyContent ?? 'flex-start';

  if (spread !== 'flex-start' && spread !== 'space-between') {
    throw new Error(`a row spread with ${String(spread)} is refused, because it moves the gaps`);
  }

  const gap = held(rowStyle, ['columnGap', 'gap']);
  const width = widthInside(row, glassWidth);
  const between = gap * (cells.length - 1);
  const drawn = cells.map(placed);

  squeeze(drawn, width - between);

  const across = widthAcross(drawn) + between;
  const spare = spread === 'space-between' ? Math.max(0, width - across) / (cells.length - 1) : 0;

  return {
    cellWidths: drawn.map((cell) => toATenthOfAPoint(cell.width)),
    rightEdge: toATenthOfAPoint(across + spare * (cells.length - 1)),
    separations: cells.slice(1).map(() => toATenthOfAPoint(gap + spare)),
    width: toATenthOfAPoint(width),
  };
}
