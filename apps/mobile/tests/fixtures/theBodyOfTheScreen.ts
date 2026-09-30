import { StyleSheet } from 'react-native';

import type { DrawnNode, PlacedBox } from './theHeightDownTheGlass';
import { scrollingView } from './theHeightDownTheGlass';

/**
 * The body of a screen, and what the body does with the room it is given.
 *
 * Every screen stands on `Screen`, which reserves what the phone keeps for itself and hands the
 * rest to one box. That box is the body. A body that centres its content leaves half the spare room
 * above the first thing in it, which draws a short column of words floating in an empty glass with
 * nothing at the top.
 *
 * Two things are read here, and they answer different questions. The room above the content is
 * measured, and it says where the content of one screen actually landed. What the body asks for is
 * read off its own style, and it says whether a screen still holds the rule, on every screen and
 * whatever its content happens to be that day.
 */

type Style = Record<string, unknown>;

function flattened(style: unknown): Style {
  return (StyleSheet.flatten(style) ?? {}) as Style;
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

function childrenOf(node: DrawnNode): DrawnNode[] {
  const children = Array.isArray(node.children) ? node.children : [];

  return children.filter(
    (child): child is DrawnNode => child !== null && typeof child === 'object' && 'type' in child,
  );
}

/** A box that takes the room the screen has left over, which is what a body does. */
function takesTheRoomLeftOver(node: DrawnNode): boolean {
  const style = flattened(node.props?.style);

  return node.type === scrollingView || held(style, ['flex']) > 0 || held(style, ['flexGrow']) > 0;
}

function placementOf(boxes: readonly PlacedBox[], node: DrawnNode): PlacedBox {
  const found = boxes.find((box) => box.node === node);

  if (found === undefined) {
    throw new Error('a box of the screen was never placed on the glass');
  }

  return found;
}

export interface TheBody {
  readonly box: PlacedBox;
  /** The style the body is laid out with, which a scrolling view carries for the box inside it. */
  readonly style: Style;
  /** The first thing the body holds, which is what a centred body pushes down the glass. */
  readonly first: PlacedBox;
}

/**
 * The one box a screen hands its content to. It is the child of the screen that takes the room left
 * over, and where that child is a scrolling view the body is the box inside it: a scrolling view
 * lays its children out in a box of its own, and that box wears the content style.
 *
 * A scrolling view counts as taking the room left over whatever its style says, because React
 * Native gives it that in a base style of its own and the drawn tree does not carry one.
 */
export function theBodyOfTheScreen(boxes: readonly PlacedBox[]): TheBody {
  const root = boxes[0];

  if (root === undefined) {
    throw new Error('no box was placed, so there is no screen to read a body from');
  }

  const holding = childrenOf(root.node).filter((child) => takesTheRoomLeftOver(child));

  if (holding.length !== 1) {
    throw new Error(
      `${holding.length} boxes of the screen take the room left over, and the body is one of them`,
    );
  }

  const holder = holding[0] as DrawnNode;
  const scrolls = holder.type === scrollingView;
  const body = scrolls ? childrenOf(holder)[0] : holder;
  const style = flattened(scrolls ? holder.props?.contentContainerStyle : holder.props?.style);

  if (body === undefined) {
    throw new Error('the scrolling view of the screen held nothing, so it has no body');
  }

  const first = childrenOf(body)[0];

  if (first === undefined) {
    throw new Error('the body of the screen holds nothing, so nothing was placed in it');
  }

  return { box: placementOf(boxes, body), first: placementOf(boxes, first), style };
}

/** Where the body lets its content begin: under its own border and its own padding. */
export function theTopOfTheContent(body: TheBody): number {
  return (
    body.box.top +
    held(body.style, ['borderTopWidth', 'borderWidth']) +
    held(body.style, ['paddingTop', 'paddingVertical', 'padding'])
  );
}

/** The room a body leaves above the first thing in it, over and above what that thing asked for. */
export function theRoomAboveTheContent(body: TheBody): number {
  const asked = held(flattened(body.first.node.props?.style), [
    'marginTop',
    'marginVertical',
    'margin',
  ]);

  return body.first.top - theTopOfTheContent(body) - asked;
}

export interface AScreenOnTheGlass {
  /** The name the screen carries on the glass, so a failure says which screen to go and read. */
  readonly name: string;
  readonly boxes: readonly PlacedBox[];
}

/**
 * The screens whose body asks for its content in the middle, named one by one, because a failure
 * saying only `false` sends the reader back to every screen in turn.
 *
 * A measurement of nothing is not a pass, so an empty list of screens is refused.
 */
export function screensCentringTheirBody(screens: readonly AScreenOnTheGlass[]): string[] {
  if (screens.length === 0) {
    throw new Error('no screen was placed on the glass, so no body was read');
  }

  return screens
    .filter(({ boxes }) => theBodyOfTheScreen(boxes).style.justifyContent === 'center')
    .map(
      ({ name }) =>
        `${name} centres its body, and the content of a screen begins at the top of the glass`,
    );
}
