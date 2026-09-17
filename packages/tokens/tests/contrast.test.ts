import {
  CONTRAST_FLOOR,
  ColourName,
  colourNames,
  colours,
  contrastRatio,
  hasRole,
  relativeLuminance,
} from '../src/colour';

interface Pair {
  readonly text: ColourName;
  readonly ground: ColourName;
  readonly ratio: number;
}

const textNames = colourNames.filter((name) => hasRole(name, 'text'));

function measure(text: ColourName, ground: ColourName): Pair {
  return { text, ground, ratio: contrastRatio(colours[text].value, colours[ground].value) };
}

const approved: readonly Pair[] = textNames.flatMap((text) =>
  colours[text].textOn.map((ground) => measure(text, ground)),
);

function report(pair: Pair): string {
  return `${pair.text} on ${pair.ground} is ${pair.ratio.toFixed(2)} to 1`;
}

describe('a colour that fails the contrast floor cannot be added', () => {
  it('measures every approved pair at or above the floor, naming any that is not', () => {
    const failed = approved.filter((pair) => pair.ratio < CONTRAST_FLOOR);

    expect(failed.map(report)).toEqual([]);
  });

  it('names the token and the ratio when a colour is moved below the floor', () => {
    const moved = { ...colours.muted, value: '#7A6F69' };
    const pairs = moved.textOn.map((ground) => ({
      text: 'muted' as ColourName,
      ground,
      ratio: contrastRatio(moved.value, colours[ground].value),
    }));

    expect(pairs.filter((pair) => pair.ratio < CONTRAST_FLOOR).map(report)).toEqual([
      'muted on stone is 4.42 to 1',
    ]);
  });

  it('gives every text colour at least one ground to be measured against', () => {
    const unmeasured = textNames.filter((name) => colours[name].textOn.length === 0);

    expect(unmeasured).toEqual([]);
  });

  it('only ever measures a text colour against a ground', () => {
    const notGrounds = approved
      .filter((pair) => !hasRole(pair.ground, 'ground'))
      .map((pair) => `${pair.text} names ${pair.ground}, which is not a ground`);

    expect(notGrounds).toEqual([]);
  });

  it('holds the ratios the design publishes, to two places', () => {
    const published = [
      measure('ink', 'stone'),
      measure('body', 'stone'),
      measure('muted', 'stone'),
      measure('ember', 'stone'),
      measure('periodInk', 'stone'),
      measure('follicularInk', 'stone'),
      measure('ovulationInk', 'stone'),
      measure('lutealInk', 'stone'),
      measure('surface', 'ember'),
    ];

    expect(published.map(report)).toEqual([
      'ink on stone is 14.76 to 1',
      'body on stone is 6.78 to 1',
      'muted on stone is 4.75 to 1',
      'ember on stone is 5.35 to 1',
      'periodInk on stone is 5.44 to 1',
      'follicularInk on stone is 5.66 to 1',
      'ovulationInk on stone is 5.59 to 1',
      'lutealInk on stone is 7.49 to 1',
      'surface on ember is 5.78 to 1',
    ]);
  });

  it('keeps muted off the two grounds it cannot carry', () => {
    const refused = [measure('muted', 'sunk'), measure('muted', 'emberTint')];

    expect(refused.every((pair) => pair.ratio < CONTRAST_FLOOR)).toBe(true);
    expect(refused.map(report)).toEqual([
      'muted on sunk is 4.43 to 1',
      'muted on emberTint is 4.36 to 1',
    ]);
    expect(colours.muted.textOn).toEqual(['stone', 'surface']);
  });

  it('measures a phase fill as unfit for text, which is why each one has an ink partner', () => {
    const fills: readonly ColourName[] = ['period', 'follicular', 'ovulation', 'luteal'];
    const unfit = fills.filter(
      (fill) => contrastRatio(colours[fill].value, colours.stone.value) < CONTRAST_FLOOR,
    );

    expect(unfit).toEqual(['period', 'follicular', 'ovulation']);
    expect(fills.flatMap((fill) => colours[fill].textOn)).toEqual([]);
  });

  it('refuses a colour that carries transparency, because its ratio depends on what is behind it', () => {
    expect(() => relativeLuminance(colours.hairline.value)).toThrow(
      'is not a six digit hex colour',
    );
  });

  it('agrees with the two ratios the guidelines themselves fix', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5);
  });
});
