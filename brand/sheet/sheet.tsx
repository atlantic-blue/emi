/** @jsxImportSource ../jsx */
import {
  BEAD_HALO_WIDTH,
  BEAD_RADIUS,
  type ColourName,
  DRAWN_FAMILY,
  FontWeightName,
  type Icon,
  type IconName,
  RING_DIAMETER,
  RING_TRACK_WIDTH,
  type TypeRoleName,
  colour,
  letterSpacingOf,
  fontWeightNames,
  fonts,
  fontsRoot,
  iconNames,
  icons,
  phaseLabel,
  phasePalette,
  pointOnRing,
  ringGeometry,
  typeScale,
  typeRoleNames,
} from '@emi/tokens';

import {
  type BrandSources,
  type Pair,
  approvedPairs,
  fillPairs,
  inkPartnerOf,
  report,
  shippedSources,
} from '../../tools/brand/generateBrandDocument.ts';
import { type Piece, drawingOf, pieces } from '../illustration/pieces.ts';
import { Html, raw } from '../jsx/jsx-runtime';
import { type DrawnRing, arcsOf, drawnRings } from '../ring/ringPage.tsx';
import { specimenSentences } from '../specimen/specimen.tsx';

import {
  APPLICATION_ICON_SIZE,
  type MarkName,
  OPTICAL_RISE,
  RING_SHARE_OF_ICON,
  type SheetAssets,
  markNames,
} from './assets.ts';

/**
 * One page carrying the whole brand: the mark, the icon, every colour with the ratio somebody
 * measured it at, the type scale, the ring, the icon set and the three illustrations.
 *
 * Every value on it is read from the token package and every drawing is read from the file the
 * application ships, so the page cannot say one thing while the product does another. The markup
 * is committed beside the picture and the pipeline writes it again, which is what catches a token
 * that moved after the picture was taken.
 */

export const sheetPath = 'brand/sheet/brand-sheet.html';

export const picturePath = 'brand/sheet/brand-sheet.png';

export const generateCommand = 'npm run generate:sheet';

export const checkCommand = 'npm run check:sheet';

/** A fixed page, so a picture of it is the whole sheet and never a viewport that cut the end off. */
export const sheetPage = { width: 1600, height: 3204 } as const;

const PAGE_PADDING = 80;

/** The three sizes each mark is shown at. The smallest is the size the gap has to survive. */
export const markSizes: readonly number[] = [128, 64, 16];

/** How large the icon is drawn on the page. The source is a square of the size beside it. */
export const ICON_SHOWN_AT = 256;

/** A colour that carries transparency has no ratio of its own, and the page says so rather than
 * printing a number nobody can stand behind. */
export const TRANSPARENT_NOTE = 'carries transparency, so the ground under it decides the ratio';

export interface SheetSources {
  readonly brand: BrandSources;
  readonly assets: SheetAssets;
  readonly rings: readonly DrawnRing[];
  readonly sentences: Readonly<Record<TypeRoleName, string>>;
  readonly iconSet: Readonly<Record<IconName, Icon>>;
  readonly iconOrder: readonly IconName[];
  readonly illustrations: readonly Piece[];
  /** Where the fonts are, relative to the committed page, so every machine writes the same file. */
  readonly fontsBase: string;
}

export const relativeFontsBase = `../../${fontsRoot}/`;

export function sheetSources(assets: SheetAssets): SheetSources {
  return {
    brand: shippedSources,
    assets,
    rings: drawnRings,
    sentences: specimenSentences,
    iconSet: icons,
    iconOrder: iconNames,
    illustrations: pieces,
    fontsBase: relativeFontsBase,
  };
}

const SIX_DIGIT_HEX = /^#[0-9A-F]{6}$/;

function ratio(pair: Pair): string {
  return `${pair.ratio.toFixed(2)} to 1`;
}

/**
 * What is printed beside one swatch. A text colour prints the grounds it was approved on. A ground
 * prints the text it carries. A fill prints its own ratio and the partner that carries the text
 * instead. Every line is measured by the same function the contrast test refuses a colour with.
 */
export function measurementsFor(sources: BrandSources, name: ColourName): readonly string[] {
  if (!SIX_DIGIT_HEX.test(sources.palette[name].value)) {
    return [TRANSPARENT_NOTE];
  }

  const approved = approvedPairs(sources);
  const lines = approved.filter((pair) => pair.text === name).map(report);
  const carried = approved.filter((pair) => pair.ground === name);

  if (carried.length === 1) {
    lines.push(report(carried[0] as Pair));
  }
  if (carried.length > 1) {
    const sorted = [...carried].sort((one, other) => one.ratio - other.ratio);
    const lowest = sorted[0] as Pair;
    const highest = sorted[sorted.length - 1] as Pair;

    lines.push(
      `carries ${carried.length} text colours, from ${lowest.text} at ${ratio(lowest)} to ${highest.text} at ${ratio(highest)}`,
    );
  }

  const fill = fillPairs(sources).find((pair) => pair.text === name);
  const partner = inkPartnerOf(sources, name);

  if (fill !== undefined && partner !== null) {
    lines.push(`${report(fill)}, so ${partner} carries the text`);
  }

  return lines;
}

export function faceClass(weight: FontWeightName): string {
  return `face-${weight}`;
}

export function sizeClass(role: TypeRoleName): string {
  return `size-${role}`;
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

function sizeRules(): string {
  return typeRoleNames
    .map((role) => {
      const style = typeScale[role];
      const tracking = letterSpacingOf(style.size, style.letterSpacingEm);

      return `.${sizeClass(role)} { font-size: ${style.size}px; line-height: ${style.lineHeight}px; letter-spacing: ${tracking}px; }`;
    })
    .join('\n');
}

function markRules(): string {
  return markSizes
    .map((size) => `.mark-${size} svg { display: block; height: ${size}px; width: auto; }`)
    .join('\n');
}

function styleSheet(fontsBase: string): string {
  return [
    fontRules(fontsBase),
    sizeRules(),
    markRules(),
    `body {
  background: ${colour.stone};
  color: ${colour.ink};
  margin: 0;
  padding: ${PAGE_PADDING}px;
  width: ${sheetPage.width}px;
  height: ${sheetPage.height}px;
  box-sizing: border-box;
}`,
    `.standfirst { color: ${colour.body}; max-width: 780px; margin-top: 8px; }`,
    `.stamp { color: ${colour.muted}; }`,
    `.head { display: flex; align-items: flex-end; justify-content: space-between; gap: 40px; }`,
    `.section { border-top: 1px solid ${colour.hairline}; margin-top: 44px; padding-top: 20px; }`,
    `.section-head { display: flex; align-items: baseline; gap: 20px; margin-bottom: 20px; }`,
    `.section-note { color: ${colour.muted}; }`,
    `.marks { display: flex; gap: 32px; }`,
    `.mark-card {
  background: ${colour.surface};
  border: 1px solid ${colour.hairline};
  border-radius: 16px;
  padding: 24px;
  width: 296px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}`,
    `.mark-name { margin-bottom: 16px; }`,
    `.mark-row { display: flex; align-items: flex-end; gap: 20px; height: 136px; }`,
    `.mark-small { display: flex; align-items: flex-end; gap: 20px; margin-top: 16px; }`,
    `.mark-label { color: ${colour.muted}; margin-top: 12px; }`,
    `.mark-row + .mark-small { margin-top: auto; }`,
    `.icon-card { width: 360px; }`,
    `.icon-shown svg { display: block; width: ${ICON_SHOWN_AT}px; height: ${ICON_SHOWN_AT}px; }`,
    `.swatches { display: flex; flex-wrap: wrap; gap: 20px; }`,
    `.swatch {
  width: 440px;
  display: flex;
  gap: 20px;
  align-items: flex-start;
}`,
    `.chip {
  width: 96px;
  height: 96px;
  border-radius: 12px;
  border: 1px solid ${colour.hairline};
  flex: none;
}`,
    `.swatch-name { display: flex; align-items: baseline; gap: 12px; }`,
    `.roles { color: ${colour.muted}; margin-bottom: 6px; }`,
    `.measured { color: ${colour.body}; }`,
    `.type-row { display: flex; align-items: baseline; gap: 28px; margin-bottom: 10px; }`,
    `.type-label { color: ${colour.muted}; width: 260px; flex: none; }`,
    `.rings { display: flex; gap: 56px; }`,
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
    `.ring-note { color: ${colour.muted}; margin-top: 6px; }`,
    `.icon-grid { display: flex; flex-wrap: wrap; gap: 16px 24px; }`,
    `.icon-cell {
  width: 116px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}`,
    `.icon-name { color: ${colour.muted}; }`,
    `.pieces { display: flex; gap: 40px; }`,
    `.piece-says { color: ${colour.muted}; margin-top: 10px; width: 320px; }`,
    `.foot { color: ${colour.muted}; margin-top: 44px; }`,
  ].join('\n');
}

function Label({ children }: { children: Html | string }): Html {
  return <div class={`${faceClass('regular')} ${sizeClass('label-sm')}`}>{children}</div>;
}

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note: string;
  children: Html | readonly Html[];
}): Html {
  return (
    <div class="section">
      <div class="section-head">
        <div class={`${faceClass('semiBold')} ${sizeClass('headline-lg')}`}>{title}</div>
        <div class={`section-note ${faceClass('regular')} ${sizeClass('body-sm')}`}>{note}</div>
      </div>
      {children}
    </div>
  );
}

function Mark({ name, drawing }: { name: MarkName; drawing: string }): Html {
  const [largest, middle, smallest] = markSizes as [number, number, number];

  return (
    <div class="mark-card">
      <div class={`mark-name ${faceClass('semiBold')} ${sizeClass('body-sm')}`}>{name}</div>
      <div class="mark-row">
        <div class={`mark-${largest}`}>{raw(drawing)}</div>
      </div>
      <div class="mark-small">
        <div class={`mark-${middle}`}>{raw(drawing)}</div>
        <div class={`mark-${smallest}`}>{raw(drawing)}</div>
      </div>
      <div class={`mark-label ${faceClass('regular')} ${sizeClass('label-sm')}`}>
        {markSizes.join(', ')} points
      </div>
    </div>
  );
}

function ApplicationIcon({ drawing }: { drawing: string }): Html {
  const share = `${Math.round(RING_SHARE_OF_ICON * 100)} percent`;
  const rise = `${(OPTICAL_RISE * 100).toFixed(1)} percent`;

  return (
    <div class="mark-card icon-card">
      <div class={`mark-name ${faceClass('semiBold')} ${sizeClass('body-sm')}`}>
        application icon
      </div>
      <div class="icon-shown">{raw(drawing)}</div>
      <div class={`mark-label ${faceClass('regular')} ${sizeClass('label-sm')}`}>
        {`${APPLICATION_ICON_SIZE} point square, shown at ${ICON_SHOWN_AT}`}
      </div>
      <div class={`mark-label ${faceClass('regular')} ${sizeClass('body-sm')}`}>
        {`The ring alone, at ${share} of the width, sitting ${rise} above the middle so it reads as centred.`}
      </div>
    </div>
  );
}

function Swatch({ sources, name }: { sources: BrandSources; name: ColourName }): Html {
  const token = sources.palette[name];

  return (
    <div class="swatch">
      <div class="chip" style={`background: ${token.value}`}></div>
      <div>
        <div class="swatch-name">
          <div class={`${faceClass('semiBold')} ${sizeClass('body-lg')}`}>{name}</div>
          <div class={`${faceClass('regular')} ${sizeClass('label-sm')}`}>{token.value}</div>
        </div>
        <div class={`roles ${faceClass('regular')} ${sizeClass('body-sm')}`}>
          {token.roles.join(', ')}
        </div>
        {measurementsFor(sources, name).map((line) => (
          <div class={`measured ${faceClass('regular')} ${sizeClass('label-sm')}`}>{line}</div>
        ))}
      </div>
    </div>
  );
}

function TypeRow({ sources, role }: { sources: SheetSources; role: TypeRoleName }): Html {
  const style = sources.brand.scale[role];
  const weight: FontWeightName = style.weight === 400 ? 'regular' : 'semiBold';

  return (
    <div class="type-row">
      <div class={`type-label ${faceClass('regular')} ${sizeClass('label-sm')}`}>
        {`${role} ${style.size}/${style.lineHeight} ${style.weight}`}
      </div>
      <div class={`${faceClass(weight)} ${sizeClass(role)}`}>{sources.sentences[role]}</div>
    </div>
  );
}

const ringCentre = { x: RING_DIAMETER / 2, y: RING_DIAMETER / 2 };
const ringTrackRadius = (RING_DIAMETER - RING_TRACK_WIDTH) / 2;

function Ring({ ring }: { ring: DrawnRing }): Html {
  const geometry = ringGeometry(ring);
  const bead = pointOnRing(ringCentre, ringTrackRadius, geometry.beadDegrees);

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
          <div class={`${faceClass('regular')} ${sizeClass('headline-xl')}`}>{ring.day}</div>
          <div
            class={`${faceClass('regular')} ${sizeClass('headline-md')}`}
            style={`color: ${colour[phasePalette[geometry.phase].ink]}`}
          >
            {phaseLabel[geometry.phase]}
          </div>
        </div>
      </div>
      <div class={`${faceClass('semiBold')} ${sizeClass('body-sm')}`}>{ring.title}</div>
      <div class={`ring-note ${faceClass('regular')} ${sizeClass('body-sm')}`}>{ring.note}</div>
    </div>
  );
}

function IconCell({ icon }: { icon: Icon }): Html {
  return (
    <div class="icon-cell">
      <svg
        width={icon.size}
        height={icon.size}
        viewBox={`0 0 ${icon.size} ${icon.size}`}
        fill="none"
        stroke={colour.ink}
        stroke-width={icon.strokeWidth}
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        {raw(icon.body)}
      </svg>
      <div class={`icon-name ${faceClass('regular')} ${sizeClass('label-sm')}`}>{icon.name}</div>
    </div>
  );
}

function Illustration({ piece }: { piece: Piece }): Html {
  return (
    <div>
      {raw(drawingOf(piece))}
      <div class={`${faceClass('semiBold')} ${sizeClass('body-sm')}`}>{piece.name}</div>
      <div class={`piece-says ${faceClass('regular')} ${sizeClass('body-sm')}`}>{piece.says}</div>
    </div>
  );
}

export function Sheet({ sources }: { sources: SheetSources }): Html {
  const counts = sources.brand.paletteOrder.length;

  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>The Emi brand sheet</title>
        <style>{raw(styleSheet(sources.fontsBase))}</style>
      </head>
      <body class={`${faceClass('regular')} ${sizeClass('body-lg')}`}>
        <div class="head">
          <div>
            <div class={`${faceClass('semiBold')} ${sizeClass('headline-xl')}`}>The Emi brand</div>
            <div class={`standfirst ${faceClass('regular')} ${sizeClass('body-lg')}`}>
              The mark, the icon, {counts} colours with the ratio each one was measured at, the type
              scale, the ring, {sources.iconOrder.length} icons and the three onboarding pieces.
              Every number here is read from the token package the application imports.
            </div>
          </div>
          <Label>{`generated by ${generateCommand}`}</Label>
        </div>

        <Section
          title="The mark"
          note="Drawn once, read here from the files the application ships."
        >
          <div class="marks">
            {markNames.map((name) => (
              <Mark name={name} drawing={sources.assets[name]} />
            ))}
            <ApplicationIcon drawing={sources.assets.icon} />
          </div>
        </Section>

        <Section
          title="Colour, measured"
          note="Every ratio is the one the contrast test refuses a colour with, below 4.5 to 1."
        >
          <div class="swatches">
            {sources.brand.paletteOrder.map((name) => (
              <Swatch sources={sources.brand} name={name} />
            ))}
          </div>
        </Section>

        <Section
          title="The type scale"
          note="Eleven roles, one face, each sentence one Emi writes."
        >
          {sources.brand.scaleOrder.map((role) => (
            <TypeRow sources={sources} role={role} />
          ))}
        </Section>

        <Section
          title="The ring, in three states"
          note="A gap of ground and a written name carry the boundary. Colour is the third cue."
        >
          <div class="rings">
            {sources.rings.map((ring) => (
              <Ring ring={ring} />
            ))}
          </div>
        </Section>

        <Section title="The icons" note="One weight, drawn on the 24 point grid and shown at it.">
          <div class="icon-grid">
            {sources.iconOrder.map((name) => (
              <IconCell icon={sources.iconSet[name]} />
            ))}
          </div>
        </Section>

        <Section
          title="The illustrations"
          note="Two or three soft shapes in the phase colours. No body, no face, no flower, no droplet, no blood."
        >
          <div class="pieces">
            {sources.illustrations.map((piece) => (
              <Illustration piece={piece} />
            ))}
          </div>
        </Section>

        <div class={`foot ${faceClass('regular')} ${sizeClass('label-sm')}`}>
          {`${sheetPath} is written by ${generateCommand}. The pipeline runs ${checkCommand} and fails when the committed copy and the tokens disagree.`}
        </div>
      </body>
    </html>
  );
}

/** The whole document, ready for a browser to draw. */
export function sheetDocument(sources: SheetSources): string {
  return `<!doctype html>${Sheet({ sources }).html}\n`;
}

/**
 * Why the committed page and the generator disagree, as sentences a person can act on. An empty
 * list is a page that is what the tokens make of it.
 */
export function driftProblems(committed: string | null, generated: string): readonly string[] {
  if (committed === null) {
    return [
      `${sheetPath} is missing, and the generator has ${generated.split('\n').length} lines to write. Run ${generateCommand}.`,
    ];
  }

  if (committed === generated) {
    return [];
  }

  const left = committed.split('\n');
  const right = generated.split('\n');
  const differing = right.findIndex((line, index) => left[index] !== line);
  const at = differing === -1 ? Math.min(left.length, right.length) : differing;

  return [
    `${sheetPath} is stale: the committed copy and the generator disagree at line ${at + 1}.`,
    `  committed: ${JSON.stringify(left[at] ?? null)}`,
    `  generated: ${JSON.stringify(right[at] ?? null)}`,
    `A token moved, or a drawing changed, or somebody edited the page by hand. Run ${generateCommand}, look at ${picturePath}, and commit both.`,
  ];
}
