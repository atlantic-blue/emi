import type {
  FunctionResponse,
  QueryValue,
  ViewerRequest,
  ViewerRequestEvent,
} from '../src/redirect.ts';
import { handler } from '../src/redirect.ts';

import { cloudFrontAnswer } from './runArtifact.ts';

function asked(
  host: string,
  uri: string,
  querystring: Record<string, QueryValue> = {},
): ViewerRequestEvent {
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
      const event = asked('www.myemi.app', '/en/privacy', { from: { value: 'store' } });

      for (const answer of bothWays(event)) {
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
      expect(locationOf(handler(asked('myemi.app', '/', { from: { value: 'store' } })))).toBe(
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

  describe('the query string she arrived with', () => {
    // request.querystring is an object of keys to { value } or { multiValue }, not a string, so
    // joining it onto an address wrote "?[object Object]" and every link with a query lost it.
    it('is left off entirely when there is none', () => {
      for (const answer of bothWays(asked('www.myemi.app', '/en/'))) {
        expect(locationOf(answer)).toBe('https://myemi.app/en/');
      }
    });

    it('carries one key across', () => {
      const event = asked('www.myemi.app', '/en/', { x: { value: '1' } });

      for (const answer of bothWays(event)) {
        expect(locationOf(answer)).toBe('https://myemi.app/en/?x=1');
      }
    });

    it('carries every value of a key that was asked for more than once', () => {
      const event = asked('www.myemi.app', '/en/', {
        tag: { value: 'one', multiValue: [{ value: 'one' }, { value: 'two' }] },
      });

      for (const answer of bothWays(event)) {
        expect(locationOf(answer)).toBe('https://myemi.app/en/?tag=one&tag=two');
      }
    });

    it('reaches the root redirect too, which is where a store link lands', () => {
      const event = asked('myemi.app', '/', { from: { value: 'store' } });

      for (const answer of bothWays(event)) {
        expect(locationOf(answer)).toBe('https://myemi.app/en/?from=store');
      }
    });

    it('names no object, because that is what the fault looked like', () => {
      const event = asked('www.myemi.app', '/en/', { x: { value: '1' } });

      for (const answer of bothWays(event)) {
        expect(locationOf(answer)).not.toContain('object Object');
      }
    });
  });

  describe('a request that carries no host', () => {
    it('reaches the origin rather than failing, because the distribution matched an alias', () => {
      const answer = handler({ request: { uri: '/en/', querystring: {}, headers: {} } });

      expect((answer as ViewerRequest).uri).toBe('/en/');
    });
  });
});
