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

  it('measures something, so an empty set of pairs is not read as a pass', () => {
    expect(approved.length).toBeGreaterThan(50);
    expect(textNames.length).toBeGreaterThan(20);
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

  it('names the phase and the ratio when an ink is written on its own fill', () => {
    // Three of the four inks sit under the floor on their own fill, and the luteal pair is the
    // furthest under it. This is the failure SEE-2 exists to make impossible.
    const onItsOwnFill = phaseNames.map((phase) =>
      measure(phasePalette[phase].ink, phasePalette[phase].fill),
    );

    expect(onItsOwnFill.filter((pair) => pair.ratio < CONTRAST_FLOOR).map(report)).toEqual([
      'periodInk on period is 4.24 to 1',
      'ovulationInk on ovulation is 4.13 to 1',
      'lutealInk on luteal is 3.47 to 1',
    ]);
    expect(onItsOwnFill.map((pair) => pair.ground)).toEqual([
      'period',
      'follicular',
      'ovulation',
      'luteal',
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

  it('holds the ratios the design system values measure, to two places', () => {
    const published = [
      measure('onSurface', 'background'),
      measure('onSurfaceVariant', 'background'),
      measure('onPrimary', 'primaryContainer'),
      measure('periodInk', 'background'),
      measure('follicularInk', 'background'),
      measure('ovulationInk', 'background'),
      measure('lutealInk', 'background'),
    ];

    expect(published.map(report)).toEqual([
      'onSurface on background is 16.27 to 1',
      'onSurfaceVariant on background is 8.92 to 1',
      'onPrimary on primaryContainer is 5.96 to 1',
      'periodInk on background is 11.94 to 1',
      'follicularInk on background is 9.48 to 1',
      'ovulationInk on background is 9.95 to 1',
      'lutealInk on background is 11.21 to 1',
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

  it('refuses every phase fill as text, and not one of the four could carry a word anyway', () => {
    const fills = phaseNames.map((phase) => phasePalette[phase].fill);
    const fit = fills.filter(
      (fill) => contrastRatio(colours[fill].value, colours.surface.value) >= CONTRAST_FLOOR,
    );

    expect(fit).toEqual([]);
    expect(fills.flatMap((fill) => colours[fill].textOn)).toEqual([]);
    expect(fills.filter((fill) => hasRole(fill, 'text'))).toEqual([]);
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
