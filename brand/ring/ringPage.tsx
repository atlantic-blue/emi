/** @jsxImportSource ../jsx */
import {
  BEAD_HALO_WIDTH,
  BEAD_RADIUS,
  DAYS_AHEAD_STRENGTH,
  FontWeightName,
  PhaseSpan,
  RING_DIAMETER,
  RING_TRACK_WIDTH,
  RingGeometry,
  arcPath,
  DRAWN_FAMILY,
  colour,
  fontWeightNames,
  fonts,
  phaseLabel,
  phasePalette,
  pointOnRing,
  ringGeometry,
  typeScale,
} from '@emi/tokens';

import { Html, raw } from '../jsx/jsx-runtime';

/**
 * The ring of design section 9.5, drawn at three cycle lengths so the arcs can be seen taking
 * their size from the days rather than from a quarter each.
 *
 * The drawing comes from `ringGeometry` and `arcPath` in the token package, which is what the
 * component on the phone draws with, and a test asserts the component's own paths are these.
 */

export const ringPage = { width: 1240, height: 560 } as const;

export interface DrawnRing {
  readonly title: string;
  readonly note: string;
  readonly cycleLengthDays: number;
  readonly day: number;
  readonly phases: readonly PhaseSpan[];
}

/** Her days, not a textbook's. The middle one is the length the first run offers by default. */
export const drawnRings: readonly DrawnRing[] = [
  {
    title: 'A short cycle, 21 days',
    note: 'Day 3, still bleeding. Four bleeding days, and no room for a follicular phase.',
    cycleLengthDays: 21,
    day: 3,
    phases: [
      { phase: 'period', days: 4 },
      { phase: 'follicular', days: 0 },
      { phase: 'ovulation', days: 5 },
      { phase: 'luteal', days: 12 },
    ],
  },
  {
    title: 'A usual cycle, 28 days',
    note: 'Day 14. Five bleeding days, then seven, seven and nine.',
    cycleLengthDays: 28,
    day: 14,
    phases: [
      { phase: 'period', days: 5 },
      { phase: 'follicular', days: 7 },
      { phase: 'ovulation', days: 7 },
      { phase: 'luteal', days: 9 },
    ],
  },
  {
    title: 'A long cycle, 45 days',
    note: 'Day 40. Twenty follicular days, which is where the extra length goes.',
    cycleLengthDays: 45,
    day: 40,
    phases: [
      { phase: 'period', days: 6 },
      { phase: 'follicular', days: 20 },
      { phase: 'ovulation', days: 7 },
      { phase: 'luteal', days: 12 },
    ],
  },
];

const centre = { x: RING_DIAMETER / 2, y: RING_DIAMETER / 2 };
const trackRadius = (RING_DIAMETER - RING_TRACK_WIDTH) / 2;

export interface DrawnArc {
  readonly d: string;
  readonly stroke: string;
  readonly opacity: number;
}

/** The arcs of one ring, in the order they are drawn: the days ahead, then the days she has had. */
export function arcsOf(geometry: RingGeometry): DrawnArc[] {
  const drawn: DrawnArc[] = [];

  for (const arc of geometry.arcs) {
    const stroke = colour[phasePalette[arc.phase].fill];
    const ahead = arc.sweepDegrees - arc.elapsedDegrees;

    if (ahead > 0) {
      drawn.push({
        d: arcPath(centre, trackRadius, arc.startDegrees + arc.elapsedDegrees, ahead),
        stroke,
        opacity: DAYS_AHEAD_STRENGTH,
      });
    }
    if (arc.elapsedDegrees > 0) {
      drawn.push({
        d: arcPath(centre, trackRadius, arc.startDegrees, arc.elapsedDegrees),
        stroke,
        opacity: 1,
      });
    }
  }

  return drawn;
}

function faceClass(weight: FontWeightName): string {
  return `face-${weight}`;
}

function fontRules(fontsBase: string): string {
  return fontWeightNames
    .map((weight) => {
      const file = fonts[DRAWN_FAMILY].files[weight];

      return [
        '@font-face {',
        `  font-family: "${file.name}";`,
        `  src: url("${fontsBase}${file.path}") format("truetype");`,
        '}',
        `.${faceClass(weight)} { font-family: "${file.name}"; }`,
      ].join('\n');
    })
    .join('\n');
}

function styleSheet(fontsBase: string): string {
  return [
    fontRules(fontsBase),
    `body {
  background: ${colour.stone};
  color: ${colour.ink};
  margin: 0;
  padding: 48px 56px;
  width: ${ringPage.width - 112}px;
  height: ${ringPage.height - 96}px;
  box-sizing: border-box;
}`,
    `.rings { display: flex; gap: 40px; margin-top: 28px; }`,
    `.ring { width: ${RING_DIAMETER}px; }`,
    `.drawing { position: relative; height: ${RING_DIAMETER}px; }`,
    `.middle {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}`,
    `.day { font-size: ${typeScale['headline-xl'].size}px; line-height: ${typeScale['headline-xl'].lineHeight}px; }`,
    `.phase { font-size: ${typeScale['headline-md'].size}px; line-height: ${typeScale['headline-md'].lineHeight}px; }`,
    `.title { font-size: ${typeScale['body-sm'].size}px; line-height: ${typeScale['body-sm'].lineHeight}px; margin-top: 12px; }`,
    `.note { color: ${colour.muted}; font-size: ${typeScale['body-sm'].size}px; line-height: ${typeScale['body-sm'].lineHeight}px; }`,
    `.heading { font-size: ${typeScale['headline-lg'].size}px; line-height: ${typeScale['headline-lg'].lineHeight}px; }`,
    `.standfirst { color: ${colour.body}; font-size: ${typeScale['body-sm'].size}px; line-height: ${typeScale['body-sm'].lineHeight}px; }`,
  ].join('\n');
}

function Ring({ ring }: { ring: DrawnRing }): Html {
  const geometry = ringGeometry(ring);
  const bead = pointOnRing(centre, trackRadius, geometry.beadDegrees);

  return (
    <div class="ring">
      <div class="drawing">
        <svg width={RING_DIAMETER} height={RING_DIAMETER}>
          {arcsOf(geometry).map((arc) => (
            <path
              d={arc.d}
              fill="none"
              opacity={arc.opacity}
              stroke={arc.stroke}
              stroke-width={RING_TRACK_WIDTH}
            />
          ))}
          <circle
            cx={bead.x}
            cy={bead.y}
            fill={colour.ember}
            r={BEAD_RADIUS}
            stroke={colour.stone}
            stroke-width={BEAD_HALO_WIDTH}
          />
        </svg>
        <div class="middle">
          <div class={`day ${faceClass('regular')}`}>{ring.day}</div>
          <div
            class={`phase ${faceClass('regular')}`}
            style={`color: ${colour[phasePalette[geometry.phase].ink]}`}
          >
            {phaseLabel[geometry.phase]}
          </div>
        </div>
      </div>
      <div class={`title ${faceClass('semiBold')}`}>{ring.title}</div>
      <div class={`note ${faceClass('regular')}`}>{ring.note}</div>
    </div>
  );
}

export function RingSheet({ fontsBase }: { fontsBase: string }): Html {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Emi cycle ring</title>
        <style>{raw(styleSheet(fontsBase))}</style>
      </head>
      <body class={faceClass('regular')}>
        <div class={`heading ${faceClass('semiBold')}`}>The ring, at three lengths</div>
        <div class="standfirst">
          Each arc is sized by the days of that phase. Three degrees of ground sit at every
          boundary, the days she has had are solid and the days ahead are at a fifth, and the ember
          bead is today.
        </div>
        <div class="rings">
          {drawnRings.map((ring) => (
            <Ring ring={ring} />
          ))}
        </div>
      </body>
    </html>
  );
}

export function ringDocument(fontsBase: string): string {
  return `<!doctype html>${RingSheet({ fontsBase }).html}`;
}
