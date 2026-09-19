import { ColourName, colour, colourNames, colours, hasRole } from '../src/colour';
import { MINIMUM_TAP_TARGET, radius, space, spaceNames } from '../src/space';
import { LINE_HEIGHT_FLOOR, face, typeRoleNames, typeScale } from '../src/type';

const publishedColours: readonly (readonly [ColourName, string])[] = [
  ['stone', '#F7F3EE'],
  ['surface', '#FFFCF8'],
  ['sunk', '#F1EBE4'],
  ['ink', '#241F1C'],
  ['body', '#5C534E'],
  ['muted', '#756A64'],
  ['hairline', '#241F1C1A'],
  ['ember', '#A8452C'],
  ['emberPressed', '#8E3823'],
  ['emberTint', '#F6E7E1'],
  ['period', '#E05A4E'],
  ['follicular', '#E0913A'],
  ['ovulation', '#2E8C93'],
  ['luteal', '#7A5B8C'],
  ['periodInk', '#B03A32'],
  ['follicularInk', '#8A5416'],
  ['ovulationInk', '#1F6B71'],
  ['lutealInk', '#5E4470'],
];

describe('the colour set', () => {
  it('holds eighteen colours and no more', () => {
    expect(colourNames).toHaveLength(18);
    expect(Object.keys(colours)).toHaveLength(18);
  });

  it('holds the value the design publishes for each one', () => {
    expect(colourNames.map((name) => [name, colour[name]])).toEqual(
      publishedColours.map(([name, value]) => [name, value]),
    );
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

  it('carries the four phase fills and their four ink partners', () => {
    expect(colourNames.filter((name) => hasRole(name, 'fill'))).toEqual([
      'ember',
      'emberPressed',
      'period',
      'follicular',
      'ovulation',
      'luteal',
    ]);
    expect(['periodInk', 'follicularInk', 'ovulationInk', 'lutealInk']).toEqual(
      colourNames.filter((name) => name.endsWith('Ink')),
    );
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

  it('puts every step above the tightest on the eight point grid', () => {
    const off = spaceNames.filter((name) => space[name] > 8 && space[name] % 8 !== 0);

    expect(off).toEqual([]);
  });

  it('rises, so two names cannot mean the same gap', () => {
    const steps = spaceNames.map((name) => space[name]);

    expect(steps).toEqual([...steps].sort((one, other) => one - other));
    expect(new Set(steps).size).toBe(steps.length);
  });

  it('keeps the tap target at the accessible minimum', () => {
    expect(MINIMUM_TAP_TARGET).toBeGreaterThanOrEqual(44);
  });

  it('draws an icon corner at the radius the icon grid uses', () => {
    expect(radius.icon).toBe(2);
  });
});
