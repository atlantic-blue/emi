import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Resvg } from '@resvg/resvg-js';

import { colour } from '../../packages/tokens/src/colour.ts';
import { colourFromHex, decodePng, inkBox, pixelAt } from '../icon/png.ts';
import { ICON_MARK_FILE, MARK_BOX, RING_RADIUS, RING_STROKE, iconMark } from '../logo/mark.ts';

const committed = readFileSync(join(__dirname, '..', 'logo', ICON_MARK_FILE), 'utf8');

const onEmber = (pixels: number) =>
  decodePng(
    new Resvg(
      iconMark().replace(
        /(<svg[^>]*>)/,
        `$1<rect width="${MARK_BOX}" height="${MARK_BOX}" fill="${colour.accent}"/>`,
      ),
      { fitTo: { mode: 'width', value: pixels } },
    )
      .render()
      .asPng(),
  );

describe('the icon mark is EMI inside the open ring, white on ember', () => {
  it('is the file the generator draws today', () => {
    expect(committed).toBe(iconMark());
  });

  it('names no font, because a reader without it would see another face', () => {
    expect(committed).not.toContain('font');
    expect(committed).not.toContain('<text');
  });

  it('draws the ring and the word in the white that carries text on ember', () => {
    expect(committed.match(/<path/g)).toHaveLength(2);
    expect(committed.match(/#[0-9A-Fa-f]{6}/g)).toEqual([colour.onAccent, colour.onAccent]);
  });

  it('spans the outer edge of the ring and nothing wider', () => {
    const image = onEmber(1000);
    const box = inkBox(image, colourFromHex(colour.accent));
    const outer = ((RING_RADIUS + RING_STROKE / 2) * 2 * 1000) / MARK_BOX;

    expect(box.width).toBeCloseTo(outer, -1);
    expect(box.height).toBeCloseTo(outer, -1);
  });

  it('leaves the gap open at the right, below three o clock, where an e opens', () => {
    const image = onEmber(1000);
    const ember = { ...colourFromHex(colour.accent), alpha: 255 };
    const white = { ...colourFromHex(colour.onAccent), alpha: 255 };
    const onTheRing = (degrees: number) => {
      const radians = (degrees * Math.PI) / 180;
      return pixelAt(
        image,
        Math.round(500 + RING_RADIUS * 10 * Math.cos(radians)),
        Math.round(500 + RING_RADIUS * 10 * Math.sin(radians)),
      );
    };

    expect(onTheRing(20)).toEqual(ember);
    expect(onTheRing(-20)).toEqual(white);
    expect(onTheRing(60)).toEqual(white);
    expect(onTheRing(180)).toEqual(white);
  });

  it('keeps the gap open at the smallest icon a store asks for', () => {
    const image = onEmber(40);
    const ember = colourFromHex(colour.accent);
    const radius = (RING_RADIUS * 40) / MARK_BOX;
    const middleOfTheGap = Math.PI / 9;
    const centre = pixelAt(
      image,
      Math.round(20 + radius * Math.cos(middleOfTheGap)),
      Math.round(20 + radius * Math.sin(middleOfTheGap)),
    );

    expect({ red: centre.red, green: centre.green, blue: centre.blue }).toEqual(ember);
  });
});
