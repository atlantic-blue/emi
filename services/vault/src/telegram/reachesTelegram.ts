import type { AnsweredBy, AskedOf, ReachesTelegram } from './exchange';

/**
 * The two calls to Telegram, over https.
 *
 * It reads the status and the text and nothing else. A failure that is not an answer travels out
 * as it arrives, because the sign in refuses a code it could not exchange the same way whatever
 * stopped the exchange.
 */

/** What this adapter asks of the platform, so a test answers it without a network. */
export type Fetches = (address: string, asked: RequestInit) => Promise<Response>;

/** The port, bound to one way of reaching the network. */
export function reachesTelegram(fetches: Fetches = fetch): ReachesTelegram {
  return async (address: string, asked: AskedOf): Promise<AnsweredBy> => {
    const answered = await fetches(address, {
      method: asked.method,
      headers: { ...asked.headers },
      ...(asked.body === undefined ? {} : { body: asked.body }),
    });

    return { status: answered.status, body: await answered.text() };
  };
}
