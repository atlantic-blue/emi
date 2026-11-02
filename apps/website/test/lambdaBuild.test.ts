import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';

import {
  colour,
  colourNames,
  websiteColour,
  websiteColourNames,
  websiteFaceNames,
  websiteFontCuts,
} from '@emi/tokens';
import { getScriptNonceFromHeader } from 'next/dist/server/app-render/get-script-nonce-from-header';

import { SERVED_FACE_VARIABLES } from '../lib/face';

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
 * A minifier may write a six digit colour as three digits where each pair repeats, and a colour
 * carried at an opacity arrives as eight digits with the opacity on the end. A token and the colour
 * it became are compared in one notation, so the comparison reads which colour it is and not how
 * much of it is painted.
 *
 * The opacity is not dropped silently: a colour at an opacity is still that colour, and the board
 * writes two of them that way, so what is read here is whether the six digits are a token.
 */
function asWritten(value: string): string {
  const lowered = value.toLowerCase();
  const digits = lowered.length === 9 ? lowered.slice(1, 7) : lowered.slice(1);

  if (
    digits.length === 6 &&
    digits[0] === digits[1] &&
    digits[2] === digits[3] &&
    digits[4] === digits[5]
  ) {
    return `#${digits[0]}${digits[2]}${digits[4]}`;
  }

  return `#${digits}`;
}

/** Where the pages of the build sit inside the package, which the runtime unpacks at /var/task. */
const nextInsideThePackage = join(serverFunction, 'apps', 'website', '.next');

/** Every file under a directory, as a path relative to it. Nothing when the directory is absent. */
function filesUnder(directory: string, root: string = directory): string[] {
  if (!existsSync(directory)) {
    return [];
  }

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    return entry.isDirectory() ? filesUnder(path, root) : [relative(root, path)];
  });
}

/**
 * The chunks of a build, by name. Only the code: a source map is never loaded by the runtime, and
 * the package carries none of them.
 */
const chunksOf = (directory: string): string[] =>
  filesUnder(join(directory, 'server', 'chunks'))
    .filter((file) => file.endsWith('.js'))
    .sort();

/**
 * The package as the runtime gets it: unpacked somewhere of its own, with nothing of this
 * workspace around it. Reading it in place would read the build directory instead, where a
 * resolver can reach node_modules that the package does not carry.
 *
 * Unpacking also grants read on `open-next.config.mjs`, which OpenNext writes with write
 * permission alone. An archive is extracted before it runs and the file arrives readable, so this
 * is what the runtime does rather than a repair of the package. The rule below still reads the
 * package itself for the entry, so a package genuinely missing the file fails.
 */
function theWholePackageSomewhereElse(): string {
  const unpacked = mkdtempSync(join(tmpdir(), 'emi-server-function-'));

  cpSync(serverFunction, unpacked, {
    recursive: true,
    // A file this host cannot even measure is left behind rather than taking the copy down with
    // it, and what it was is then the business of the rules, not of the copy.
    filter: (from) => {
      try {
        statSync(from);
        return true;
      } catch {
        return false;
      }
    },
  });

  const configuration = join(unpacked, 'apps', 'website', 'open-next.config.mjs');

  if (existsSync(configuration)) {
    chmodSync(configuration, 0o644);
  } else {
    copyFileSync(join(workspace, '.open-next', '.build', 'open-next.config.mjs'), configuration);
    chmodSync(configuration, 0o644);
  }

  return unpacked;
}

/** One address asked of the handler in the package, through node, as the runtime asks it. */
function askThePackage(
  unpacked: string,
  address: string,
): { statusCode: number; headers: Record<string, string>; location: string | null; body: string } {
  const asked = spawnSync(
    process.execPath,
    [
      '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',
      join(__dirname, 'askTheBundledHandler.ts'),
      unpacked,
      address,
    ],
    { cwd: unpacked, encoding: 'utf8' },
  );

  if (asked.status !== 0) {
    throw new Error(`the package refused to answer ${address}: ${asked.stdout}${asked.stderr}`);
  }

  return JSON.parse(asked.stdout) as {
    statusCode: number;
    headers: Record<string, string>;
    location: string | null;
    body: string;
  };
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

  describe('what the server function is given to run', () => {
    it(
      'carries every chunk the build wrote, because a page loads them by name at the first request',
      () => {
        const built = chunksOf(join(workspace, '.next'));
        const packaged = chunksOf(nextInsideThePackage);

        expect(built.length).toBeGreaterThan(0);
        expect(packaged).toEqual(built);
      },
      longEnoughForACompiler,
    );

    it(
      'answers the page nobody meant to open, asked the way the runtime asks it',
      () => {
        const unpacked = theWholePackageSomewhereElse();

        try {
          expect(readdirSync(join(unpacked, 'apps', 'website'))).toContain('open-next.config.mjs');

          const asked = askThePackage(unpacked, '/en/an-address-nobody-has');

          // The site keeps one form of an address and moves the other, so a move is followed
          // here, the way the browser in front of it follows one. What matters is the page she is
          // left holding, not which of the two forms she happened to type.
          const answered =
            asked.location === null ? asked : askThePackage(unpacked, asked.location);

          expect(answered.statusCode).toBe(404);
          expect(answered.body).toContain('This page does not exist');
          expect(answered.body).toContain('Go to the Emi home page');
        } finally {
          rmSync(unpacked, { force: true, recursive: true });
        }
      },
      longEnoughForACompiler,
    );

    it(
      'answers a page with a policy naming a secret, and puts that secret on its scripts',
      () => {
        const unpacked = theWholePackageSomewhereElse();

        try {
          const asked = askThePackage(unpacked, '/en/');
          const policy = asked.headers['content-security-policy'] ?? '';
          const secret = getScriptNonceFromHeader(policy) ?? '';

          expect(asked.statusCode).toBe(200);
          expect(secret).not.toBe('');
          expect(Buffer.from(secret, 'base64').length).toBeGreaterThanOrEqual(16);
          expect(policy).toContain(`script-src 'self' 'nonce-${secret}' 'strict-dynamic'`);
          expect(policy).not.toContain('unsafe-inline');

          const tags = [...asked.body.matchAll(/<script\b[^>]*>/g)].map(([tag]) => tag);

          expect(tags.length).toBeGreaterThan(0);
          expect(tags.filter((tag) => !tag.includes(`nonce="${secret}"`))).toEqual([]);
        } finally {
          rmSync(unpacked, { force: true, recursive: true });
        }
      },
      longEnoughForACompiler,
    );

    it(
      'gives the next page a secret of its own, so the scripts of one page are dead in another',
      () => {
        const unpacked = theWholePackageSomewhereElse();

        try {
          const secrets = ['/en/', '/en/'].map((address) => {
            const asked = askThePackage(unpacked, address);

            return getScriptNonceFromHeader(asked.headers['content-security-policy'] ?? '') ?? '';
          });

          expect(secrets.filter((secret) => secret === '')).toEqual([]);
          expect(new Set(secrets).size).toBe(secrets.length);
        } finally {
          rmSync(unpacked, { force: true, recursive: true });
        }
      },
      longEnoughForACompiler,
    );

    it(
      'answers the page nobody meant to open under that policy too, and writes no style on it',
      () => {
        const unpacked = theWholePackageSomewhereElse();

        try {
          const asked = askThePackage(unpacked, '/nothing/');
          const policy = asked.headers['content-security-policy'] ?? '';

          expect(asked.statusCode).toBe(404);
          expect(getScriptNonceFromHeader(policy)).not.toBeUndefined();
          expect(asked.body).toContain('This page does not exist');
          expect([...asked.body.matchAll(/style="[^"]*"/g)].map(([found]) => found)).toEqual([]);
        } finally {
          rmSync(unpacked, { force: true, recursive: true });
        }
      },
      longEnoughForACompiler,
    );

    it(
      'leaves a file of the bucket without one, because the policy of the edge covers those',
      () => {
        const unpacked = theWholePackageSomewhereElse();

        try {
          const asked = askThePackage(unpacked, '/emi-icon.svg');

          expect(asked.headers['content-security-policy']).toBeUndefined();
        } finally {
          rmSync(unpacked, { force: true, recursive: true });
        }
      },
      longEnoughForACompiler,
    );
  });

  describe('what the browser is sent', () => {
    it('serves one stylesheet, and every colour in it is a colour the token package holds', () => {
      const built = builtStylesheet();
      const written = new Set([
        ...colourNames.map((name) => asWritten(colour[name])),
        ...websiteColourNames.map((name) => asWritten(websiteColour[name])),
      ]);

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
      const cuts = websiteFaceNames.flatMap((name) => websiteFontCuts[name]);

      expect(served).toHaveLength(cuts.length);

      for (const rule of served) {
        expect(rule).toContain('format("truetype")');
        expect(rule).toMatch(/url\((?!https?:|\/\/)[^)]+\)/);
      }

      for (const cut of cuts) {
        // The bundler writes a hash into the name it serves a file under, and it writes a
        // hyphen of its own as an underscore, so the cut is read by the part of the name the
        // board chose.
        const named = cut.name.replace('-', '_');

        expect(servedFiles().some((file) => file.includes(named) && file.endsWith('.ttf'))).toBe(
          true,
        );
      }
    });

    it('declares the custom property the theme reads, so the pages draw in the served face', () => {
      for (const name of websiteFaceNames) {
        expect(builtStylesheet()).toContain(SERVED_FACE_VARIABLES[name]);
      }
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

    it('serves the icon the application ships, to the byte', () => {
      const shipped = join(workspace, '..', 'mobile', 'assets', 'icon', 'emi-icon.svg');

      expect(readFileSync(join(assets, 'emi-icon.svg'), 'utf8')).toBe(
        readFileSync(shipped, 'utf8'),
      );
    });
  });
});
