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
import { washNames, washStops, washes } from '../src/wash';

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

  it('measures every pair the palette approves, and says how many', () => {
    expect(textNames).toHaveLength(15);
    expect(approved).toHaveLength(35);
  });

  it('names the token and the ratio when a colour is moved below the floor', () => {
    // The value of the quiet icon, which the document names and the floor refuses as text.
    const moved = { ...colours.secondaryText, value: colours.quietIcon.value };
    const pairs = moved.textOn.map((ground) => ({
      text: 'secondaryText' as ColourName,
      ground,
      ratio: contrastRatio(moved.value, colours[ground].value),
    }));

    expect(pairs.filter((pair) => pair.ratio < CONTRAST_FLOOR).map(report)).toContain(
      'secondaryText on ground is 2.39 to 1',
    );
  });

  it('names the phase and the ratio when an ink is written on its own fill', () => {
    // Three of the four inks sit under the floor on their own fill, and the period pair is the
    // furthest under it, because the period ink is the pressed accent on the accent itself. This is
    // the failure SEE-2 exists to make impossible.
    const onItsOwnFill = phaseNames.map((phase) =>
      measure(phasePalette[phase].ink, phasePalette[phase].fill),
    );

    expect(onItsOwnFill.filter((pair) => pair.ratio < CONTRAST_FLOOR).map(report)).toEqual([
      'periodInk on period is 1.51 to 1',
      'ovulationInk on ovulation is 3.16 to 1',
      'lutealInk on luteal is 2.48 to 1',
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
      measure('text', 'ground'),
      measure('secondaryText', 'ground'),
      measure('onAccent', 'accent'),
      measure('periodInk', 'ground'),
      measure('follicularInk', 'ground'),
      measure('ovulationInk', 'ground'),
      measure('lutealInk', 'ground'),
    ];

    expect(published.map(report)).toEqual([
      'text on ground is 14.57 to 1',
      'secondaryText on ground is 5.42 to 1',
      'onAccent on accent is 5.32 to 1',
      'periodInk on ground is 7.63 to 1',
      'follicularInk on ground is 14.57 to 1',
      'ovulationInk on ground is 6.49 to 1',
      'lutealInk on ground is 7.48 to 1',
    ]);
  });

  // The quiet icon points at a row and the disabled label names a control that cannot be pressed.
  // Neither carries a live word, and both sit under the floor on every surface Emi draws them on, so
  // neither is a text colour and neither is measured as one.
  it('keeps a line colour off every surface Emi draws it on, because it carries no word', () => {
    const drawnOn: ColourName[] = ['ground', 'card', 'field'];
    const lines: ColourName[] = ['quietIcon', 'disabledLabel'];
    const readable = lines.flatMap((name) =>
      drawnOn.map((ground) => measure(name, ground)).filter((pair) => pair.ratio >= CONTRAST_FLOOR),
    );

    expect(readable.map(report)).toEqual([]);
    for (const name of lines) {
      expect(colours[name].textOn).toEqual([]);
      expect(hasRole(name, 'text')).toBe(false);
      expect(hasRole(name, 'line')).toBe(true);
    }
  });

  // The period fill is the accent, which does carry white text where it is a button. As a phase fill
  // it carries nothing, which is the whole of SEE-2: the rule is about the role and not the value.
  it('refuses every phase fill as text, whatever the value would measure', () => {
    const fills = phaseNames.map((phase) => phasePalette[phase].fill);
    expect(fills.flatMap((fill) => colours[fill].textOn)).toEqual([]);
    expect(fills.filter((fill) => hasRole(fill, 'text'))).toEqual([]);
    expect(phaseNames.map((phase) => colours[phasePalette[phase].ink].textOn.length > 0)).toEqual([
      true,
      true,
      true,
      true,
    ]);
  });

  // A wash is four colours and a shape, so it has no ratio of its own: what a word drawn on it
  // would measure against depends on where on the screen that word sits. So the wash is kept out of
  // the measuring entirely, and the way that is enforced is that no colour it runs through carries a
  // word anywhere, on it or on anything else.
  it('never measures a wash, because a gradient has no one value to measure', () => {
    for (const name of washNames) {
      const stops = washStops(washes[name]);

      expect(stops).toHaveLength(4);
      expect(stops.filter((stop) => hasRole(stop, 'text'))).toEqual([]);
      expect(stops.flatMap((stop) => colours[stop].textOn)).toEqual([]);
      expect(new Set(stops.map((stop) => colours[stop].value)).size).toBeGreaterThan(1);
    }

    expect(approved.filter((pair) => washNames.some((name) => name === pair.text))).toEqual([]);
  });

  it('refuses a colour that carries transparency, because its ratio depends on what is behind it', () => {
    expect(() => relativeLuminance(`${colours.text.value}1A`)).toThrow(
      'is not a six digit hex colour',
    );
  });

  it('agrees with the two ratios the guidelines themselves fix', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5);
  });
});
