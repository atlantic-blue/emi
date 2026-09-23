import { StyleSheet } from 'react-native';

import type { Phone } from './theWidthOfARow';

/**
 * Where a box falls down the glass of a phone, and how tall it is when it lands there.
 *
 * The runner draws a tree and never lays it out, so no number here is read off a rendered box.
 * This does down the screen what `theWidthOfARow` does across it: a box takes its own border,
 * padding and margins off the room its parent leaves, a column stacks what is in it, a row puts
 * what is in it side by side, and a box that grows takes what the column has left over.
 *
 * Words are the one thing a run with no phone under it cannot measure, so they are counted rather
 * than measured. A line here holds the words that fit when every character is as wide as the size
 * it is drawn at. No letter of a text face is wider than the size it is drawn at, so a paragraph
 * never wraps onto fewer lines on the phone than it does here, and a box measured here is never
 * shorter than the box the phone draws.
 *
 * A phone is the only judge of the real thing. This is the arithmetic a phone performs, run on the
 * numbers the application ships, which is as near as a run with no phone in it reaches.
 */

/** A node of the drawn tree, as `toJSON` hands it over: a host box, its style, and what is in it. */
export interface DrawnNode {
  readonly type: string;
  readonly props?: Record<string, unknown>;
  readonly children?: unknown;
}

/** One box of the tree, as the arithmetic placed it. Every number is in points. */
export interface PlacedBox {
  readonly node: DrawnNode;
  /** The top edge, measured from the top edge of the glass. */
  readonly top: number;
  readonly height: number;
  readonly width: number;
  /** Everything the box says, which is every run of text inside it, in the order they are drawn. */
  readonly words: string;
}

interface Landing {
  node: DrawnNode;
  top: number;
  height: number;
  width: number;
  words: string;
}

/** The name React Native gives a scrolling view, which is the box that clips what is inside it. */
export const scrollingView = 'RCTScrollView';

type Style = Record<string, unknown>;

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

function marginsAcross(style: Style): number {
  return (
    held(style, ['marginLeft', 'marginHorizontal', 'margin']) +
    held(style, ['marginRight', 'marginHorizontal', 'margin'])
  );
}

function marginsDown(style: Style): number {
  return (
    held(style, ['marginTop', 'marginVertical', 'margin']) +
    held(style, ['marginBottom', 'marginVertical', 'margin'])
  );
}

/** What a box keeps across itself, which comes off the width its children share. */
function insidesAcross(style: Style): number {
  return (
    held(style, ['borderLeftWidth', 'borderWidth']) +
    held(style, ['borderRightWidth', 'borderWidth']) +
    held(style, ['paddingLeft', 'paddingHorizontal', 'padding']) +
    held(style, ['paddingRight', 'paddingHorizontal', 'padding'])
  );
}

/** What a box keeps down itself, which comes off the height its children stack in. */
function insidesDown(style: Style): number {
  return (
    held(style, ['borderTopWidth', 'borderWidth']) +
    held(style, ['borderBottomWidth', 'borderWidth']) +
    held(style, ['paddingTop', 'paddingVertical', 'padding']) +
    held(style, ['paddingBottom', 'paddingVertical', 'padding'])
  );
}

function flattened(style: unknown): Style {
  return (StyleSheet.flatten(style) ?? {}) as Style;
}

function styleOf(node: DrawnNode): Style {
  return flattened(node.props?.style);
}

/**
 * The style a box is laid out with. A scrolling view holds its children in a box of its own, and
 * that box wears the style the view was handed rather than one of its own.
 */
function styleUnder(node: DrawnNode, parent: DrawnNode | null): Style {
  return parent !== null && parent.type === scrollingView
    ? flattened(parent.props?.contentContainerStyle)
    : styleOf(node);
}

function childrenOf(node: DrawnNode): DrawnNode[] {
  const children = Array.isArray(node.children) ? node.children : [];

  return children.filter(
    (child): child is DrawnNode => child !== null && typeof child === 'object' && 'type' in child,
  );
}

/** Everything a box says, the strings of every run of text inside it, in the order they are drawn. */
function wordsOf(node: DrawnNode): string {
  const children = Array.isArray(node.children) ? node.children : [];

  return children
    .map((child) =>
      typeof child === 'string'
        ? child
        : child !== null && typeof child === 'object' && 'type' in child
          ? wordsOf(child as DrawnNode)
          : '',
    )
    .join('');
}

/**
 * How many lines a run of words takes in a width, with every character as wide as its own size.
 * A word that does not fit on the line it started takes the next one, which is what a phone does
 * and is the room a count of characters alone would not leave.
 */
function linesOf(words: string, width: number, perCharacter: number): number {
  const said = words.split(/\s+/).filter((word) => word.length > 0);

  if (said.length === 0) {
    return 0;
  }

  let lines = 1;
  let filled = 0;

  for (const word of said) {
    const alone = word.length * perCharacter;
    const added = filled === 0 ? alone : filled + perCharacter + alone;

    if (filled > 0 && added > width) {
      lines += 1;
      filled = alone;
    } else {
      filled = added;
    }
  }

  return lines;
}

function saysWords(node: DrawnNode): boolean {
  return node.type === 'Text' && wordsOf(node).length > 0;
}

function heightOfWords(node: DrawnNode, style: Style, width: number): number {
  const size = held(style, ['fontSize']);

  if (size === 0) {
    throw new Error(`a run of words with no size on it was measured: ${wordsOf(node)}`);
  }

  const lineHeight = held(style, ['lineHeight']);
  const tracking = Math.max(held(style, ['letterSpacing']), 0);

  return linesOf(wordsOf(node), width, size + tracking) * (lineHeight === 0 ? size : lineHeight);
}

/** The width a box asks for when nothing makes it share: its words, or what is inside it. */
function widthWanted(node: DrawnNode, parent: DrawnNode | null): number {
  const style = styleUnder(node, parent);

  if (saysWords(node)) {
    const size = held(style, ['fontSize']);
    const tracking = Math.max(held(style, ['letterSpacing']), 0);

    return wordsOf(node).length * (size + tracking) + insidesAcross(style);
  }

  const children = childrenOf(node);
  const inside = children.map(
    (child) => widthWanted(child, node) + marginsAcross(styleUnder(child, node)),
  );
  const along =
    style.flexDirection === 'row'
      ? inside.reduce((total, one) => total + one, 0) +
        held(style, ['columnGap', 'gap']) * Math.max(inside.length - 1, 0)
      : Math.max(0, ...inside);

  return Math.max(along + insidesAcross(style), held(style, ['width', 'minWidth']));
}

/** A box grows into what a column leaves over, and `flex` starts it from nothing while it does. */
function growthOf(style: Style): { grow: number; fromNothing: boolean } {
  const shorthand = style.flex;

  if (typeof shorthand === 'number' && shorthand > 0) {
    return { grow: shorthand, fromNothing: true };
  }

  return { grow: held(style, ['flexGrow']), fromNothing: false };
}

interface Given {
  readonly width: number;
  /** The height the parent settled on for this box, where the parent had one to give. */
  readonly height: number | undefined;
}

function laid(
  node: DrawnNode,
  parent: DrawnNode | null,
  given: Given,
  top: number,
  onto: Landing[] | null,
): number {
  const style = styleUnder(node, parent);
  const insideWidth = given.width - insidesAcross(style);
  const landing: Landing = { node, top, height: 0, width: given.width, words: wordsOf(node) };

  if (onto !== null) {
    onto.push(landing);
  }

  const contentTop =
    top +
    held(style, ['borderTopWidth', 'borderWidth']) +
    held(style, ['paddingTop', 'paddingVertical', 'padding']);
  const inside = saysWords(node)
    ? heightOfWords(node, style, insideWidth)
    : alongTheColumnOrRow(node, style, insideWidth, given.height, contentTop, onto);

  // A box the column settled a height on keeps it, and what does not fit runs past the edge.
  // That is what a scrolling view is: the room it is given, with more inside it than that.
  const settled = given.height ?? Math.max(held(style, ['height']), inside + insidesDown(style));
  const height = Math.max(settled, held(style, ['minHeight']));

  landing.height = height;

  return height;
}

function alongTheColumnOrRow(
  node: DrawnNode,
  style: Style,
  insideWidth: number,
  ownHeight: number | undefined,
  contentTop: number,
  onto: Landing[] | null,
): number {
  const children = childrenOf(node);

  if (children.length === 0) {
    return 0;
  }

  return style.flexDirection === 'row'
    ? acrossTheRow(node, style, children, insideWidth, contentTop, onto)
    : downTheColumn(node, style, children, insideWidth, ownHeight, contentTop, onto);
}

function acrossTheRow(
  node: DrawnNode,
  style: Style,
  children: readonly DrawnNode[],
  insideWidth: number,
  contentTop: number,
  onto: Landing[] | null,
): number {
  const gap = held(style, ['columnGap', 'gap']);
  const share = (insideWidth - gap * (children.length - 1)) / children.length;

  return children.reduce((tallest, child) => {
    const childStyle = styleUnder(child, node);
    const across = insideWidth - marginsAcross(childStyle);
    const width =
      growthOf(childStyle).grow > 0
        ? Math.max(share, held(childStyle, ['width', 'minWidth']))
        : Math.min(widthWanted(child, node), across);
    const height =
      laid(
        child,
        node,
        { height: undefined, width },
        contentTop + held(childStyle, ['marginTop', 'marginVertical', 'margin']),
        onto,
      ) + marginsDown(childStyle);

    return Math.max(tallest, height);
  }, 0);
}

function downTheColumn(
  node: DrawnNode,
  style: Style,
  children: readonly DrawnNode[],
  insideWidth: number,
  ownHeight: number | undefined,
  contentTop: number,
  onto: Landing[] | null,
): number {
  const gap = held(style, ['rowGap', 'gap']);
  const widths = children.map((child) => insideWidth - marginsAcross(styleUnder(child, node)));
  const naturals = children.map((child, at) =>
    laid(child, node, { height: undefined, width: widths[at] ?? insideWidth }, 0, null),
  );
  const growths = children.map((child) => growthOf(styleUnder(child, node)));
  const bases = naturals.map((natural, at) => (growths[at]?.fromNothing === true ? 0 : natural));
  const stacked =
    bases.reduce(
      (total, one, at) => total + one + marginsDown(styleUnder(children[at] as DrawnNode, node)),
      0,
    ) +
    gap * (children.length - 1);
  const room = ownHeight === undefined ? undefined : ownHeight - insidesDown(style);
  const spare = room === undefined ? 0 : Math.max(room - stacked, 0);
  const growing = growths.reduce((total, one) => total + one.grow, 0);
  const pushedApart =
    growing === 0 && style.justifyContent === 'space-between' && children.length > 1
      ? spare / (children.length - 1)
      : 0;
  const pushedDown = growing === 0 && style.justifyContent === 'center' ? spare / 2 : 0;

  let at = contentTop + pushedDown;

  children.forEach((child, index) => {
    const childStyle = styleUnder(child, node);
    const growth = growths[index] ?? { fromNothing: false, grow: 0 };
    const share = growing === 0 ? undefined : (bases[index] ?? 0) + (spare * growth.grow) / growing;

    at += held(childStyle, ['marginTop', 'marginVertical', 'margin']);
    at += laid(
      child,
      node,
      { height: growth.grow > 0 ? share : undefined, width: widths[index] ?? insideWidth },
      at,
      onto,
    );
    at += held(childStyle, ['marginBottom', 'marginVertical', 'margin']) + gap + pushedApart;
  });

  return at - gap - pushedApart - contentTop;
}

/**
 * Every box of a drawn screen, placed on the glass of one phone, in the order the tree holds them.
 *
 * The screen is the box the application draws, so the tree handed in is the one under the safe
 * area provider rather than the provider itself.
 */
export function placedOnTheGlass(screen: unknown, phone: Phone): PlacedBox[] {
  if (screen === null || typeof screen !== 'object' || !('type' in screen)) {
    throw new Error('nothing was drawn, so there was no screen to measure');
  }

  const onto: Landing[] = [];

  laid(screen as DrawnNode, null, { height: phone.height, width: phone.width }, 0, onto);

  if (onto.length === 0) {
    throw new Error('the screen held no boxes, so nothing was measured');
  }

  return onto;
}

/** The one box that says these words. A screen saying them twice, or not at all, is refused. */
export function theBoxSaying(boxes: readonly PlacedBox[], words: string): PlacedBox {
  const said = boxes.filter((box) => box.node.type === 'Text' && box.words === words);

  if (said.length !== 1) {
    throw new Error(`${said.length} boxes said "${words}", and one was measured`);
  }

  return said[0] as PlacedBox;
}

/** The one box carrying this name. */
export function theBoxNamed(boxes: readonly PlacedBox[], testID: string): PlacedBox {
  const named = boxes.filter((box) => box.node.props?.testID === testID);

  if (named.length !== 1) {
    throw new Error(`${named.length} boxes were named ${testID}, and one was measured`);
  }

  return named[0] as PlacedBox;
}

/** The one box of a kind, for the boxes a screen has exactly one of and gives no name to. */
export function theOnlyBoxOfType(boxes: readonly PlacedBox[], type: string): PlacedBox {
  const found = boxes.filter((box) => box.node.type === type);

  if (found.length !== 1) {
    throw new Error(`${found.length} boxes were a ${type}, and one was measured`);
  }

  return found[0] as PlacedBox;
}
