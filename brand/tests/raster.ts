import type { Drawing, Point } from '../logo/geometry.ts';

/**
 * A drawing turned into coverage, one number for each pixel, from zero for bare ground to one
 * for solid ink. The rows are sampled and each span is measured along its row, which is close
 * enough to what a browser draws to answer whether a person can see a gap.
 */
export interface Raster {
  readonly width: number;
  readonly height: number;
  readonly coverage: Float64Array;
}

const ROWS_PER_PIXEL = 8;

export function rasterise(drawing: Drawing, heightInPixels: number): Raster {
  const scale = heightInPixels / drawing.height;
  const width = Math.max(1, Math.round(drawing.width * scale));
  const height = Math.max(1, Math.round(heightInPixels));
  const coverage = new Float64Array(width * height);
  const byRow = edgesByRow(drawing.contours.flatMap(edgesOf), scale, height);

  for (let row = 0; row < height; row++) {
    const edges = byRow[row] as Edge[];
    if (edges.length === 0) continue;
    for (let sample = 0; sample < ROWS_PER_PIXEL; sample++) {
      const y = (row + (sample + 0.5) / ROWS_PER_PIXEL) / scale;
      for (const span of spansAt(edges, y)) {
        addSpan(coverage, width, row, span.from * scale, span.to * scale, 1 / ROWS_PER_PIXEL);
      }
    }
  }
  return { width, height, coverage };
}

/** Each row only meets the edges that cross it, so a large drawing stays quick. */
function edgesByRow(edges: readonly Edge[], scale: number, height: number): Edge[][] {
  const rows: Edge[][] = Array.from({ length: height }, () => []);
  for (const edge of edges) {
    const first = Math.max(0, Math.floor(Math.min(edge.y0, edge.y1) * scale));
    const last = Math.min(height - 1, Math.ceil(Math.max(edge.y0, edge.y1) * scale));
    for (let row = first; row <= last; row++) (rows[row] as Edge[]).push(edge);
  }
  return rows;
}

interface Edge {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

function edgesOf(contour: readonly Point[]): Edge[] {
  const edges: Edge[] = [];
  for (let k = 0; k < contour.length; k++) {
    const a = contour[k] as Point;
    const b = contour[(k + 1) % contour.length] as Point;
    if (a.y !== b.y) edges.push({ x0: a.x, y0: a.y, x1: b.x, y1: b.y });
  }
  return edges;
}

/** The inside of the drawing along one horizontal line, by the non zero winding rule. */
function spansAt(edges: readonly Edge[], y: number): { from: number; to: number }[] {
  const hits: { x: number; winding: number }[] = [];
  for (const edge of edges) {
    const low = Math.min(edge.y0, edge.y1);
    const high = Math.max(edge.y0, edge.y1);
    if (y < low || y >= high) continue;
    hits.push({
      x: edge.x0 + ((y - edge.y0) / (edge.y1 - edge.y0)) * (edge.x1 - edge.x0),
      winding: edge.y1 > edge.y0 ? 1 : -1,
    });
  }
  hits.sort((one, other) => one.x - other.x);

  const spans: { from: number; to: number }[] = [];
  let winding = 0;
  let from = 0;
  for (const hit of hits) {
    if (winding === 0) from = hit.x;
    winding += hit.winding;
    if (winding === 0 && hit.x > from) spans.push({ from, to: hit.x });
  }
  return spans;
}

function addSpan(
  coverage: Float64Array,
  width: number,
  row: number,
  from: number,
  to: number,
  weight: number,
): void {
  const first = Math.max(0, Math.floor(from));
  const last = Math.min(width - 1, Math.ceil(to) - 1);
  for (let column = first; column <= last; column++) {
    const overlap = Math.min(to, column + 1) - Math.max(from, column);
    if (overlap > 0) {
      const at = row * width + column;
      coverage[at] = (coverage[at] as number) + overlap * weight;
    }
  }
}

export function coverageAt(raster: Raster, column: number, row: number): number {
  if (column < 0 || row < 0 || column >= raster.width || row >= raster.height) return 0;
  return Math.min(1, raster.coverage[row * raster.width + column] as number);
}

/** Ink is anything a person reads as drawn rather than as ground. */
export const INK = 0.5;

/**
 * Whether the ground outside the drawing reaches the given pixel without crossing ink. The hole
 * of a closed ring is unreachable; the hole of an open one is reached through the gap.
 */
export function groundReaches(raster: Raster, target: { column: number; row: number }): boolean {
  const seen = new Uint8Array(raster.width * raster.height);
  const queue: number[] = [];
  const visit = (column: number, row: number): void => {
    if (column < 0 || row < 0 || column >= raster.width || row >= raster.height) return;
    const at = row * raster.width + column;
    if (seen[at] === 1) return;
    if (coverageAt(raster, column, row) >= INK) return;
    seen[at] = 1;
    queue.push(at);
  };

  for (let column = 0; column < raster.width; column++) {
    visit(column, 0);
    visit(column, raster.height - 1);
  }
  for (let row = 0; row < raster.height; row++) {
    visit(0, row);
    visit(raster.width - 1, row);
  }

  while (queue.length > 0) {
    const at = queue.pop() as number;
    const column = at % raster.width;
    const row = (at - column) / raster.width;
    visit(column - 1, row);
    visit(column + 1, row);
    visit(column, row - 1);
    visit(column, row + 1);
  }
  return seen[target.row * raster.width + target.column] === 1;
}

/** The mark drawn in text, so a failing test shows the picture it is complaining about. */
export function picture(raster: Raster): string {
  const shades = ' .:-=+*#%@';
  const rows: string[] = [];
  for (let row = 0; row < raster.height; row++) {
    let line = '';
    for (let column = 0; column < raster.width; column++) {
      const step = Math.min(
        shades.length - 1,
        Math.floor(coverageAt(raster, column, row) * shades.length),
      );
      line += shades[step];
    }
    rows.push(line);
  }
  return rows.join('\n');
}
