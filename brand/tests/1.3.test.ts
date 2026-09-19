import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { colour } from '../../packages/tokens/src/colour.ts';
import {
  drawings,
  flatten,
  GAP_BEARING_DEGREES,
  GAP_DEGREES,
  lockup,
  ring,
  ringAlone,
  stemWidth,
  wordmark,
  type Drawing,
  type Point,
} from '../logo/geometry.ts';
import { DOT, letters, STEM_TOP } from '../logo/letters.ts';
import { coverageAt, groundReaches, INK, picture, rasterise } from './raster.ts';

const logoDirectory = join(__dirname, '..', 'logo');

/** The three sizes the mark is proved at, in points, smallest first. */
const SIZES = [16, 64, 512];

/** A drawing rarely lands on whole pixels, so every size is proved on and off the grid. */
const ALIGNMENTS = [0, 0.5];

function shift(drawing: Drawing, across: number, down: number, heightInPixels: number): Drawing {
  const units = drawing.height / heightInPixels;
  const move = (point: Point): Point => ({
    x: point.x + across * units,
    y: point.y + down * units,
  });
  return {
    ...drawing,
    contours: drawing.contours.map((contour) => contour.map(move)),
    ring: {
      ...drawing.ring,
      centreX: drawing.ring.centreX + across * units,
      centreY: drawing.ring.centreY + down * units,
    },
  };
}

function holePixel(drawing: Drawing, heightInPixels: number): { column: number; row: number } {
  const scale = heightInPixels / drawing.height;
  return {
    column: Math.round(drawing.ring.centreX * scale),
    row: Math.round(drawing.ring.centreY * scale),
  };
}

/**
 * The narrowest run of ground between the two ends of the arc, which is the chord across the
 * gap at the inner edge of the stroke. Under one pixel, no pixel can come out as ground.
 */
function channelInPixels(drawing: Drawing, heightInPixels: number): number {
  const chord =
    2 * drawing.ring.innerRadius * Math.sin((drawing.ring.gapDegrees / 2) * (Math.PI / 180));
  return chord * (heightInPixels / drawing.height);
}

function everyAlignmentLetsTheGroundThrough(drawing: Drawing, heightInPixels: number): boolean {
  return ALIGNMENTS.every((across) =>
    ALIGNMENTS.every((down) => {
      const moved = shift(drawing, across, down, heightInPixels);
      return groundReaches(rasterise(moved, heightInPixels), holePixel(moved, heightInPixels));
    }),
  );
}

describe('the ring gap survives the smallest rendering', () => {
  describe('the gap stays open at every size the mark is drawn', () => {
    it.each(SIZES)('lets the ground through into the hole at %i points', (size) => {
      const drawing = wordmark();
      const reached = everyAlignmentLetsTheGroundThrough(drawing, size);

      if (!reached) {
        throw new Error(
          `the gap closed at ${size} points, and this is what it drew:\n${picture(
            rasterise(drawing, size),
          )}`,
        );
      }
      expect(reached).toBe(true);
    });

    it.each(SIZES)('keeps a whole pixel of ground in the channel at %i points', (size) => {
      expect(channelInPixels(wordmark(), size)).toBeGreaterThanOrEqual(1);
    });

    it('closes when the gap is narrowed until the channel is thinner than a pixel', () => {
      const narrowed = wordmark(20);

      expect(channelInPixels(narrowed, 16)).toBeLessThan(1);
    });

    it('closes altogether when there is no gap', () => {
      const closed = wordmark(0);

      expect(everyAlignmentLetsTheGroundThrough(closed, 16)).toBe(false);
      expect(everyAlignmentLetsTheGroundThrough(closed, 512)).toBe(false);
    });

    it('holds the gap the design drew, at the bearing the design drew it', () => {
      expect(GAP_DEGREES).toBe(40);
      expect(GAP_BEARING_DEGREES).toBe(135);
    });
  });

  describe('the ring opens where the eye is meant to carry on', () => {
    it('leaves the ground reaching the hole from the upper left and nowhere else', () => {
      const drawing = wordmark();
      const size = 512;
      const raster = rasterise(drawing, size);
      const scale = size / drawing.height;
      const centre = { x: drawing.ring.centreX * scale, y: drawing.ring.centreY * scale };
      const radius = drawing.ring.radius * scale;

      const inkAt = (degrees: number): number => {
        const radians = (degrees * Math.PI) / 180;
        return coverageAt(
          raster,
          Math.round(centre.x + radius * Math.cos(radians)),
          Math.round(centre.y + radius * Math.sin(radians)),
        );
      };

      // The y axis runs down in a drawing, so the upper left of the ring is minus 135 degrees.
      expect(inkAt(-135)).toBeLessThan(INK);
      expect(inkAt(-45)).toBeGreaterThan(INK);
      expect(inkAt(45)).toBeGreaterThan(INK);
      expect(inkAt(135)).toBeGreaterThan(INK);
    });
  });

  describe('the ring is the dot of the i, grown and opened', () => {
    it('strokes the ring as thick as the stem it grew out of', () => {
      const size = 512;
      const drawing = wordmark();
      const raster = rasterise(drawing, size);
      const scale = size / drawing.height;

      const runAcross = (row: number, from: number, to: number): number => {
        let ink = 0;
        for (let column = from; column <= to; column++) {
          if (coverageAt(raster, column, row) >= INK) ink += 1;
        }
        return ink;
      };

      const stemMiddle = Math.round(
        (drawing.ring.centreY + drawing.ring.outerRadius) * scale + 200,
      );
      const stemRun = runAcross(
        stemMiddle,
        Math.round((DOT.centreX - 200) * scale),
        Math.round((DOT.centreX + 200) * scale),
      );
      const ringBottom = Math.round(drawing.ring.centreY * scale);
      const ringRun = runAcross(
        ringBottom,
        Math.round((drawing.ring.centreX - drawing.ring.outerRadius) * scale),
        Math.round((drawing.ring.centreX - drawing.ring.innerRadius) * scale),
      );

      expect(stemRun).toBeGreaterThan(0);
      expect(Math.abs(ringRun - stemRun)).toBeLessThanOrEqual(1);
    });

    it('measures the stem between the serifs rather than across them', () => {
      expect(stemWidth()).toBeCloseTo(181, 5);
      expect(ring().stroke).toBe(stemWidth());
    });

    it('takes the place the dot had, one stroke of air above the stem', () => {
      const subject = ring();

      expect(subject.centreX).toBe(DOT.centreX);
      expect(subject.centreY - subject.outerRadius).toBeCloseTo(STEM_TOP + subject.stroke, 5);
    });

    it('draws no dot, because the ring is the dot', () => {
      const i = letters.find((letter) => letter.character === 'i');

      expect(i?.contours).toHaveLength(1);
      expect(wordmark().svg).not.toContain('circle');
    });

    it('holds a hole wider than the stroke around it, so it reads as a ring', () => {
      const subject = ring();

      expect(subject.innerRadius * 2).toBeGreaterThan(subject.stroke * 2);
    });
  });

  describe('the three files carry what the generator draws', () => {
    it.each(drawings.map((drawing) => drawing.file))('%s is what is drawn today', (file) => {
      const drawing = drawings.find((candidate) => candidate.file === file);

      expect(readFileSync(join(logoDirectory, file), 'utf8')).toBe(drawing?.draw().svg);
    });

    it('names no font, because a reader without it would see another face', () => {
      for (const drawing of drawings) {
        expect(drawing.draw().svg).not.toContain('font');
        expect(drawing.draw().svg).not.toContain('<text');
      }
    });

    it('draws the letters and the ring and nothing else in the wordmark', () => {
      const svg = wordmark().svg;

      expect(svg.match(/<path/g)).toHaveLength(2);
      expect(svg).not.toContain('<rect');
    });

    it('takes its colours from the token package', () => {
      expect(wordmark().svg).toContain(colour.primary);
      expect(lockup().svg).toContain(colour.surfaceContainerLowest);
      expect(ringAlone().svg).toContain(colour.primary);
    });

    it('fits every drawing inside the box it declares', () => {
      for (const drawing of drawings) {
        const drawn = drawing.draw();
        const points = drawn.contours.flat();

        expect(Math.min(...points.map((point) => point.x))).toBeGreaterThanOrEqual(-0.01);
        expect(Math.min(...points.map((point) => point.y))).toBeGreaterThanOrEqual(-0.01);
        expect(Math.max(...points.map((point) => point.x))).toBeLessThanOrEqual(drawn.width + 0.01);
        expect(Math.max(...points.map((point) => point.y))).toBeLessThanOrEqual(
          drawn.height + 0.01,
        );
      }
    });

    it('squares the ring on its own, so an icon can sit it in the middle', () => {
      const alone = ringAlone();

      expect(alone.width).toBe(alone.height);
      expect(alone.width).toBeCloseTo(ring().outerRadius * 2, 5);
    });

    it('gives the lockup two strokes of air on all four sides', () => {
      const air = ring().stroke * 2;
      const inner = wordmark();
      const outer = lockup();

      expect(outer.width - inner.width).toBeCloseTo(air * 2, 5);
      expect(outer.height - inner.height).toBeCloseTo(air * 2, 5);
    });
  });

  describe('the letters are outlines, not a font the reader may not have', () => {
    it('carries the three letters of the word and no more', () => {
      expect(letters.map((letter) => letter.character)).toEqual(['e', 'm', 'i']);
    });

    it('keeps every outline closed, so a fill has an inside', () => {
      for (const letter of letters) {
        for (const contour of letter.contours) {
          expect(contour[contour.length - 1]).toEqual({ type: 'Z' });
          expect(flatten(contour).length).toBeGreaterThan(3);
        }
      }
    });
  });
});
