import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { type TypeRoleName, fontFileFor, fontsRoot, typeScale } from '@emi/tokens';

/**
 * How wide a run of words is drawn, read from the font files the application ships.
 *
 * The runner draws a tree and never lays it out, so no width here comes off a rendered box. A
 * phone asks the face how far the pen moves for each letter and adds those up. This does the same
 * arithmetic on the same files: the advance of each glyph, out of the font, at the size the role
 * is drawn at.
 *
 * Emi ships Latin cuts only. A phone reading Russian draws the Cyrillic in a face of its own that
 * this repository does not hold, so a run holding one of those letters is refused rather than
 * answered. The widest glyph in a Latin cut is one and a third letters wide, which makes a word of
 * six letters half as wide again as the phone draws it, and a number that wrong fails a screen
 * that is fine. What can be said without the file is said by laying the row out at every width the
 * words could take.
 */

/** The bytes of one font file, and where each table it holds begins. */
interface Tables {
  readonly bytes: Buffer;
  readonly at: Readonly<Record<string, number>>;
}

/** One cut of one face, as the two numbers a width is made of. */
export interface Face {
  /** The grid the advances are measured on, which a size is scaled against. */
  readonly unitsPerEm: number;
  /** The advance of one character, in those units, or nothing when the face has no glyph for it. */
  readonly advanceOf: (codePoint: number) => number | undefined;
  /** The widest advance the face carries, which is what a letter it cannot draw is counted at. */
  readonly widest: number;
}

/** The fonts sit at a path from the root of the repository, and a runner is started anywhere. */
const repositoryRoot = join(__dirname, '..', '..', '..', '..');

const TABLE_DIRECTORY = 12;
const TABLE_RECORD = 16;

function tablesOf(bytes: Buffer): Tables {
  const count = bytes.readUInt16BE(4);
  const at: Record<string, number> = {};

  for (let index = 0; index < count; index += 1) {
    const record = TABLE_DIRECTORY + index * TABLE_RECORD;

    at[bytes.toString('latin1', record, record + 4)] = bytes.readUInt32BE(record + 8);
  }

  return { bytes, at };
}

function tableAt(tables: Tables, name: string): number {
  const found = tables.at[name];

  if (found === undefined) {
    throw new Error(`the font carries no ${name} table, so its widths cannot be read`);
  }

  return found;
}

/**
 * The subtable that maps a character to a glyph. The Windows Unicode subtable is the one every
 * face in this repository carries, and it covers everything Emi writes.
 */
function unicodeSubtableOf(tables: Tables): number {
  const cmap = tableAt(tables, 'cmap');
  const count = tables.bytes.readUInt16BE(cmap + 2);

  for (let index = 0; index < count; index += 1) {
    const record = cmap + 4 + index * 8;
    const platform = tables.bytes.readUInt16BE(record);
    const encoding = tables.bytes.readUInt16BE(record + 2);
    const subtable = cmap + tables.bytes.readUInt32BE(record + 4);

    if (platform === 3 && encoding === 1 && tables.bytes.readUInt16BE(subtable) === 4) {
      return subtable;
    }
  }

  throw new Error('the font maps no characters the way every face Emi ships maps them');
}

/** Which glyph draws a character, walking the segments the subtable is written as. */
function glyphReader(tables: Tables): (codePoint: number) => number {
  const subtable = unicodeSubtableOf(tables);
  const segments = tables.bytes.readUInt16BE(subtable + 6) / 2;
  const ends = subtable + 14;
  const starts = ends + segments * 2 + 2;
  const deltas = starts + segments * 2;
  const ranges = deltas + segments * 2;

  return (codePoint) => {
    for (let segment = 0; segment < segments; segment += 1) {
      if (codePoint > tables.bytes.readUInt16BE(ends + segment * 2)) {
        continue;
      }

      const start = tables.bytes.readUInt16BE(starts + segment * 2);

      if (codePoint < start) {
        return 0;
      }

      const delta = tables.bytes.readInt16BE(deltas + segment * 2);
      const range = tables.bytes.readUInt16BE(ranges + segment * 2);

      if (range === 0) {
        return (codePoint + delta) & 0xffff;
      }

      const glyph = tables.bytes.readUInt16BE(
        ranges + segment * 2 + range + (codePoint - start) * 2,
      );

      return glyph === 0 ? 0 : (glyph + delta) & 0xffff;
    }

    return 0;
  };
}

const faces = new Map<string, Face>();

function faceAt(path: string): Face {
  const held = faces.get(path);

  if (held !== undefined) {
    return held;
  }

  const tables = tablesOf(readFileSync(path));
  const unitsPerEm = tables.bytes.readUInt16BE(tableAt(tables, 'head') + 18);
  const metrics = tables.bytes.readUInt16BE(tableAt(tables, 'hhea') + 34);
  const hmtx = tableAt(tables, 'hmtx');
  const glyphOf = glyphReader(tables);
  // A face writes an advance for each of the first glyphs and then stops, because the tail of it
  // is drawn at one width. A glyph past the end takes the last advance the table holds.
  const advanceAt = (glyph: number): number =>
    tables.bytes.readUInt16BE(hmtx + Math.min(glyph, metrics - 1) * 4);

  let widest = 0;

  for (let glyph = 0; glyph < metrics; glyph += 1) {
    widest = Math.max(widest, advanceAt(glyph));
  }

  const face: Face = {
    advanceOf: (codePoint) => {
      const glyph = glyphOf(codePoint);

      return glyph === 0 ? undefined : advanceAt(glyph);
    },
    unitsPerEm,
    widest,
  };

  faces.set(path, face);

  return face;
}

/** The cut one role of the design system is drawn in, as the file that ships it. */
export function theFaceOf(role: TypeRoleName): Face {
  const step = typeScale[role];

  if (step.letterSpacingEm !== 0) {
    throw new Error(
      `${role} is drawn with tracking, and how much of it a platform puts after the last letter is not known here`,
    );
  }

  return faceAt(
    join(repositoryRoot, ...fontsRoot.split('/'), fontFileFor(step.face, step.weight).path),
  );
}

/** The letters of a run the shipped face cannot draw, which a phone draws in a face of its own. */
export function theLettersWithNoGlyph(words: string, role: TypeRoleName): string[] {
  const face = theFaceOf(role);

  return [...words].filter((letter) => face.advanceOf(letter.codePointAt(0) ?? 0) === undefined);
}

/** Points. A run the shipped face cannot draw is refused, because its width is the phone's. */
export function theWidthOfWords(words: string, role: TypeRoleName): number {
  const absent = theLettersWithNoGlyph(words, role);

  if (absent.length > 0) {
    throw new Error(
      `the cut Emi ships for ${role} draws no ${absent.join('')}, so a phone draws those in a ` +
        'face this repository does not hold, and a width for them is not read here',
    );
  }

  const face = theFaceOf(role);
  const units = [...words].reduce(
    (total, letter) => total + (face.advanceOf(letter.codePointAt(0) ?? 0) ?? 0),
    0,
  );

  return (units * typeScale[role].size) / face.unitsPerEm;
}
