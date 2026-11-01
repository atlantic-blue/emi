import { handler } from '../src/placeholder.ts';

import { lambdaAnswer } from './runArtifact.ts';

describe('the site says it is not ready until a deploy replaces the code', () => {
  it('answers 503, so nobody reads an empty page as the product', () => {
    expect(handler().statusCode).toBe(503);
    expect((lambdaAnswer() as { statusCode: number }).statusCode).toBe(503);
  });

  it('is kept by no cache, so the first real deploy is read at once', () => {
    expect(handler().headers['cache-control']).toBe('no-store');
  });

  it('says in words that the site is not published', () => {
    expect(handler().body).toContain('not published yet');
  });
});
