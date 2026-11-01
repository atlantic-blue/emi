import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { colour, colourNames, fontFile, fonts } from '@emi/tokens';

import { SERVED_FACE_VARIABLE } from '../lib/face';

const workspace = resolve(__dirname, '..');

/** What OpenNext writes: the code of the server function, and the files the bucket serves. */
const serverFunction = join(workspace, '.open-next', 'server-functions', 'default');
const assets = join(workspace, '.open-next', 'assets');

/** The build is the slowest check in the repository, and a cold machine is slower still. */
const longEnoughForACompiler = 900_000;

/** The companies a page must never ask for a face. */
const fontServices: readonly string[] = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'fonts.bunny.net',
  'use.typekit.net',
  'fast.fonts.net',
  'cdn.jsdelivr.net',
  'unpkg.com',
];

/**
 * A colour whose alpha is zero paints nothing, and Tailwind writes one into the shadow it declares
 * on every element. It is not a colour from the palette and it is not measured as one.
 */
function paintsNothing(value: string): boolean {
  const digits = value.slice(1);
  const alpha =
    digits.length === 4 ? digits.slice(3) : digits.length === 8 ? digits.slice(6) : 'ff';

  return /^0+$/.test(alpha);
}

/**
 * A minifier may write a six digit colour as three digits where each pair repeats, so a token and
 * the colour it became are compared in one notation.
 */
function asWritten(value: string): string {
  const lowered = value.toLowerCase();
  const digits = lowered.slice(1);

  if (
    digits.length === 6 &&
    digits[0] === digits[1] &&
    digits[2] === digits[3] &&
    digits[4] === digits[5]
  ) {
    return `#${digits[0]}${digits[2]}${digits[4]}`;
  }

  return lowered;
}

/** Every file the bucket would hold, as a path under the assets. */
function servedFiles(directory: string = assets): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    return entry.isDirectory() ? servedFiles(path) : [relative(assets, path)];
  });
}

function stylesheetFiles(): string[] {
  return servedFiles()
    .filter((file) => file.endsWith('.css'))
    .map((file) => join(assets, file));
}

/** The one stylesheet the pages load, as the browser receives it. */
function builtStylesheet(): string {
  const files = stylesheetFiles();

  expect(files).toHaveLength(1);

  return readFileSync(files[0] as string, 'utf8');
}

function run(script: string): { status: number | null; output: string } {
  const ran = spawnSync('npm', ['run', script], {
    cwd: workspace,
    encoding: 'utf8',
    env: { ...process.env, CI: 'true' },
  });

  return { status: ran.status, output: `${ran.stdout ?? ''}${ran.stderr ?? ''}` };
}

describe('the site builds into a Lambda function and a folder of assets', () => {
  beforeAll(() => {
    rmSync(join(workspace, '.open-next'), { force: true, recursive: true });
  }, longEnoughForACompiler);

  it(
    'compiles the pages with Next.js',
    () => {
      const built = run('build');

      expect(built.output).not.toContain('Failed to compile');
      expect(built.status).toBe(0);
      expect(existsSync(join(workspace, '.next'))).toBe(true);
    },
    longEnoughForACompiler,
  );

  it(
    'packages that build for Lambda and for the bucket',
    () => {
      expect(existsSync(serverFunction)).toBe(false);

      const packaged = run('build:lambda');

      expect(packaged.status).toBe(0);
      expect(existsSync(serverFunction)).toBe(true);
      expect(existsSync(assets)).toBe(true);
    },
    longEnoughForACompiler,
  );

  describe('what the browser is sent', () => {
    it('serves one stylesheet, and every colour in it is a colour the token package holds', () => {
      const built = builtStylesheet();
      const written = new Set(colourNames.map((name) => asWritten(colour[name])));

      const strangers = [...built.matchAll(/#[0-9a-fA-F]{3,8}\b/g)]
        .map(([value]) => value)
        .filter((value) => !paintsNothing(value))
        .map((value) => asWritten(value))
        .filter((value) => !written.has(value));

      expect(strangers).toEqual([]);
    });

    it('carries the paper, the card, the one colour that acts and the words she reads', () => {
      const built = builtStylesheet();

      for (const name of ['ground', 'card', 'accent', 'text'] as const) {
        expect(built).toContain(asWritten(colour[name]));
      }
    });

    it('serves its own faces, from its own origin, and names no font service', () => {
      const built = builtStylesheet();
      const faces = [...built.matchAll(/@font-face\{([^}]*)\}/g)].map(([, rule]) => rule ?? '');
      const served = faces.filter((rule) => rule.includes('url('));

      expect(served).toHaveLength(fonts.figtree.weights.length);

      for (const rule of served) {
        expect(rule).toContain('format("truetype")');
        expect(rule).toMatch(/url\((?!https?:|\/\/)[^)]+\)/);
      }

      for (const weight of fonts.figtree.weights) {
        const cut = fontFile('figtree', weight).name.replace('-', '_');

        expect(servedFiles().some((file) => file.includes(cut) && file.endsWith('.ttf'))).toBe(
          true,
        );
      }
    });

    it('declares the custom property the theme reads, so the pages draw in the served face', () => {
      expect(builtStylesheet()).toContain(SERVED_FACE_VARIABLE);
    });

    it('asks no other company for a file, in any stylesheet it serves', () => {
      for (const file of stylesheetFiles()) {
        const addresses = [...readFileSync(file, 'utf8').matchAll(/url\(([^)]*)\)/g)].map(
          ([, address]) => address ?? '',
        );

        expect(addresses.length).toBeGreaterThan(0);

        for (const address of addresses) {
          expect(address).not.toMatch(/^(https?:)?\/\//);
        }
      }
    });

    it('names no font service anywhere in what it serves', () => {
      const named = servedFiles().filter((file) => {
        const contents = readFileSync(join(assets, file), 'utf8');

        return fontServices.some((host) => contents.includes(host));
      });

      expect(named).toEqual([]);
    });

    it('serves the mark the brand draws, to the byte', () => {
      const drawn = join(workspace, '..', '..', 'brand', 'logo', 'emi-wordmark.svg');

      expect(readFileSync(join(assets, 'emi-wordmark.svg'), 'utf8')).toBe(
        readFileSync(drawn, 'utf8'),
      );
    });
  });
});
