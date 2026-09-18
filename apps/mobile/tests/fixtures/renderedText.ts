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
