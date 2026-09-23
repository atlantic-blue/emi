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

describe('the colour set', () => {
  it('holds the colours the design system names and no more', () => {
    expect(colourNames).toHaveLength(55);
    expect(Object.keys(colours)).toHaveLength(55);
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
      ['primary', 'primaryContainer', 'secondaryContainer', 'tertiaryContainer'].includes(name),
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
      'display-lg 48/56',
      'display-lg-mobile 36/44',
      'headline-lg 32/40',
      'headline-md 24/32',
      'headline-sm 20/28',
      'body-lg 18/28',
      'body-md 16/24',
      'body-sm 14/20',
      'label-md 14/20',
      'label-sm 12/16',
      'data-lg 28/36',
      'data-md 16/24',
      'data-sm 12/16',
    ]);
  });

  it('keeps every line height at or above the floor, apart from the one nobody has decided', () => {
    const cramped = typeRoleNames
      .filter((name) => typeScale[name].lineHeight < typeScale[name].size * LINE_HEIGHT_FLOOR)
      .map((name) => `${name} is ${typeScale[name].lineHeight} on ${typeScale[name].size}`);

    expect(cramped).toEqual(['display-lg is 56 on 48']);
    expect(lineHeightsNobodyHasDecided).toEqual(['display-lg']);
  });

  it('names three faces, and gives each role one of them', () => {
    expect(Object.values(face)).toEqual(['Newsreader', 'Plus Jakarta Sans', 'JetBrains Mono']);
    expect([...new Set(typeRoleNames.map((name) => typeScale[name].face))]).toEqual([
      'display',
      'text',
      'data',
    ]);
  });

  it('draws every face in a family of its own, so no two jobs share a file', () => {
    const families = Object.values(faceFamily);

    expect(new Set(families).size).toBe(families.length);
    expect(families).toHaveLength(Object.keys(face).length);
  });

  it('ships a cut of the family each face names, which can be narrower than the name', () => {
    // The design system names Newsreader and the repository ships one optical cut of it, so the
    // shipped name opens with the name the document uses rather than repeating it.
    const cuts = Object.entries(face).map(([faceName, family]) => {
      const shipped = fonts[faceFamily[faceName as keyof typeof face]].family;

      return shipped.startsWith(family) ? '' : `${faceName} names ${family} and ships ${shipped}`;
    });

    expect(cuts.filter((said) => said.length > 0)).toEqual([]);
    expect(Object.values(faceFamily).map((name) => fonts[name].family)).toEqual([
      'Newsreader 16pt',
      'Plus Jakarta Sans',
      'JetBrains Mono',
    ]);
  });

  it('gives the serif the headings, the sans the words and the monospace the numbers', () => {
    const byFace = (name: string) => typeRoleNames.filter((role) => typeScale[role].face === name);

    expect(byFace('display')).toEqual([
      'display-lg',
      'display-lg-mobile',
      'headline-lg',
      'headline-md',
      'headline-sm',
    ]);
    expect(byFace('text')).toEqual(['body-lg', 'body-md', 'body-sm', 'label-md', 'label-sm']);
    expect(byFace('data')).toEqual(['data-lg', 'data-md', 'data-sm']);
  });

  it('carries the weight of each role, so no call site chooses one', () => {
    expect(typeRoleNames.map((name) => typeScale[name].weight)).toEqual([
      400, 400, 400, 500, 500, 400, 400, 400, 600, 600, 500, 400, 500,
    ]);
  });

  it('tracks the headlines and the figures tighter, and the labels wider, in em', () => {
    const tighter = typeRoleNames.filter((name) => typeScale[name].letterSpacingEm < 0);
    const wider = typeRoleNames.filter((name) => typeScale[name].letterSpacingEm > 0);

    expect(tighter).toEqual([
      'display-lg',
      'display-lg-mobile',
      'headline-lg',
      'data-lg',
      'data-md',
    ]);
    expect(wider).toEqual(['label-md', 'label-sm', 'data-sm']);
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

  it('names one gap three times, because the page gutter, the margin and the rhythm agree on it', () => {
    expect(space.gutter).toBe(space.spaceMd);
    expect(space.margin).toBe(space.spaceMd);
    expect(space.gutterMd).toBe(space.spaceLg);
    expect(space.gutterLg).toBe(space.marginMd);
    expect(new Set(spaceNames.map((name) => space[name])).size).toBe(7);
  });

  it('keeps the tap target at the accessible minimum', () => {
    expect(MINIMUM_TAP_TARGET).toBeGreaterThanOrEqual(44);
  });

  it('holds the six corners the document names, rising to the capsule', () => {
    const corners = radiusNames.map((name) => radius[name]);

    expect(corners).toEqual([4, 8, 12, 16, 24, 9999]);
    expect(corners).toEqual([...corners].sort((one, other) => one - other));
  });
});
