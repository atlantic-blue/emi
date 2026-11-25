import type { WhatSheIsEntitledToNow } from '../../services/store/theEntitlement';
import { sheIsPaidUp } from '../../services/store/thePurchase';

/**
 * Where a woman goes once her answers are written: into Emi, or along the way to paying for it.
 *
 * Emi has no free content, so the two screens below stand between every unpaid woman and the
 * product. One function answers for the end of the first run and for every later opening, because
 * two answers would let one of them send her somewhere the other would not.
 */

/** The way in, which comes before the paywall, because a purchase belongs to an account. */
export const theSignInOfTheFirstRun = '/onboarding/sign-in';

export const thePaywallOfTheFirstRun = '/onboarding/paywall';

/** Where the first run ended before Emi was sold, and where a purchase lands. */
export const theScreenSheOpensEmiOn = '/';

/**
 * The screens an unpaid woman reaches, and no others. The export and the delete are on the list
 * because contracts KEEP-2 and KEEP-3 never stop, whatever she has paid.
 */
export const theScreensSheReachesWithoutPaying: readonly string[] = [
  theSignInOfTheFirstRun,
  thePaywallOfTheFirstRun,
  '/export',
  '/settings/delete',
];

export function whereSheGoesNext(
  held: WhatSheIsEntitledToNow | null,
  sheIsSignedIn: boolean,
): string {
  if (sheIsPaidUp(held)) {
    return theScreenSheOpensEmiOn;
  }

  return sheIsSignedIn ? thePaywallOfTheFirstRun : theSignInOfTheFirstRun;
}
