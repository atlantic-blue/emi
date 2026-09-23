import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { colour, colourNames } from '../src/colour';
import { REM_IN_POINTS, radius, radiusNames, space, spaceNames } from '../src/space';
import {
  LINE_HEIGHT_FLOOR,
  face,
  lineHeightsNobodyHasDecided,
  typeRoleNames,
  typeScale,
} from '../src/type';

/**
 * The token package against the document it was copied from. The token package is the only place a
 * screen reads a colour or a size from, so a value that drifts from the design system drifts
 * everywhere at once and nothing else would notice.
 *
 * The document is held to the prototype it was written from by
 * `tools/pipeline/prototype.test.ts`, which also refuses a colour value anywhere in its prose. So
 * the chain runs from the markup, through the front matter, to here, and every link is read.
 */

const repositoryRoot = resolve(__dirname, '..', '..', '..');

/** The design system Emi is drawn in, written from the Warm Editorial Journal prototype. */
export const designSystemDocument = join('docs', 'design', 'prototype-design-system.md');

interface RoleInTheDocument {
  readonly fontFamily: string;
  readonly fontSize: string;
  readonly fontWeight: string;
  readonly lineHeight: string;
  /** Absent in the document for a role it sets no tracking on. */
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

const document = readFileSync(join(repositoryRoot, designSystemDocument), 'utf8');
const inTheDocument = rolesIn(document);

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

describe('the type scale says what the design system says', () => {
  it('reads the document, so an empty read is not taken for agreement', () => {
    expect(Object.keys(inTheDocument)).toHaveLength(13);
    expect(inTheDocument['display-lg']?.fontSize).toBe('3rem');
  });

  it('holds the same thirteen roles, under the same names', () => {
    expect([...typeRoleNames].sort()).toEqual(Object.keys(inTheDocument).sort());
  });

  it.each(typeRoleNames)('sets %s to the size, line height and weight of the document', (name) => {
    const written = inTheDocument[name];
    const held = typeScale[name];

    expect(written).toBeDefined();
    expect(held.size).toBe(pointsOf(String(written?.fontSize)));
    expect(held.lineHeight).toBe(pointsOf(String(written?.lineHeight)));
    expect(String(held.weight)).toBe(written?.fontWeight);
  });

  it.each(typeRoleNames)('tracks %s by what the document names, in em', (name) => {
    const written = inTheDocument[name]?.letterSpacing;
    const held = typeScale[name].letterSpacingEm;

    expect(written === undefined ? 0 : Number(written.replace('em', ''))).toBe(held);
  });

  it.each(typeRoleNames)('draws %s in the family the document names for it', (name) => {
    expect(face[typeScale[name].face]).toBe(inTheDocument[name]?.fontFamily);
  });

  it('names three families across the document, one for each job', () => {
    const families = new Set(Object.values(inTheDocument).map((role) => role.fontFamily));

    expect([...families].sort()).toEqual(['JetBrains Mono', 'Newsreader', 'Plus Jakarta Sans']);
    expect(Object.values(face).sort()).toEqual([...families].sort());
  });

  it('keeps every role at or above the line height floor, apart from the one nobody has decided', () => {
    const cramped = typeRoleNames.filter(
      (name) => typeScale[name].lineHeight < typeScale[name].size * LINE_HEIGHT_FLOOR,
    );

    expect(cramped).toEqual([...lineHeightsNobodyHasDecided]);
  });

  it('holds the undecided role at the ratio the document draws it, so the fix reddens this too', () => {
    const [undecided] = lineHeightsNobodyHasDecided;
    const role = typeScale[undecided ?? 'display-lg'];

    expect(undecided).toBe('display-lg');
    expect(role.lineHeight / role.size).toBeCloseTo(1.167, 3);
  });
});

const coloursInTheDocument = valuesIn(document, 'colors');
const cornersInTheDocument = valuesIn(document, 'rounded');
const spacingInTheDocument = valuesIn(document, 'spacing');

describe('the palette says what the design system says', () => {
  it('reads the document, so an empty read is not taken for agreement', () => {
    expect(Object.keys(coloursInTheDocument)).toHaveLength(55);
    expect(coloursInTheDocument['primary']).toBe('#843117');
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
    expect(Object.keys(spacingInTheDocument)).toHaveLength(11);
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
