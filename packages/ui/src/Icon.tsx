import { ICON_SIZE, type IconName, icons } from '@emi/tokens';
import type { ReactNode } from 'react';
import { SvgXml } from 'react-native-svg';

/**
 * One drawing from the set in the token package, at the size and colour the screen asks for. The
 * drawing itself is never written here: a screen names an icon and the set answers with it, so
 * the twenty are drawn once and the stroke width cannot drift between two screens.
 *
 * An icon carries no meaning a screen reader needs, because every one of them sits beside the
 * words it decorates, so nothing here reaches the accessibility tree.
 */

interface Props {
  readonly name: IconName;
  /** Points on both axes. The drawing is laid out on a 24 point grid and scales to this. */
  readonly size?: number;
  readonly colour: string;
  readonly testID?: string;
}

/** One drawing from the set, at the size and the colour the screen asks for. */
export function Icon({ name, size = ICON_SIZE, colour, testID }: Props): ReactNode {
  const drawing = icons[name];
  const xml = [
    `<svg viewBox="0 0 ${String(drawing.size)} ${String(drawing.size)}"`,
    ` fill="none" stroke="${colour}" stroke-width="${String(drawing.strokeWidth)}"`,
    ' stroke-linecap="round" stroke-linejoin="round">',
    drawing.body,
    '</svg>',
  ].join('');

  return <SvgXml height={size} testID={testID} width={size} xml={xml} />;
}
