import { applicationFontFiles } from '@emi/tokens';

/**
 * What face a run of text is actually drawn in. A family is inherited the way a size is, so a run
 * inside a styled block is read with the block's family and never with none at all.
 */

export interface DrawnRun {
  readonly text: string;
  readonly points: number | undefined;
  readonly family: string | undefined;
}

/** The names the application registers, which is the only set a style may name. */
export const registeredFaces: readonly string[] = applicationFontFiles.map((file) => file.name);

function valueIn(style: unknown, key: string): unknown {
  if (Array.isArray(style)) {
    return style.reduce<unknown>((found, each) => valueIn(each, key) ?? found, undefined);
  }
  if (style !== null && typeof style === 'object' && key in style) {
    return (style as Record<string, unknown>)[key];
  }
  return undefined;
}

export function drawnRuns(
  node: unknown,
  inherited: { points?: number; family?: string } = {},
): DrawnRun[] {
  if (typeof node === 'string') {
    return [{ text: node, points: inherited.points, family: inherited.family }];
  }
  if (Array.isArray(node)) {
    return node.flatMap((each) => drawnRuns(each, inherited));
  }
  if (node !== null && typeof node === 'object' && 'children' in node) {
    const style = (node as { props?: { style?: unknown } }).props?.style;
    const points = valueIn(style, 'fontSize');
    const family = valueIn(style, 'fontFamily');

    return drawnRuns((node as { children: unknown }).children, {
      points: typeof points === 'number' ? points : inherited.points,
      family: typeof family === 'string' ? family : inherited.family,
    });
  }
  return [];
}

/**
 * Every run a screen drew in a face nobody loaded. A run with no size of its own is left out: it is
 * drawn by whatever encloses it, and that run is measured here too.
 */
export function runsDrawnInAnUnloadedFace(node: unknown): DrawnRun[] {
  return drawnRuns(node).filter(
    (run) =>
      run.text.trim().length > 0 &&
      run.points !== undefined &&
      (run.family === undefined || !registeredFaces.includes(run.family)),
  );
}
