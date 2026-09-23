import { applicationFontFiles, colour } from '@emi/tokens';

/**
 * A rendered React Native tree, turned into the markup a browser can draw. The tree comes from the
 * screen the application ships, so every word, size, colour and arc in the picture is the one the
 * component produced rather than one this file chose.
 *
 * The page loads the same font files the application loads, under the same names, so the words are
 * drawn in the face that ships. One thing the browser still does not share with the phone, and it
 * is stated on the page itself: a browser lays out in rows where React Native lays out in columns,
 * which the rule below restores.
 */

export interface RenderedNode {
  readonly type: string;
  readonly props?: Record<string, unknown>;
  readonly children?: unknown;
}

/** One screen in the picture: what it is, and the tree it was rendered from. */
export interface DrawnScreen {
  readonly title: string;
  readonly note: string;
  readonly tree: unknown;
}

export interface PhoneSize {
  readonly width: number;
  readonly height: number;
}

/** A phone of ordinary size, in points, which is what a React Native style is measured in. */
export const phoneSize: PhoneSize = { width: 390, height: 844 };

const UNITLESS: readonly string[] = [
  'flex',
  'flexGrow',
  'flexShrink',
  'opacity',
  'zIndex',
  'fontWeight',
];

const SIDES: Readonly<Record<string, readonly string[]>> = {
  paddingVertical: ['padding-top', 'padding-bottom'],
  paddingHorizontal: ['padding-left', 'padding-right'],
  marginVertical: ['margin-top', 'margin-bottom'],
  marginHorizontal: ['margin-left', 'margin-right'],
};

function hyphenated(key: string): string {
  return key.replace(/[A-Z]/g, (capital) => `-${capital.toLowerCase()}`);
}

function measured(key: string, value: number): string {
  return UNITLESS.includes(key) ? String(value) : `${value}px`;
}

function declarations(key: string, value: unknown): string[] {
  if (value === null || value === undefined) {
    return [];
  }
  if (key === 'transform' && Array.isArray(value)) {
    const parts = value.flatMap((each) =>
      Object.entries(each as Record<string, number>).map(([name, to]) => `${name}(${to})`),
    );

    return parts.length > 0 ? [`transform: ${parts.join(' ')}`] : [];
  }
  const sides = SIDES[key];
  if (sides !== undefined && typeof value === 'number') {
    return sides.map((side) => `${side}: ${value}px`);
  }
  if (typeof value === 'number') {
    return [`${hyphenated(key)}: ${measured(key, value)}`];
  }
  if (typeof value === 'string') {
    return [`${hyphenated(key)}: ${value}`];
  }
  return [];
}

export function cssFrom(style: unknown): string {
  if (Array.isArray(style)) {
    return style.map(cssFrom).filter(Boolean).join('; ');
  }
  if (style === null || typeof style !== 'object') {
    return '';
  }

  return Object.entries(style as Record<string, unknown>)
    .flatMap(([key, value]) => declarations(key, value))
    .join('; ');
}

/** React Native holds a colour as a packed number by the time the tree is read back. */
export function colourFrom(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  if (value === null || typeof value !== 'object' || !('payload' in value)) {
    return undefined;
  }
  const packed = (value as { payload: unknown }).payload;
  if (typeof packed !== 'number') {
    return undefined;
  }
  const red = (packed >>> 16) & 0xff;
  const green = (packed >>> 8) & 0xff;
  const blue = packed & 0xff;

  return `#${[red, green, blue].map((part) => part.toString(16).padStart(2, '0')).join('')}`;
}

function escaped(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function attributes(pairs: readonly (readonly [string, unknown])[]): string {
  return pairs
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([name, value]) => ` ${name}="${escaped(String(value))}"`)
    .join('');
}

function drawnChildren(node: RenderedNode): string {
  return markupOf(node.children);
}

function box(node: RenderedNode, extra = ''): string {
  const style = [cssFrom(node.props?.style), extra].filter(Boolean).join('; ');

  return `<div${attributes([['style', style]])}>${drawnChildren(node)}</div>`;
}

/** The ends and corners a stroke takes, which arrive as the numbers the platform passes down. */
const CAPS: readonly string[] = ['butt', 'round', 'square'];
const JOINS: readonly string[] = ['miter', 'round', 'bevel'];

function paintFrom(key: string, value: unknown): unknown {
  if (key === 'stroke' || key === 'fill') {
    return colourFrom(value);
  }
  if (key === 'strokeLinecap' && typeof value === 'number') {
    return CAPS[value];
  }
  if (key === 'strokeLinejoin' && typeof value === 'number') {
    return JOINS[value];
  }

  return value;
}

/**
 * Which paint an element set itself. React Native names those in `propList`, and an element with no
 * list of its own set none: what it reads back is a default the browser must not be shown, because
 * an unset fill reads back as black and turns a stroked outline into a blot.
 */
function ownProps(node: RenderedNode): readonly string[] | undefined {
  const held = node.props?.propList;

  return Array.isArray(held) ? (held as string[]) : undefined;
}

/** The paint a shape or a group can carry. Geometry is passed in separately and always written. */
const PAINT: readonly string[] = [
  'fill',
  'stroke',
  'strokeWidth',
  'strokeLinecap',
  'strokeLinejoin',
  'opacity',
];

function written(
  node: RenderedNode,
  keys: readonly string[],
  onlyOwned: boolean,
): (readonly [string, unknown])[] {
  const props = node.props ?? {};
  const own = ownProps(node);

  return keys.flatMap((key) => {
    if (onlyOwned && (own === undefined || !own.includes(key))) {
      return [];
    }
    const value = paintFrom(key, props[key]);

    return value === undefined || value === null ? [] : [[hyphenated(key), value] as const];
  });
}

/**
 * One shape. Its geometry is always written and its paint only where the shape set it itself, so
 * what a group above it painted stays painted by the group. A shape that names no fill is filled
 * black by a browser, which turns a stroked outline into a blot, so the absence is written out.
 */
function svgNode(name: string, node: RenderedNode, geometry: readonly string[]): string {
  const paint = written(node, PAINT, true);
  const pairs = [...written(node, geometry, false), ...paint];
  const unfilled: readonly [string, unknown] = ['fill', 'none'];
  const painted = paint.some(([key]) => key === 'fill') ? pairs : [...pairs, unfilled];

  return `<${name}${attributes(painted)}>${drawnChildren(node)}</${name}>`;
}

/**
 * What is inside a scroll, with one wrapper taken off. React Native puts the children of a scroll
 * inside a plain box of its own, and the style that arranges them is handed to the scroll instead,
 * so drawing both leaves the arrangement on one box and the children on another. A content
 * container asking for its children to be spread then spreads a single box holding all of them,
 * which reads as a screen that ignored the rule it was given.
 */
function scrolled(node: RenderedNode): string {
  const children = node.children;
  const only = Array.isArray(children) && children.length === 1 ? children[0] : undefined;
  const wrapper = only as RenderedNode | undefined;
  const isBare = wrapper?.type === 'View' && Object.keys(wrapper.props ?? {}).length === 0;

  return isBare ? markupOf(wrapper.children) : drawnChildren(node);
}

/**
 * The markup for one node. A host component this screen does not use falls through to a plain box,
 * which keeps its children on the page rather than dropping them without a word.
 */
export function markupOf(node: unknown): string {
  if (typeof node === 'string') {
    return escaped(node);
  }
  if (typeof node === 'number') {
    return escaped(String(node));
  }
  if (Array.isArray(node)) {
    return node.map(markupOf).join('');
  }
  if (node === null || typeof node !== 'object') {
    return '';
  }

  const drawn = node as RenderedNode;
  const props = drawn.props ?? {};

  switch (drawn.type) {
    case 'RCTScrollView':
      return [
        `<div style="${cssFrom(props.style)}; overflow: hidden">`,
        `<div style="${cssFrom(props.contentContainerStyle)}; min-height: 100%">`,
        scrolled(drawn),
        '</div></div>',
      ].join('');
    case 'RNSVGSvgView':
      // A drawing given its own grid is laid out on that grid and then scaled to the box it was
      // asked for, so the box and the grid are two different pairs of numbers.
      return `<svg${attributes([
        ['width', props.bbWidth],
        ['height', props.bbHeight],
        [
          'viewBox',
          [
            props.minX ?? 0,
            props.minY ?? 0,
            props.vbWidth ?? props.bbWidth,
            props.vbHeight ?? props.bbHeight,
          ]
            .map(String)
            .join(' '),
        ],
      ])}>${drawnChildren(drawn)}</svg>`;
    case 'RNSVGGroup':
      return `<g${attributes(written(drawn, PAINT, true))}>${drawnChildren(drawn)}</g>`;
    case 'RNSVGPath':
      return svgNode('path', drawn, ['d']);
    case 'TextInput': {
      // A field draws what she typed, or the placeholder when she has typed nothing. Without this
      // a picture of a sheet full of fields shows empty boxes and says she typed nothing.
      const typed = typeof props.value === 'string' && props.value.length > 0;
      const shown = typed ? String(props.value) : String(props.placeholder ?? '');
      const faint = typed ? undefined : colourFrom(props.placeholderTextColor);
      const style = [
        cssFrom(props.style),
        'justify-content: center',
        faint === undefined ? '' : `color: ${faint}`,
      ]
        .filter(Boolean)
        .join('; ');

      return `<div${attributes([['style', style]])}>${escaped(shown)}</div>`;
    }
    case 'RNSVGCircle':
      return svgNode('circle', drawn, ['cx', 'cy', 'r']);
    case 'RNSVGRect':
      return svgNode('rect', drawn, ['x', 'y', 'width', 'height', 'rx', 'ry']);
    default:
      return box(drawn);
  }
}

/**
 * Where the font files sit, written from brand/screens, because the page is drawn from that
 * directory and a path of its own is what keeps the file portable to another machine.
 */
const FONTS_FROM_HERE = '../../apps/mobile/assets/fonts';

/** The files the application loads, declared under the names it registers them under. */
const FACES = applicationFontFiles
  .map(
    (file) =>
      `@font-face { font-family: '${file.name}'; src: url('${FONTS_FROM_HERE}/${file.path}') format('truetype'); }`,
  )
  .join('\n');

const RESET = `
* { box-sizing: border-box; }
body { margin: 0; padding: 40px; background: ${colour.surfaceContainer}; font-family: system-ui, sans-serif; }
div {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  flex-shrink: 0;
  position: relative;
}
svg { flex-shrink: 0; }
.screens { display: flex; flex-direction: row; gap: 32px; align-items: flex-start; }
.screen { display: flex; flex-direction: column; width: ${phoneSize.width}px; }
.phone {
  width: ${phoneSize.width}px;
  height: ${phoneSize.height}px;
  border-radius: 36px;
  overflow: hidden;
  border: 1px solid ${colour.outlineVariant};
}
.phone > div { height: 100%; }
.title { font-size: 15px; font-weight: 600; color: ${colour.onSurface}; margin: 0 0 2px; }
.note { font-size: 13px; color: ${colour.onSurfaceVariant}; margin: 0 0 12px; min-height: 34px; }
.caveat { font-size: 13px; color: ${colour.onSurfaceVariant}; margin: 20px 0 0; max-width: 1200px; }
`;

/**
 * The page, with each screen under the days it was drawn from. The caveat is printed on the picture
 * rather than left to whoever passes it on, because a picture travels away from its description.
 */
export function screenDocument(screens: readonly DrawnScreen[], caveat: string): string {
  const drawn = screens
    .map(
      (screen) =>
        `<section class="screen"><p class="title">${escaped(screen.title)}</p><p class="note">${escaped(screen.note)}</p><div class="phone">${markupOf(screen.tree)}</div></section>`,
    )
    .join('');

  return [
    '<!doctype html><html><head><meta charset="utf-8" />',
    `<style>${FACES}\n${RESET}</style></head><body>`,
    `<div class="screens">${drawn}</div>`,
    `<p class="caveat">${escaped(caveat)}</p>`,
    '</body></html>',
  ].join('');
}

/** How wide and tall the browser window has to be to hold the whole picture. */
export function pageSize(count: number): PhoneSize {
  return { width: 80 + count * phoneSize.width + (count - 1) * 32, height: phoneSize.height + 190 };
}
