/** Every word a rendered screen puts on the glass, in the order it draws them. */
export function textIn(node: unknown): string[] {
  if (typeof node === 'string') {
    return [node];
  }
  if (Array.isArray(node)) {
    return node.flatMap(textIn);
  }
  if (node !== null && typeof node === 'object' && 'children' in node) {
    return textIn((node as { children: unknown }).children);
  }
  return [];
}

/** The days a screen names, as she reads them: the 6th, the 18th, the 21st. */
export function daysNamedIn(text: string): string[] {
  return text.match(/\b\d{1,2}(?:st|nd|rd|th)\b/g) ?? [];
}

/** One run of text a screen drew, with the size it was drawn at. */
export interface SizedText {
  readonly text: string;
  /** Points, from the nearest style up the tree that names a size. */
  readonly points: number | undefined;
}

function sizeIn(style: unknown): number | undefined {
  if (Array.isArray(style)) {
    return style.reduce<number | undefined>((found, each) => sizeIn(each) ?? found, undefined);
  }
  if (style !== null && typeof style === 'object' && 'fontSize' in style) {
    const size = (style as { fontSize: unknown }).fontSize;

    return typeof size === 'number' ? size : undefined;
  }
  return undefined;
}

/**
 * Every run of text on the glass and the size it carries. A size is inherited, because a run
 * inside a styled block is drawn at the block's size and never at none at all.
 */
export function sizedTextIn(node: unknown, inherited?: number): SizedText[] {
  if (typeof node === 'string') {
    return [{ text: node, points: inherited }];
  }
  if (Array.isArray(node)) {
    return node.flatMap((each) => sizedTextIn(each, inherited));
  }
  if (node !== null && typeof node === 'object' && 'children' in node) {
    const props = (node as { props?: { style?: unknown } }).props;
    const here = sizeIn(props?.style) ?? inherited;

    return sizedTextIn((node as { children: unknown }).children, here);
  }
  return [];
}
