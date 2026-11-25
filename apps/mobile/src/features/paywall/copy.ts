import { readingLanguage, words } from '../../language';
import type { APlanInTheStore } from '../../services/store/thePlans';
import { theMonthlyPlan, theYearlyPlan } from '../../services/store/theProducts';

/**
 * The words of the paywall, from the board approved on 2026-11-25.
 *
 * Every amount she reads is the figure the store quoted, filled into a sentence the catalogue
 * holds. So no price is written in the application, in any language, and the sentence she reads in
 * Dublin carries the number Apple charges in Dublin.
 */

/**
 * The words that carry no amount, read at the moment they are drawn rather than at the moment
 * this file loads.
 *
 * Every other screen holds its words in a constant, because the phone is asked for its language
 * once and nothing moves it afterwards. This screen is held to its board in three languages by a
 * test that renders it three times in one run, and a constant built on the first load would answer
 * the first language three times. The lookup memoises the language, so a read costs nothing.
 */
export function thePaywallSaid(): {
  readonly title: string;
  readonly line: string;
  readonly gets: readonly string[];
  readonly offer: string;
  readonly restore: string;
  readonly terms: string;
  readonly privacy: string;
  readonly troubleTitle: string;
  readonly troubleLine: string;
  readonly troubleOk: string;
} {
  return {
    title: words('paywall.title'),
    line: words('paywall.line'),
    gets: [
      words('paywall.gets.log'),
      words('paywall.gets.forecast'),
      words('paywall.gets.encrypted'),
    ],
    offer: words('paywall.yearly.offer'),
    restore: words('paywall.restore'),
    terms: words('paywall.link.terms'),
    privacy: words('paywall.link.privacy'),
    troubleTitle: words('paywall.trouble.title'),
    troubleLine: words('paywall.trouble.line'),
    troubleOk: words('paywall.trouble.ok'),
  };
}

/** Which of the two plans a row draws, which is how a row picks its own words. */
export type WhichPlan = 'yearly' | 'monthly';

export function whichPlanIs(identifier: string): WhichPlan | null {
  if (identifier === theYearlyPlan.identifier) {
    return 'yearly';
  }

  return identifier === theMonthlyPlan.identifier ? 'monthly' : null;
}

export function thePlanNameOf(which: WhichPlan): string {
  return which === 'yearly' ? words('paywall.yearly.name') : words('paywall.monthly.name');
}

/** The price and the period, in one line, with the figure the store quoted inside it. */
export function thePriceOf(which: WhichPlan, price: string): string {
  return which === 'yearly'
    ? words('paywall.yearly.price', undefined, { price })
    : words('paywall.monthly.price', undefined, { price });
}

/**
 * The line under the price. The yearly row says how long the free month lasts and what is taken
 * when it ends, which is what Apple asks of a trial. The monthly row promises no month at all,
 * because one introductory offer reaches one woman in a subscription group and the yearly plan
 * holds it.
 */
export function theLineUnderThePriceOf(which: WhichPlan, price: string): string {
  return which === 'yearly'
    ? words('paywall.yearly.freeMonth', undefined, { price })
    : words('paywall.monthly.line', undefined, { price });
}

/** The full renewal price, which App Review reads under the button. */
export function theRenewalPriceOf(which: WhichPlan, price: string): string {
  return which === 'yearly'
    ? words('paywall.renewal.yearly', undefined, { price })
    : words('paywall.renewal.monthly', undefined, { price });
}

/** The word on the button, which names the free month only where the free month is hers. */
export function theActionFor(which: WhichPlan, price: string): string {
  return which === 'yearly'
    ? words('paywall.action.yearly')
    : words('paywall.action.monthly', undefined, { price });
}

/** The order the board puts the rows in, the yearly plan first, which is the one selected. */
export const theOrderThePlansAreDrawnIn: readonly WhichPlan[] = ['yearly', 'monthly'];

export interface APlanRow {
  readonly which: WhichPlan;
  readonly plan: APlanInTheStore;
}

/**
 * The rows, in the board's order, from the plans the store named. The Black Friday product is not
 * one of them: the row that offers it waits for the window the operator sets.
 */
export function thePlanRowsOf(named: readonly APlanInTheStore[]): readonly APlanRow[] {
  return theOrderThePlansAreDrawnIn.flatMap((which) => {
    const found = named.find((one) => whichPlanIs(one.product.identifier) === which);

    return found === undefined ? [] : [{ which, plan: found }];
  });
}

/**
 * The two pages App Review asks every subscription to link to. Apple's own standard agreement
 * stands for the terms, which is the document Apple names where an application writes none of its
 * own. The privacy policy is the page of the site, in the language she reads Emi in.
 */
export const THE_TERMS_OF_USE = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

/**
 * The address of that page, with the language left as a hole. The wording gate refuses the host
 * of the website everywhere the application draws from, because guideline 3.1.1(a) refuses an
 * application that points her at another way to pay. This one line is the approved exception, and
 * the gate holds it as written: a privacy policy is the page Apple asks every subscription to
 * link to, and it sells nothing.
 */
export const THE_PRIVACY_POLICY = 'https://myemi.app/{language}/privacy-policy/';

/** Where the hole is filled, so the page she opens is the page in the language she reads. */
export const THE_LANGUAGE_HOLE = '{language}';

export function thePrivacyPolicyAddress(): string {
  return THE_PRIVACY_POLICY.replace(THE_LANGUAGE_HOLE, readingLanguage());
}
