import { colour } from '@emi/tokens';

/**
 * The one shadow this design system allows, on layer 2 and nowhere else.
 *
 * The body text colour at five per cent, four points down, blurred twenty and drawn two points
 * inside the edge. React Native reads the string the way a browser does, which is the only shape
 * that carries the spread.
 *
 * Everything below layer 2 is separated by a tonal step and a hairline instead, so a second use of
 * this is a change to the design and not a change to a screen.
 */
export const floatingShadow = `0px 4px 20px -2px ${colour.onSurface}0d`;
