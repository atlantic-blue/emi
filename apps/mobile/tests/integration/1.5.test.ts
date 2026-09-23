import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { ICON_CORNER, ICON_SIZE, type IconName, icon, iconNames, icons, stroke } from '@emi/tokens';

const repositoryRoot = resolve(__dirname, '..', '..', '..', '..');
const drawingDirectory = join(repositoryRoot, 'brand', 'icons');

/** The twenty eight the design asks for, in the order the steps named them. */
const theSet: readonly string[] = [
  'drop',
  'calendar',
  'ring',
  'mood',
  'energy',
  'pain',
  'sleep',
  'temperature',
  'weight',
  'note',
  'lock',
  'export',
  'delete',
  'settings',
  'chevron',
  'close',
  'plus',
  'check',
  'search',
  'spotting',
  'sun',
  'edit',
  'chart',
  'shield',
  'skin',
  'digestion',
  'headache',
  'bloating',
];

function drawingFiles(): readonly string[] {
  return readdirSync(drawingDirectory)
    .filter((file) => file.endsWith('.svg') && file !== 'contact-sheet.svg')
    .sort();
}

function fileFor(name: string): string {
  return readFileSync(join(drawingDirectory, `${name}.svg`), 'utf8');
}

/** Every stroke width written anywhere in a drawing, the shared one and any that overrides it. */
function strokeWidthsIn(source: string): readonly number[] {
  return [...source.matchAll(/stroke-width="([^"]+)"/g)].map((found) => Number(found[1]));
}

function attributeOf(source: string, attribute: string): string | undefined {
  return new RegExp(`${attribute}="([^"]*)"`).exec(source)?.[1];
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

const everyName: readonly IconName[] = iconNames;

describe('every icon in the set shares one stroke weight', () => {
  describe('one weight', () => {
    it.each(everyName)(
      'the %s file is drawn at 1.75 and nothing in it is drawn at anything else',
      (name) => {
        const widths = strokeWidthsIn(fileFor(name));

        expect(widths.length).toBeGreaterThan(0);
        for (const width of widths) {
          expect(width).toBe(1.75);
        }
      },
    );

    it('the whole set carries a single weight, so nothing reads as a second hand', () => {
      const widths = new Set(everyName.flatMap((name) => strokeWidthsIn(fileFor(name))));

      expect([...widths]).toEqual([1.75]);
    });

    it('that weight is the token, so a change to it moves the drawings with it', () => {
      expect(stroke.icon).toBe(1.75);
      for (const name of everyName) {
        expect(icons[name].strokeWidth).toBe(stroke.icon);
      }
    });
  });

  describe('a screen names an icon rather than carrying a path', () => {
    it('names the twenty eight the design asks for', () => {
      expect([...everyName].sort()).toEqual([...theSet].sort());
      expect(everyName).toHaveLength(28);
    });

    it('gives back the drawing for a name', () => {
      const found = icon('calendar');

      expect(found.name).toBe('calendar');
      expect(found.size).toBe(ICON_SIZE);
      expect(found.body).toContain('<rect');
    });

    it('refuses a name nothing was drawn for, rather than handing back an empty drawing', () => {
      expect(() => icon('uterus')).toThrow('no icon named uterus');
    });
  });

  describe('the module and the drawings cannot drift apart', () => {
    it.each(everyName)('%s is named in the module and has a file', (name) => {
      expect(drawingFiles()).toContain(`${name}.svg`);
    });

    it('every file in the directory is named in the module', () => {
      const named = drawingFiles().map((file) => file.replace(/\.svg$/, ''));

      expect(named.sort()).toEqual([...everyName].sort());
    });

    it.each(everyName)(
      'the drawing the module carries for %s is the drawing in the file',
      (name) => {
        expect(icons[name].body).toBe(bodyOf(fileFor(name)));
      },
    );
  });

  describe('the contact sheet shows the set', () => {
    const sheet = readFileSync(join(drawingDirectory, 'contact-sheet.svg'), 'utf8');

    it.each(everyName)('%s is on the sheet, drawn as the file draws it', (name) => {
      expect(sheet).toContain(icons[name].body);
      expect(sheet).toContain(`>${name}</text>`);
    });

    it('shows the whole set and nothing else', () => {
      expect(
        [...sheet.matchAll(/<text[^>]*>([^<]+)<\/text>/g)].map((found) => found[1]).sort(),
      ).toEqual([...everyName].sort());
    });
  });

  describe('one hand drew them', () => {
    it.each(everyName)(
      '%s sits on the 24 grid with round caps and round joins, and fills nothing',
      (name) => {
        const source = fileFor(name);

        expect(attributeOf(source, 'viewBox')).toBe(`0 0 ${ICON_SIZE} ${ICON_SIZE}`);
        expect(attributeOf(source, 'width')).toBe(String(ICON_SIZE));
        expect(attributeOf(source, 'height')).toBe(String(ICON_SIZE));
        expect(attributeOf(source, 'stroke-linecap')).toBe('round');
        expect(attributeOf(source, 'stroke-linejoin')).toBe('round');
        expect(source).toContain('fill="none"');
        expect([...source.matchAll(/fill="([^"]*)"/g)].map((found) => found[1])).toEqual(['none']);
      },
    );

    it.each(everyName)('%s takes its colour from the screen rather than naming one', (name) => {
      expect(attributeOf(fileFor(name), 'stroke')).toBe('currentColor');
      expect(fileFor(name)).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    });

    it('a rectangle is rounded to the corner the icon grid draws', () => {
      const rectangles = everyName.flatMap((name) => [...fileFor(name).matchAll(/<rect[^>]*>/g)]);

      expect(rectangles.length).toBeGreaterThan(0);
      for (const [rectangle] of rectangles) {
        expect(attributeOf(rectangle, 'rx')).toBe(String(ICON_CORNER));
      }
    });
  });
});
