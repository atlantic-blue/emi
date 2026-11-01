import { handler } from '../src/placeholder.ts';

import { lambdaInvocation } from './runArtifact.ts';

interface Answer {
  readonly statusCode: number;
  readonly headers: Record<string, string>;
  readonly body: string;
}

const invoked = lambdaInvocation();

/** The answer the committed artifact gives, after the call is awaited the way the runtime awaits it. */
const fromArtifact = (): Answer => invoked.answer as Answer;

const theLine = 'Emi. Every Month Insights. The site is on its way.';

describe('the site says it is on its way until a deploy replaces the code', () => {
  describe('the shape the Lambda runtime needs, which decides whether the answer is kept at all', () => {
    // The runtime keeps what a handler returns only when the call gives back a promise. A plain
    // function is run, its value is dropped, and the invocation finishes with null, which the
    // function url answered as 200 with the body null while this file read 503 on import.
    it('exports a handler whose call gives back a promise', () => {
      expect(invoked.returnsPromise).toBe(true);
      expect(invoked.kind).toBe('AsyncFunction');
    });

    it('carries the answer in that promise rather than beside it', async () => {
      await expect(handler()).resolves.toMatchObject({ statusCode: 503 });
    });
  });

  describe('the answer the function url gives', () => {
    it('is 503, so nobody reads an empty page as the product', () => {
      expect(fromArtifact().statusCode).toBe(503);
    });

    it('is a page and not a payload, so a browser draws it', () => {
      expect(fromArtifact().headers['content-type']).toBe('text/html; charset=utf-8');
    });

    it('is kept by no cache, so the first real deploy is read at once', () => {
      expect(fromArtifact().headers['cache-control']).toBe('no-store');
    });

    it('says the one line a reader is left with', () => {
      expect(fromArtifact().body).toContain(theLine);
    });
  });

  describe('the page itself', () => {
    const page = (): string => fromArtifact().body;

    it('names the language it is written in, so a reader is read to correctly', () => {
      expect(page()).toContain('<html lang="en">');
    });

    it('is titled Emi', () => {
      expect(page()).toContain('<title>Emi</title>');
    });

    it('runs nothing and reaches no other host, because this page is served before the site', () => {
      expect(page()).not.toContain('<script');
      expect(page()).not.toContain('<link');
      expect(page()).not.toContain('http://');
      expect(page()).not.toContain('https://');
    });

    it('carries no colour, because a colour belongs in the tokens', () => {
      expect(page()).not.toContain('#');
      expect(page()).not.toContain('style=');
      expect(page()).not.toContain('<style');
    });
  });
});
