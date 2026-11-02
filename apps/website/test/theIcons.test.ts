import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { Resvg } from '@resvg/resvg-js';

import { generateMetadata } from '../app/[lang]/layout';
import {
  APPROVED_ICON,
  ICON_FOLDER,
  addressOf,
  icoEntries,
  iconFiles,
  mediaTypeOf,
  pngSize,
  sizesOf,
  type IconFile,
} from '../tools/theIcons';

const repositoryRoot = resolve(__dirname, '..', '..', '..');

const approvedIcon = join(repositoryRoot, APPROVED_ICON);

const program = join('apps', 'website', 'tools', 'writeTheIcons.ts');

const rubbish: string[] = [];

function scratch(): string {
  const directory = mkdtempSync(join(tmpdir(), 'emi-website-icons-'));

  rubbish.push(directory);

  return directory;
}

afterAll(() => {
  for (const directory of rubbish) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function committed(file: IconFile): Buffer {
  return readFileSync(join(repositoryRoot, ICON_FOLDER, file.name));
}

/** The approved drawing, resampled to one width, which is the only thing any of these files is. */
function drawnAt(pixels: number, icon: string = approvedIcon): Buffer {
  return new Resvg(readFileSync(icon, 'utf8'), {
    fitTo: { mode: 'width', value: pixels },
  })
    .render()
    .asPng();
}

/** The image inside a file, which for an ico is the one the directory points at. */
function imageIn(file: IconFile, bytes: Buffer): Buffer {
  if (file.container !== 'ico') {
    return bytes;
  }

  const entry = icoEntries(bytes)[0];

  if (entry === undefined) {
    throw new Error(`${file.name} carries no image at all`);
  }

  return bytes.subarray(entry.at, entry.at + entry.length);
}

interface Run {
  readonly status: number | null;
  readonly error: string;
  readonly folder: string;
}

/** The program, run the way the root script runs it, over a folder of its own. */
function drawInto(icon: string): Run {
  const folder = scratch();
  const run = spawnSync(
    process.execPath,
    [
      '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',
      '--experimental-strip-types',
      program,
      '--icon',
      icon,
      '--out',
      folder,
    ],
    { cwd: repositoryRoot, encoding: 'utf8' },
  );

  return { status: run.status, error: run.stderr, folder };
}

describe('the square that says this page is Emi', () => {
  describe('what the site keeps beside its pages', () => {
    it.each(iconFiles.map((file) => [file.name, file] as const))(
      'keeps %s, for the browser that asks for that size',
      (name, file) => {
        expect({ name, held: existsSync(join(repositoryRoot, ICON_FOLDER, name)) }).toEqual({
          name,
          held: true,
        });
        expect(file.asks.length).toBeGreaterThan(0);
      },
    );

    it.each(iconFiles.map((file) => [file.name, file] as const))(
      'draws %s at the size its tag promises',
      (name, file) => {
        const bytes = committed(file);
        const square = { width: file.pixels, height: file.pixels };

        expect({ name, ...pngSize(imageIn(file, bytes)) }).toEqual({ name, ...square });

        if (file.container === 'ico') {
          // The directory is read as well as the image, because the directory is the part a
          // browser reads first and an entry that disagrees with its image is a file it refuses.
          expect(icoEntries(bytes).map(({ width, height }) => ({ width, height }))).toEqual([
            square,
          ]);
        }
      },
    );

    it.each(iconFiles.map((file) => [file.name, file] as const))(
      'draws %s from the approved icon and from nothing else',
      (name, file) => {
        expect({ name, drawn: imageIn(file, committed(file)) }).toEqual({
          name,
          drawn: drawnAt(file.pixels),
        });
      },
    );
  });

  describe('what the document tells her browser', () => {
    it('names every square, with its size and its kind', async () => {
      const metadata = await generateMetadata({ params: Promise.resolve({ lang: 'en' }) });

      expect(metadata.icons).toEqual({
        icon: iconFiles
          .filter((file) => file.declaration === 'icon')
          .map((file) => ({ url: addressOf(file), sizes: sizesOf(file), type: mediaTypeOf(file) })),
        apple: iconFiles
          .filter((file) => file.declaration === 'apple')
          .map((file) => ({ url: addressOf(file), sizes: sizesOf(file), type: mediaTypeOf(file) })),
      });
    });

    it('names them on the page in every language, because the mark does not change', async () => {
      const named = await Promise.all(
        ['en', 'ru', 'es'].map(async (lang) => {
          const metadata = await generateMetadata({ params: Promise.resolve({ lang }) });

          return JSON.stringify(metadata.icons);
        }),
      );

      expect(new Set(named).size).toBe(1);
      expect(named[0]).toContain('/favicon.ico');
    });

    it('offers the square an iPhone saves under the one name an iPhone asks for', () => {
      const apple = iconFiles.filter((file) => file.declaration === 'apple');

      expect(apple.map((file) => [file.name, file.pixels])).toEqual([
        ['apple-touch-icon.png', 180],
      ]);
    });
  });

  describe('the program that draws them', () => {
    it('writes every file again, byte for byte, from the approved icon', () => {
      const run = drawInto(approvedIcon);

      expect({ status: run.status, error: run.error }).toEqual({ status: 0, error: '' });

      for (const file of iconFiles) {
        expect({ name: file.name, bytes: readFileSync(join(run.folder, file.name)) }).toEqual({
          name: file.name,
          bytes: committed(file),
        });
      }
    });

    it('draws a different icon differently, so a new drawing makes new files', () => {
      const another = join(scratch(), 'another.svg');

      writeFileSync(
        another,
        '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000">' +
          '<rect width="1000" height="1000" fill="black"/></svg>\n',
      );

      const run = drawInto(another);

      expect({ status: run.status, error: run.error }).toEqual({ status: 0, error: '' });

      for (const file of iconFiles) {
        expect({
          name: file.name,
          sameAsEmi: readFileSync(join(run.folder, file.name)).equals(committed(file)),
        }).toEqual({ name: file.name, sameAsEmi: false });
      }

      // The sizes come from the list and not from the drawing, so the other icon arrives at every
      // size this one does.
      expect(
        iconFiles.map((file) => pngSize(imageIn(file, readFileSync(join(run.folder, file.name))))),
      ).toEqual(iconFiles.map((file) => ({ width: file.pixels, height: file.pixels })));
    });

    it('refuses an icon that is not there, and says which path it read', () => {
      const run = drawInto(join(repositoryRoot, 'apps', 'website', 'public', 'no-such-icon.svg'));

      expect(run.status).toBe(1);
      expect(run.error).toContain('no-such-icon.svg');
    });
  });
});
