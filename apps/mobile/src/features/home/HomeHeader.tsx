import type { ReactNode } from 'react';

/** The header of the screen she opens: the mark, the word and the greeting, in that order. */

export const homeHeaderTestID = 'home-header';
export const homeHeaderMarkTestID = 'home-header-mark';
export const homeHeaderWordTestID = 'home-header-word';
export const homeGreetingTestID = 'home-greeting';

interface Props {
  /** The name in her profile, and nothing at all where she gave none. Then no greeting is drawn. */
  readonly name?: string;
}

export function HomeHeader(_props: Props): ReactNode {
  return null;
}
