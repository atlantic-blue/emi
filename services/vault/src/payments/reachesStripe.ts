import type { AnsweredByStripe, AskedOfStripe, ReachesStripe } from './stripe';

/**
 * The calls to Stripe, over https.
 *
 * It reads the status and the text and nothing else. A failure that is not an answer travels out
 * as it arrives, because the start refuses a press it could not finish the same way whatever
 * stopped it.
 */

/** What this adapter asks of the platform, so a test answers it without a network. */
export type StripeFetches = (address: string, asked: RequestInit) => Promise<Response>;

/** The port, bound to one way of reaching the network. */
export function reachesStripe(fetches: StripeFetches = fetch): ReachesStripe {
  return async (address: string, asked: AskedOfStripe): Promise<AnsweredByStripe> => {
    const answered = await fetches(address, {
      method: asked.method,
      headers: { ...asked.headers },
      body: asked.body,
    });

    return { status: answered.status, body: await answered.text() };
  };
}
