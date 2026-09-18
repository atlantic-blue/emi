import { colour } from '@emi/tokens';

/**
 * A rendered React Native tree, turned into the markup a browser can draw. The tree comes from the
 * screen the application ships, so every word, size, colour and arc in the picture is the one the
 * component produced rather than one this file chose.
 *
 * Two things the browser does not share with the phone, and both are stated on the page itself: no
 * screen names a font family yet, so the picture takes the browser's own face, and a browser lays
 * out in rows where React Native lays out in columns, which the rule below restores.
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

function svgNode(name: string, node: RenderedNode, pairs: readonly string[]): string {
  const props = node.props ?? {};
  const written = pairs.flatMap((key) => {
    const value = key === 'stroke' || key === 'fill' ? colourFrom(props[key]) : props[key];

    return value === undefined || value === null ? [] : [[hyphenated(key), value] as const];
  });

  return `<${name}${attributes(written)}>${drawnChildren(node)}</${name}>`;
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
        drawnChildren(drawn),
        '</div></div>',
      ].join('');
    case 'RNSVGSvgView':
      return `<svg${attributes([
        ['width', props.bbWidth],
        ['height', props.bbHeight],
        ['viewBox', `0 0 ${String(props.bbWidth)} ${String(props.bbHeight)}`],
      ])}>${drawnChildren(drawn)}</svg>`;
    case 'RNSVGGroup':
      return `<g>${drawnChildren(drawn)}</g>`;
    case 'RNSVGPath':
      // React Native reads an unset fill back as nothing, and a browser fills an unfilled path
      // black, so the one the component asked for is written out.
      return svgNode('path', { ...drawn, props: { ...props, fill: props.fill ?? 'none' } }, [
        'd',
        'stroke',
        'strokeWidth',
        'opacity',
        'fill',
      ]);
    case 'RNSVGCircle':
      return svgNode('circle', drawn, ['cx', 'cy', 'r', 'fill', 'stroke', 'strokeWidth']);
    default:
      return box(drawn);
  }
}

const RESET = `
* { box-sizing: border-box; }
body { margin: 0; padding: 40px; background: ${colour.sunk}; font-family: system-ui, sans-serif; }
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
  border: 1px solid ${colour.hairline};
}
.phone > div { height: 100%; }
.title { font-size: 15px; font-weight: 600; color: ${colour.ink}; margin: 0 0 2px; }
.note { font-size: 13px; color: ${colour.body}; margin: 0 0 12px; min-height: 34px; }
.caveat { font-size: 13px; color: ${colour.body}; margin: 20px 0 0; max-width: 1200px; }
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
    `<style>${RESET}</style></head><body>`,
    `<div class="screens">${drawn}</div>`,
    `<p class="caveat">${escaped(caveat)}</p>`,
    '</body></html>',
  ].join('');
}

/** How wide and tall the browser window has to be to hold the whole picture. */
export function pageSize(count: number): PhoneSize {
  return { width: 80 + count * phoneSize.width + (count - 1) * 32, height: phoneSize.height + 190 };
}
