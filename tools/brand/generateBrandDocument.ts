import {
  CONTRAST_FLOOR,
  type ColourName,
  type ColourRole,
  type ColourToken,
  colourNames,
  colours,
  contrastRatio,
} from '../../packages/tokens/src/colour.ts';
import {
  MINIMUM_TAP_TARGET,
  type RadiusName,
  type SpaceName,
  radius,
  space,
  spaceNames,
  stroke,
} from '../../packages/tokens/src/space.ts';
import {
  type FaceName,
  LINE_HEIGHT_FLOOR,
  type TypeSizeName,
  type TypeStyle,
  face,
  typeScale,
  typeSizeNames,
} from '../../packages/tokens/src/type.ts';

export const brandDocumentPath = 'docs/brand.md';

export const generateCommand = 'npm run generate:brand';

export const checkCommand = 'npm run check:brand';

/**
 * The token package, passed in rather than reached for, so a test can move one colour and read
 * what the document says about it.
 */
export interface BrandSources {
  readonly palette: Readonly<Record<ColourName, ColourToken>>;
  readonly paletteOrder: readonly ColourName[];
  readonly scale: Readonly<Record<TypeSizeName, TypeStyle>>;
  readonly scaleOrder: readonly TypeSizeName[];
  readonly faces: Readonly<Record<FaceName, string>>;
  readonly spacing: Readonly<Record<SpaceName, number>>;
  readonly spacingOrder: readonly SpaceName[];
  readonly corners: Readonly<Record<RadiusName, number>>;
  readonly strokes: Readonly<Record<string, number>>;
  readonly tapTarget: number;
}

export const shippedSources: BrandSources = {
  palette: colours,
  paletteOrder: colourNames,
  scale: typeScale,
  scaleOrder: typeSizeNames,
  faces: face,
  spacing: space,
  spacingOrder: spaceNames,
  corners: radius,
  strokes: stroke,
  tapTarget: MINIMUM_TAP_TARGET,
};

export interface Pair {
  readonly text: ColourName;
  readonly ground: ColourName;
  readonly ratio: number;
}

export interface BrandCounts {
  readonly colours: number;
  readonly approved: number;
  readonly refused: number;
  readonly sizes: number;
}

function carries(sources: BrandSources, name: ColourName, role: ColourRole): boolean {
  return sources.palette[name].roles.includes(role);
}

function measure(sources: BrandSources, text: ColourName, ground: ColourName): Pair {
  return {
    text,
    ground,
    ratio: contrastRatio(sources.palette[text].value, sources.palette[ground].value),
  };
}

// The sentence the contrast test prints, so a ratio in this document and a ratio in a test failure
// read the same way.
export function report(pair: Pair): string {
  return `${pair.text} on ${pair.ground} is ${pair.ratio.toFixed(2)} to 1`;
}

export function approvedPairs(sources: BrandSources = shippedSources): Pair[] {
  return sources.paletteOrder
    .filter((name) => carries(sources, name, 'text'))
    .flatMap((text) =>
      sources.palette[text].textOn.map((ground) => measure(sources, text, ground)),
    );
}

/**
 * A pair below the floor, which is why it is not approved. Measured rather than listed, so a
 * combination cannot be refused without the ratio that refuses it.
 */
export function refusedPairs(sources: BrandSources = shippedSources): Pair[] {
  const grounds = sources.paletteOrder.filter((name) => carries(sources, name, 'ground'));

  return sources.paletteOrder
    .filter((name) => carries(sources, name, 'text'))
    .flatMap((text) =>
      grounds
        .filter((ground) => ground !== text && !sources.palette[text].textOn.includes(ground))
        .map((ground) => measure(sources, text, ground)),
    )
    .filter((pair) => pair.ratio < CONTRAST_FLOOR);
}

/**
 * A fill with an ink partner of the same name is a phase colour. The partner exists because the
 * fill cannot carry text, and that relation is in the palette rather than in a list here.
 */
export function inkPartnerOf(sources: BrandSources, fill: ColourName): ColourName | null {
  const partner = `${fill}Ink`;

  return sources.paletteOrder.find((name) => name === partner) ?? null;
}

export function fillPairs(sources: BrandSources = shippedSources): Pair[] {
  return sources.paletteOrder
    .filter((name) => carries(sources, name, 'fill') && inkPartnerOf(sources, name) !== null)
    .map((fill) => measure(sources, fill, 'stone'));
}

export function brandCounts(sources: BrandSources = shippedSources): BrandCounts {
  return {
    colours: sources.paletteOrder.length,
    approved: approvedPairs(sources).length,
    refused: refusedPairs(sources).length,
    sizes: sources.scaleOrder.length,
  };
}

function sentenceList(words: readonly string[]): string {
  if (words.length <= 1) {
    return words.join('');
  }

  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}

function colourLines(sources: BrandSources): string[] {
  return sources.paletteOrder.map((name) => {
    const token = sources.palette[name];
    const noun = token.roles.length === 1 ? 'role' : 'roles';

    return `- \`${name}\` is \`${token.value}\` and carries the ${noun} ${sentenceList(token.roles)}.`;
  });
}

function typeLines(sources: BrandSources): string[] {
  return sources.scaleOrder.map((name) => {
    const style = sources.scale[name];
    const multiple = (style.lineHeight / style.size).toFixed(2);
    const spacing = style.letterSpacing === 0 ? '' : `, letter spacing ${style.letterSpacing}`;
    const family = sources.faces[style.face];

    return `- \`${name}\` is ${style.size} points over ${style.lineHeight}, in ${family}${spacing}, which is ${multiple} times the size.`;
  });
}

function numberLines(entries: readonly (readonly [string, number])[]): string[] {
  return entries.map(([name, value]) => `- \`${name}\` is ${value}.`);
}

function fillLines(sources: BrandSources): string[] {
  return fillPairs(sources).map((pair) => {
    const partner = inkPartnerOf(sources, pair.text);

    return `- ${report(pair)}, so \`${partner}\` carries the text.`;
  });
}

// A value substituted into a sentence changes its length, so the paragraph is wrapped here rather
// than typed at a width that stops being true.
function paragraph(prose: string, width = 100): string[] {
  const words = prose.split(/\s+/).filter((word) => word.length > 0);
  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    if (line.length === 0) {
      line = word;
      continue;
    }

    if (`${line} ${word}`.length > width) {
      lines.push(line);
      line = word;
      continue;
    }

    line = `${line} ${word}`;
  }

  if (line.length > 0) {
    lines.push(line);
  }

  return lines;
}

// A fill that measures above the floor is still refused as text, because the rule covers all four.
// The sentence only appears while that is true of one of them.
function aboveTheFloor(sources: BrandSources): string[] {
  const passing = fillPairs(sources).filter((pair) => pair.ratio >= CONTRAST_FLOOR);

  if (passing.length === 0) {
    return [];
  }

  const named = sentenceList(passing.map((pair) => `\`${pair.text}\``));
  const verb = passing.length === 1 ? 'measures' : 'measure';

  return [
    ...paragraph(
      `The fill ${named} ${verb} above the floor. It still carries no text. The rule is the same for
       every fill.`,
    ),
    '',
  ];
}

export function brandDocument(sources: BrandSources = shippedSources): string {
  const counts = brandCounts(sources);
  const floor = CONTRAST_FLOOR.toFixed(1);
  const faces = sentenceList([sources.faces.heading, sources.faces.text, sources.faces.numeric]);
  const refused = refusedPairs(sources).sort((one, other) => other.ratio - one.ratio);

  const lines = [
    '# The brand',
    '',
    ...paragraph(
      `This document is generated from the token package. Nobody writes it by hand. Every value here
       is the value the application uses. Run \`${generateCommand}\` after a token changes. The pipeline
       runs \`${checkCommand}\`. It fails when the committed copy and the generator disagree by one
       character.`,
    ),
    '',
    '## The palette',
    '',
    'Status: built',
    '',
    ...paragraph(
      `The token package declares ${counts.colours} colours, in this order. A role says where a colour
       can go. A ground is a surface to sit on. A text colour carries words. A fill paints an arc of
       the ring. A line draws a hairline.`,
    ),
    '',
    ...colourLines(sources),
    '',
    '## Colour, measured',
    '',
    'Status: built',
    '',
    ...paragraph(
      `The function \`contrastRatio\` in \`packages/tokens/src/colour.ts\` measures every ratio below.
       The contrast test reads the same function. Level AA of the Web Content Accessibility Guidelines
       asks for ${floor} to 1 for normal text. A pair below ${floor} is refused here, and the test
       refuses it too.`,
    ),
    '',
    `These ${counts.approved} pairs are approved:`,
    '',
    ...approvedPairs(sources).map((pair) => `- ${report(pair)}`),
    '',
    ...paragraph(
      `These ${counts.refused} pairs are refused, in order of ratio. A text colour is approved only on
       the grounds above. The two near misses come first.`,
    ),
    '',
    ...refused.map((pair) => `- ${report(pair)}`),
    '',
    ...paragraph(
      `A phase fill carries no text. Each one has an ink partner that carries the text instead. On the
       stone ground they measure:`,
    ),
    '',
    ...fillLines(sources),
    '',
    ...aboveTheFloor(sources),
    '## The type scale',
    '',
    'Status: built',
    '',
    ...paragraph(
      `The scale has ${counts.sizes} sizes. The three faces are ${faces}. A line height below
       ${LINE_HEIGHT_FLOOR.toFixed(1)} times the size fails the token test.`,
    ),
    '',
    ...typeLines(sources),
    '',
    '## Space, radius and stroke',
    '',
    'Status: built',
    '',
    'The spacing scale, in points:',
    '',
    ...numberLines(sources.spacingOrder.map((name) => [name, sources.spacing[name]] as const)),
    '',
    'The corner radii, in points:',
    '',
    ...numberLines(Object.entries(sources.corners)),
    '',
    'The strokes, in points:',
    '',
    ...numberLines(Object.entries(sources.strokes)),
    '',
    `The smallest tap target is ${sources.tapTarget} points square.`,
    '',
  ];

  return lines.join('\n');
}

export function stalenessProblems(committed: string | null, generated: string): string[] {
  if (committed === null) {
    return [
      `${brandDocumentPath} is missing, and the generator has ${generated.split('\n').length} lines to write. Run ${generateCommand}.`,
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
    `${brandDocumentPath} is stale: the committed copy and the generator disagree at line ${at + 1}.`,
    `  committed: ${JSON.stringify(left[at] ?? null)}`,
    `  generated: ${JSON.stringify(right[at] ?? null)}`,
    `A token moved, or somebody edited the document by hand. Run ${generateCommand}.`,
  ];
}
