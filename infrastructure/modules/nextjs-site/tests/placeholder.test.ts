import { handler } from '../src/placeholder.ts';

import { lambdaAnswer } from './runArtifact.ts';

interface Answer {
  readonly statusCode: number;
  readonly headers: Record<string, string>;
  readonly body: string;
}

/**
 * The answer the committed artifact gives, imported and called the way the Lambda runtime calls
 * it. A function url answers 200 with the JSON `null` when a handler returns nothing, so what the
 * handler returns is read here rather than only what the source says it returns.
 */
const fromArtifact = (): Answer => lambdaAnswer() as Answer;

const theLine = 'Emi. Every Month Insights. The site is on its way.';

describe('the site says it is on its way until a deploy replaces the code', () => {
  describe('the answer the function url gives', () => {
    it('is 503, so nobody reads an empty page as the product', () => {
      expect(fromArtifact().statusCode).toBe(503);
      expect(handler().statusCode).toBe(503);
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
