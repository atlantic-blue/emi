import {
  CONTRAST_FLOOR,
  ColourName,
  colourNames,
  colours,
  contrastRatio,
  hasRole,
  relativeLuminance,
} from '../src/colour';
import { phaseNames, phasePalette } from '../src/ring';

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
    // The value of outline, which the document names and the floor refuses as text.
    const moved = { ...colours.onSurfaceVariant, value: colours.outline.value };
    const pairs = moved.textOn.map((ground) => ({
      text: 'onSurfaceVariant' as ColourName,
      ground,
      ratio: contrastRatio(moved.value, colours[ground].value),
    }));

    expect(pairs.filter((pair) => pair.ratio < CONTRAST_FLOOR).map(report)).toContain(
      'onSurfaceVariant on surface is 4.27 to 1',
    );
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

  it('holds the ratios the design system values measure, to two places', () => {
    const published = [
      measure('onSurface', 'surface'),
      measure('onSurfaceVariant', 'surface'),
      measure('onPrimaryFixedVariant', 'surface'),
      measure('onSecondaryContainer', 'surface'),
      measure('onTertiaryFixedVariant', 'surface'),
      measure('onPrimary', 'primary'),
    ];

    expect(published.map(report)).toEqual([
      'onSurface on surface is 16.26 to 1',
      'onSurfaceVariant on surface is 8.91 to 1',
      'onPrimaryFixedVariant on surface is 8.90 to 1',
      'onSecondaryContainer on surface is 7.85 to 1',
      'onTertiaryFixedVariant on surface is 8.94 to 1',
      'onPrimary on primary is 6.70 to 1',
    ]);
  });

  it('keeps outline off every ground, because it carries no word above the floor', () => {
    const refused = colourNames
      .filter((name) => hasRole(name, 'ground'))
      .map((ground) => measure('outline', ground))
      .filter((pair) => pair.ratio >= CONTRAST_FLOOR);

    expect(refused.map(report)).toEqual([]);
    expect(colours.outline.textOn).toEqual([]);
    expect(hasRole('outline', 'text')).toBe(false);
    expect(hasRole('outline', 'line')).toBe(true);
  });

  it('refuses every phase fill as text, whatever it measures, which is why each has an ink', () => {
    const fills = phaseNames.map((phase) => phasePalette[phase].fill);
    const fit = fills.filter(
      (fill) => contrastRatio(colours[fill].value, colours.surface.value) >= CONTRAST_FLOOR,
    );

    // Three of the four fail the floor outright. The fourth passes it and is refused anyway,
    // because contract SEE-2 covers every fill rather than the ones that measure badly.
    expect(fit).toEqual(['primary']);
    expect(fills.flatMap((fill) => colours[fill].textOn)).toEqual([]);
    expect(phaseNames.map((phase) => colours[phasePalette[phase].ink].textOn.length > 0)).toEqual([
      true,
      true,
      true,
      true,
    ]);
  });

  it('refuses a colour that carries transparency, because its ratio depends on what is behind it', () => {
    expect(() => relativeLuminance(`${colours.onSurface.value}1A`)).toThrow(
      'is not a six digit hex colour',
    );
  });

  it('agrees with the two ratios the guidelines themselves fix', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5);
  });
});
