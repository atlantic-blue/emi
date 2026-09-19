import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

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
