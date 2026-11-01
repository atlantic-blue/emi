import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { colour } from '@emi/tokens';

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
