import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

import {
  FontFile,
  OPEN_FONT_LICENCE,
  faceNames,
  fontFiles,
  fontNameFor,
  fontWeightNames,
  fonts,
  fontsRoot,
} from '../src/font';
import { FaceName, face, typeScale, typeSizeNames } from '../src/type';

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
  describe('the faces the token package names', () => {
    it('ships a file for every face the type scale sets a size in', () => {
      const facesInScale = [...new Set(typeSizeNames.map((name) => typeScale[name].face))];

      expect(facesInScale.filter((name) => fonts[name] === undefined)).toEqual([]);
      expect([...facesInScale].sort()).toEqual([...faceNames].sort());
    });

    it('ships a cut of the face the design names, and says which cut', () => {
      const wrong = faceNames
        .filter((name) => !fonts[name].family.startsWith(face[name]))
        .map((name) => `${name} ships ${fonts[name].family} for ${face[name]}`);

      expect(wrong).toEqual([]);
      expect(faceNames.map((name) => fonts[name].family)).toEqual([
        'Fraunces 72pt Soft',
        'Plus Jakarta Sans',
        'IBM Plex Mono',
      ]);
    });

    it('ships one file for running text and one for emphasis in each face', () => {
      expect(fontWeightNames).toEqual(['regular', 'semiBold']);
      expect(fontFiles).toHaveLength(6);
      expect(new Set(fontFiles.map((file) => file.path)).size).toBe(6);
      expect(faceNames.map((name) => fonts[name].files.regular.weight)).toEqual([400, 400, 400]);
      expect(faceNames.map((name) => fonts[name].files.semiBold.weight)).toEqual([600, 600, 600]);
    });

    it('names each file by the name a style will ask for', () => {
      expect(fontNameFor('heading')).toBe('Fraunces72ptSoft-Regular');
      expect(fontNameFor('numeric', 'semiBold')).toBe('IBMPlexMono-SemiBold');
      expect(fontNameFor(typeScale.label.face)).toBe('IBMPlexMono-Regular');
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
    it.each(faceNames)('%s carries the Open Font License, version 1.1', (name) => {
      const licence = read(fonts[name].licencePath);

      expect(licence).toContain(OPEN_FONT_LICENCE);
      expect(licence).toContain('SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007');
      expect(licence).toContain('PERMISSION & CONDITIONS');
    });

    it.each(faceNames)('%s records the copyright its licence file opens with', (name) => {
      const first = read(fonts[name].licencePath).split('\n')[0]?.trim();

      expect(first).toBe(fonts[name].copyright);
    });

    it.each(faceNames)('%s says whether its licence reserves the family name', (name) => {
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
      const apart = faceNames
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
        faceNames.map((name) => dirname(join(fontsDirectory, fonts[name].licencePath))),
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
        ...faceNames.map((name) => join(fontsDirectory, fonts[name].licencePath)),
      ]);

      expect(
        shipped.filter((file) => !allowed.has(file)).map((file) => relative(fontsDirectory, file)),
      ).toEqual([]);
    });
  });

  describe('the document a reader of the repository finds', () => {
    const document = readFileSync(join(repositoryRoot, 'docs', 'licences.md'), 'utf8');

    it.each(faceNames)('names %s, its licence, its copyright and where it came from', (name) => {
      const family = fonts[name];

      expect(document).toContain(family.family);
      expect(document).toContain(family.licence);
      expect(document).toContain(family.copyright);
      expect(document).toContain(family.source);
    });

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
      const reserved = faceNames
        .map((name) => fonts[name].reservedName)
        .filter((reservedName): reservedName is string => reservedName !== undefined);

      expect(reserved).toEqual(['Plex']);
      expect(reserved.filter((reservedName) => !document.includes(reservedName))).toEqual([]);
    });
  });
});

describe('the faces are bound to the type scale', () => {
  it.each(typeSizeNames)('%s names a face that ships', (name) => {
    const named: FaceName = typeScale[name].face;

    expect(fonts[named]).toBeDefined();
    expect(fonts[named].files.regular.path).toContain('.ttf');
  });

  it('sets the numbers in the monospaced face that ships', () => {
    expect(fonts[typeScale.label.face].family).toBe('IBM Plex Mono');
  });
});
