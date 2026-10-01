import { type PhaseName, WASH_HEIGHT } from '@emi/tokens';
import Svg from 'react-native-svg';

/**
 * The wash at the top of a screen, drawn in the colours of the phase of today.
 *
 * It draws nothing yet. The layers, their gradients and the stops of each are what the step builds.
 */

/** The whole wash, as one drawing. */
export const washTestID = 'wash';

/** The field under the tints, which is the layer that reaches the ground at the bottom. */
export const washFieldTestID = 'wash-field';

/** The tints are read in the order the design document lists them, so they are numbered. */
export function washTintTestID(at: 1 | 2): string {
  return `wash-tint-${at}`;
}

/** What a layer is painted with, as against the layer itself. */
/**
 * What the field is painted with, as against the field itself. They are named apart because a
 * gradient nothing paints with draws nothing at all, and only the pair proves the wash.
 */
export const washFieldGradientID = 'wash-field-gradient';

/** What a tint is painted with, numbered the same way the tint itself is. */
export function washTintGradientID(at: 1 | 2): string {
  return `wash-tint-${at}-gradient`;
}

interface Props {
  /** The phase she is in. With none, the wash is the soft one every screen with no phase draws. */
  readonly phase?: PhaseName;
  readonly height?: number;
}

/** The wash at the top of a screen, in the colours of the phase she is in. */
export function Wash({ height = WASH_HEIGHT }: Props) {
  return <Svg testID={washTestID} width="100%" height={height} />;
}
