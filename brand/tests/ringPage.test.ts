import { colour } from '../../packages/tokens/src/colour.ts';
import { faceFamily, fontFile } from '../../packages/tokens/src/font.ts';
import {
  DAYS_AHEAD_STRENGTH,
  FULL_TURN_DEGREES,
  RING_DIAMETER,
  RING_TRACK_WIDTH,
  arcPath,
  coveredDegrees,
  phasePalette,
  ringGeometry,
} from '../../packages/tokens/src/ring.ts';
import { arcsOf, drawnRings, ringDocument } from '../ring/ringPage.tsx';

const centre = { x: RING_DIAMETER / 2, y: RING_DIAMETER / 2 };
const trackRadius = (RING_DIAMETER - RING_TRACK_WIDTH) / 2;
const page = ringDocument('file:///fonts/');

describe('the picture of the ring', () => {
  it('draws the three cycle lengths the step is proved at', () => {
    expect(drawnRings.map((ring) => ring.cycleLengthDays)).toEqual([21, 28, 45]);

    for (const ring of drawnRings) {
      const days = ring.phases.reduce((total, phase) => total + phase.days, 0);

      expect(days).toBe(ring.cycleLengthDays);
      expect(ring.day).toBeLessThanOrEqual(ring.cycleLengthDays);
    }
  });

  it('draws each arc where the geometry puts it, which is where the phone draws it too', () => {
    // A round end is painted half the width of the track past the point the path stops at, so
    // every stroke is pulled in by that much at each end and the ground between two phases is
    // the gap the geometry names. A stroke with no room for two round ends keeps square ones.
    const end = ((RING_TRACK_WIDTH / 2 / trackRadius) * FULL_TURN_DEGREES) / (2 * Math.PI);
    const pulledIn = (startDegrees: number, sweepDegrees: number) =>
      sweepDegrees <= end * 2
        ? { d: arcPath(centre, trackRadius, startDegrees, sweepDegrees), roundEnds: false }
        : {
            d: arcPath(centre, trackRadius, startDegrees + end, sweepDegrees - end * 2),
            roundEnds: true,
          };

    for (const ring of drawnRings) {
      const geometry = ringGeometry(ring);
      const expected = geometry.arcs.flatMap((arc) => {
        const stroke = colour[phasePalette[arc.phase].fill];
        const ahead = arc.sweepDegrees - arc.elapsedDegrees;

        return [
          // The days ahead are painted across the whole phase and the days she lived over them,
          // so the two never meet as two round ends in the middle of a phase.
          ahead > 0
            ? {
                ...pulledIn(arc.startDegrees, arc.sweepDegrees),
                stroke,
                opacity: DAYS_AHEAD_STRENGTH,
              }
            : undefined,
          arc.elapsedDegrees > 0
            ? { ...pulledIn(arc.startDegrees, arc.elapsedDegrees), stroke, opacity: 1 }
            : undefined,
        ].filter((drawn) => drawn !== undefined);
      });

      expect(arcsOf(geometry)).toEqual(expected);
      expect(coveredDegrees(geometry)).toBeCloseTo(FULL_TURN_DEGREES, 9);
    }
  });

  it('paints a round end on every arc long enough to carry two of them', () => {
    const painted = drawnRings.flatMap((ring) => arcsOf(ringGeometry(ring)));

    expect(painted.length).toBeGreaterThan(8);
    expect(painted.filter((arc) => arc.roundEnds)).not.toHaveLength(0);
    expect(page).toContain('stroke-linecap="round"');
  });

  it('writes one drawing for each ring, with the day and the phase inside it', () => {
    expect(page.match(/<svg /g)).toHaveLength(drawnRings.length);
    expect(page.match(/<circle /g)).toHaveLength(drawnRings.length);

    for (const ring of drawnRings) {
      expect(page).toContain(
        `<div class="day face-${fontFile(faceFamily.data, 'medium').name}">${ring.day}</div>`,
      );
      expect(page).toContain(ring.title);
    }
  });

  it('writes every arc of every ring as a path of the track width', () => {
    const paths = page.match(/<path /g) ?? [];
    const drawn = drawnRings.reduce((total, ring) => total + arcsOf(ringGeometry(ring)).length, 0);

    expect(paths).toHaveLength(drawn);
    expect(page.match(new RegExp(`stroke-width="${RING_TRACK_WIDTH}"`, 'g'))).toHaveLength(drawn);
  });
});
