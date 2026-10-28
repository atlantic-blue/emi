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

/** The whole style for one role of the design system. The face and the weight pick the file. */
export function textStyle(role: TypeRoleName): TextStyle {
  const step = typeScale[role];

  return {
    fontFamily: fontNameFor(step.face, step.weight),
    fontSize: step.size,
    letterSpacing: letterSpacingOf(step.size, step.letterSpacingEm),
    lineHeight: step.lineHeight,
  };
}

/**
 * The most the iOS text size setting may enlarge a run of text, as a multiple of its role. Past
 * this the labels in a tile, a chip or a tab no longer fit their box, so the scale stops reading
 * as one scale.
 */
export const MAXIMUM_TEXT_GROWTH = 1.3;
