import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

import {
  DRAWN_FAMILY,
  FontFile,
  OPEN_FONT_LICENCE,
  applicationFontFiles,
  fontFamilyNames,
  fontFiles,
  fontNameFor,
  fontWeightNames,
  fonts,
  fontsRoot,
} from '../src/font';
import { face, typeRoleNames, typeScale } from '../src/type';

import { factsOf } from './trueType';

const repositoryRoot = resolve(__dirname, '..', '..', '..');
const fontsDirectory = join(repositoryRoot, fontsRoot);

function pathOf(file: FontFile): string {
  return join(fontsDirectory, file.path);
}

function read(file: string): string {
  return readFileSync(join(fontsDirectory, file), 'utf8');
}

function filesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(full) : [full];
  });
}

const shipped = filesUnder(fontsDirectory);
const fontExtension = /\.(ttf|otf|woff2?)$/i;

describe('every shipped font carries its licence', () => {
  describe('the families the token package names', () => {
    it('draws every role in the one family the design system names', () => {
      const facesInScale = [...new Set(typeRoleNames.map((name) => typeScale[name].face))];

      expect(facesInScale).toEqual(['text']);
      expect(fonts[DRAWN_FAMILY].family).toBe(face.text);
    });

    it('keeps the two families the application stopped drawing, with their licences', () => {
      expect(fontFamilyNames.map((name) => fonts[name].family)).toEqual([
        'Plus Jakarta Sans',
        'Fraunces 72pt Soft',
        'IBM Plex Mono',
      ]);
      expect(fontFiles).toHaveLength(6);
      expect(applicationFontFiles.map((file) => file.name)).toEqual([
        'PlusJakartaSans-Regular',
        'PlusJakartaSans-SemiBold',
      ]);
    });

    it('ships one file for running text and one for emphasis in each family', () => {
      expect(fontWeightNames).toEqual(['regular', 'semiBold']);
      expect(new Set(fontFiles.map((file) => file.path)).size).toBe(6);
      expect(fontFamilyNames.map((name) => fonts[name].files.regular.weight)).toEqual([
        400, 400, 400,
      ]);
      expect(fontFamilyNames.map((name) => fonts[name].files.semiBold.weight)).toEqual([
        600, 600, 600,
      ]);
    });

    it('names each file by the name a style will ask for', () => {
      expect(fontNameFor(400)).toBe('PlusJakartaSans-Regular');
      expect(fontNameFor(600)).toBe('PlusJakartaSans-SemiBold');
    });

    it('draws a weight with no file of its own in the nearest file that ships', () => {
      expect(fontNameFor(500)).toBe('PlusJakartaSans-SemiBold');
      expect(fontNameFor(700)).toBe('PlusJakartaSans-SemiBold');
    });

    it.each(fontFiles.map((file) => [file.path, file] as const))(
      '%s is on disk, and the file is a font',
      (_path, file) => {
        const facts = factsOf(pathOf(file));

        expect(facts.sfnt).toBe('truetype');
        expect(facts.tables).toContain('glyf');
      },
    );

    it.each(fontFiles.map((file) => [file.path, file] as const))(
      '%s is the face it claims to be, read from the file itself',
      (_path, file) => {
        const facts = factsOf(pathOf(file));

        expect(facts.postScriptName).toBe(file.name);
      },
    );

    it.each(fontFiles.map((file) => [file.path, file] as const))(
      '%s is a static instance, so the weight reaches the phone',
      (_path, file) => {
        // A variable font registers as its default instance only, so a semi bold axis set in a
        // style would silently draw the regular one on a device.
        expect(factsOf(pathOf(file)).isVariable).toBe(false);
      },
    );
  });

  describe('the licence beside each font', () => {
    it.each(fontFamilyNames)('%s carries the Open Font License, version 1.1', (name) => {
      const licence = read(fonts[name].licencePath);

      expect(licence).toContain(OPEN_FONT_LICENCE);
      expect(licence).toContain('SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007');
      expect(licence).toContain('PERMISSION & CONDITIONS');
    });

    it.each(fontFamilyNames)('%s records the copyright its licence file opens with', (name) => {
      const first = read(fonts[name].licencePath).split('\n')[0]?.trim();

      expect(first).toBe(fonts[name].copyright);
    });

    it.each(fontFamilyNames)('%s says whether its licence reserves the family name', (name) => {
      const { reservedName } = fonts[name];
      // The reservation is declared on the copyright line, and the licence body explains the term
      // further down, so reading the whole file would find the word in every font.
      const declared = read(fonts[name].licencePath).split('\n')[0] ?? '';

      if (reservedName === undefined) {
        expect(declared).not.toContain('Reserved Font Name');
        return;
      }

      expect(declared).toContain(`Reserved Font Name "${reservedName}"`);
    });

    it('keeps the licence in the same directory as the files it covers', () => {
      const apart = fontFamilyNames
        .filter((name) =>
          fontWeightNames.some(
            (weight) =>
              dirname(fonts[name].files[weight].path) !== dirname(fonts[name].licencePath),
          ),
        )
        .map((name) => `${name} keeps its licence at ${fonts[name].licencePath}`);

      expect(apart).toEqual([]);
    });

    it('refuses a font file the token package does not name', () => {
      const named = new Set(fontFiles.map((file) => join(fontsDirectory, file.path)));
      const stranger = shipped
        .filter((file) => fontExtension.test(file))
        .filter((file) => !named.has(file))
        .map((file) => relative(repositoryRoot, file));

      expect(stranger).toEqual([]);
    });

    it('refuses a font file with no licence next to it', () => {
      const covered = new Set(
        fontFamilyNames.map((name) => dirname(join(fontsDirectory, fonts[name].licencePath))),
      );
      const bare = shipped
        .filter((file) => fontExtension.test(file))
        .filter((file) => !covered.has(dirname(file)))
        .map((file) => relative(repositoryRoot, file));

      expect(bare).toEqual([]);
    });

    it('holds nothing under the fonts directory but the fonts and their licences', () => {
      const allowed = new Set([
        ...fontFiles.map((file) => join(fontsDirectory, file.path)),
        ...fontFamilyNames.map((name) => join(fontsDirectory, fonts[name].licencePath)),
      ]);

      expect(
        shipped.filter((file) => !allowed.has(file)).map((file) => relative(fontsDirectory, file)),
      ).toEqual([]);
    });
  });

  describe('the document a reader of the repository finds', () => {
    const document = readFileSync(join(repositoryRoot, 'docs', 'licences.md'), 'utf8');

    it.each(fontFamilyNames)(
      'names %s, its licence, its copyright and where it came from',
      (name) => {
        const family = fonts[name];

        expect(document).toContain(family.family);
        expect(document).toContain(family.licence);
        expect(document).toContain(family.copyright);
        expect(document).toContain(family.source);
      },
    );

    it('names every file that ships, so a reader can check the list against the tree', () => {
      const missing = fontFiles
        .filter((file) => !document.includes(file.path))
        .map((file) => file.path);

      expect(missing).toEqual([]);
    });

    it('says the repository redistributes the fonts unmodified', () => {
      expect(document).toContain('unmodified');
    });

    it('names the reserved font name the reader may not keep in a modified build', () => {
      const reserved = fontFamilyNames
        .map((name) => fonts[name].reservedName)
        .filter((reservedName): reservedName is string => reservedName !== undefined);

      expect(reserved).toEqual(['Plex']);
      expect(reserved.filter((reservedName) => !document.includes(reservedName))).toEqual([]);
    });
  });
});

describe('the roles are bound to the family that ships', () => {
  it.each(typeRoleNames)('%s is drawn in a file that is on disk', (name) => {
    const file = fontNameFor(typeScale[name].weight);

    expect(applicationFontFiles.map((each) => each.name)).toContain(file);
  });

  it('asks for no weight the drawn family cannot answer', () => {
    const answered = typeRoleNames.map((name) => fontNameFor(typeScale[name].weight));

    expect(answered.filter((name) => name === undefined)).toEqual([]);
    expect(new Set(answered).size).toBe(2);
  });
});
