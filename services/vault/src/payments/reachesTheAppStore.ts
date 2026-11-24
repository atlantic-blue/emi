import type { AnsweredByTheAppStore, AskedOfTheAppStore, ReachesTheAppStore } from './appStore';

/**
 * The calls to the App Store Server api, over https.
 *
 * It reads the status and the text and nothing else. A failure that is not an answer travels out as
 * it arrives, because the filing writes nothing at all where Apple was not reached.
 */

/** What this adapter asks of the platform, so a test answers it without a network. */
export type AppStoreFetches = (address: string, asked: RequestInit) => Promise<Response>;

/** The port, bound to one way of reaching the network. */
export function reachesTheAppStore(fetches: AppStoreFetches = fetch): ReachesTheAppStore {
  return async (address: string, asked: AskedOfTheAppStore): Promise<AnsweredByTheAppStore> => {
    const answered = await fetches(address, {
      method: asked.method,
      headers: { ...asked.headers },
    });

    return { status: answered.status, body: await answered.text() };
  };
}
