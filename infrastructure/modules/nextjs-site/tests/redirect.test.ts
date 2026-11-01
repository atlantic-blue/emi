import type { FunctionResponse, ViewerRequest, ViewerRequestEvent } from '../src/redirect.ts';
import { handler } from '../src/redirect.ts';

import { cloudFrontAnswer } from './runArtifact.ts';

function asked(host: string, uri: string, querystring = ''): ViewerRequestEvent {
  return { request: { uri, querystring, headers: { host: { value: host } } } };
}

const locationOf = (answer: unknown): string =>
  (answer as FunctionResponse).headers.location?.value ?? '';

const statusOf = (answer: unknown): number => (answer as FunctionResponse).statusCode;

/** The same case through the source and through the artifact CloudFront evaluates. */
const bothWays = (event: ViewerRequestEvent): readonly unknown[] => [
  handler(event),
  cloudFrontAnswer(event),
];

describe('one address answers for the site, and the origin is told which one she typed', () => {
  describe('www moves to the address on the record', () => {
    it('keeps the path she asked for', () => {
      for (const answer of bothWays(asked('www.myemi.app', '/en/'))) {
        expect(statusOf(answer)).toBe(301);
        expect(locationOf(answer)).toBe('https://myemi.app/en/');
      }
    });

    it('keeps the query string too, so a link with one is not cut in half', () => {
      for (const answer of bothWays(asked('www.myemi.app', '/en/privacy', 'from=store'))) {
        expect(locationOf(answer)).toBe('https://myemi.app/en/privacy?from=store');
      }
    });

    it('says moved permanently, so a browser and a search engine both stop asking', () => {
      const answer = handler(asked('www.myemi.app', '/'));

      expect((answer as FunctionResponse).statusDescription).toBe('Moved Permanently');
    });
  });

  describe('the root moves to a language, because no page lives above one', () => {
    it('sends the root to the default language', () => {
      for (const answer of bothWays(asked('myemi.app', '/'))) {
        expect(statusOf(answer)).toBe(301);
        expect(locationOf(answer)).toBe('https://myemi.app/en/');
      }
    });

    it('carries a query string across', () => {
      expect(locationOf(handler(asked('myemi.app', '/', 'from=store')))).toBe(
        'https://myemi.app/en/?from=store',
      );
    });
  });

  describe('a page passes through', () => {
    it('reaches the origin rather than answering at the edge', () => {
      for (const answer of bothWays(asked('myemi.app', '/en/'))) {
        expect((answer as FunctionResponse).statusCode).toBeUndefined();
        expect((answer as ViewerRequest).uri).toBe('/en/');
      }
    });

    it('tells the origin the host she typed, which the origin request policy removes', () => {
      for (const answer of bothWays(asked('myemi.app', '/en/privacy'))) {
        expect((answer as ViewerRequest).headers['x-forwarded-host']).toEqual({
          value: 'myemi.app',
        });
      }
    });
  });

  describe('every address it names is an https address', () => {
    it.each([
      ['www.myemi.app', '/en/'],
      ['www.myemi.app', '/'],
      ['myemi.app', '/'],
    ])('names https when %s asks for %s', (host, uri) => {
      for (const answer of bothWays(asked(host, uri))) {
        expect(locationOf(answer).startsWith('https://')).toBe(true);
      }
    });
  });

  describe('a request that carries no host', () => {
    it('reaches the origin rather than failing, because the distribution matched an alias', () => {
      const answer = handler({ request: { uri: '/en/', querystring: '', headers: {} } });

      expect((answer as ViewerRequest).uri).toBe('/en/');
    });
  });
});
