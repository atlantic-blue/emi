import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import {
  claimsHeading,
  claimsNotRecorded,
  coloursDrawnOutsideThePalette,
  coloursInTheProse,
  configuredIn,
  copyReviewDocument,
  describedIn,
  designSystemDocument,
  disagreements,
  drawnParts,
  falseClaimsOfTheCopyReview,
  phaseColourNames,
  phaseColoursIn,
  phaseColoursNotDrawn,
  prototypeDirectory,
  prototypeReadme,
  proseOf,
  radiiTheExportKeeps,
  sectionUnder,
  sourceScreen,
  type Theme,
} from './prototype.ts';

/**
 * The design system document is read against the prototype it was written from.
 *
 * Everything downstream reads the document: the token package, and through it every screen. So
 * until this ran, the one place the chain could break without a test noticing was its first link,
 * where the document and the prototype sit side by side and nothing held them together.
 */

const root = resolve(__dirname, '..', '..');
const screen = readFileSync(join(root, prototypeDirectory, sourceScreen), 'utf8');
const document = readFileSync(join(root, designSystemDocument), 'utf8');

const prototype = configuredIn(screen);
const described = describedIn(document);

/**
 * A colour to probe a refusal with. It is one the document names with its digits reversed, rather
 * than a value written here, because a value belongs in packages/tokens and nowhere else. Every case
 * that uses it proves first that the screen draws it nowhere, so a probe that turns out to be a real
 * colour of the prototype fails out loud rather than passing on nothing.
 */
const aColourTheScreenDoesNotDraw = `#${[...(described.colours['period'] ?? '').slice(1)]
  .reverse()
  .join('')}`;

const colourNames = Object.keys(prototype.colours);
const spacingNames = Object.keys(prototype.spacing);
const roleNames = Object.keys(prototype.type);

/** The palette the configuration names, which is the palette without the eight phase colours. */
const describedWithoutPhases = Object.keys(described.colours).filter(
  (name) => !phaseColourNames.includes(name),
);

describe('the design system says what the prototype draws', () => {
  it('reads both sides, so an empty read is not taken for agreement', () => {
    expect(colourNames).toHaveLength(47);
    expect(Object.keys(described.colours)).toHaveLength(47 + phaseColourNames.length);
    expect(spacingNames).toHaveLength(11);
    expect(roleNames).toHaveLength(13);
    expect(prototype.type['display-lg']?.fontSize).toBe('3rem');
    expect(prototype.type['data-lg']?.fontFamily).toBe('JetBrains Mono');
  });

  it('holds the accent the export itself disagreed about, as the front matter writes it', () => {
    // The export's prose called the primary accent the value the front matter gives
    // `primary-container`, so the two roles are asserted to be different colours rather than by
    // writing either one out. A value belongs in packages/tokens and nowhere else.
    expect(described.colours['primary']).toMatch(/^#[0-9a-f]{6}$/);
    expect(described.colours['primary']).toBe(prototype.colours['primary']);
    expect(described.colours['primary']).not.toBe(described.colours['primary-container']);
  });

  it('names the same colours, the same spacing steps and the same type roles', () => {
    expect(describedWithoutPhases.sort()).toEqual([...colourNames].sort());
    expect(Object.keys(described.spacing).sort()).toEqual([...spacingNames].sort());
    expect(Object.keys(described.type).sort()).toEqual([...roleNames].sort());
  });

  it.each(colourNames)('holds the prototype value for colour %s', (name) => {
    expect(described.colours[name]).toBe(prototype.colours[name]);
  });

  it.each(spacingNames)('holds the prototype value for spacing %s', (name) => {
    expect(described.spacing[name]).toBe(prototype.spacing[name]);
  });

  it.each(roleNames)(
    'draws %s at the size, line height, tracking and weight of the prototype',
    (name) => {
      expect(described.type[name]).toEqual(prototype.type[name]);
    },
  );

  it('agrees about everything, apart from the radii nobody has decided yet', () => {
    expect(disagreements(prototype, described)).toEqual([...radiiTheExportKeeps]);
  });

  it('names three faces, because the numbers and the headings are not the body', () => {
    const faces = new Set(Object.values(described.type).map((role) => role.fontFamily));

    expect([...faces].sort()).toHaveLength(3);
  });
});

describe('a colour named in the prose of the design document fails the pipeline', () => {
  describe('the prose names a role and never a value', () => {
    it('reads the prose, so an empty read is not taken for silence', () => {
      const prose = proseOf(document);

      expect(prose.length).toBeGreaterThan(100);
      expect(prose.some((line) => line.text.startsWith('## Colours'))).toBe(true);
      expect(prose[0]?.number).toBeGreaterThan(100);
    });

    it('writes no colour value anywhere below the front matter', () => {
      expect(coloursInTheProse(document)).toEqual([]);
    });

    it('refuses a hex value, and names the line and the paragraph', () => {
      const value = aColourTheScreenDoesNotDraw;

      expect(value).toMatch(/^#[0-9a-f]{6}$/);

      const written = `---\nname: One\n---\n\nThe primary button is ${value} on press.\n`;
      const [said] = coloursInTheProse(written);

      expect(coloursInTheProse(written)).toHaveLength(1);
      expect(said).toContain('line 5');
      expect(said).toContain(value);
      expect(said).toContain('The primary button is');
    });

    it('refuses a colour written as a function, so a second palette cannot arrive in other clothes', () => {
      expect(coloursInTheProse('---\na: b\n---\nrgba(38, 34, 32, 0.05)\n')).toHaveLength(1);
      expect(coloursInTheProse('---\na: b\n---\nhsl(20, 60%, 40%)\n')).toHaveLength(1);
    });

    it('reads the front matter as the one place a value belongs, so it is never a failure', () => {
      const front = document.split('\n').slice(0, proseOf(document)[0]!.number - 1);

      expect(front.filter((line) => /#[0-9a-f]{6}/.test(line)).length).toBeGreaterThan(40);
      expect(coloursInTheProse(document)).toEqual([]);
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
      const held = phaseColoursIn(described);

      expect(Object.keys(held)).toEqual([...phaseColourNames]);
      for (const name of phaseColourNames) {
        expect(held[name]).toMatch(/^#[0-9a-f]{6}$/);
      }
    });

    it('draws every one of them on the screen the front matter was read from', () => {
      expect(phaseColoursNotDrawn(described, screen)).toEqual([]);
    });

    it('says which phase colour the front matter names and the screen never draws', () => {
      const value = aColourTheScreenDoesNotDraw;

      expect(screen.toLowerCase()).not.toContain(value.toLowerCase());

      const moved = { ...described, colours: { ...described.colours, period: value } };
      const [said] = phaseColoursNotDrawn(moved, screen);

      expect(said).toContain('phase colour period');
      expect(said).toContain(value);
      expect(said).toContain(sourceScreen);
    });

    it('says which phase colour the front matter forgot', () => {
      const { luteal: _dropped, ...rest } = described.colours;

      expect(phaseColoursNotDrawn({ ...described, colours: rest }, screen)).toEqual([
        'phase colour luteal: the design system names nothing',
      ]);
    });

    it('keeps the eight out of the comparison with the configuration, which does not name them', () => {
      expect(phaseColourNames.filter((name) => name in prototype.colours)).toEqual([]);
      expect(disagreements(prototype, described)).toEqual([...radiiTheExportKeeps]);
    });
  });
});

describe('the corners the two sides do not agree about', () => {
  it('keeps the disagreement written out, so the fix reddens this too', () => {
    expect(radiiTheExportKeeps.length).toBeGreaterThan(0);
    expect(radiiTheExportKeeps.every((said) => said.startsWith('radius '))).toBe(true);
  });

  it('holds the one corner they do agree about, so the block is not waved through whole', () => {
    expect(prototype.radii['full']).toBe('9999px');
    expect(described.radii['full']).toBe('9999px');
  });
});

describe('a value that moves is named', () => {
  const moved = (block: keyof Theme, name: string, value: string): Theme => ({
    ...described,
    [block]: { ...described[block], [name]: value },
  });

  it('says which colour moved, and what each side says', () => {
    const other = described.colours['error'] as string;
    const [said] = disagreements(prototype, moved('colours', 'primary', other));

    expect(said).toBe(
      `colour primary: the prototype says ${prototype.colours['primary']} and the design system says ${other}`,
    );
  });

  it('says which spacing step moved', () => {
    expect(disagreements(prototype, moved('spacing', 'margin', '2rem'))).toContain(
      'spacing margin: the prototype says 1rem and the design system says 2rem',
    );
  });

  it('reads a type role property by property, so a tracking change is not lost inside a role', () => {
    const roles = {
      ...described.type,
      'label-md': { ...described.type['label-md'], letterSpacing: '0em' },
    } as Theme['type'];

    expect(disagreements(prototype, { ...described, type: roles })).toContain(
      'label-md letterSpacing: the prototype says 0.01em and the design system says 0em',
    );
  });

  it('counts a name only one side holds, so a deleted colour is not silence', () => {
    const { primary: _dropped, ...rest } = described.colours;

    expect(disagreements(prototype, { ...described, colours: rest })).toContain(
      `colour primary: the prototype says ${prototype.colours['primary']} and the design system says nothing`,
    );
  });
});

describe('the prototype in the repository', () => {
  const held = readdirSync(join(root, prototypeDirectory)).sort();

  it('holds twenty three screens, each with a picture beside it', () => {
    const markup = held.filter((file) => file.endsWith('.html'));

    expect(markup).toHaveLength(23);
    expect(markup.map((file) => file.replace('.html', '.png'))).toEqual(
      held.filter((file) => file.endsWith('.png')),
    );
  });

  it('draws every screen from the one configuration, so the source screen speaks for the set', () => {
    for (const file of held.filter((name) => name.endsWith('.html'))) {
      const other = configuredIn(readFileSync(join(root, prototypeDirectory, file), 'utf8'));

      expect(disagreements(prototype, other)).toEqual([]);
    }
  });

  it('is named by the document it was written into', () => {
    expect(document).toContain(prototypeDirectory);
    expect(document).toContain(sourceScreen);
  });

  it('refuses a screen that carries no configuration, rather than reading it as empty', () => {
    expect(() => configuredIn('<html></html>')).toThrow('configures nothing');
  });
});

describe('the room a screen reserves at its foot', () => {
  const screens = readdirSync(join(root, prototypeDirectory)).filter((name) =>
    name.endsWith('.html'),
  );

  const reserved = (file: string): string | undefined =>
    /<main class="[^"]*\b(pb-\d+)\b/.exec(
      readFileSync(join(root, prototypeDirectory, file), 'utf8'),
    )?.[1];

  it('is reserved by the six screens that carry something fixed at the foot, and by no other', () => {
    expect(screens).toHaveLength(23);
    expect(
      Object.fromEntries(
        screens
          .filter((file) => reserved(file) !== undefined)
          .map((file) => [file, reserved(file)]),
      ),
    ).toEqual({
      'cycle-length.html': 'pb-28',
      'cycle-regularity.html': 'pb-28',
      'home.html': 'pb-24',
      'last-period.html': 'pb-28',
      'period-before.html': 'pb-28',
      'period-length.html': 'pb-28',
    });
  });
});

describe('a screen of the prototype that draws a colour outside the palette fails the pipeline', () => {
  const screens = readdirSync(join(root, prototypeDirectory)).filter((name) =>
    name.endsWith('.html'),
  );
  const palette = Object.values(described.colours);
  const markupOf = (file: string): string =>
    readFileSync(join(root, prototypeDirectory, file), 'utf8');

  describe('every screen paints from the front matter and from nowhere else', () => {
    it('reads twenty three screens and a palette of fifty five, so an empty read is not silence', () => {
      expect(screens).toHaveLength(23);
      expect(palette).toHaveLength(47 + phaseColourNames.length);
      expect(drawnParts(markupOf(sourceScreen)).length).toBeGreaterThan(400);
    });

    it.each(screens)('paints %s with no colour the palette does not hold', (file) => {
      expect(coloursDrawnOutsideThePalette(palette, markupOf(file))).toEqual([]);
    });

    it('names the value and reads it out of an attribute, a class and a style alike', () => {
      const value = aColourTheScreenDoesNotDraw;

      expect(palette).not.toContain(value);

      expect(coloursDrawnOutsideThePalette(palette, `<circle fill="${value}"></circle>`)).toEqual([
        value,
      ]);
      expect(coloursDrawnOutsideThePalette(palette, `<div class="bg-[${value}]"></div>`)).toEqual([
        value,
      ]);
      expect(coloursDrawnOutsideThePalette(palette, `<div style="color: ${value}"></div>`)).toEqual(
        [value],
      );
      expect(
        coloursDrawnOutsideThePalette(palette, `<style>.ring { fill: ${value}; }</style>`),
      ).toEqual([value]);
    });

    it('reads a value a screen writes as a word as no colour at all', () => {
      const value = aColourTheScreenDoesNotDraw;

      expect(coloursDrawnOutsideThePalette(palette, `<span>${value}</span>`)).toEqual([]);
      expect(coloursDrawnOutsideThePalette(palette, `<!-- the band is ${value} -->`)).toEqual([]);
    });

    it('reads a shadow as a depth rather than as a colour, and an opaque function as a colour', () => {
      expect(
        coloursDrawnOutsideThePalette(palette, '<div class="shadow-[0_1px_8px_rgba(0,0,0,0.03)]">'),
      ).toEqual([]);
      expect(coloursDrawnOutsideThePalette(palette, '<div style="color: rgb(0,0,0)">')).toEqual([
        'rgb(0,0,0)',
      ]);
    });

    it('refuses the retired canvas, which is the value four screens drew before this ran', () => {
      const retired = (described.colours['surface'] as string).replace(/^#ff/, '#fa');

      expect(retired).toMatch(/^#[0-9a-f]{6}$/);
      expect(palette).not.toContain(retired);
      expect(
        coloursDrawnOutsideThePalette(palette, `<circle stroke="${retired}"></circle>`),
      ).toEqual([retired]);
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

    it('reads the claims under that heading alone, so a claim named elsewhere is not recorded', () => {
      const claim = falseClaimsOfTheCopyReview[1] as string;
      const elsewhere = `${claimsHeading}\n\nNothing.\n\n## Later\n\n${claim}\n`;

      expect(claimsNotRecorded(claim, elsewhere)).toContain(
        `${prototypeReadme} does not record ${claim} under ${claimsHeading.slice(3)}`,
      );
    });

    it('reads a claim wrapped over two lines as one phrase', () => {
      const claim = 'We will broaden windows into softer horizon ranges';

      expect(falseClaimsOfTheCopyReview).toContain(claim);
      expect(review).not.toContain(claim);
      expect(claimsNotRecorded(review, readme)).toEqual([]);
    });
  });
});
