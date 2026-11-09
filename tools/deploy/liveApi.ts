import {
  type ApiRoute,
  addressOf,
  apiConfiguration,
  carriesTheAuthorizer,
  registrationRoute,
} from './routes.ts';

/**
 * Reads the live api, which is the last word on a deploy.
 *
 * A bundle that fails to load answers no request at all, and a green upload step says nothing about
 * that. So the deploy asks the api itself: every route the authorizer stands in front of has to
 * refuse a request nobody signed, and the registration has to answer something other than the
 * status the placeholder answers.
 *
 * The read presents no signature and no sign in code, so it writes nothing and it reads nobody. It
 * keeps the status of each answer and no part of a body, so a failure here cannot print anything
 * about a woman into a log of a public repository.
 */

/** What one request answered. The status is all this read keeps. */
export interface Answered {
  readonly status: number;
}

/** How a request is sent, so a test drives this read with no api behind it. */
export type AsksTheApi = (
  address: string,
  method: string,
  body: string | undefined,
) => Promise<Answered>;

export interface LiveRead {
  /** The address the api answers on, which the deploy reads from a Terraform output. */
  readonly origin: string;
  readonly routes: readonly ApiRoute[];
  readonly ask: AsksTheApi;
  readonly report: (line: string) => void;
}

/** What the api gateway answers for a request its authorizer refused. */
export const refusals: readonly number[] = [401, 403];

/** What every placeholder answers, and therefore the one status registration may not give back. */
export const notImplemented = 501;

/**
 * Asks the live api and refuses a deploy it cannot get a refusal from. It returns how many requests
 * it sent, and it throws on the first answer that is not owed.
 *
 * An api with no authorized route fails rather than passing, because a loop over an empty list
 * reports success just the same.
 */
export async function readTheLiveApi(given: LiveRead): Promise<number> {
  const origin = given.origin.trim().replace(/\/+$/, '');

  if (origin === '') {
    throw new Error('this read was given no api address, so it asked the account nothing');
  }

  const authorized = given.routes.filter(carriesTheAuthorizer);

  if (authorized.length === 0) {
    throw new Error(
      `no route of ${apiConfiguration} carries the authorizer, so this read proved nothing`,
    );
  }

  for (const route of authorized) {
    const answered = await given.ask(addressOf(origin, route), route.method, undefined);

    if (!refusals.includes(answered.status)) {
      throw new Error(
        `${route.method} ${route.path} stands behind the authorizer and answered ` +
          `${answered.status} to a request nobody signed, where a refusal is ` +
          `${refusals.join(' or ')}`,
      );
    }

    given.report(
      `${route.method} ${route.path}: ${answered.status}, so an unsigned request is refused`,
    );
  }

  const registration = given.routes.find((route) => route.resource === registrationRoute);

  if (registration === undefined) {
    throw new Error(`${apiConfiguration} declares no ${registrationRoute} route to read`);
  }

  const answered = await given.ask(addressOf(origin, registration), registration.method, '');

  if (answered.status === notImplemented) {
    throw new Error(
      `${registration.method} ${registration.path} answered ${notImplemented}, so the ` +
        'placeholder is still the code that runs there',
    );
  }

  given.report(
    `${registration.method} ${registration.path}: ${answered.status}, so the bundle answers ` +
      'and not the placeholder',
  );

  return authorized.length + 1;
}
