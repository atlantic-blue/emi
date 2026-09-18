import { Resvg } from '@resvg/resvg-js';

import { colour } from '../../../packages/tokens/src/colour';
import {
  ADAPTIVE_VISIBLE_FRACTION,
  CANVAS,
  OPTICAL_RISE_OF_WIDTH,
  RING_FRACTION_OF_WIDTH,
  RingSourceError,
  composeIcon,
  placementFor,
  readRingSource,
  ringOnly,
} from '../compose';
import { colourFromHex, decodePng, inkBox, pixelAt } from '../png';
import { appleIcons, googleIcons, iconFiles } from '../sizes';

const square = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="20" y="30" width="40" height="20" fill="${colour.ember}"/></svg>`;

function render(svg: string, pixels: number) {
  return decodePng(new Resvg(svg, { fitTo: { mode: 'width', value: pixels } }).render().asPng());
}

describe('the ring source is read, never guessed at', () => {
  it('reads the box and the drawing out of the file', () => {
    const ring = readRingSource(square);

    expect({ ...ring, inner: ring.inner.length > 0 }).toEqual({
      minX: 0,
      minY: 0,
      width: 100,
      height: 100,
      inner: true,
    });
  });

  it('reads a box that does not start at the origin', () => {
    const shifted = square.replace('viewBox="0 0 100 100"', 'viewBox="-8 -4 64 32"');

    expect(readRingSource(shifted)).toMatchObject({ minX: -8, minY: -4, width: 64, height: 32 });
  });

  it('refuses a file with no svg element in it', () => {
    expect(() => readRingSource('<html></html>')).toThrow(RingSourceError);
  });

  it('refuses a box that is not four numbers, naming what it read', () => {
    expect(() => readRingSource(square.replace('0 0 100 100', '0 0 100'))).toThrow('"0 0 100"');
  });

  it('refuses a box with no area', () => {
    expect(() => readRingSource(square.replace('0 0 100 100', '0 0 100 0'))).toThrow('no area');
  });
});

describe('the mark is placed by the design, not by the file it came from', () => {
  it('takes its numbers from the design, so a drawing cannot move them', () => {
    expect(RING_FRACTION_OF_WIDTH).toBe(0.56);
    expect(OPTICAL_RISE_OF_WIDTH).toBe(0.02);
    expect(ADAPTIVE_VISIBLE_FRACTION).toBeCloseTo(0.6667, 4);
  });

  it('gives the icon 56 percent of the width, raised above the centre', () => {
    expect(placementFor('icon')).toEqual({
      size: RING_FRACTION_OF_WIDTH * CANVAS,
      centreX: CANVAS / 2,
      centreY: CANVAS / 2 - OPTICAL_RISE_OF_WIDTH * CANVAS,
    });
  });

  it('shrinks the adaptive foreground to the square the launcher shows', () => {
    const adaptive = placementFor('adaptiveForeground');

    expect(adaptive.size).toBeCloseTo(RING_FRACTION_OF_WIDTH * ADAPTIVE_VISIBLE_FRACTION * CANVAS);
    expect(adaptive.centreY).toBeGreaterThan(placementFor('icon').centreY);
  });

  it('scales the drawing by its ink, so padding in the source cannot shrink the mark', () => {
    const ring = readRingSource(square);
    const ink = { left: 20, top: 30, width: 40, height: 20 };
    const icon = render(composeIcon(ring, 'icon', ink, colour.stone), 1000);
    const box = inkBox(icon, colourFromHex(colour.stone));

    expect(box.width / icon.width).toBeCloseTo(RING_FRACTION_OF_WIDTH, 2);
  });

  it('leaves the adaptive background empty of any mark', () => {
    const ring = readRingSource(square);
    const background = composeIcon(
      ring,
      'adaptiveBackground',
      { left: 0, top: 0, width: 1, height: 1 },
      colour.stone,
    );

    expect(background).not.toContain('<g ');
    expect(background).toContain(
      `<rect width="${CANVAS}" height="${CANVAS}" fill="${colour.stone}"/>`,
    );
  });

  it('leaves the adaptive foreground without a ground', () => {
    const ring = readRingSource(square);
    const foreground = composeIcon(
      ring,
      'adaptiveForeground',
      { left: 0, top: 0, width: 1, height: 1 },
      colour.stone,
    );

    expect(foreground).not.toContain(`fill="${colour.stone}"`);
    expect(foreground).toContain('<g ');
  });

  it('renders the source on its own for measuring, with its box kept', () => {
    expect(ringOnly(readRingSource(square))).toContain('viewBox="0 0 100 100"');
  });
});

describe('the image reader measures what is really there', () => {
  it('finds the drawing inside a bigger picture', () => {
    const image = render(square, 100);
    const box = inkBox(image, colourFromHex(colour.stone));

    expect(box).toEqual({ left: 20, top: 30, width: 40, height: 20 });
  });

  it('finds the same drawing by its transparency when there is no ground', () => {
    const image = render(square.replace(/<svg([^>]*)>/, '<svg$1>'), 100);

    expect(inkBox(image, 'nothing')).toEqual({ left: 20, top: 30, width: 40, height: 20 });
  });

  it('reads back the colour that was drawn', () => {
    const image = render(square, 100);

    expect(pixelAt(image, 40, 40)).toEqual({ ...colourFromHex(colour.ember), alpha: 255 });
  });

  it('refuses a picture with nothing on it', () => {
    const empty = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="${colour.stone}"/></svg>`;

    expect(() => inkBox(render(empty, 10), colourFromHex(colour.stone))).toThrow('no ink at all');
  });
});

describe('the lists the stores publish', () => {
  it('names every file once', () => {
    const names = iconFiles.map((file) => file.name);

    expect(new Set(names).size).toBe(names.length);
  });

  it('asks for a reason for every size', () => {
    expect(iconFiles.filter((file) => file.asks.length === 0)).toEqual([]);
  });

  it('holds the sizes the iPhone asset catalogue asks for', () => {
    expect(appleIcons.map((file) => file.pixels)).toEqual([40, 58, 60, 80, 87, 120, 180, 1024]);
  });

  it('holds the launcher, the adaptive pair and the listing that Google asks for', () => {
    expect(
      googleIcons.filter((file) => file.artwork === 'icon').map((file) => file.pixels),
    ).toEqual([48, 72, 96, 144, 192, 512]);
    expect(
      googleIcons
        .filter((file) => file.artwork === 'adaptiveForeground')
        .map((file) => file.pixels),
    ).toEqual([108, 162, 216, 324, 432]);
    expect(
      googleIcons
        .filter((file) => file.artwork === 'adaptiveBackground')
        .map((file) => file.pixels),
    ).toEqual([108, 162, 216, 324, 432]);
  });
});
