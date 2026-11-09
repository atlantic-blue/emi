import { type HttpRequestEvent, type HttpResponse, methodOf, refusal } from './api';
import { deleteAccount, accountPath } from './handlers/deleteAccount';
import { pullRecords, recordsPath } from './handlers/pullRecords';
import { putRecord, recordPathPrefix } from './handlers/putRecord';
import { accountsPath, register } from './handlers/register';
import type { AccountDeleteStore, AccountStore } from './store/accounts';
import type { RecordStore } from './store/records';

/**
 * Which handler answers a request, read from the method and the path the api gateway sends.
 *
 * The api gateway answers a path no route names before a function is reached, so the refusal at the
 * end of this file is for the other case: a route that is wired to this function for a path this
 * service does not handle. `POST /v1/sign-in/telegram` is that route today. It is wired here and
 * the sign in gets a function of its own, so this answers it a refusal rather than guessing.
 */

/** What every route of this service is: one event in, one answer out, and no shared state. */
export type SignedRoute = (event: HttpRequestEvent) => Promise<HttpResponse>;

/** The storage the four routes need between them. */
export type VaultStore = AccountStore & RecordStore & AccountDeleteStore;

/** The one answer a path this service does not handle gets. It names no route and no method. */
export const nothingAnswersThatPath = 'nothing answers that path';

/**
 * The four routes, bound to one store. The clock is passed through rather than read inside each
 * handler, so a test moves every route to the same instant with one argument.
 */
export function routesOf(
  store: VaultStore,
  clock: () => Date = () => new Date(),
): Record<string, SignedRoute> {
  return {
    [`POST ${accountsPath}`]: register(store, clock),
    [`PUT ${recordPathPrefix}`]: putRecord(store, clock),
    [`GET ${recordsPath}`]: pullRecords(store),
    [`DELETE ${accountPath}`]: deleteAccount(store),
  };
}

/**
 * The key a request is looked up by. A write carries the identifier of the record in its path, so a
 * put is keyed by the part of the path before it and the handler reads the identifier back itself.
 */
export function routeKeyOf(event: HttpRequestEvent): string {
  const method = methodOf(event);
  const path =
    method === 'PUT' && event.rawPath.startsWith(recordPathPrefix)
      ? recordPathPrefix
      : event.rawPath;

  return `${method} ${path}`;
}

/** The function the api calls, with the four routes bound to one store. */
export function router(store: VaultStore, clock: () => Date = () => new Date()): SignedRoute {
  const routes = routesOf(store, clock);

  return async (event) => {
    const route = routes[routeKeyOf(event)];

    return route === undefined ? refusal(404, nothingAnswersThatPath) : route(event);
  };
}
