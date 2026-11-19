/**
 * Stripe, as this page uses it: the library, the two elements it draws, and the one call that
 * confirms what she gave it.
 *
 * The library is loaded from Stripe rather than bundled. Stripe asks for that, a bundled copy
 * stops receiving their fixes, and the page that collects a card is the one page where that
 * matters most. So the script tag is written into the page the first time she needs it.
 *
 * Everything the form calls sits behind the port below, so a test drives the real form against a
 * double and never reaches Stripe.
 */

/** Where the library is loaded from. It may not be copied into the bundle of this site. */
export const THE_STRIPE_LIBRARY = 'https://js.stripe.com/v3/';

/** The host that library is served from, which the content policy of the site names. */
export const THE_STRIPE_SCRIPT_HOST = 'https://js.stripe.com';

/** Where the library calls once it is running, which the content policy names as well. */
export const THE_STRIPE_API_HOST = 'https://api.stripe.com';

/** Where a bank sends her to answer a check, which Stripe draws in a frame of its own. */
export const THE_STRIPE_FRAME_HOST = 'https://hooks.stripe.com';

/**
 * The key the page is built with. It is public by design, which is why a browser may hold it, and
 * it is still not in this repository: the pipeline puts it in at build time from a variable the
 * operator sets. A build with no variable leaves this empty, and the page then draws the plan and
 * no form rather than a form that cannot take a card.
 */
export const thePublishableKey = (): string => process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

/** One element of Stripe, as far as the form drives it. */
export interface AnElementOfStripe {
  mount(into: HTMLElement): void;
  on(event: string, listen: (said: Record<string, unknown>) => void): void;
  destroy(): void;
}

/** The group both elements belong to, which carries the mode and the amount they draw for. */
export interface TheElementsOfTheForm {
  create(kind: 'payment' | 'expressCheckout', options?: Record<string, unknown>): AnElementOfStripe;
  submit(): Promise<{ readonly error?: { readonly message?: string } }>;
}

/**
 * What a confirmation answers with: the setup it finished, or the error Stripe wants her to read.
 *
 * Both are absent where the library itself never arrived, which the page reads as a refusal: no
 * card was taken, so nothing of hers moved.
 */
export interface WhatTheConfirmationSaid {
  readonly error?: { readonly message?: string };
  readonly setupIntent?: { readonly id?: string };
}

/** Stripe, as far as this page uses it. A test hands the form one of these and no library loads. */
export interface TheStripeOnThePage {
  elements(options: Record<string, unknown>): TheElementsOfTheForm;
  confirmSetup(options: Record<string, unknown>): Promise<WhatTheConfirmationSaid>;
}

/** How the form gets hold of Stripe. A test hands it one that answers without a network. */
export type HowStripeArrives = (publishableKey: string) => Promise<TheStripeOnThePage | null>;

interface AWindowWithStripe {
  Stripe?: (publishableKey: string) => TheStripeOnThePage;
}

/**
 * The library, loaded once for the life of the page. A second caller waits on the first load
 * rather than writing a second script tag, and a load that failed is forgotten so the next press
 * tries again.
 */
let loading: Promise<TheStripeOnThePage | null> | null = null;

function theScriptTag(): HTMLScriptElement {
  const held = document.querySelector<HTMLScriptElement>(`script[src="${THE_STRIPE_LIBRARY}"]`);

  if (held !== null) {
    return held;
  }

  const tag = document.createElement('script');

  tag.src = THE_STRIPE_LIBRARY;
  tag.async = true;
  document.head.append(tag);

  return tag;
}

export const stripeArrives: HowStripeArrives = (publishableKey: string) => {
  if (publishableKey.length === 0) {
    return Promise.resolve(null);
  }

  const held = (window as AWindowWithStripe).Stripe;

  if (held !== undefined) {
    return Promise.resolve(held(publishableKey));
  }

  loading =
    loading ??
    new Promise<TheStripeOnThePage | null>((answer) => {
      const tag = theScriptTag();
      const whenItArrives = (): void =>
        answer((window as AWindowWithStripe).Stripe?.(publishableKey) ?? null);

      tag.addEventListener('load', whenItArrives);
      tag.addEventListener('error', () => answer(null));
    }).then((arrived) => {
      if (arrived === null) {
        loading = null;
      }

      return arrived;
    });

  return loading;
};
