import { icons } from '@emi/tokens';

/**
 * How many locks a rendered screen draws, read off the drawing each icon hands the glass. A lock
 * drawn by any component counts, so a screen cannot pass by drawing one outside the lock line.
 */
export function locksDrawnIn(node: unknown): number {
  if (Array.isArray(node)) {
    return node.reduce<number>((count, each) => count + locksDrawnIn(each), 0);
  }
  if (node === null || typeof node !== 'object') {
    return 0;
  }

  const xml = (node as { props?: { xml?: unknown } }).props?.xml;
  const here = typeof xml === 'string' && xml.includes(icons.lock.body) ? 1 : 0;
  const children = 'children' in node ? (node as { children: unknown }).children : [];

  return here + locksDrawnIn(children);
}
