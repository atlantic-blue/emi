import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { render, screen } from '@testing-library/react-native';

import { colour, icons, iconNames, stroke } from '@emi/tokens';
import { Icon } from '@emi/ui';

import { problemsWith } from '../../../../brand/icons/rules.ts';
import { refusalsIn } from '../../../../brand/illustration/refusals.ts';

const repositoryRoot = resolve(__dirname, '..', '..', '..', '..');
const drawingDirectory = join(repositoryRoot, 'brand', 'icons');

/** The four the focus screen and the today screen ask for, which nothing in the set drew. */
const theTiles = ['skin', 'digestion', 'headache', 'bloating'] as const;

/** The shapes a drawing is built from, in the order the file draws them. */
function shapesIn(source: string): readonly string[] {
  return [...source.matchAll(/<(rect|circle|ellipse|path)\b/g)].map((found) => found[1] as string);
}

/** What react native svg calls that shape once it has drawn it. */
function drawnAs(shape: string): string {
  return `RNSVG${shape[0]?.toUpperCase() ?? ''}${shape.slice(1)}`;
}

interface Drawn {
  readonly type: string;
  readonly props: Record<string, unknown>;
  readonly children: readonly Drawn[];
}

/** Every shape the renderer drew, in order, with the group and the canvas around them left out. */
function shapesDrawn(node: Drawn | null): readonly string[] {
  if (node === null) {
    return [];
  }

  const below = node.children.flatMap((child) => shapesDrawn(child));

  return node.type.startsWith('RNSVG') && !['RNSVGSvgView', 'RNSVGGroup'].includes(node.type)
    ? [node.type, ...below]
    : below;
}

const rubbish: string[] = [];

function scratch(): string {
  const directory = mkdtempSync(join(tmpdir(), 'emi-icon-rules-'));
  rubbish.push(directory);
  return directory;
}

function fileFor(name: string): string {
  return readFileSync(join(drawingDirectory, `${name}.svg`), 'utf8');
}

/** The markup inside the canvas, on one line, which is what the module carries as the drawing. */
function bodyOf(source: string): string {
  return source
    .slice(source.indexOf('>') + 1, source.lastIndexOf('</svg>'))
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join(' ');
}

interface Run {
  readonly status: number | null;
  readonly out: string;
  readonly error: string;
  readonly module: string;
  readonly sheet: string;
}

/**
 * The generator, run the way the README says to run it, over a directory of its own. Nothing here
 * touches the committed set, so a drawing that has to be refused can be drawn and handed over.
 */
function generateFrom(drawings: string): Run {
  const written = scratch();
  const module = join(written, 'icons.ts');
  const sheet = join(written, 'contact-sheet.svg');
  const run = spawnSync(
    process.execPath,
    [
      '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',
      '--experimental-strip-types',
      join('brand', 'icons', 'generate.ts'),
      '--from',
      drawings,
      '--module',
      module,
      '--sheet',
      sheet,
    ],
    { cwd: repositoryRoot, encoding: 'utf8' },
  );

  return { status: run.status, out: run.stdout, error: run.stderr, module, sheet };
}

/** The four tiles, copied out, so one of them can be redrawn and the set left alone. */
function theTilesCopied(): string {
  const directory = scratch();

  for (const name of theTiles) {
    copyFileSync(join(drawingDirectory, `${name}.svg`), join(directory, `${name}.svg`));
  }

  return directory;
}

function redrawn(directory: string, name: string, change: (source: string) => string): string {
  const file = join(directory, `${name}.svg`);
  writeFileSync(file, change(readFileSync(file, 'utf8')));
  return directory;
}

afterAll(() => {
  for (const directory of rubbish) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe('an icon drawn at a second stroke weight fails the build', () => {
  describe('the four tiles the first run asks for', () => {
    it.each(theTiles)('%s is drawn, and the module names it', (name) => {
      expect(existsSync(join(drawingDirectory, `${name}.svg`))).toBe(true);
      expect(iconNames).toContain(name);
      expect(icons[name].body).toBe(bodyOf(fileFor(name)));
    });

    it.each(theTiles)('%s follows every rule the set is drawn to', (name) => {
      expect(problemsWith(`${name}.svg`, fileFor(name))).toEqual([]);
    });

    it.each(theTiles)('%s is drawn at the one weight the token carries', (name) => {
      expect(icons[name].strokeWidth).toBe(stroke.icon);
      expect([...fileFor(name).matchAll(/stroke-width="([^"]+)"/g)].map((at) => at[1])).toEqual([
        '1.75',
      ]);
    });

    it.each(theTiles)('%s draws none of the five subjects the style refuses', (name) => {
      expect(refusalsIn(`${name}.svg`, fileFor(name))).toEqual([]);
    });

    it('takes the set to twenty eight, with the four added and nothing dropped', () => {
      expect(iconNames).toHaveLength(28);
      for (const name of theTiles) {
        expect(iconNames).toContain(name);
      }
    });
  });

  describe('a drawing at a second stroke weight is refused', () => {
    it('names the file, the weight it was drawn at and the one weight the set carries', () => {
      expect(problemsWith('headache.svg', fileFor('headache').replace('1.75', '2'))).toEqual([
        'headache.svg is drawn at 2, and the set carries one weight of 1.75: a second weight reads ' +
          'as a second hand',
      ]);
    });

    it('refuses a second weight written on one element inside an otherwise correct drawing', () => {
      const second = fileFor('skin').replace('<rect', '<rect stroke-width="2"');

      expect(problemsWith('skin.svg', second)).toEqual([
        'skin.svg is drawn at 2, and the set carries one weight of 1.75: a second weight reads as ' +
          'a second hand',
      ]);
    });
  });

  describe('the screen draws every shape the file holds', () => {
    it.each(theTiles)('draws %s through the icon component, shape for shape', async (name) => {
      await render(<Icon colour={colour.onSurface} name={name} testID="tile" />);

      expect(shapesDrawn(screen.toJSON() as unknown as Drawn)).toEqual(
        shapesIn(fileFor(name)).map(drawnAs),
      );
    });

    it('draws the ellipse bloating is built from, which no other drawing in the set uses', async () => {
      await render(<Icon colour={colour.onSurface} name="bloating" testID="tile" />);

      expect(shapesDrawn(screen.toJSON() as unknown as Drawn)).toContain('RNSVGEllipse');
      expect(screen.getByTestId('tile').props.strokeWidth).toBe(stroke.icon);
    });
  });

  describe('the generator is the build, and it writes nothing it would have to take back', () => {
    it('writes the module and the sheet from a directory of drawings that follow the rules', () => {
      const run = generateFrom(theTilesCopied());

      expect({ status: run.status, error: run.error }).toEqual({ status: 0, error: '' });
      expect(existsSync(run.module)).toBe(true);
      expect(existsSync(run.sheet)).toBe(true);

      const written = readFileSync(run.module, 'utf8');
      const sheet = readFileSync(run.sheet, 'utf8');

      for (const name of theTiles) {
        expect(written).toContain(bodyOf(fileFor(name)));
        expect(sheet).toContain(`>${name}</text>`);
      }
    });

    it('fails, says which drawing and writes nothing when one is drawn at 2', () => {
      const run = generateFrom(
        redrawn(theTilesCopied(), 'headache', (source) => source.replace('1.75', '2')),
      );

      expect(run.status).toBe(1);
      expect(run.error).toContain('headache.svg is drawn at 2');
      expect(run.error).toContain('1 drawing rule(s) broken, so nothing was written');
      expect(existsSync(run.module)).toBe(false);
      expect(existsSync(run.sheet)).toBe(false);
    });

    it('fails on a rectangle that is not rounded to the corner the grid draws', () => {
      const run = generateFrom(
        redrawn(theTilesCopied(), 'skin', (source) => source.replace('rx="2"', 'rx="6"')),
      );

      expect(run.status).toBe(1);
      expect(run.error).toContain('skin.svg holds a rectangle that is not rounded to 2');
      expect(existsSync(run.module)).toBe(false);
    });

    it('fails on a drawing that names its own colour, so a screen cannot set it', () => {
      const run = generateFrom(
        redrawn(theTilesCopied(), 'digestion', (source) =>
          source.replace('stroke="currentColor"', `stroke="${colour.onSurface}"`),
        ),
      );

      expect(run.status).toBe(1);
      expect(run.error).toContain('digestion.svg does not take its colour from the screen');
      expect(run.error).toContain('digestion.svg writes a colour into the drawing');
      expect(existsSync(run.module)).toBe(false);
    });
  });
});
