import { useFonts } from 'expo-font';
import type { ReactNode } from 'react';

import { fontsToLoad } from './fontsToLoad';

/**
 * Nothing is drawn until the files are in memory. A screen drawn before them arrives in the system
 * face and redraws a moment later in Plus Jakarta Sans, so she reads the same words twice in two
 * faces. That flash is what this stops.
 */
export function Fonts({ children }: { readonly children: ReactNode }): ReactNode {
  const [loaded, failed] = useFonts(fontsToLoad);

  // A file that will not load leaves her with a working product in the system face, which is worth
  // more than a screen she cannot get past.
  if (!loaded && failed === null) {
    return null;
  }

  return children;
}
