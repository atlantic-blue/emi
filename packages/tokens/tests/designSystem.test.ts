import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { colour, colourNames } from '../src/colour';
import { REM_IN_POINTS, radius, radiusNames, space, spaceNames } from '../src/space';
import { face, typeRoleNames, typeScale } from '../src/type';

/**
 * The type scale against the document it was copied from. The token package is the only place a
 * screen reads a size from, so a role that drifts from the design system drifts everywhere at once
 * and nothing else would notice.
 */

const repositoryRoot = resolve(__dirname, '..', '..', '..');
export const designSystemDocument = join('docs', 'design', 'prototype-design-system.md');

interface RoleInTheDocument {
  readonly fontFamily: string;
  readonly fontSize: string;
  readonly fontWeight: string;
  readonly lineHeight: string;
  /** Absent in the document for a role the design system does not track. */
  readonly letterSpacing?: string;
}

/**
 * One block of the front matter, read as it is written. This is a reader rather than a parser for
 * the whole of YAML: it holds to two indents and the one nesting level the blocks have, and it
 * refuses anything else rather than guessing.
 */
export function valuesIn(document: string, block: string): Record<string, string> {
  const front = document.split('---')[1];

  if (front === undefined) {
    throw new Error(`the design system has no front matter, so it names no ${block}`);
  }

  const values: Record<string, string> = {};
  let reading = false;

  for (const line of front.split('\n')) {
    if (new RegExp(`^${block}:\\s*$`).test(line)) {
      reading = true;
      continue;
    }
    if (!reading) {
      continue;
    }
    if (/^\S/.test(line)) {
      break;
    }

    const pair = /^ {2}([A-Za-z-]+): *'?([^']*?)'? *$/.exec(line);
    if (pair?.[1] !== undefined && pair[2] !== undefined && pair[2] !== '') {
      values[pair[1]] = pair[2];
    }
  }

  return values;
}

/** The document writes a name in kebab case and the token package writes it in camel case. */
export function camelCase(name: string): string {
  return name.replace(/-([a-z])/g, (_whole, letter: string) => letter.toUpperCase());
}

/**
 * The typography block of the front matter, read as it is written. This is a reader rather than a
 * parser for the whole of YAML: it holds to two indents and one nesting level, which is the shape
 * the block has, and it refuses anything else rather than guessing.
 */
export function rolesIn(document: string): Record<string, RoleInTheDocument> {
  const front = document.split('---')[1];

  if (front === undefined) {
    throw new Error('the design system has no front matter, so it names no type roles');
  }

  const roles: Record<string, Record<string, string>> = {};
  let role: string | undefined;
  let reading = false;

  for (const line of front.split('\n')) {
    if (/^typography:\s*$/.test(line)) {
      reading = true;
      continue;
    }
    if (!reading) {
      continue;
    }
    if (/^\S/.test(line)) {
      break;
    }

    const opened = /^ {2}([a-z-]+):\s*$/.exec(line);
    if (opened?.[1] !== undefined) {
      role = opened[1];
      roles[role] = {};
      continue;
    }

    const pair = /^ {4}([A-Za-z]+): *'?([^']*?)'? *$/.exec(line);
    if (pair?.[1] !== undefined && pair[2] !== undefined && role !== undefined) {
      const held = roles[role];
      if (held !== undefined) {
        held[pair[1]] = pair[2];
      }
    }
  }

  return roles as unknown as Record<string, RoleInTheDocument>;
}

/** One colour as the document writes it, with where it sits, so a failure names the paragraph. */
export interface ColourInTheDocument {
  readonly written: string;
  readonly line: number;
  readonly context: string;
}

const hexPattern = /#[0-9a-fA-F]{3,8}\b/g;

const functionPattern = /rgba?\([^)]*\)/gi;

/** One spelling for one colour: lower case, and no spaces inside a function. */
export function sameColour(written: string): string {
  return written.toLowerCase().replace(/\s+/g, '');
}

/**
 * Every colour written anywhere in the document, the front matter and the prose alike.
 *
 * The prose is the half nothing read. The type scale, the palette, the corners and the spacing are
 * all checked against the front matter, and for as long as that was the whole check the prose could
 * name a different palette and the suite stayed green, which is what it did.
 */
export function coloursWrittenIn(document: string): ColourInTheDocument[] {
  const found: ColourInTheDocument[] = [];

  document.split('\n').forEach((text, at) => {
    for (const pattern of [hexPattern, functionPattern]) {
      for (const match of text.matchAll(pattern)) {
        found.push({ written: match[0], line: at + 1, context: text.trim() });
      }
    }
  });

  return found;
}

/**
 * The shadow values the prose may keep, named one at a time. The front matter holds no shadow
 * block, so these two are the only place the elevation is written down, and both are drawn by the
 * prototype. A rule that allowed any `rgba` instead would let a whole second palette back in
 * wearing different clothes.
 */
export const shadowTints: readonly string[] = [
  'rgba(43, 37, 35, 0.05)',
  'rgba(217, 107, 82, 0.06)',
];

export function coloursOutsideThePalette(
  written: readonly ColourInTheDocument[],
  palette: readonly string[],
  allowed: readonly string[] = shadowTints,
): string[] {
  const held = new Set([...palette, ...allowed].map(sameColour));

  return written
    .filter((colour) => !held.has(sameColour(colour.written)))
    .map(
      (colour) =>
        `${designSystemDocument} line ${colour.line} writes ${colour.written}, which the palette does not hold: ${colour.context}`,
    );
}

const document = readFileSync(join(repositoryRoot, designSystemDocument), 'utf8');
const inTheDocument = rolesIn(document);

describe('the type scale says what the design system says', () => {
  it('reads the document, so an empty read is not taken for agreement', () => {
    expect(Object.keys(inTheDocument)).toHaveLength(11);
    expect(inTheDocument['headline-xl']?.fontSize).toBe('36px');
  });

  it('holds the same eleven roles, under the same names', () => {
    expect([...typeRoleNames].sort()).toEqual(Object.keys(inTheDocument).sort());
  });

  it.each(typeRoleNames)('sets %s to the size, line height and weight of the document', (name) => {
    const written = inTheDocument[name];
    const held = typeScale[name];

    expect(written).toBeDefined();
    expect(`${held.size}px`).toBe(written?.fontSize);
    expect(`${held.lineHeight}px`).toBe(written?.lineHeight);
    expect(String(held.weight)).toBe(written?.fontWeight);
  });

  it.each(typeRoleNames)('tracks %s by what the document names, in em', (name) => {
    const written = inTheDocument[name]?.letterSpacing;
    const held = typeScale[name].letterSpacingEm;

    expect(written === undefined ? 0 : Number(written.replace('em', ''))).toBe(held);
  });

  it.each(typeRoleNames)('draws %s in the one family the document names', (name) => {
    expect(face[typeScale[name].face]).toBe(inTheDocument[name]?.fontFamily);
  });

  it('names one family across the whole document, which is why there is one face', () => {
    const families = new Set(Object.values(inTheDocument).map((role) => role.fontFamily));

    expect([...families]).toEqual(['Plus Jakarta Sans']);
  });
});

const coloursInTheDocument = valuesIn(document, 'colors');
const cornersInTheDocument = valuesIn(document, 'rounded');
const spacingInTheDocument = valuesIn(document, 'spacing');

/** A length the document writes in rem or in px, as the points a screen measures in. */
function pointsOf(written: string): number {
  if (written.endsWith('rem')) {
    return Number(written.replace('rem', '')) * REM_IN_POINTS;
  }
  if (written.endsWith('px')) {
    return Number(written.replace('px', ''));
  }
  throw new Error(`${written} is neither rem nor px, so it has no length in points`);
}

describe('the palette says what the design system says', () => {
  it('reads the document, so an empty read is not taken for agreement', () => {
    expect(Object.keys(coloursInTheDocument)).toHaveLength(47);
    expect(coloursInTheDocument['primary']).toBe('#9c3e28');
  });

  it('holds the same colours, under the same names', () => {
    expect([...colourNames].sort()).toEqual(
      Object.keys(coloursInTheDocument).map(camelCase).sort(),
    );
  });

  it.each(Object.keys(coloursInTheDocument))('holds the document value for %s', (name) => {
    const held = colour[camelCase(name) as keyof typeof colour];

    expect(held.toLowerCase()).toBe(coloursInTheDocument[name]?.toLowerCase());
  });
});

describe('the corners and the spacing say what the design system says', () => {
  it('reads both blocks, so an empty read is not taken for agreement', () => {
    expect(Object.keys(cornersInTheDocument)).toHaveLength(6);
    expect(Object.keys(spacingInTheDocument)).toHaveLength(7);
  });

  it('holds the same corner names and the same steps', () => {
    expect([...radiusNames].sort()).toEqual(Object.keys(cornersInTheDocument).sort());
  });

  it.each(Object.keys(cornersInTheDocument))('rounds %s the way the document rounds it', (name) => {
    const held = radius[name as keyof typeof radius];

    expect(held).toBe(pointsOf(String(cornersInTheDocument[name])));
  });

  it('holds the same spacing names and the same steps', () => {
    expect([...spaceNames].sort()).toEqual(Object.keys(spacingInTheDocument).map(camelCase).sort());
  });

  it.each(Object.keys(spacingInTheDocument))('spaces %s the way the document spaces it', (name) => {
    const held = space[camelCase(name) as keyof typeof space];

    expect(held).toBe(pointsOf(String(spacingInTheDocument[name])));
  });
});

describe('the whole document names one palette', () => {
  const written = coloursWrittenIn(document);
  const palette = Object.values(coloursInTheDocument);

  it('reads past the front matter, which is the half nothing read before', () => {
    const frontMatterEnds =
      document.split('\n').findIndex((line, at) => at > 0 && line === '---') + 1;

    expect(frontMatterEnds).toBeGreaterThan(100);
    expect(written.filter((colour) => colour.line > frontMatterEnds).length).toBeGreaterThan(0);
    expect(written.length).toBeGreaterThan(palette.length);
  });

  it('writes no colour the palette does not hold', () => {
    expect(coloursOutsideThePalette(written, palette)).toEqual([]);
  });

  it('keeps both shadow tints, so the list of what is allowed cannot rot unnoticed', () => {
    const spellings = written.map((colour) => sameColour(colour.written));

    for (const tint of shadowTints) {
      expect(spellings).toContain(sameColour(tint));
    }
  });

  it('refuses a colour of its own, and names the line and the paragraph', () => {
    const [said] = coloursOutsideThePalette(
      coloursWrittenIn('# One\n\nThe primary button is #D96B52 on press.\n'),
      palette,
    );

    expect(said).toContain('line 3');
    expect(said).toContain('#D96B52');
    expect(said).toContain('The primary button is');
  });

  it('refuses a tint that is not one of the two, so the allowance is by name and not by shape', () => {
    const other = 'rgba(217, 107, 82, 0.3)';

    expect(coloursOutsideThePalette(coloursWrittenIn(other), palette)).toHaveLength(1);
    expect(coloursOutsideThePalette(coloursWrittenIn(shadowTints[0] as string), palette)).toEqual(
      [],
    );
  });

  it('reads one colour under either spelling, so a capital is not a second palette', () => {
    expect(coloursOutsideThePalette(coloursWrittenIn('#FCF9F4'), palette)).toEqual([]);
    expect(sameColour('RGBA(43, 37, 35, 0.05)')).toBe('rgba(43,37,35,0.05)');
  });
});
