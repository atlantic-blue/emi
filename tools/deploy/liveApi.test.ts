import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { type Answered, notImplemented, readTheLiveApi, refusals } from './liveApi';
import {
  type ApiRoute,
  addressOf,
  apiConfiguration,
  carriesTheAuthorizer,
  nothingIsHere,
  readTheRoutes,
  registrationRoute,
  routesIn,
  routesWithNoAuthorizer,
} from './routes';

/**
 * The live read of the deploy, driven with no api behind it, and the reader that tells it which
 * route to ask. The last step of a deploy is the one that says whether the api answers her phone,
 * so the cases below drive it to the end rather than to the request it sent.
 */

const repositoryRoot = resolve(__dirname, '..', '..');
const configuration = readFileSync(join(repositoryRoot, apiConfiguration), 'utf8');

const theOrigin = 'https://example.execute-api.eu-central-1.amazonaws.com';

interface Asked {
  readonly address: string;
  readonly method: string;
  readonly body: string | undefined;
}

function route(held: Partial<ApiRoute>): ApiRoute {
  return {
    resource: 'pull_records',
    method: 'GET',
    path: '/v1/records',
    authorizationType: 'CUSTOM',
    authorizerId: 'aws_apigatewayv2_authorizer.signature.id',
    ...held,
  };
}

const registration = route({
  resource: registrationRoute,
  method: 'POST',
  path: '/v1/accounts',
  authorizationType: 'NONE',
  authorizerId: null,
});

/** A read that answers each address in turn, and remembers everything it was asked. */
function reading(answers: Readonly<Record<string, number>>, fallback = 401) {
  const asked: Asked[] = [];
  const lines: string[] = [];

  return {
    asked,
    lines,
    read: async (routes: readonly ApiRoute[], origin = theOrigin): Promise<number> =>
      readTheLiveApi({
        origin,
        routes,
        ask: async (address, method, body): Promise<Answered> => {
          asked.push({ address, method, body });

          return { status: answers[address] ?? fallback };
        },
        report: (line) => lines.push(line),
      }),
  };
}

describe('the deploy reads the live api, and requires a refusal', () => {
  describe('the routes it asks, read out of the Terraform that declares them', () => {
    it('reads every route of the api, so the list is never empty by accident', () => {
      const routes = readTheRoutes(repositoryRoot);

      expect(routes.length).toBeGreaterThan(routesWithNoAuthorizer.length);
      expect(routes.map((each) => each.resource)).toContain(registrationRoute);
    });

    it('reads the method and the path of each one, with a path parameter left as a template', () => {
      const routes = readTheRoutes(repositoryRoot);
      const put = routes.find((each) => each.resource === 'put_record');

      expect(put?.method).toBe('PUT');
      expect(put?.path).toBe('/v1/records/{recordId}');
    });

    it('reads the authorization each route declares, by the two fields that make one', () => {
      const routes = readTheRoutes(repositoryRoot);
      const of = (resource: string): ApiRoute | undefined =>
        routes.find((each) => each.resource === resource);

      expect(of('pull_records')?.authorizationType).toBe('CUSTOM');
      expect(of('pull_records')?.authorizerId).toBe('aws_apigatewayv2_authorizer.signature.id');
      expect(of('read_articles')?.authorizationType).toBe('NONE');
      expect(of('read_articles')?.authorizerId).toBeNull();
    });

    it('reads a route that asks for an authorizer and names none as carrying none', () => {
      expect(carriesTheAuthorizer(route({ authorizerId: null }))).toBe(false);
      expect(carriesTheAuthorizer(route({ authorizationType: 'NONE', authorizerId: null }))).toBe(
        false,
      );
      expect(carriesTheAuthorizer(route({}))).toBe(true);
    });

    it('refuses a route whose key is not a method and a path', () => {
      const broken = configuration.replace(
        'route_key          = "GET /v1/records"',
        'route_key          = "whatever"',
      );

      expect(() => routesIn(broken)).toThrow(/carries no route key/);
    });
  });

  describe('the address each request is sent to', () => {
    it('fills a path parameter, because the authorizer answers before any handler reads it', () => {
      expect(addressOf(theOrigin, route({ path: '/v1/records/{recordId}' }))).toBe(
        `${theOrigin}/v1/records/${nothingIsHere}`,
      );
    });

    it('takes the trailing slash off the address Terraform prints for the default stage', () => {
      expect(addressOf(`${theOrigin}/`, route({}))).toBe(`${theOrigin}/v1/records`);
    });
  });

  describe('what it asks of every route the authorizer stands in front of', () => {
    it('sends one unsigned request to each one, and one to the registration', async () => {
      const run = reading({});

      await expect(
        run.read([
          route({}),
          route({ resource: 'delete_account', method: 'DELETE', path: '/v1/account' }),
          registration,
        ]),
      ).resolves.toBe(3);
      expect(run.asked.map((each) => `${each.method} ${each.address}`)).toEqual([
        `GET ${theOrigin}/v1/records`,
        `DELETE ${theOrigin}/v1/account`,
        `POST ${theOrigin}/v1/accounts`,
      ]);
    });

    it('presents no signature, and sends a body to the registration alone', async () => {
      const run = reading({});

      await run.read([route({}), registration]);

      expect(run.asked.map((each) => each.body)).toEqual([undefined, '']);
    });

    it.each(refusals)('takes %s as the refusal it owes', async (status) => {
      const run = reading({ [`${theOrigin}/v1/records`]: status });

      await expect(run.read([route({}), registration])).resolves.toBe(2);
      expect(run.lines[0]).toContain(`${status}, so an unsigned request is refused`);
    });

    it('fails when a route behind the authorizer answers a request nobody signed', async () => {
      const run = reading({ [`${theOrigin}/v1/records`]: 200 });

      await expect(run.read([route({}), registration])).rejects.toThrow(
        /GET \/v1\/records stands behind the authorizer and answered 200/,
      );
    });

    it('asks nothing of a route that carries no authorizer but the registration', async () => {
      const articles = route({
        resource: 'read_articles',
        path: '/v1/articles/{phase}',
        authorizationType: 'NONE',
        authorizerId: null,
      });
      const run = reading({});

      await run.read([route({}), articles, registration]);

      expect(run.asked.map((each) => each.address)).not.toContain(
        `${theOrigin}/v1/articles/${nothingIsHere}`,
      );
    });
  });

  describe('what it asks of the registration, which stands behind nothing', () => {
    it('fails while the placeholder is still the code that answers there', async () => {
      const run = reading({ [`${theOrigin}/v1/accounts`]: notImplemented });

      await expect(run.read([route({}), registration])).rejects.toThrow(
        new RegExp(`POST /v1/accounts answered ${notImplemented}`),
      );
    });

    it('takes the refusal the handler gives an unsigned body, which is not the placeholder', async () => {
      const run = reading({ [`${theOrigin}/v1/accounts`]: 400 });

      await expect(run.read([route({}), registration])).resolves.toBe(2);
      expect(run.lines[1]).toContain('400, so the bundle answers and not the placeholder');
    });

    it('fails where no registration route is declared at all', async () => {
      const run = reading({});

      await expect(run.read([route({})])).rejects.toThrow(
        new RegExp(`declares no ${registrationRoute} route`),
      );
    });
  });

  describe('an empty run, which reads the same as every other pass', () => {
    it('fails when no route carries the authorizer', async () => {
      const run = reading({});

      await expect(run.read([registration])).rejects.toThrow(/carries the authorizer/);
      expect(run.asked).toEqual([]);
    });

    it('fails when the deploy had no api address to read', async () => {
      const run = reading({});

      await expect(run.read([route({}), registration], '  ')).rejects.toThrow(/no api address/);
      expect(run.asked).toEqual([]);
    });
  });
});
