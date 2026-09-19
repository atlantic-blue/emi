import { colour, colourNames, colours, hasRole } from '../src/colour';
import { phaseNames, phasePalette } from '../src/ring';
import { MINIMUM_TAP_TARGET, radius, radiusNames, space, spaceNames } from '../src/space';
import { LINE_HEIGHT_FLOOR, face, typeRoleNames, typeScale } from '../src/type';

describe('the colour set', () => {
  it('holds the colours the design system names and no more', () => {
    expect(colourNames).toHaveLength(47);
    expect(Object.keys(colours)).toHaveLength(47);
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

  it('pairs every phase with a fill and an ink, and neither one carries the other job', () => {
    const fills = phaseNames.map((phase) => phasePalette[phase].fill);
    const inks = phaseNames.map((phase) => phasePalette[phase].ink);

    expect(fills).toEqual([
      'primaryContainer',
      'secondaryContainer',
      'primary',
      'tertiaryContainer',
    ]);
    expect(inks).toEqual([
      'onPrimaryFixedVariant',
      'onSecondaryContainer',
      'onPrimaryFixedVariant',
      'onTertiaryFixedVariant',
    ]);
    expect(fills.filter((fill) => hasRole(fill, 'text'))).toEqual([]);
    expect(inks.filter((ink) => !hasRole(ink, 'text'))).toEqual([]);
  });
});

describe('the type scale', () => {
  it('holds the eleven roles the design system names', () => {
    expect(typeRoleNames).toHaveLength(11);
    expect(Object.keys(typeScale)).toHaveLength(11);
  });

  it('holds the size and the line height of each role', () => {
    expect(
      typeRoleNames.map((name) => `${name} ${typeScale[name].size}/${typeScale[name].lineHeight}`),
    ).toEqual([
      'headline-xl 36/44',
      'headline-xl-mobile 30/38',
      'headline-lg 26/34',
      'headline-md 20/28',
      'headline-sm 18/24',
      'body-lg 17/26',
      'body-md 15/22',
      'body-sm 13/18',
      'label-lg 15/20',
      'label-md 13/16',
      'label-sm 11/14',
    ]);
  });

  it('keeps every line height at or above the floor, naming any that is not', () => {
    const cramped = typeRoleNames
      .filter((name) => typeScale[name].lineHeight < typeScale[name].size * LINE_HEIGHT_FLOOR)
      .map((name) => `${name} is ${typeScale[name].lineHeight} on ${typeScale[name].size}`);

    expect(cramped).toEqual([]);
  });

  it('names one face, and every role takes it', () => {
    expect(Object.values(face)).toEqual(['Plus Jakarta Sans']);
    expect([...new Set(typeRoleNames.map((name) => typeScale[name].face))]).toEqual(['text']);
  });

  it('carries the weight of each role, so no call site chooses one', () => {
    expect(typeRoleNames.map((name) => typeScale[name].weight)).toEqual([
      700, 700, 600, 600, 600, 400, 400, 400, 600, 600, 600,
    ]);
  });

  it('tracks the headlines tighter and the labels wider, in em', () => {
    const tighter = typeRoleNames.filter((name) => typeScale[name].letterSpacingEm < 0);
    const wider = typeRoleNames.filter((name) => typeScale[name].letterSpacingEm > 0);

    expect(tighter).toEqual([
      'headline-xl',
      'headline-xl-mobile',
      'headline-lg',
      'headline-md',
      'headline-sm',
      'body-lg',
    ]);
    expect(wider).toEqual(['label-lg', 'label-md', 'label-sm']);
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

  it('names one gap twice, because the document names the page gutter and the rhythm apart', () => {
    expect(space.gutter).toBe(space.spaceMd);
    expect(new Set(spaceNames.map((name) => space[name])).size).toBe(spaceNames.length - 1);
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
