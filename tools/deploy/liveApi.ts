import {
  type ApiRoute,
  addressOf,
  apiConfiguration,
  carriesTheAuthorizer,
  registrationRoute,
  theRouteThePreflightReads,
  theSignInRoute,
} from './routes.ts';
import { SITE_ORIGIN } from '../../apps/website/lib/addresses.ts';

/**
 * Reads the live api, which is the last word on a deploy.
 *
 * A bundle that fails to load answers no request at all, and a green upload step says nothing about
 * that. So the deploy asks the api itself: every route the authorizer stands in front of has to
 * refuse a request nobody signed, and the registration has to answer something other than the
 * status the placeholder answers.
 *
 * The last read is the preflight of the sign in, which a browser sends on its own before it sends
 * the sign in. An api that answers no preflight loses the sign in of every woman on the site while
 * every status above stays exactly as it is.
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

/**
 * What one preflight answered, read as the three headers a browser compares and nothing else. A
 * missing header is null, which is what a browser reads when the api names no origin at all.
 */
export interface AnsweredThePreflight {
  readonly allowOrigin: string | null;
  readonly allowMethods: string | null;
  readonly allowHeaders: string | null;
}

/** How a preflight is sent, so a test drives this read with no api behind it. */
export type AsksForThePreflight = (
  address: string,
  origin: string,
  method: string,
  header: string,
) => Promise<AnsweredThePreflight>;

/** The one header the site sends with the sign in, and therefore the one a preflight asks for. */
export const theHeaderTheSiteSends = 'content-type';

/**
 * A header value read as the list it is. A browser takes one name as a list of one, and a star as
 * every name, so both read the same way here.
 */
function allows(answered: string | null, wanted: string): boolean {
  if (answered === null) {
    return false;
  }

  return (
    answered === '*' ||
    answered
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .includes(wanted.toLowerCase())
  );
}

export interface LiveRead {
  /** The address the api answers on, which the deploy reads from a Terraform output. */
  readonly origin: string;
  readonly routes: readonly ApiRoute[];
  readonly ask: AsksTheApi;
  /** How the preflight of the sign in is sent, which is the one browser request this read makes. */
  readonly askThePreflight: AsksForThePreflight;
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
 * The count is every authorized route, the registration, and the one preflight.
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

  await readThePreflightOfTheSignIn(given, origin);

  return authorized.length + 2;
}

/**
 * The preflight the site's browser sends before the sign in, and the answer a browser needs back.
 *
 * A browser sends this request itself, and it refuses the sign in call when the answer does not
 * carry the three headers below. The sign in function then never runs, and nothing reaches a log to
 * say why, so this read sends the preflight the browser sends and reads what it reads.
 *
 * It sends no body and it names no code, so no function is invoked and nothing is written.
 */
async function readThePreflightOfTheSignIn(given: LiveRead, origin: string): Promise<void> {
  const route = theRouteThePreflightReads(given.routes);

  if (route === undefined) {
    throw new Error(`${apiConfiguration} declares no ${theSignInRoute} route to read`);
  }

  const address = addressOf(origin, route);
  const answered = await given.askThePreflight(
    address,
    SITE_ORIGIN,
    route.method,
    theHeaderTheSiteSends,
  );

  if (!allows(answered.allowOrigin, SITE_ORIGIN)) {
    throw new Error(
      `the preflight of ${route.method} ${route.path} from ${SITE_ORIGIN} answered ` +
        `${answered.allowOrigin === null ? 'no allowed origin at all' : `the origin ${answered.allowOrigin}`}, ` +
        'so a browser refuses the sign in before it is sent',
    );
  }

  if (!allows(answered.allowMethods, route.method)) {
    throw new Error(
      `the preflight of ${route.method} ${route.path} from ${SITE_ORIGIN} allows the methods ` +
        `${answered.allowMethods ?? 'none'}, which do not include ${route.method}`,
    );
  }

  if (!allows(answered.allowHeaders, theHeaderTheSiteSends)) {
    throw new Error(
      `the preflight of ${route.method} ${route.path} from ${SITE_ORIGIN} allows the headers ` +
        `${answered.allowHeaders ?? 'none'}, which do not include ${theHeaderTheSiteSends}`,
    );
  }

  given.report(
    `the preflight of ${route.method} ${route.path} from ${SITE_ORIGIN}: ` +
      `${answered.allowOrigin}, ${answered.allowMethods}, ${answered.allowHeaders}, so a browser ` +
      'sends the sign in',
  );
}
