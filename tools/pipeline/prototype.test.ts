import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { CONTRAST_FLOOR, contrastRatio } from '../../packages/tokens/src/colour';

import {
  type Described,
  canvasFile,
  claimsHeading,
  claimsNotRecorded,
  coloursDrawnIn,
  coloursInTheProse,
  coloursWithNoName,
  copyReviewDocument,
  describedIn,
  designSystemDocument,
  drawnParts,
  falseClaimsOfTheCopyReview,
  namedValues,
  namesDrawnNowhere,
  opaqueBaseOf,
  phaseColourNames,
  prototypeDirectory,
  prototypeReadme,
  proseOf,
  screenSuffix,
  sectionUnder,
} from './prototype.ts';

/**
 * The redesign prototype is read against the document written from it.
 *
 * The prototype approved on 2026-10-01 carries no configuration element, so there is no block of
 * named values to compare. Every colour is written straight into the markup it paints. The rule
 * that replaces the comparison is narrower and harder to pass: a colour a screen paints with has a
 * name in the front matter, and a name in the front matter is painted by a screen.
 *
 * The contrast arithmetic is the token package's, borrowed rather than written again, because a
 * second implementation of it would agree with the first until the day it did not.
 */

const root = resolve(__dirname, '..', '..');
const screens = readdirSync(join(root, prototypeDirectory))
  .filter((file) => file.endsWith(screenSuffix))
  .sort();

function markupOf(file: string): string {
  return readFileSync(join(root, prototypeDirectory, file), 'utf8');
}

const document = readFileSync(join(root, designSystemDocument), 'utf8');
const described = describedIn(document);
const named = namedValues(described);
const painted = screens.map((file) => ({ file, markup: markupOf(file) }));

/** Every colour the 52 screens paint with, as the opaque colour underneath each one. */
const basesDrawn = new Set(
  painted.flatMap(({ markup }) => coloursDrawnIn(markup).map((value) => opaqueBaseOf(value))),
);

/** The same colour written as a function at the alpha given, so no value is typed in this file. */
function atAlpha(value: string, alpha: number): string {
  const channels = [1, 3, 5].map((at) => Number.parseInt(value.slice(at, at + 2), 16));

  return `rgba(${channels.join(',')},${alpha})`;
}

/**
 * A colour no screen paints and the document does not name. It is built from a value the document
 * does name, with its digits reversed, so a probe that turns out to be a real colour of the
 * redesign fails out loud rather than passing on nothing. A value belongs in packages/tokens and
 * nowhere else.
 */
const aColourNobodyDraws = `#${[...(described.colours['accent'] ?? '').slice(1)].reverse().join('')}`;

describe('every colour in the redesign prototype has a name in the design document', () => {
  describe('both sides are read, so an empty read is not taken for agreement', () => {
    it('reads fifty two screens and the canvas that places them', () => {
      expect(screens).toHaveLength(52);
      expect(readdirSync(join(root, prototypeDirectory))).toContain(canvasFile);
      expect(screens.every((file) => markupOf(file).includes('<x-dc>'))).toBe(true);
    });

    it('reads two thousand four hundred and thirty two colours, under thirty five distinct ones', () => {
      const mentions = painted.flatMap(({ markup }) => coloursDrawnIn(markup));

      expect(mentions).toHaveLength(2432);
      expect(basesDrawn.size).toBe(35);
    });

    it('reads a document that names at least as many colours as the screens paint with', () => {
      expect(named.size).toBeGreaterThanOrEqual(basesDrawn.size);
      expect(Object.keys(described.colours).length).toBeGreaterThan(30);
    });
  });

  describe('a colour a screen paints with', () => {
    it('has a name, across the whole set', () => {
      expect(coloursWithNoName(named, painted)).toEqual([]);
    });

    it.each(screens)('has a name, on %s', (file) => {
      expect(coloursWithNoName(named, [{ file, markup: markupOf(file) }])).toEqual([]);
    });

    it('is reported with its value and the screen that paints it, when the document forgets it', () => {
      const dropped = String(described.raised['dock-quiet']?.prototype);
      const without = new Set([...named].filter((value) => value !== dropped.toLowerCase()));

      const said = coloursWithNoName(without, painted);

      expect(said.length).toBeGreaterThan(0);
      expect(said[0]).toContain(dropped.toLowerCase());
      expect(said[0]).toContain('Main.dc.html');
      expect(said[0]).toContain(designSystemDocument);
    });

    it('is read out of an attribute, a class and a style alike, and never out of a word', () => {
      const value = aColourNobodyDraws;

      expect(named.has(value.toLowerCase())).toBe(false);
      expect(
        coloursWithNoName(named, [{ file: 'a', markup: `<circle fill="${value}"/>` }]),
      ).toHaveLength(1);
      expect(
        coloursWithNoName(named, [{ file: 'a', markup: `<div class="bg-[${value}]">` }]),
      ).toHaveLength(1);
      expect(
        coloursWithNoName(named, [{ file: 'a', markup: `<div style="color:${value}">` }]),
      ).toHaveLength(1);
      expect(
        coloursWithNoName(named, [{ file: 'a', markup: `<style>.r{fill:${value}}</style>` }]),
      ).toHaveLength(1);
      expect(coloursWithNoName(named, [{ file: 'a', markup: `<span>${value}</span>` }])).toEqual(
        [],
      );
      expect(coloursWithNoName(named, [{ file: 'a', markup: `<!-- ${value} -->` }])).toEqual([]);
    });
  });

  describe('a translucent colour is held to the colour underneath it', () => {
    it('reads an alpha of any depth as its opaque base', () => {
      const text = String(described.colours['text']);
      const card = String(described.colours['card']);
      const ground = String(described.colours['ground']);

      expect(opaqueBaseOf(atAlpha(text, 0.04))).toBe(text.toLowerCase());
      expect(opaqueBaseOf(atAlpha(card, 0.94))).toBe(card.toLowerCase());
      expect(opaqueBaseOf(atAlpha(ground, 0))).toBe(ground.toLowerCase());
      expect(opaqueBaseOf(ground.toUpperCase())).toBe(ground.toLowerCase());
      expect(opaqueBaseOf(`#${'f'.repeat(3)}`)).toBe(`#${'f'.repeat(6)}`);
    });

    it('refuses a base the document does not name, however faint the alpha', () => {
      const faint = atAlpha(aColourNobodyDraws, 0.02);

      expect(
        coloursWithNoName(named, [{ file: 'a', markup: `<div style="color:${faint}">` }]),
      ).toHaveLength(1);
    });

    it('passes a shadow, because the colour under it is one the document names', () => {
      const shadow = atAlpha(String(described.colours['text']), 0.04);

      expect(
        coloursWithNoName(named, [
          { file: 'a', markup: `<div style="box-shadow:0 1px 2px ${shadow}">` },
        ]),
      ).toEqual([]);
    });
  });

  describe('a colour the document names and no screen paints', () => {
    it('leaves no such name behind', () => {
      expect(namesDrawnNowhere(described, painted)).toEqual([]);
    });

    it('is named, with the value nobody paints', () => {
      const invented = {
        ...described,
        colours: { ...described.colours, ghost: aColourNobodyDraws },
      };
      const [said] = namesDrawnNowhere(invented as Described, painted);

      expect(said).toContain('ghost');
      expect(said).toContain(aColourNobodyDraws.toLowerCase());
    });
  });
});

describe('a colour the prototype paints below the contrast floor is raised, and both values are recorded', () => {
  const raisedNames = Object.keys(described.raised).sort();

  it('records every colour that had to move, and nothing else', () => {
    expect(raisedNames).toEqual(['accent-soft-ink', 'dock-quiet', 'picker-far', 'picker-near']);
  });

  it.each(['accent-soft-ink', 'dock-quiet', 'picker-far', 'picker-near'])(
    'paints %s under the floor and builds a value that clears it',
    (name) => {
      const raised = described.raised[name];
      const ground = described.colours[String(raised?.on)];
      const built = described.colours[name];

      expect(raised?.prototype).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(ground).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(contrastRatio(String(raised?.prototype), String(ground))).toBeLessThan(CONTRAST_FLOOR);
      expect(contrastRatio(String(built), String(ground))).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
    },
  );

  it('keeps the value the prototype paints inside the names, so the screens still pass', () => {
    for (const name of raisedNames) {
      expect(named.has(String(described.raised[name]?.prototype).toLowerCase())).toBe(true);
    }
  });

  it('says why each one moved, in words a reader can check', () => {
    for (const name of raisedNames) {
      expect(String(described.raised[name]?.reason).length).toBeGreaterThan(20);
    }
  });
});

describe('a colour named in the prose of the design document fails the pipeline', () => {
  it('reads the prose, so an empty read is not taken for silence', () => {
    const prose = proseOf(document);

    expect(prose.length).toBeGreaterThan(50);
    expect(prose[0]?.number).toBeGreaterThan(50);
  });

  it('writes no colour value anywhere below the front matter', () => {
    expect(coloursInTheProse(document)).toEqual([]);
  });

  it('refuses a hex value, and names the line and the paragraph', () => {
    const value = aColourNobodyDraws;
    const written = `---\nname: One\n---\n\nThe accent is ${value} on press.\n`;
    const [said] = coloursInTheProse(written);

    expect(coloursInTheProse(written)).toHaveLength(1);
    expect(said).toContain('line 5');
    expect(said).toContain(value);
  });

  it('refuses a colour written as a function, so a second palette cannot arrive in other clothes', () => {
    expect(coloursInTheProse('---\na: b\n---\nrgba(38, 34, 32, 0.05)\n')).toHaveLength(1);
    expect(coloursInTheProse('---\na: b\n---\nhsl(20, 60%, 40%)\n')).toHaveLength(1);
  });

  it('reads the front matter as the one place a value belongs, so it is never a failure', () => {
    const front = document.split('\n').slice(0, (proseOf(document)[0]?.number ?? 1) - 1);

    expect(front.filter((line) => /#[0-9a-fA-F]{6}/.test(line)).length).toBeGreaterThan(30);
  });

  it('refuses a document with no front matter, rather than reading the whole of it as prose', () => {
    expect(() => proseOf('# One\n\nNo front matter here.\n')).toThrow('has no front matter');
  });
});

describe('the four phase fills and the four inks', () => {
  it('names eight, as four pairs in the order a cycle runs', () => {
    expect(phaseColourNames).toHaveLength(8);
    expect(phaseColourNames.filter((name) => name.endsWith('-ink'))).toHaveLength(4);
  });

  it('holds every one of them in the front matter', () => {
    for (const name of phaseColourNames) {
      expect(described.colours[name]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('keeps every ink off its own fill, which is the pair contract SEE-2 forbids', () => {
    for (const name of phaseColourNames.filter((each) => each.endsWith('-ink'))) {
      const fill = described.colours[name.replace('-ink', '')];

      expect(described.colours[name]).not.toBe(fill);
    }
  });

  it('keeps every ink readable on the ground, which is where the ring writes the phase name', () => {
    const ground = String(described.colours['ground']);
    const under = phaseColourNames
      .filter((name) => name.endsWith('-ink'))
      .filter((name) => contrastRatio(String(described.colours[name]), ground) < CONTRAST_FLOOR);

    expect(under).toEqual([]);
  });
});

describe('the prototype in the repository', () => {
  const held = readdirSync(join(root, prototypeDirectory)).sort();

  it('holds fifty two screens, the canvas, the readme and the copy review, and nothing else', () => {
    expect(held).toEqual([...screens, canvasFile, 'README.md', 'copy-review.md'].sort());
  });

  it('keeps the screens as the tool wrote them, so no formatter moves a line', () => {
    const ignored = readFileSync(join(root, '.prettierignore'), 'utf8');

    expect(ignored).toContain(`${prototypeDirectory}/*.html`);
  });

  it('is named by the document it was written into', () => {
    expect(document).toContain(prototypeDirectory);
  });

  it('names every screen after a screen of the mockups, apart from the one the canvas launches', () => {
    const mockups = JSON.parse(
      readFileSync(join(root, 'docs', 'design', 'mockups', 'flows.json'), 'utf8'),
    ) as { screens: Record<string, unknown> };
    const unknown = screens
      .map((file) => file.replace(screenSuffix, ''))
      .filter((name) => !(name in mockups.screens));

    expect(unknown).toEqual(['Main']);
  });

  it('reads the parts a browser paints from, and not the words between them', () => {
    expect(drawnParts(markupOf('today.dc.html')).length).toBeGreaterThan(20);
    const written = String(described.colours['accent']);

    expect(drawnParts(`<span>${written}</span>`).join('')).not.toContain(written);
  });
});

describe('the copy review of screens 6 to 22', () => {
  const review = readFileSync(join(root, copyReviewDocument), 'utf8');
  const readme = readFileSync(join(root, prototypeReadme), 'utf8');

  it('reads both documents, so an empty read is not taken for agreement', () => {
    expect(falseClaimsOfTheCopyReview.length).toBeGreaterThan(30);
    expect(review.split('\n').length).toBeGreaterThan(100);
    expect(sectionUnder(readme, claimsHeading).length).toBeGreaterThan(2000);
  });

  it('is recorded in the readme, claim for claim, under the heading that says it is never built', () => {
    expect(claimsNotRecorded(review, readme)).toEqual([]);
  });

  it('says which document lost a claim, rather than passing on a missing one', () => {
    const dropped = falseClaimsOfTheCopyReview[0] as string;

    expect(claimsNotRecorded(review.replace(dropped, ''), readme)).toEqual([
      `${copyReviewDocument} does not name ${dropped}`,
    ]);
    expect(claimsNotRecorded(review, readme.replace(dropped, ''))).toEqual([
      `${prototypeReadme} does not record ${dropped} under ${claimsHeading.slice(3)}`,
    ]);
  });

  it('reads a claim wrapped over two lines as one phrase', () => {
    const claim = 'We will broaden windows into softer horizon ranges';

    expect(falseClaimsOfTheCopyReview).toContain(claim);
    expect(review).not.toContain(claim);
    expect(claimsNotRecorded(review, readme)).toEqual([]);
  });
});
