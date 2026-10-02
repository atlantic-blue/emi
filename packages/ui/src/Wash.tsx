import { type PhaseName, WASH_HEIGHT, type WashTint, colour, washFor } from '@emi/tokens';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

/**
 * The wash at the top of a screen, drawn in the colours of the phase of today.
 *
 * Three layers, the way the prototype paints them: a field falling from the phase's own tint to the
 * ground, and two ellipses of colour reaching in from the corners over it, each fading to nothing
 * before it ends. The colours and the shape both come from the token, so this holds no number and
 * no colour of its own.
 *
 * A tint fades by dropping to no opacity rather than to another colour, so nothing here carries
 * transparency as a value. A colour that did would have no contrast ratio of its own, which is the
 * thing the palette refuses.
 */

/** The whole wash, as one drawing. */
export const washTestID = 'wash';

/** The field under the tints, which is the layer that reaches the ground at the bottom. */
export const washFieldTestID = 'wash-field';

/** The tints are read in the order the design document lists them, so they are numbered. */
export function washTintTestID(at: 1 | 2): string {
  return `wash-tint-${at}`;
}

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

function Tint({ at, tint }: { readonly at: 1 | 2; readonly tint: WashTint }) {
  return (
    <RadialGradient
      id={washTintGradientID(at)}
      cx={`${tint.acrossPercent}%`}
      cy={`${tint.downPercent}%`}
      rx={`${tint.widthPercent}%`}
      ry={`${tint.heightPercent}%`}
    >
      <Stop offset="0" stopColor={colour[tint.colour]} stopOpacity={1} />
      <Stop offset={`${tint.fadedByPercent}%`} stopColor={colour[tint.colour]} stopOpacity={0} />
    </RadialGradient>
  );
}

/** The wash at the top of a screen, in the colours of the phase she is in. */
export function Wash({ phase, height = WASH_HEIGHT }: Props) {
  const wash = washFor(phase);

  return (
    <Svg testID={washTestID} width="100%" height={height}>
      <Defs>
        <LinearGradient id={washFieldGradientID} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colour[wash.from]} />
          <Stop offset="1" stopColor={colour[wash.to]} />
        </LinearGradient>
        <Tint at={1} tint={wash.tints[0]} />
        <Tint at={2} tint={wash.tints[1]} />
      </Defs>
      <Rect
        testID={washFieldTestID}
        x="0"
        y="0"
        width="100%"
        height="100%"
        fill={`url(#${washFieldGradientID})`}
      />
      {/* The document lists the topmost tint first, and the last shape drawn here is the top one. */}
      <Rect
        testID={washTintTestID(2)}
        x="0"
        y="0"
        width="100%"
        height="100%"
        fill={`url(#${washTintGradientID(2)})`}
      />
      <Rect
        testID={washTintTestID(1)}
        x="0"
        y="0"
        width="100%"
        height="100%"
        fill={`url(#${washTintGradientID(1)})`}
      />
    </Svg>
  );
}
