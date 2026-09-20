import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { colour } from '../../packages/tokens/src/colour';

import {
  configuredIn,
  describedIn,
  designSystemDocument,
  disagreements,
  footRoomIn,
  footStepsIn,
  prototypeDirectory,
  radiiNobodyHasDecided,
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

/**
 * The token package writes a colour in capitals and the prototype writes it in lower case, so a
 * value read out of the tokens is put into the spelling the page uses before it is compared.
 */
const asWritten = (value: string): string => value.toLowerCase();

const root = resolve(__dirname, '..', '..');
const screen = readFileSync(join(root, prototypeDirectory, sourceScreen), 'utf8');
const document = readFileSync(join(root, designSystemDocument), 'utf8');

const prototype = configuredIn(screen);
const described = describedIn(document);

const colourNames = Object.keys(prototype.colours);
const spacingNames = Object.keys(prototype.spacing);
const roleNames = Object.keys(prototype.type);

describe('the design system says what the prototype draws', () => {
  it('reads both sides, so an empty read is not taken for agreement', () => {
    expect(colourNames).toHaveLength(47);
    expect(spacingNames).toHaveLength(7);
    expect(roleNames).toHaveLength(11);
    expect(prototype.colours['primary']).toBe(asWritten(colour.primary));
    expect(described.colours['primary']).toBe(asWritten(colour.primary));
    expect(prototype.type['headline-xl']?.fontSize).toBe('36px');
  });

  it('names the same colours, the same spacing steps and the same type roles', () => {
    expect(Object.keys(described.colours).sort()).toEqual([...colourNames].sort());
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
    expect(disagreements(prototype, described)).toEqual([...radiiNobodyHasDecided]);
  });
});

describe('the corners the two sides do not agree about', () => {
  it('keeps the disagreement written out, so the fix reddens this too', () => {
    expect(radiiNobodyHasDecided.length).toBeGreaterThan(0);
    expect(radiiNobodyHasDecided.every((said) => said.startsWith('radius '))).toBe(true);
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
    const [said] = disagreements(prototype, moved('colours', 'primary', asWritten(colour.error)));

    expect(said).toBe(
      `colour primary: the prototype says ${asWritten(colour.primary)} and the design system says ${asWritten(colour.error)}`,
    );
  });

  it('says which spacing step moved', () => {
    expect(disagreements(prototype, moved('spacing', 'margin', '1rem'))).toContain(
      'spacing margin: the prototype says 1.25rem and the design system says 1rem',
    );
  });

  it('reads a type role property by property, so a tracking change is not lost inside a role', () => {
    const roles = {
      ...described.type,
      'body-lg': { ...described.type['body-lg'], letterSpacing: '0em' },
    } as Theme['type'];

    expect(disagreements(prototype, { ...described, type: roles })).toContain(
      'body-lg letterSpacing: the prototype says -0.005em and the design system says 0em',
    );
  });

  it('counts a name only one side holds, so a deleted colour is not silence', () => {
    const { primary: _dropped, ...rest } = described.colours;

    expect(disagreements(prototype, { ...described, colours: rest })).toContain(
      `colour primary: the prototype says ${asWritten(colour.primary)} and the design system says nothing`,
    );
  });
});

describe('the prototype in the repository', () => {
  const held = readdirSync(join(root, prototypeDirectory)).sort();

  it('holds five screens, each with a picture beside it', () => {
    const markup = held.filter((file) => file.endsWith('.html'));

    expect(markup).toHaveLength(5);
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
  const held = readdirSync(join(root, prototypeDirectory))
    .sort()
    .filter((file) => file.endsWith('.html'));

  it('is read off the content element rather than typed anywhere', () => {
    expect(footStepsIn('<main class="flex-1 pt-16 pb-28 px-margin">')).toBe(28);
  });

  it('reads the class it is written in and not one that merely contains it', () => {
    expect(footStepsIn('<main class="pb-2 pt-16">')).toBe(2);
    expect(footStepsIn('<main class="lg:pb-40 pb-8">')).toBe(8);
  });

  it('turns the step into points at the size a rem is drawn', () => {
    expect(footRoomIn('<main class="pb-28">', 16)).toBe(112);
    expect(footRoomIn('<main class="pb-28">', 10)).toBe(70);
  });

  it('refuses a screen whose content element reserves nothing', () => {
    expect(() => footStepsIn('<main class="flex-1 pt-16">')).toThrow(
      'reserves no room at its foot',
    );
  });

  it('refuses a screen with no content element at all, rather than reading it as none', () => {
    expect(() => footStepsIn('<html></html>')).toThrow('carries no main element');
  });

  it('is the same room on every screen of the prototype, so one of them speaks for the set', () => {
    const reserved = held.map((file) =>
      footStepsIn(readFileSync(join(root, prototypeDirectory, file), 'utf8')),
    );

    expect(reserved).toHaveLength(5);
    expect(new Set(reserved).size).toBe(1);
  });
});
