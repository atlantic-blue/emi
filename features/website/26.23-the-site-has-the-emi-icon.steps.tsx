import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { Resvg } from '@resvg/resvg-js';
import { defineFeature, loadFeature } from 'jest-cucumber';

import { generateMetadata } from '../../apps/website/app/[lang]/layout';
import {
  APPROVED_ICON,
  ICON_FOLDER,
  addressOf,
  icoEntries,
  iconFiles,
  mediaTypeOf,
  pngSize,
  sizesOf,
  type Declaration,
  type IconFile,
} from '../../apps/website/tools/theIcons';
import { moduleDirectory } from '../../infrastructure/modules/nextjs-site/tests/runArtifact';
import { bodyOf, configurationOf, listedIn } from '../../tools/pipeline/policy';

const feature = loadFeature(join(__dirname, '26.23-the-site-has-the-emi-icon.feature'));

const repositoryRoot = resolve(__dirname, '..', '..');

const websiteWorkspace = join(repositoryRoot, 'apps', 'website');

/** One square as a document names it to a browser: where it is, how big, and which container. */
interface Declared {
  readonly url: string;
  readonly sizes: string;
  readonly type: string;
}

function read(file: string): string {
  return readFileSync(file, 'utf8');
}

function committedBytes(file: IconFile): Buffer {
  return readFileSync(join(repositoryRoot, ICON_FOLDER, file.name));
}

/** The image a file carries, which for an ico is the one its directory points at. */
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

/** The one drawing, drawn at one width. Never a bigger drawing scaled down to that width. */
function drawnAt(drawing: string, pixels: number): Buffer {
  return new Resvg(drawing, { fitTo: { mode: 'width', value: pixels } }).render().asPng();
}

/** What the layout tells a browser, grouped the way a document groups it. */
async function declaredTo(language: string): Promise<Record<string, Declared[]>> {
  const metadata = await generateMetadata({ params: Promise.resolve({ lang: language }) });

  return (metadata.icons ?? {}) as Record<string, Declared[]>;
}

function theSquaresFor(declaration: Declaration): Declared[] {
  return iconFiles
    .filter((file) => file.declaration === declaration)
    .map((file) => ({ url: addressOf(file), sizes: sizesOf(file), type: mediaTypeOf(file) }));
}

defineFeature(feature, (test) => {
  test('the site has the Emi icon', ({ given, then, and }) => {
    let drawing = '';

    given('the one drawing Emi is known by, the square her phone already shows her', () => {
      drawing = read(join(repositoryRoot, APPROVED_ICON));

      // The file the application ships, so the square in her tab and the square on her home
      // screen cannot drift apart.
      expect(drawing).toContain('<svg');
      expect(read(join(websiteWorkspace, 'public', 'emi-icon.svg'))).toBe(drawing);
      expect(iconFiles.length).toBeGreaterThan(0);
    });

    then('the site keeps that square at every size a browser asks for', () => {
      for (const file of iconFiles) {
        expect({
          name: file.name,
          held: existsSync(join(repositoryRoot, ICON_FOLDER, file.name)),
        }).toEqual({ name: file.name, held: true });

        expect({ name: file.name, ...pngSize(imageIn(file, committedBytes(file))) }).toEqual({
          name: file.name,
          width: file.pixels,
          height: file.pixels,
        });
      }

      // A browser reads the directory of an ico before the image inside it, so an entry that says
      // another size is a file it draws wrongly or refuses outright.
      const container = iconFiles.find((file) => file.container === 'ico');

      if (container === undefined) {
        throw new Error('no file here is an ico, so nothing answers the address asked for alone');
      }

      expect(
        icoEntries(committedBytes(container)).map(({ width, height }) => ({ width, height })),
      ).toEqual([{ width: container.pixels, height: container.pixels }]);
    });

    and('each square is drawn from that one drawing at its own size', () => {
      for (const file of iconFiles) {
        expect({ name: file.name, bytes: imageIn(file, committedBytes(file)) }).toEqual({
          name: file.name,
          bytes: drawnAt(drawing, file.pixels),
        });
      }
    });

    and('the document the site draws names each square to her browser', async () => {
      expect((await declaredTo('en')).icon).toEqual(theSquaresFor('icon'));

      // The mark does not change with the words, so every language names the same squares.
      const inEveryLanguage = await Promise.all(
        ['en', 'ru', 'es'].map(async (language) => JSON.stringify(await declaredTo(language))),
      );

      expect(new Set(inEveryLanguage).size).toBe(1);
    });

    and('the square an iPhone saves to her home screen is offered to it by name', async () => {
      expect(theSquaresFor('apple').map((square) => square.url)).toEqual(['/apple-touch-icon.png']);
      expect((await declaredTo('en')).apple).toEqual(theSquaresFor('apple'));
    });

    and('the edge answers for each of those addresses, so the file reaches her', () => {
      const site = configurationOf(moduleDirectory);
      const sentToTheBucket = listedIn(bodyOf(site, 'locals'), 'asset_paths');

      expect(
        iconFiles.map(addressOf).filter((address) => !sentToTheBucket.includes(address)),
      ).toEqual([]);
    });

    and('a browser opens the page, reads each square off it, and asks for every one', () => {
      const sentence = 'the site has the Emi icon';
      const theFeature = read(join(websiteWorkspace, 'e2e', 'features', 'theIcons.feature'));
      const theSteps = read(join(websiteWorkspace, 'e2e', 'steps', 'theIcons.ts'));

      expect(theFeature).toContain(`Scenario: ${sentence}`);
      expect(theFeature).toContain('Given a woman opens the page at "/en/"');

      // The browser asks the real host for each address and reads the size out of the answer, so
      // the deploy proves the live site and not only this checkout.
      expect(theSteps).toContain('request.get(square.address)');
      expect(theSteps).toContain('status: 200');
      expect(theSteps).toContain('sizeInside(await answer.body())');
    });
  });
});
