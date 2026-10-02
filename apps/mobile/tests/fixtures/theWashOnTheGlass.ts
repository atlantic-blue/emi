/**
 * A wash as the drawing passes it down.
 *
 * react-native-svg flattens a gradient into one array of numbers, alternating the place along the
 * gradient with the colour at that place, and it packs that colour as alpha, red, green and blue
 * in a single signed integer. A gradient is also a definition rather than a shape, so no test
 * identifier reaches it and it has to be found by its own name. Both of those are read back here,
 * so a test can name a token and a phase rather than a number and a position.
 */

/** A node of the tree the drawing passed down. */
interface Drawn {
  readonly type?: string;
  readonly props?: Record<string, unknown>;
  readonly children?: unknown;
}

/** One stop of a gradient: where it sits, what colour it is, and how much of it is there. */
export interface DrawnStop {
  /** Where along the gradient the stop sits, from 0 at the start to 1 at the end. */
  readonly at: number;
  /** The colour, as the six digit hex the token package holds. */
  readonly colour: string;
  /** How opaque it is, from 0 for nothing to 1 for the whole colour. */
  readonly opacity: number;
}

function hexOf(packed: number): string {
  return `#${(packed & 0xffffff).toString(16).toUpperCase().padStart(6, '0')}`;
}

function opacityOf(packed: number): number {
  return ((packed >>> 24) & 0xff) / 0xff;
}

function nodesIn(node: unknown): Drawn[] {
  if (Array.isArray(node)) {
    return node.flatMap(nodesIn);
  }
  if (node === null || typeof node !== 'object') {
    return [];
  }

  const element = node as Drawn;

  return [element, ...nodesIn(element.children ?? [])];
}

/**
 * The gradient of that name, found by what it is called rather than by where it sits. Reaching for
 * it by position would pass on the day two of them swapped over.
 */
export function gradientNamed(tree: unknown, id: string): Drawn {
  const found = nodesIn(tree).filter((node) => node.props?.['name'] === id);

  if (found.length !== 1) {
    throw new Error(`the drawing holds ${found.length} gradients called ${id}, and it holds one`);
  }

  return found[0] as Drawn;
}

/** Every stop of a gradient the drawing passed down, in the order it runs through them. */
export function stopsOf(node: Drawn): DrawnStop[] {
  const flattened = node.props?.['gradient'];

  if (!Array.isArray(flattened) || flattened.length === 0 || flattened.length % 2 !== 0) {
    throw new Error(
      `${JSON.stringify(flattened)} is not the pairs of a gradient the drawing passed down`,
    );
  }

  const stops: DrawnStop[] = [];

  for (let pair = 0; pair < flattened.length; pair += 2) {
    const at = flattened[pair] as unknown;
    const packed = flattened[pair + 1] as unknown;

    if (typeof at !== 'number' || typeof packed !== 'number') {
      throw new Error(`stop ${pair / 2} of the gradient is ${JSON.stringify([at, packed])}`);
    }

    stops.push({ at, colour: hexOf(packed), opacity: opacityOf(packed) });
  }

  return stops;
}

/** The colours a gradient runs through, with the stops that have faded to nothing left out. */
export function washColoursOf(stops: readonly DrawnStop[]): string[] {
  return stops.filter((stop) => stop.opacity > 0).map((stop) => stop.colour);
}

/** What a layer of the wash is painted with, which is the gradient it points at by name. */
export function paintedWith(tree: unknown, testID: string): string {
  const found = nodesIn(tree).filter((node) => node.props?.['testID'] === testID);

  if (found.length !== 1) {
    throw new Error(`the drawing holds ${found.length} layers called ${testID}, and it holds one`);
  }

  const fill = found[0]?.props?.['fill'] as { brushRef?: unknown } | undefined;

  if (typeof fill?.brushRef !== 'string') {
    throw new Error(`the layer ${testID} is painted with ${JSON.stringify(fill)}, not a gradient`);
  }

  return fill.brushRef;
}
