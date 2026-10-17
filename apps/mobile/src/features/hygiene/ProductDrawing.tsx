import type { ReactNode } from 'react';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

import type { ProductSlug } from './products';

/**
 * The drawing of each product, from the hygieneProducts board: a stroke on a 24 point grid. The
 * drawings are not in the icon set of the token package, because the set holds one stroke width
 * and the board draws these finer.
 */

const STROKE = 1.6;

const drawings: Readonly<Record<ProductSlug, ReactNode>> = {
  'panty-liner': (
    <>
      <Rect height={18} rx={4} width={8} x={8} y={3} />
      <Rect height={11} rx={1.8} width={3.6} x={10.2} y={6.5} />
    </>
  ),
  pad: (
    <>
      <Path d="M9.5 3h5a2.5 2.5 0 0 1 2.5 2.5V8.5l2.5 1.5v4l-2.5 1.5v3A2.5 2.5 0 0 1 14.5 21h-5A2.5 2.5 0 0 1 7 18.5v-3L4.5 14v-4L7 8.5V5.5A2.5 2.5 0 0 1 9.5 3z" />
      <Rect height={10} rx={1.8} width={3.6} x={10.2} y={7} />
    </>
  ),
  'reusable-cloth-pad': (
    <>
      <Path d="M8.5 3h7a2 2 0 0 1 2 2v4.5h2.5v5h-2.5V19a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-4.5H4v-5h2.5V5a2 2 0 0 1 2-2z" />
      <Circle cx={5.3} cy={12} r={0.6} />
      <Circle cx={18.7} cy={12} r={0.6} />
      <Path d="M10 8.5h4M10 12h4M10 15.5h4" />
    </>
  ),
  tampon: (
    <>
      <Rect height={12} rx={3} width={6} x={9} y={2.5} />
      <Path d="M9 6.5h6" />
      <Path d="M12 14.5v2.5c0 2.2-1.8 3.5-4 3.5" />
    </>
  ),
  'period-underwear': (
    <>
      <Path d="M3 6.5h18l-1.2 5.2c-2.5.3-4.6 2.5-5.3 6.3h-5c-.7-3.8-2.8-6-5.3-6.3z" />
      <Path d="M3.4 8.8h17.2" />
      <Path d="M10 14.5h4" />
    </>
  ),
  'menstrual-cup': (
    <>
      <Path d="M5.5 3.5h13c0 6.5-2.8 11-6.5 11s-6.5-4.5-6.5-11z" />
      <Path d="M6 6.5h12" />
      <Path d="M12 14.5v4.5M10.5 19h3M10.8 21h2.4" />
    </>
  ),
  'menstrual-disc': (
    <>
      <Ellipse cx={12} cy={9.5} rx={8.5} ry={2.8} />
      <Path d="M3.5 9.5c.9 4.6 4.3 7 8.5 7s7.6-2.4 8.5-7" />
    </>
  ),
  sponge: (
    <>
      <Path d="M6 8.5C6 5.7 8.6 4 12 4s6 1.7 6 4.5v6c0 3.2-2.6 5.5-6 5.5s-6-2.3-6-5.5z" />
      <Circle cx={10} cy={9.5} r={0.9} />
      <Circle cx={14.2} cy={11.5} r={0.9} />
      <Circle cx={10.8} cy={14.8} r={0.9} />
      <Circle cx={14} cy={16.2} r={0.6} />
    </>
  ),
};

interface Props {
  readonly slug: ProductSlug;
  readonly colour: string;
  readonly size: number;
  readonly testID?: string;
}

export function ProductDrawing({ slug, colour, size, testID }: Props): ReactNode {
  return (
    <Svg
      fill="none"
      height={size}
      stroke={colour}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={STROKE}
      testID={testID}
      viewBox="0 0 24 24"
      width={size}
    >
      {drawings[slug]}
    </Svg>
  );
}
