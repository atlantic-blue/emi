import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { colour } from '@emi/tokens';

import {
  colourFromHex,
  decodePng,
  inkBox,
  pixelAt,
  type Image,
} from '../../../../brand/icon/png.ts';
import { appleIcons, googleIcons, iconFiles } from '../../../../brand/icon/sizes.ts';
import { ringSource } from '../fixtures/ringSource';

const repositoryRoot = resolve(__dirname, '..', '..', '..', '..');

// The numbers are written out here rather than imported, so that moving one in the generator is
// caught by this test instead of being agreed with. Section 9.2 of the design gives the first two.
// Android gives the last two: a canvas of 108 density independent pixels, of which the launcher
// keeps the outer 18 a side and shows about the middle 72.
const RING_FRACTION_OF_WIDTH = 0.56;
const OPTICAL_RISE_OF_WIDTH = 0.02;
const ADAPTIVE_CANVAS = 108;
const ADAPTIVE_VISIBLE = 72;
const stone = colourFromHex(colour.stone);

interface Run {
  readonly status: number | null;
  readonly out: string;
  readonly error: string;
  readonly directory: string;
}

const rubbish: string[] = [];

function scratch(): string {
  const directory = mkdtempSync(join(tmpdir(), 'emi-icons-'));
  rubbish.push(directory);
  return directory;
}

/**
 * The command the operator runs, spawned the way they type it, so the test covers the script in
 * package.json as well as the program it points at.
 */
function generateFrom(source: string, directory = scratch()): Run {
  const run = spawnSync(
    'npm',
    ['run', 'icons', '--silent', '--', '--ring', source, '--out', directory],
    { cwd: repositoryRoot, encoding: 'utf8' },
  );

  return { status: run.status, out: run.stdout, error: run.stderr, directory };
}

function withRing(drawing: Parameters<typeof ringSource>[0] = {}): string {
  const directory = scratch();
  const file = join(directory, 'emi-ring.svg');
  writeFileSync(file, ringSource(drawing));
  return file;
}

function imageIn(run: Run, name: string): Image {
  return decodePng(readFileSync(join(run.directory, name)));
}

function centreOfInk(
  image: Image,
  ground: Parameters<typeof inkBox>[1],
): {
  readonly x: number;
  readonly y: number;
} {
  const box = inkBox(image, ground);
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

let ring: string;
let run: Run;

beforeAll(() => {
  ring = withRing();
  run = generateFrom(ring);
}, 120_000);

afterAll(() => {
  for (const directory of rubbish) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe('one source generates every icon both stores ask for', () => {
  describe('the sizes the stores ask for', () => {
    it('writes an icon for every size on both lists and nothing else', () => {
      expect(run.status).toBe(0);

      const written = readdirSync(run.directory)
        .filter((name) => name.endsWith('.png'))
        .sort();

      expect(written).toEqual(iconFiles.map((file) => file.name).sort());
      expect(written).toHaveLength(24);
    });

    it('draws each one square, at exactly the size that asked for it', () => {
      for (const file of iconFiles) {
        const image = imageIn(run, file.name);

        expect({ name: file.name, width: image.width, height: image.height }).toEqual({
          name: file.name,
          width: file.pixels,
          height: file.pixels,
        });
      }
    });

    it('carries the store listing icon each store wants', () => {
      expect(appleIcons.map((file) => file.pixels)).toContain(1024);
      expect(googleIcons.map((file) => file.pixels)).toContain(512);
      expect(existsSync(join(run.directory, 'apple-1024.png'))).toBe(true);
      expect(existsSync(join(run.directory, 'google-play-512.png'))).toBe(true);
    });

    it('says how many it wrote, for each store', () => {
      expect(run.out).toContain(`apple: ${String(appleIcons.length)} icons`);
      expect(run.out).toContain(`google: ${String(googleIcons.length)} icons`);
      expect(run.out).toContain(`wrote ${String(iconFiles.length)} icons`);
    });
  });

  describe('the mark on the icon', () => {
    it('holds the ring at 56 percent of the icon width', () => {
      const image = imageIn(run, 'apple-1024.png');
      const box = inkBox(image, stone);

      expect(box.width / image.width).toBeCloseTo(RING_FRACTION_OF_WIDTH, 2);
      expect(box.height / image.height).toBeCloseTo(RING_FRACTION_OF_WIDTH, 2);
      expect(run.out).toContain('the ring measures 56.00 percent of the width');
    });

    it('draws it in ember on the stone ground', () => {
      const image = imageIn(run, 'apple-1024.png');
      const corner = pixelAt(image, 0, 0);
      const box = inkBox(image, stone);
      const onTheStroke = pixelAt(image, box.left + 12, Math.round(box.top + box.height / 2));

      expect(corner).toEqual({ ...stone, alpha: 255 });
      expect(onTheStroke).toEqual({ ...colourFromHex(colour.ember), alpha: 255 });
    });

    it('sits it above the geometric centre, so it does not read low', () => {
      const image = imageIn(run, 'apple-1024.png');
      const centre = centreOfInk(image, stone);

      expect(centre.x).toBeCloseTo(image.width / 2, 0);
      expect(centre.y).toBeCloseTo(image.height / 2 - OPTICAL_RISE_OF_WIDTH * image.width, 0);
      expect(centre.y).toBeLessThan(image.height / 2);
    });

    it('keeps the ring inside the ground, whatever padding the source carries', () => {
      const padded = generateFrom(withRing({ padding: 0.4 }));
      const image = imageIn(padded, 'apple-1024.png');
      const box = inkBox(image, stone);

      expect(padded.status).toBe(0);
      expect(box.width / image.width).toBeCloseTo(RING_FRACTION_OF_WIDTH, 2);
    });
  });

  describe('the android adaptive pair', () => {
    it('gives the foreground the ring and no ground', () => {
      const image = imageIn(run, 'google-adaptive-foreground-432.png');

      expect(pixelAt(image, 0, 0).alpha).toBe(0);
      expect(inkBox(image, 'nothing').width).toBeGreaterThan(0);
    });

    it('gives the background the ground and no ring', () => {
      const image = imageIn(run, 'google-adaptive-background-432.png');
      const corners = [
        pixelAt(image, 0, 0),
        pixelAt(image, image.width - 1, image.height - 1),
        pixelAt(image, Math.floor(image.width / 2), Math.floor(image.height / 2)),
      ];

      expect(corners).toEqual([
        { ...stone, alpha: 255 },
        { ...stone, alpha: 255 },
        { ...stone, alpha: 255 },
      ]);
      expect(() => inkBox(image, stone)).toThrow('no ink at all');
    });

    it('sizes the foreground ring for the square the launcher shows, not the whole canvas', () => {
      const image = imageIn(run, 'google-adaptive-foreground-432.png');
      const box = inkBox(image, 'nothing');

      expect(box.width / image.width).toBeCloseTo(
        (RING_FRACTION_OF_WIDTH * ADAPTIVE_VISIBLE) / ADAPTIVE_CANVAS,
        2,
      );
    });
  });

  describe('one edit to the source, not thirty', () => {
    it('changes every icon when the ring alone changes', () => {
      const widened = generateFrom(withRing({ gap: 120 }));

      expect(widened.status).toBe(0);

      const unchanged = iconFiles.filter(
        (file) =>
          file.artwork !== 'adaptiveBackground' &&
          readFileSync(join(run.directory, file.name)).equals(
            readFileSync(join(widened.directory, file.name)),
          ),
      );

      expect(unchanged).toEqual([]);
    });

    it('leaves the same source giving the same icons byte for byte', () => {
      const again = generateFrom(ring);

      for (const file of iconFiles) {
        expect({
          name: file.name,
          same: readFileSync(join(again.directory, file.name)).equals(
            readFileSync(join(run.directory, file.name)),
          ),
        }).toEqual({ name: file.name, same: true });
      }
    });

    it('clears an icon a store stopped asking for', () => {
      const directory = scratch();
      writeFileSync(join(directory, 'apple-512.png'), 'a size nobody asks for now');

      const repeat = generateFrom(ring, directory);

      expect(repeat.status).toBe(0);
      expect(existsSync(join(directory, 'apple-512.png'))).toBe(false);
    });
  });

  describe('what it refuses', () => {
    it('refuses to guess when the ring is not drawn yet, and names the step that draws it', () => {
      const missing = generateFrom(join(scratch(), 'nothing-here.svg'));

      expect(missing.status).not.toBe(0);
      expect(missing.error).toContain('there is no ring to draw at');
      expect(missing.error).toContain('Feature 1 step 3 draws it');
    });

    it('refuses a source with no viewBox, because nothing says how big the mark is', () => {
      const directory = scratch();
      const file = join(directory, 'emi-ring.svg');
      writeFileSync(file, ringSource().replace(/viewBox="[^"]*"/, ''));

      const refused = generateFrom(file, scratch());

      expect(refused.status).not.toBe(0);
      expect(refused.error).toContain('carries no viewBox');
    });

    it('refuses a source that draws nothing', () => {
      const directory = scratch();
      const file = join(directory, 'emi-ring.svg');
      writeFileSync(file, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"></svg>');

      const refused = generateFrom(file, scratch());

      expect(refused.status).not.toBe(0);
      expect(refused.error).toContain('draws nothing');
    });
  });

  describe('the generator itself', () => {
    it('is TypeScript, run through Node, and never a shell script', () => {
      const scripts = (
        JSON.parse(readFileSync(join(repositoryRoot, 'package.json'), 'utf8')) as {
          scripts: Record<string, string>;
        }
      ).scripts;

      expect(scripts.icons).toContain('--experimental-strip-types');
      expect(scripts.icons).toContain('brand/icon/generate.ts');

      const shellScripts = readdirSync(join(repositoryRoot, 'brand'), {
        recursive: true,
        encoding: 'utf8',
      }).filter((name) => name.endsWith('.sh') || name.endsWith('.bash'));

      expect(shellScripts).toEqual([]);
    });

    it('draws on one canvas, so every size is the same drawing', () => {
      const small = imageIn(run, 'apple-40.png');
      const large = imageIn(run, 'apple-180.png');

      expect(inkBox(small, stone).width / small.width).toBeCloseTo(
        inkBox(large, stone).width / large.width,
        1,
      );
    });
  });
});
