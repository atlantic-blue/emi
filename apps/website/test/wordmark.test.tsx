import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { colour } from '@emi/tokens';
import { renderToStaticMarkup } from 'react-dom/server';

import { EmiWordmark } from '../components/emiWordmark';
import { WORDMARK_FILE, WORDMARK_UNITS } from '../components/siteHeader';
import { websiteWorkspace } from './stylesheet';

/**
 * The mark the site serves, read against the mark the brand draws. The brand generator writes
 * `brand/logo/emi-wordmark.svg` from the geometry and from the accent in `packages/tokens`, so the
 * colour in that file is measured where it is chosen. This is the gate that keeps the file a
 * browser asks for the same drawing: redraw the mark without bringing it across, and this case
 * says so.
 */

const repositoryRoot = join(websiteWorkspace, '..', '..');

const drawn = join(repositoryRoot, 'brand', 'logo', 'emi-wordmark.svg');
const served = join(websiteWorkspace, 'public', WORDMARK_FILE);

function read(file: string): string {
  return readFileSync(file, 'utf8');
}

describe('the mark on every page of the site', () => {
  it('is the drawing the brand generates, to the byte', () => {
    expect(read(served)).toBe(read(drawn));
  });

  it('is painted in the one colour that acts', () => {
    expect(read(served)).toContain(colour.accent);
  });

  it('is declared at the size it is drawn at, so a browser keeps its shape', () => {
    const canvas = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(read(served));

    expect(canvas).not.toBeNull();
    expect(WORDMARK_UNITS.width).toBe(Math.round(Number(canvas?.[1])));
    expect(WORDMARK_UNITS.height).toBe(Math.round(Number(canvas?.[2])));
  });

  it('is served by this site, under a name of its own', () => {
    expect(WORDMARK_FILE).toBe('/emi-wordmark.svg');
  });
});

/**
 * The band at the top of every page draws the mark inside the page rather than asking for the file,
 * because an element that carries a picture writes a style on itself and this site's policy refuses
 * one. Drawn in the page, the mark is a copy, and a copy can fall behind the drawing it came from.
 * These cases hold the two together: redraw the mark in the brand and they say the page is behind.
 */
describe('the mark drawn inside the page', () => {
  const drawing = read(drawn);

  const pathsOf = (svg: string): string[] =>
    [...svg.matchAll(/ d="([^"]+)"/g)].map(([, outline]) => outline ?? '');

  const inline = (): string => renderToStaticMarkup(<EmiWordmark />);

  it('carries every outline of the drawing the brand generates, in its order', () => {
    expect(pathsOf(drawing).length).toBeGreaterThan(0);
    expect(pathsOf(inline())).toEqual(pathsOf(drawing));
  });

  it('is drawn on the canvas the drawing declares, so it keeps its shape', () => {
    const canvas = /viewBox="([^"]+)"/.exec(drawing);

    expect(canvas?.[1]).not.toBeUndefined();
    expect(inline()).toContain(`viewBox="${canvas?.[1] ?? ''}"`);
  });

  it('is painted in the one colour that acts, which is the colour of the file', () => {
    expect(drawing).toContain(colour.accent);
    expect(inline()).toContain(colour.accent);
  });

  it('reads to her software as one picture called Emi, which the file gave her as its label', () => {
    expect(inline()).toContain('role="img"');
    expect(inline()).toContain('aria-label="Emi"');
  });

  it('writes no style on itself, because this site’s policy refuses one', () => {
    expect(inline()).not.toContain('style=');
  });
});
