import type { Language, SiteWords } from '@/app/words';

import { theDayOf, theDayWritten } from './theNextPeriodRange';
import { THE_API_HOST } from './theTelegramSignIn';

/**
 * What her account page knows about her subscription: one date, one state and the way she paid.
 *
 * The route answers three fields and no more, so nothing here can draw a customer, a card or an
 * amount she was charged. The card she reads is worked out from the date and the state alone.
 */

/** The route her account page reads, behind the token authorizer of the pool. */
export const WHERE_A_SUBSCRIPTION_IS_READ = `${THE_API_HOST}/v1/payments/subscription`;

/** The states the payment record carries, which the service writes and this page reads. */
export type TheStateOfHerPayment = 'active' | 'cancelling' | 'lapsed' | 'refunded';

/** The three fields the route answers. Each one is absent until an event has written it. */
export interface WhatSheHolds {
  readonly paidUntil?: string;
  readonly state?: TheStateOfHerPayment;
  readonly route?: 'card' | 'stars';
}

/** What the card draws, which is one of three things and never two at once. */
export type WhichCardSheReads = 'noSubscription' | 'active' | 'renewalOff';

/** How this module reaches the api. A test hands it one that answers without a network. */
export type HowItAsks = typeof fetch;

/**
 * Which card she reads.
 *
 * A date in the future with the renewal still on is the active card. A date in the future with the
 * renewal stopped, and a date that has passed, are both the card that says the renewal is off:
 * the first because she stopped it, the second because it stopped itself. A record with no date at
 * all is a press that was never finished, so it reads as no subscription.
 */
export function whichCardSheReads(held: WhatSheHolds | null, now: Date): WhichCardSheReads {
  if (held === null || held.paidUntil === undefined || held.state === undefined) {
    return 'noSubscription';
  }

  const until = Date.parse(held.paidUntil);

  if (Number.isNaN(until)) {
    return 'noSubscription';
  }

  return held.state === 'active' && until > now.getTime() ? 'active' : 'renewalOff';
}

/** Whether the date she paid until has passed, which is when she is offered Emi again. */
export function theYearHasRunOut(held: WhatSheHolds | null, now: Date): boolean {
  const until = held?.paidUntil === undefined ? Number.NaN : Date.parse(held.paidUntil);

  return !Number.isNaN(until) && until <= now.getTime();
}

/** The twelve months, under the names the catalogues already give them. */
const monthKeys = [
  'cycleMonthJanuary',
  'cycleMonthFebruary',
  'cycleMonthMarch',
  'cycleMonthApril',
  'cycleMonthMay',
  'cycleMonthJune',
  'cycleMonthJuly',
  'cycleMonthAugust',
  'cycleMonthSeptember',
  'cycleMonthOctober',
  'cycleMonthNovember',
  'cycleMonthDecember',
] as const;

/**
 * The order a date is written in, for each language the site serves. It is a shape rather than a
 * word: English and Russian write the same three parts in the same order, and a catalogue holding
 * both would read as a word somebody forgot to translate.
 */
export const theDateShape: Readonly<Record<Language, string>> = {
  en: '{day} {month} {year}',
  ru: '{day} {month} {year}',
  es: '{day} de {month} de {year}',
};

/**
 * The day she is paid until, written the way her language writes a date. The instant is read into
 * the day her own machine is in, because a date drawn in another zone is another day.
 */
export function theDateWritten(language: Language, words: SiteWords, instant: string): string {
  const day = theDayOf(new Date(Date.parse(instant)));
  const month = monthKeys[day.month - 1];

  return theDateShape[language]
    .replace('{day}', `${day.dayOfMonth}`)
    .replace('{month}', month === undefined ? '' : words[month])
    .replace('{year}', `${day.year}`);
}

/** The day one written day names, kept here so a test can write one without a clock. */
export const theDayNamed = theDayWritten;

interface WhatTheRouteSaid {
  readonly paidUntil?: unknown;
  readonly state?: unknown;
  readonly route?: unknown;
}

const theStates: readonly string[] = ['active', 'cancelling', 'lapsed', 'refunded'];

/**
 * What she holds, or nothing at all where the route would not say. A refusal and a failure read
 * the same to the page: it draws the card of a woman with no subscription rather than an error,
 * because a page that says something is wrong with her payment when nothing is wrong is worse.
 */
export async function theSubscriptionSheHolds(
  idToken: string,
  asks: HowItAsks = fetch,
): Promise<WhatSheHolds | null> {
  let answered: Response;

  try {
    answered = await asks(WHERE_A_SUBSCRIPTION_IS_READ, {
      method: 'GET',
      headers: { authorization: `Bearer ${idToken}` },
    });
  } catch {
    return null;
  }

  if (!answered.ok) {
    return null;
  }

  let said: WhatTheRouteSaid;

  try {
    said = (await answered.json()) as WhatTheRouteSaid;
  } catch {
    return null;
  }

  return {
    ...(typeof said.paidUntil === 'string' ? { paidUntil: said.paidUntil } : {}),
    ...(typeof said.state === 'string' && theStates.includes(said.state)
      ? { state: said.state as TheStateOfHerPayment }
      : {}),
    ...(said.route === 'card' || said.route === 'stars' ? { route: said.route } : {}),
  };
}
