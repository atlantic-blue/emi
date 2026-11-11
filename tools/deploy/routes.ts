import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { bodyOf } from '../pipeline/policy.ts';

/**
 * The routes of the api, read out of the Terraform that declares them.
 *
 * One reader, used by the live read of the deploy and by the infrastructure test. A route added to
 * `infra/api.tf` is therefore a route the deploy sends an unsigned request to, with nothing to
 * remember and no second list to keep in step.
 */

export interface ApiRoute {
  /** The resource in `infra/api.tf` that declares the route. */
  readonly resource: string;
  /** The method of the route key, which is the word before the path. */
  readonly method: string;
  /** The path of the route key, with a path parameter still written as a template. */
  readonly path: string;
  /** What the route sets, which is CUSTOM for a route the authorizer stands in front of. */
  readonly authorizationType: string;
  /** The authorizer the route names, or null where it names none. */
  readonly authorizerId: string | null;
}

/** The file that declares every route, read from the root of the repository. */
export const apiConfiguration = 'infra/api.tf';

/**
 * The routes that carry no authorizer, each named rather than matched, so a fourth one fails the
 * infrastructure test rather than opening a way into the account.
 *
 * Registration carries none because the account does not exist yet, so there is no stored key to
 * check a signature against. The sign in carries none because a woman reaching an account from a
 * new phone holds no device key for it. The article read carries none because a request says which
 * phase is read and never who is reading it.
 */
export const routesWithNoAuthorizer: readonly string[] = [
  'register',
  'sign_in_telegram',
  'read_articles',
];

/** The registration route, which the live read asks for a status that is not the placeholder's. */
export const registrationRoute = 'register';

/** What a path parameter is filled with. The authorizer answers before any handler reads it. */
export const nothingIsHere = 'nothing-is-here';

export function routesIn(configuration: string): ApiRoute[] {
  const headers = [...configuration.matchAll(/resource "aws_apigatewayv2_route" "(\w+)"/g)];

  return headers.flatMap((header) => {
    const resource = header[1];

    if (resource === undefined) {
      return [];
    }

    const body = bodyOf(configuration, `resource "aws_apigatewayv2_route" "${resource}"`);
    const key = /route_key\s*=\s*"(\w+) (\S+)"/.exec(body);

    if (key?.[1] === undefined || key[2] === undefined) {
      throw new Error(`the route ${resource} carries no route key of a method and a path`);
    }

    return [
      {
        resource,
        method: key[1],
        path: key[2],
        authorizationType: /authorization_type\s*=\s*"([^"]*)"/.exec(body)?.[1] ?? '',
        authorizerId: /authorizer_id\s*=\s*(\S+)/.exec(body)?.[1] ?? null,
      },
    ];
  });
}

export function readTheRoutes(repositoryRoot: string): ApiRoute[] {
  return routesIn(readFileSync(join(repositoryRoot, apiConfiguration), 'utf8'));
}

/**
 * True where the request authorizer stands in front of a route. Both halves are read: a route that
 * asks for a custom authorizer and names none is refused by the api gateway rather than guarded.
 */
export function carriesTheAuthorizer(route: ApiRoute): boolean {
  return route.authorizationType === 'CUSTOM' && route.authorizerId !== null;
}

/** The address one route answers on, with every path parameter filled. */
export function addressOf(origin: string, route: ApiRoute): string {
  return `${origin.replace(/\/+$/, '')}${route.path.replace(/\{[^}]+\}/g, nothingIsHere)}`;
}

/**
 * The sign in route, which the live read sends a preflight to. The browser calls it from the site
 * and not from the api address, so it is the one route of this api whose preflight a woman's sign
 * in depends on.
 */
export const theSignInRoute = 'sign_in_telegram';

/** The route the live read sends its preflight to, or nothing where the api declares none. */
export function theRouteThePreflightReads(routes: readonly ApiRoute[]): ApiRoute | undefined {
  return routes.find((route) => route.resource === theSignInRoute);
}
