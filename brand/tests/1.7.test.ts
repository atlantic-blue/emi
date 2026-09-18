import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  APPLICATION_ICON_SIZE,
  OPTICAL_RISE,
  RING_SHARE_OF_ICON,
  assetsFrom,
  canvasOf,
  iconSquare,
  insideOf,
  markFiles,
  markNames,
} from '../sheet/assets.ts';
import {
  ICON_SHOWN_AT,
  TRANSPARENT_NOTE,
  driftProblems,
  generateCommand,
  markSizes,
  measurementsFor,
  picturePath,
  relativeFontsBase,
  sheetDocument,
  sheetPage,
  sheetPath,
  sheetSources,
} from '../sheet/sheet.tsx';
import { committedSheet, sheetMarkupFor } from '../sheet/sheetFile.ts';
import {
  type ColourName,
  colourNames,
  colours,
  contrastRatio,
  fontFiles,
  iconNames,
  icons,
  phaseLabel,
  ringGeometry,
  typeScale,
  typeSizeNames,
} from '../../packages/tokens/src/index.ts';
import { arcsOf, drawnRings } from '../ring/ringPage.tsx';
import { pieces } from '../illustration/pieces.ts';
import { specimenSentences } from '../specimen/specimen.tsx';
import { approvedPairs, shippedSources } from '../../tools/brand/generateBrandDocument.ts';

const root = join(__dirname, '..', '..');
const assets = assetsFrom(root);
const sources = sheetSources(assets);
const page = sheetDocument(sources);
const committed = committedSheet(root);

/**
 * The palette with muted taken to the value body carries. A real token rather than a typed hex,
 * and a different ratio, which is the drift the pipeline job exists to catch.
 */
const movedValue = colours.body.value;
const movedPalette = {
  ...colours,
  muted: { ...colours.muted, value: movedValue },
};
const moved = { ...sources, brand: { ...shippedSources, palette: movedPalette } };

function ratiosIn(text: string): number[] {
  return [...text.matchAll(/([0-9]+\.[0-9]{2}) to 1/g)].map((found) => Number(found[1]));
}

describe('the brand sheet is generated from the tokens and cannot drift', () => {
  describe('the page a person looks at', () => {
    it('is one document a browser can draw on its own', () => {
      expect(page.startsWith('<!doctype html>')).toBe(true);
      expect(page).toContain('<title>The Emi brand sheet</title>');
      expect(page.trimEnd().endsWith('</html>')).toBe(true);
    });

    it('is drawn at a fixed page, so the picture is the whole sheet', () => {
      expect(sheetPage.height).toBeGreaterThan(sheetPage.width);
      expect(page).toContain(`width: ${sheetPage.width}px`);
      expect(page).toContain(`height: ${sheetPage.height}px`);
    });

    it.each(fontFiles.map((file) => [file.path, file] as const))(
      'reaches %s through a path that is the same on every machine',
      (_path, file) => {
        expect(relativeFontsBase.startsWith('../../')).toBe(true);
        expect(page).toContain(`src: url("${relativeFontsBase}${file.path}") format("truetype");`);
      },
    );

    it('says where it came from and what writes it again', () => {
      expect(page).toContain(generateCommand);
      expect(page).toContain(sheetPath);
    });
  });

  describe('every swatch', () => {
    it.each(colourNames)('shows %s with its value and its roles', (name) => {
      expect(page).toContain(`>${name}<`);
      expect(page).toContain(colours[name].value);
      expect(page).toContain(`>${colours[name].roles.join(', ')}<`);
    });

    it('paints the chip in the colour itself, so the value and the patch cannot disagree', () => {
      for (const name of colourNames) {
        expect(page).toContain(`class="chip" style="background: ${colours[name].value}"`);
      }
    });

    it('prints a measurement beside every one of the eighteen', () => {
      const silent = colourNames.filter(
        (name) => measurementsFor(shippedSources, name).length === 0,
      );

      expect(silent).toEqual([]);
      expect(colourNames).toHaveLength(18);
    });

    it('prints the ratio contrastRatio computes, and not a number typed by hand', () => {
      const wrong = approvedPairs(shippedSources).filter((pair) => {
        const measured = contrastRatio(colours[pair.text].value, colours[pair.ground].value);

        return !page.includes(`${pair.text} on ${pair.ground} is ${measured.toFixed(2)} to 1`);
      });

      expect(wrong).toEqual([]);
    });

    it('names the one colour that has no ratio of its own, and says why', () => {
      const silent = colourNames.filter((name) =>
        measurementsFor(shippedSources, name).includes(TRANSPARENT_NOTE),
      );

      expect(silent).toEqual<ColourName[]>(['hairline']);
      expect(page).toContain(TRANSPARENT_NOTE);
    });

    it('says what a fill is measured at and which partner carries its text', () => {
      const measured = measurementsFor(shippedSources, 'period');

      expect(measured).toContain('period on stone is 3.31 to 1, so periodInk carries the text');
      expect(page).toContain('period on stone is 3.31 to 1, so periodInk carries the text');
    });

    it('prints every ratio to two places, so nothing reads as rounder than it was measured', () => {
      const printed = ratiosIn(page);

      expect(printed.length).toBeGreaterThan(colourNames.length);
      expect(printed.every((value) => value > 0)).toBe(true);
    });
  });

  describe('the mark', () => {
    it.each(markNames)('draws %s from the file the application ships', (name) => {
      const file = readFileSync(join(root, markFiles[name]), 'utf8').trim();

      expect(page).toContain(file);
    });

    it.each(markSizes)('shows each mark at %s points', (size) => {
      expect(page).toContain(
        `.mark-${size} svg { display: block; height: ${size}px; width: auto; }`,
      );

      for (const name of markNames) {
        expect(page).toContain(`class="mark-${size}"`);
        expect(assets[name].length).toBeGreaterThan(0);
      }
    });

    it('shows the smallest size the gap has to survive', () => {
      expect(Math.min(...markSizes)).toBe(16);
    });

    it('shows the application icon beside the wordmark', () => {
      expect(page).toContain(assets.icon);
      expect(page).toContain(`${APPLICATION_ICON_SIZE} point square, shown at ${ICON_SHOWN_AT}`);
    });

    it('draws the ring at 56 percent of the icon width, above the middle so it reads as centred', () => {
      const ringCanvas = canvasOf(assets.ring);
      const scale = (APPLICATION_ICON_SIZE * RING_SHARE_OF_ICON) / ringCanvas.width;
      const drawn = ringCanvas.width * scale;
      const left = (APPLICATION_ICON_SIZE - drawn) / 2;
      const top = left - APPLICATION_ICON_SIZE * OPTICAL_RISE;

      expect(drawn / APPLICATION_ICON_SIZE).toBeCloseTo(0.56, 10);
      expect(top).toBeLessThan(left);
      expect(assets.icon).toContain(`scale(${Math.round(scale * 1000) / 1000})`);
      expect(assets.icon).toContain(
        `translate(${Math.round(left * 1000) / 1000} ${Math.round(top * 1000) / 1000})`,
      );
      expect(assets.icon).toContain(insideOf(assets.ring));
      expect(iconSquare(assets.ring)).toEqual(assets.icon);
    });
  });

  describe('the type scale', () => {
    it.each(typeSizeNames)('sets %s at its own size over its own line height', (size) => {
      const style = typeScale[size];

      expect(page).toContain(
        `.size-${size} { font-size: ${style.size}px; line-height: ${style.lineHeight}px; letter-spacing: ${style.letterSpacing}px; }`,
      );
      expect(page).toContain(`${size} ${style.size}/${style.lineHeight}`);
    });

    it('writes the sentence the specimen writes, so the two pages cannot disagree', () => {
      for (const size of typeSizeNames) {
        expect(page).toContain(specimenSentences[size]);
      }
    });
  });

  describe('the ring, in three states', () => {
    it('draws three, and today sits in a different phase on each', () => {
      const phases = drawnRings.map((ring) => ringGeometry(ring).phase);

      expect(phases).toHaveLength(3);
      expect(new Set(phases).size).toBe(3);
    });

    it('draws every arc the token package computes, at the strength it computes', () => {
      const missing = drawnRings.flatMap((ring) =>
        arcsOf(ringGeometry(ring)).filter(
          (arc) => !page.includes(`d="${arc.d}"`) || !page.includes(`opacity="${arc.opacity}"`),
        ),
      );

      expect(missing).toEqual([]);
    });

    it('writes the phase in words, so the boundary is not carried by colour alone', () => {
      for (const ring of drawnRings) {
        expect(page).toContain(`>${phaseLabel[ringGeometry(ring).phase]}<`);
        expect(page).toContain(`>${ring.day}<`);
      }
    });
  });

  describe('the icons', () => {
    it.each(iconNames)('draws %s on its own grid at the one stroke weight', (name) => {
      const icon = icons[name];

      expect(page).toContain(icon.body);
      expect(page).toContain(`viewBox="0 0 ${icon.size} ${icon.size}"`);
      expect(page).toContain(`stroke-width="${icon.strokeWidth}"`);
    });

    it('shows twenty and no twenty first', () => {
      expect(iconNames).toHaveLength(20);
      expect(page.match(/class="icon-cell"/g)).toHaveLength(20);
    });
  });

  describe('the illustrations', () => {
    it('shows the three pieces together, each with what it carries', () => {
      expect(pieces).toHaveLength(3);

      for (const piece of pieces) {
        expect(page).toContain(`<title>${piece.name}</title>`);
        expect(page).toContain(piece.says);
      }
    });
  });

  describe('drift', () => {
    it('is what the generator writes now', () => {
      expect(driftProblems(committed, sheetMarkupFor(root))).toEqual([]);
    });

    it('changes when a colour moves, and prints the ratio the new value measures', () => {
      const after = sheetDocument(moved);
      const measured = contrastRatio(movedValue, colours.stone.value).toFixed(2);

      expect(after).not.toEqual(page);
      expect(page).toContain('muted on stone is 4.75 to 1');
      expect(after).not.toContain('muted on stone is 4.75 to 1');
      expect(after).toContain(`muted on stone is ${measured} to 1`);
    });

    it('changes the measurement beside the swatch, not only the patch of colour', () => {
      const before = measurementsFor(shippedSources, 'muted');
      const after = measurementsFor(moved.brand, 'muted');

      expect(after).not.toEqual(before);
      expect(after[0]).toContain(contrastRatio(movedValue, colours.stone.value).toFixed(2));
    });

    it('refuses the committed copy when a token has moved, naming the line', () => {
      const problems = driftProblems(page, sheetDocument(moved));

      expect(problems[0]).toContain(`${sheetPath} is stale`);
      expect(problems[0]).toMatch(/disagree at line [0-9]+\./);
      expect(problems[problems.length - 1]).toContain(generateCommand);
      expect(problems[problems.length - 1]).toContain(picturePath);
    });

    it('refuses a page that was never written, naming the command that writes it', () => {
      const problems = driftProblems(null, page);

      expect(problems).toHaveLength(1);
      expect(problems[0]).toContain(`${sheetPath} is missing`);
      expect(problems[0]).toContain(generateCommand);
    });
  });
});
