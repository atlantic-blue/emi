import { colour, phaseNames, phasePalette } from '@emi/tokens';
import { StyleSheet } from 'react-native';

/**
 * SEE-2, measured off what a screen actually rendered rather than off the styles it declares. Text
 * of any size on a phase fill fails the contrast floor, so the rule is that a fill carries colour
 * and nothing else, and the darker ink partner carries the words.
 *
 * The walk carries the nearest background down the tree, because a run of text inside a filled
 * block is drawn on that block's colour and never on none at all.
 */

/** The four fills, as the values a rendered style holds. */
export const phaseFills: readonly string[] = phaseNames.map(
  (phase) => colour[phasePalette[phase].fill],
);

export interface TextOnAFill {
  readonly text: string;
  readonly fill: string;
}

function backgroundIn(style: unknown): string | undefined {
  const flattened = StyleSheet.flatten(style as never) as { backgroundColor?: unknown } | undefined;
  const held = flattened?.backgroundColor;

  return typeof held === 'string' ? held : undefined;
}

/** Every run of text drawn on one of the four phase fills. An empty list is the passing answer. */
export function textDrawnOnAPhaseFill(node: unknown, ground?: string): TextOnAFill[] {
  if (typeof node === 'string') {
    return ground !== undefined && phaseFills.includes(ground)
      ? [{ text: node, fill: ground }]
      : [];
  }
  if (Array.isArray(node)) {
    return node.flatMap((each) => textDrawnOnAPhaseFill(each, ground));
  }
  if (node !== null && typeof node === 'object' && 'children' in node) {
    const props = (node as { props?: { style?: unknown } }).props;

    return textDrawnOnAPhaseFill(
      (node as { children: unknown }).children,
      backgroundIn(props?.style) ?? ground,
    );
  }
  return [];
}

/** The colour a run of text is drawn in, so the ink partner can be read back off the screen. */
export function colourOf(element: { props: { style?: unknown } }): string | undefined {
  const flattened = StyleSheet.flatten(element.props.style as never) as
    { color?: unknown } | undefined;
  const held = flattened?.color;

  return typeof held === 'string' ? held : undefined;
}
