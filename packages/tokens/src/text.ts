import { fontNameFor } from './font';
import { type TypeRoleName, letterSpacingOf, typeScale } from './type';

/**
 * A role, as the four values a run of text is drawn with. The call sites this replaced copied the
 * size, the line height and the letter spacing out of the scale and left the family behind, so
 * every heading and every paragraph drew in the system face while the files sat unread.
 */

/** Everything one run of text needs. No field is optional, which is the point of the helper. */
export interface TextStyle {
  /** The name the application registers the file under, never the family the design calls it. */
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly letterSpacing: number;
  readonly lineHeight: number;
}

/** The whole style for one role of the design system. The weight picks the file. */
export function textStyle(role: TypeRoleName): TextStyle {
  const step = typeScale[role];

  return {
    fontFamily: fontNameFor(step.weight),
    fontSize: step.size,
    letterSpacing: letterSpacingOf(step.size, step.letterSpacingEm),
    lineHeight: step.lineHeight,
  };
}
