/**
 * How anything on the phone reaches the vault, and how long it waits.
 *
 * The sender is a port rather than a call to the platform, so a test drives the real signing and
 * the real reading of the answer over no socket at all.
 */

/** A request as this directory makes one: a method, an address, the signed headers and a body. */
export interface VaultRequest {
  readonly url: string;
  readonly method: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body?: string;
}

/** All a caller is given of the network. */
export type SendRequest = (request: VaultRequest) => Promise<{ readonly status: number }>;

/** The sender the application runs on, which is the platform's own. */
export const fetchSender: SendRequest = async (request) => {
  const answered = await fetch(request.url, {
    method: request.method,
    headers: request.headers,
    ...(request.body === undefined ? {} : { body: request.body }),
  });

  return { status: answered.status };
};

/**
 * The answer, or nothing at all once the wait is over. The request is not cancelled, because a
 * signed request that lands late is a request that landed; it is only stopped from being waited on.
 */
export async function answeredWithin<Answer>(
  sending: Promise<Answer>,
  milliseconds: number,
): Promise<Answer | null> {
  let waited: ReturnType<typeof setTimeout> | undefined = undefined;

  try {
    return await Promise.race([
      sending,
      new Promise<null>((resolve) => {
        waited = setTimeout(() => resolve(null), milliseconds);
      }),
    ]);
  } finally {
    clearTimeout(waited);
  }
}
