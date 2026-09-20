import { colour } from '@emi/tokens';
import { DefaultTheme } from 'expo-router';

/**
 * The ground the navigator paints behind everything it draws.
 *
 * A navigator fills the glass with a colour of its own before a screen draws over it, and its own
 * is a light grey. A screen covers that grey and the dock does not: the dock is a capsule with air
 * around it, so whatever the navigator painted shows through beside it and under it, and Emi's
 * surface stops in a hard line where the tab bar begins.
 *
 * Only the ground is taken. The other roles belong to a header and a tab bar the product draws
 * itself and the navigator never renders.
 */
export const theNavigatorGround = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: colour.surface },
};
