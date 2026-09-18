import { readFileSync } from 'node:fs';

const SFNT_TRUETYPE = 0x00010000;
const SFNT_APPLE_TRUETYPE = 0x74727565;
const SFNT_OPENTYPE_CFF = 0x4f54544f;

const NAME_FAMILY = 1;
const NAME_SUBFAMILY = 2;
const NAME_FULL = 4;
const NAME_POSTSCRIPT = 6;

const WINDOWS_PLATFORM = 3;

export interface FontFacts {
  /** The four byte tag that opens the file. A file that is not a font does not have one of these. */
  readonly sfnt: 'truetype' | 'opentype-cff' | 'not a font';
  readonly family: string;
  readonly subfamily: string;
  readonly fullName: string;
  readonly postScriptName: string;
  /** A variable font carries an `fvar` table. React Native reaches only its default instance. */
  readonly isVariable: boolean;
  readonly tables: readonly string[];
}

function sfntOf(tag: number): FontFacts['sfnt'] {
  if (tag === SFNT_TRUETYPE || tag === SFNT_APPLE_TRUETYPE) {
    return 'truetype';
  }
  if (tag === SFNT_OPENTYPE_CFF) {
    return 'opentype-cff';
  }
  return 'not a font';
}

function decode(platform: number, bytes: Buffer): string {
  if (platform === WINDOWS_PLATFORM) {
    return Buffer.from(bytes).swap16().toString('utf16le');
  }
  return bytes.toString('latin1');
}

// The name table is read by hand because the only alternative is a font parsing dependency, and
// the four strings below are the whole reason to open the file.
function namesIn(file: Buffer, offset: number): Map<number, string> {
  const found = new Map<number, string>();
  const count = file.readUInt16BE(offset + 2);
  const storage = offset + file.readUInt16BE(offset + 4);

  for (let index = 0; index < count; index += 1) {
    const record = offset + 6 + index * 12;
    const platform = file.readUInt16BE(record);
    const nameId = file.readUInt16BE(record + 6);
    const length = file.readUInt16BE(record + 8);
    const start = storage + file.readUInt16BE(record + 10);
    const value = decode(platform, file.subarray(start, start + length));

    // A Windows record wins over a Macintosh one for the same name, because it is the one the
    // platforms read, and it is written second in every font here.
    if (!found.has(nameId) || platform === WINDOWS_PLATFORM) {
      found.set(nameId, value);
    }
  }

  return found;
}

export function factsOf(path: string): FontFacts {
  const file = readFileSync(path);

  if (file.length < 12) {
    return {
      sfnt: 'not a font',
      family: '',
      subfamily: '',
      fullName: '',
      postScriptName: '',
      isVariable: false,
      tables: [],
    };
  }

  const sfnt = sfntOf(file.readUInt32BE(0));
  const tableCount = sfnt === 'not a font' ? 0 : file.readUInt16BE(4);
  const tables = new Map<string, number>();

  for (let index = 0; index < tableCount; index += 1) {
    const entry = 12 + index * 16;
    tables.set(file.toString('latin1', entry, entry + 4), file.readUInt32BE(entry + 8));
  }

  const nameOffset = tables.get('name');
  const names = nameOffset === undefined ? new Map<number, string>() : namesIn(file, nameOffset);

  return {
    sfnt,
    family: names.get(NAME_FAMILY) ?? '',
    subfamily: names.get(NAME_SUBFAMILY) ?? '',
    fullName: names.get(NAME_FULL) ?? '',
    postScriptName: names.get(NAME_POSTSCRIPT) ?? '',
    isVariable: tables.has('fvar'),
    tables: [...tables.keys()],
  };
}
