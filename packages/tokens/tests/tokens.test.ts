import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

import { colour, colourNames, colours, hasRole } from '../src/colour';
import { faceFamily, fonts } from '../src/font';
import { phaseNames, phasePalette } from '../src/ring';
import { MINIMUM_TAP_TARGET, radius, radiusNames, space, spaceNames } from '../src/space';
import {
  LINE_HEIGHT_FLOOR,
  face,
  lineHeightsNobodyHasDecided,
  typeRoleNames,
  typeScale,
} from '../src/type';

const repositoryRoot = resolve(__dirname, '..', '..', '..');

/**
 * Reaching for a role, as against writing its name. A quoted name is code asking for the role, a
 * name followed by a colon is a key in a configuration or a style sheet, and the three prefixes are
 * the classes markup draws with. Prose that records the retirement names the role too, and that is
 * the opposite of a reach, so the forms are named rather than the characters.
 */
function reachesFor(role: string, contents: string): boolean {
  return [
    `'${role}'`,
    `"${role}"`,
    `${role}:`,
    `text-${role}`,
    `font-${role}`,
    `size-${role}`,
  ].some((form) => contents.includes(form));
}

/**
 * Reaching for a spacing step, as against writing its name. The token package writes a step in
 * camel case and a style sheet writes it in kebab case, so both spellings are read. A step always
 * follows a hyphen in a class, because Tailwind writes the property first, and it always follows a
 * dot when code reads it off the scale. Prose that records the retirement writes the name inside
 * backticks, which is the opposite of a reach, so the forms are named rather than the characters.
 */
function reachesForStep(step: string, contents: string): boolean {
  const kebab = step.replace(/[A-Z]/g, (capital) => `-${capital.toLowerCase()}`);

  return [
    `'${step}'`,
    `"${step}"`,
    `space.${step}`,
    `'${kebab}'`,
    `"${kebab}"`,
    `${kebab}:`,
    `-${kebab}`,
  ].some((form) => contents.includes(form));
}

/**
 * The export under `docs/design/prototype` is the design tool's own output, and the markup of three
 * of its screens reaches for `text-data-md`. A configuration that stopped naming the role would draw
 * that text at whatever the browser defaults to, so the export keeps the name, its own check reads
 * the two sides against each other, and `tools/pipeline/prototype.ts` records the difference property
 * by property. Those two files and this one name the role in order to hold it out, and a mention
 * inside a backtick reads the same as a class to the forms above, so they are named here.
 *
 * The same four files are the only ones allowed to name a retired spacing step, for the same
 * reason: the markup of the export reaches for `px-gutter-lg`.
 */
function mayReachForIt(file: string): boolean {
  return (
    file.startsWith('docs/design/prototype/') ||
    file === 'tools/pipeline/prototype.ts' ||
    file === 'tools/pipeline/prototype.test.ts' ||
    file === 'packages/tokens/tests/tokens.test.ts'
  );
}

/** Every file a reach can be written in, which is the tracked text of the repository. */
function readableFiles(): string[] {
  return trackedFiles().filter(
    (file) => readable.includes(extname(file)) && file !== 'package-lock.json',
  );
}

/** Where a reach can be written. A picture holds no class and no key, so it is not read. */
const readable = ['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.md', '.html', '.css', '.yml'];

function trackedFiles(): string[] {
  const listed = spawnSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  });

  expect(listed.status).toBe(0);

  return listed.stdout.split('\n').filter((line) => line.length > 0);
}

describe('the colour set', () => {
  it('holds the colours the design system names and no more', () => {
    expect(colourNames).toHaveLength(40);
    expect(Object.keys(colours)).toHaveLength(40);
  });

  it('writes every value in upper case hex, so two spellings of one colour cannot appear', () => {
    const wrong = colourNames.filter((name) => !/^#[0-9A-F]{6}([0-9A-F]{2})?$/.test(colour[name]));

    expect(wrong).toEqual([]);
  });

  it('gives every colour at least one role', () => {
    const roleless = colourNames.filter((name) => colours[name].roles.length === 0);

    expect(roleless).toEqual([]);
  });

  it('keeps the flat map and the registry saying the same thing', () => {
    const disagreed = colourNames.filter((name) => colour[name] !== colours[name].value);

    expect(disagreed).toEqual([]);
  });

  it('gives each phase a fill and an ink of its own, so a phase is never a button', () => {
    const fills = phaseNames.map((phase) => phasePalette[phase].fill);
    const inks = phaseNames.map((phase) => phasePalette[phase].ink);

    expect(fills).toEqual(['period', 'follicular', 'ovulation', 'luteal']);
    expect(inks).toEqual(['periodInk', 'follicularInk', 'ovulationInk', 'lutealInk']);
    expect(fills.filter((fill) => hasRole(fill, 'text'))).toEqual([]);
    expect(inks.filter((ink) => !hasRole(ink, 'text'))).toEqual([]);
  });

  it('gives no other role of the palette to a phase, which is the drift this answers', () => {
    const phaseColours = [
      ...phaseNames.map((phase) => phasePalette[phase].fill),
      ...phaseNames.map((phase) => phasePalette[phase].ink),
    ];
    const shared = phaseColours.filter((name) =>
      ['accent', 'accent', 'field', 'accentTile'].includes(name),
    );

    expect(shared).toEqual([]);
  });
});

describe('the type scale', () => {
  it('holds the thirteen roles the design system names', () => {
    expect(typeRoleNames).toHaveLength(13);
    expect(Object.keys(typeScale)).toHaveLength(13);
  });

  it('holds the size and the line height of each role', () => {
    expect(
      typeRoleNames.map((name) => `${name} ${typeScale[name].size}/${typeScale[name].lineHeight}`),
    ).toEqual([
      'display-lg 50/60',
      'display-lg-mobile 34/42',
      'headline-lg 28/34',
      'headline-md 22/28',
      'headline-sm 18/24',
      'body-lg 16/24',
      'body-sm 14/20',
      'button-lg 16/22',
      'button-md 15/21',
      'label-md 13/18',
      'label-sm 11/15',
      'data-lg 24/30',
      'data-sm 12/16',
    ]);
  });

  it('keeps every line height at or above the floor, with nothing left undecided', () => {
    const cramped = typeRoleNames
      .filter((name) => typeScale[name].lineHeight < typeScale[name].size * LINE_HEIGHT_FLOOR)
      .map((name) => `${name} is ${typeScale[name].lineHeight} on ${typeScale[name].size}`);

    expect(typeRoleNames).toHaveLength(13);
    expect(cramped).toEqual([]);
    expect(lineHeightsNobodyHasDecided).toEqual([]);
  });

  // The display face and the text face are one family at different weights, so the two names stay
  // and every call site that reads a face keeps reading the same one.
  it('names three faces across two families, and gives each role one of them', () => {
    expect(Object.values(face)).toEqual(['Figtree', 'Figtree', 'JetBrains Mono']);
    expect([...new Set(typeRoleNames.map((name) => typeScale[name].face))]).toEqual([
      'display',
      'text',
      'data',
    ]);
  });

  it('names a family for every face, and ships the words and the figures apart', () => {
    const families = Object.values(faceFamily);

    expect(families).toHaveLength(Object.keys(face).length);
    expect(new Set(families).size).toBe(2);
    expect(faceFamily.data).not.toBe(faceFamily.text);
  });

  it('ships a cut of the family each face names, which can be narrower than the name', () => {
    // A shipped family can carry a narrower name than the document uses, as an optical cut does, so
    // the shipped name opens with the name the document uses rather than repeating it.
    const cuts = Object.entries(face).map(([faceName, family]) => {
      const shipped = fonts[faceFamily[faceName as keyof typeof face]].family;

      return shipped.startsWith(family) ? '' : `${faceName} names ${family} and ships ${shipped}`;
    });

    expect(cuts.filter((said) => said.length > 0)).toEqual([]);
    expect(Object.values(faceFamily).map((name) => fonts[name].family)).toEqual([
      'Figtree',
      'Figtree',
      'JetBrains Mono',
    ]);
  });

  it('gives one face the headings, one the words and the monospace the numbers', () => {
    const byFace = (name: string) => typeRoleNames.filter((role) => typeScale[role].face === name);

    expect(byFace('display')).toEqual([
      'display-lg',
      'display-lg-mobile',
      'headline-lg',
      'headline-md',
      'headline-sm',
    ]);
    expect(byFace('text')).toEqual([
      'body-lg',
      'body-sm',
      'button-lg',
      'button-md',
      'label-md',
      'label-sm',
    ]);
    expect(byFace('data')).toEqual(['data-lg', 'data-sm']);
  });

  it('carries the weight of each role, so no call site chooses one', () => {
    expect(typeRoleNames.map((name) => typeScale[name].weight)).toEqual([
      800, 800, 800, 800, 800, 400, 400, 700, 700, 700, 600, 500, 500,
    ]);
  });

  it('tracks the headlines and the figures tighter, and the labels wider, in em', () => {
    const tighter = typeRoleNames.filter((name) => typeScale[name].letterSpacingEm < 0);
    const wider = typeRoleNames.filter((name) => typeScale[name].letterSpacingEm > 0);

    expect(tighter).toEqual([
      'display-lg',
      'display-lg-mobile',
      'headline-lg',
      'headline-md',
      'data-lg',
    ]);
    expect(wider).toEqual(['label-sm', 'data-sm']);
  });
});

describe('the data-md role, which retired because no screen drew it', () => {
  it('leaves the name out of the scale, so nothing can reach for it', () => {
    expect(typeRoleNames).not.toContain('data-md');
    expect(Object.keys(typeScale)).not.toContain('data-md');
    expect(typeRoleNames.filter((name) => typeScale[name].face === 'data')).toEqual([
      'data-lg',
      'data-sm',
    ]);
  });

  it('is reached for by no file the repository tracks, apart from the export that draws it', () => {
    const files = readableFiles();

    expect(files.length).toBeGreaterThan(100);

    const reaching = files.filter((file) =>
      reachesFor('data-md', readFileSync(join(repositoryRoot, file), 'utf8')),
    );

    expect(reaching).not.toEqual([]);
    expect(reaching.filter((file) => !mayReachForIt(file))).toEqual([]);
  });

  it('reads a reach as a quoted name, a key or a class, and a record of the retirement as neither', () => {
    expect(reachesFor('data-md', "textStyle('data-md')")).toBe(true);
    expect(reachesFor('data-md', '"data-md":["1rem"]')).toBe(true);
    expect(reachesFor('data-md', '  data-md:\n    fontSize: 1rem')).toBe(true);
    expect(reachesFor('data-md', '<div class="text-data-md">')).toBe(true);
    expect(reachesFor('data-md', '.size-data-md { font-size: 16px; }')).toBe(true);
    expect(reachesFor('data-md', 'the data-md role retired, and `data-md` is drawn nowhere')).toBe(
      false,
    );
  });
});

/** The three names this step retired, each of which held the value of a step that stays. */
const retiredSteps = ['gutter', 'gutterMd', 'gutterLg'];

describe('the three gutter steps, which retired because each repeated another step', () => {
  it.each(retiredSteps)('leaves %s out of the scale, so nothing can reach for it', (step) => {
    expect(spaceNames).not.toContain(step);
    expect(Object.keys(space)).not.toContain(step);
  });

  it.each(retiredSteps)('is reached for by no file the repository tracks: %s', (step) => {
    const files = readableFiles();

    expect(files.length).toBeGreaterThan(100);

    const reaching = files.filter((file) =>
      reachesForStep(step, readFileSync(join(repositoryRoot, file), 'utf8')),
    );

    expect(reaching).not.toEqual([]);
    expect(reaching.filter((file) => !mayReachForIt(file))).toEqual([]);
  });

  it('reads a reach as a quoted name, a key or a class, and a record of the retirement as neither', () => {
    expect(reachesForStep('gutter', 'space.gutter')).toBe(true);
    expect(reachesForStep('gutterMd', "step('gutterMd')")).toBe(true);
    expect(reachesForStep('gutterLg', '"gutter-lg":"2rem"')).toBe(true);
    expect(reachesForStep('gutterLg', '  gutter-lg: 2rem')).toBe(true);
    expect(reachesForStep('gutterLg', '<div class="px-gutter-lg">')).toBe(true);
    expect(reachesForStep('gutterMd', 'the `gutter-md` step retired into nothing')).toBe(false);
    expect(reachesForStep('gutter', 'a gutter each side of the calendar')).toBe(false);
  });
});

describe('the spacing', () => {
  it('puts every step on the four point grid', () => {
    const off = spaceNames.filter((name) => space[name] % 4 !== 0);

    expect(off).toEqual([]);
  });

  it('never falls, so a wider name is never a narrower gap', () => {
    const steps = spaceNames.map((name) => space[name]);

    expect(steps).toEqual([...steps].sort((one, other) => one - other));
  });

  it('gives every step a value of its own, so no two names are one gap', () => {
    expect(spaceNames).toHaveLength(8);
    expect(new Set(spaceNames.map((name) => space[name])).size).toBe(8);
  });

  it('holds the screen margin at 20 points, which is the padding every screen draws', () => {
    expect(space.margin).toBe(20);
    expect(space.margin).not.toBe(space.spaceLg);
  });

  it('holds the largest section gap at 24 points, with the two wider margins above it', () => {
    const largest = Math.max(...spaceNames.map((name) => space[name]));

    expect(space.spaceXl).toBe(24);
    expect(largest).toBe(space.marginLg);
    expect(spaceNames.filter((name) => space[name] > space.spaceXl)).toEqual([
      'marginMd',
      'marginLg',
    ]);
  });

  it('keeps the tap target at the accessible minimum', () => {
    expect(MINIMUM_TAP_TARGET).toBeGreaterThanOrEqual(44);
  });

  it('holds five steps of the rhythm and three margins, and nothing else', () => {
    const rhythm = spaceNames.filter((name) => name.startsWith('space'));
    const margins = spaceNames.filter((name) => name.startsWith('margin'));

    expect(rhythm).toEqual(['spaceXs', 'spaceSm', 'spaceMd', 'spaceLg', 'spaceXl']);
    expect(margins).toEqual(['margin', 'marginMd', 'marginLg']);
    expect(spaceNames.indexOf('margin')).toBeLessThan(spaceNames.indexOf('spaceXl'));
    expect(spaceNames).toHaveLength(rhythm.length + margins.length);
  });

  it('holds the seven corners the document names, rising to the capsule', () => {
    const corners = radiusNames.map((name) => radius[name]);

    expect(corners).toEqual([10, 12, 14, 16, 18, 28, 999]);
    expect(corners).toEqual([...corners].sort((one, other) => one - other));
  });
});
