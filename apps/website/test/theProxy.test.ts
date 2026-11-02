import { getScriptNonceFromHeader } from 'next/dist/server/app-render/get-script-nonce-from-header';
import { NextRequest } from 'next/server';

import proxy, { config } from '../proxy';

/**
 * What the site puts in front of every page: the policy her browser is given, and the copy the
 * page is given so that the scripts Next.js writes carry the same secret.
 *
 * The secret is read with the function Next.js reads it with, rather than with a pattern of this
 * file's own. A secret this file could find and Next.js could not would pass here and leave the
 * page blank.
 */

const policyHeader = 'content-security-policy';

/** How Next.js carries a header on to the page: the name it set, prefixed. */
const onTheRequest = `x-middleware-request-${policyHeader}`;

const answerFor = (address: string) =>
  proxy(new NextRequest(new URL(address, 'https://myemi.app')));

const policyOn = (address: string): string => answerFor(address).headers.get(policyHeader) ?? '';

const secretIn = (policy: string): string => getScriptNonceFromHeader(policy) ?? '';

function directive(policy: string, named: string): string {
  return (
    policy
      .split(';')
      .map((each) => each.trim())
      .find((each) => each === named || each.startsWith(`${named} `)) ?? ''
  );
}

describe('the policy a page of the site answers with', () => {
  it('names a secret, so the scripts that draw the page may run', () => {
    const policy = policyOn('/en/');

    expect(secretIn(policy)).not.toBe('');
    expect(directive(policy, 'script-src')).toBe(
      `script-src 'self' 'nonce-${secretIn(policy)}' 'strict-dynamic'`,
    );
  });

  it('allows no inline script and no eval of its own', () => {
    const policy = policyOn('/en/');

    expect(policy).not.toContain('unsafe-inline');
    expect(policy).not.toContain('unsafe-eval');
    expect(policy).not.toContain('unsafe-hashes');
  });

  it('carries a secret of at least 128 bits, which is 16 bytes', () => {
    expect(Buffer.from(secretIn(policyOn('/en/')), 'base64').length).toBeGreaterThanOrEqual(16);
  });

  it('carries a different secret on every answer', () => {
    const secrets = new Set(Array.from({ length: 8 }, () => secretIn(policyOn('/en/'))));

    expect(secrets.size).toBe(8);
  });

  it('hands the same secret to the page, which is where Next.js reads it', () => {
    const answer = answerFor('/en/');
    const forHer = answer.headers.get(policyHeader) ?? '';
    const forThePage = answer.headers.get(onTheRequest) ?? '';

    expect(secretIn(forThePage)).toBe(secretIn(forHer));
    expect(forThePage).toBe(forHer);
  });

  it('holds the page to this origin, to no frame and to no plugin', () => {
    const policy = policyOn('/en/');

    expect(directive(policy, 'default-src')).toBe(`default-src 'self'`);
    expect(directive(policy, 'frame-ancestors')).toBe(`frame-ancestors 'none'`);
    expect(directive(policy, 'object-src')).toBe(`object-src 'none'`);
    expect(directive(policy, 'base-uri')).toBe(`base-uri 'self'`);
    expect(directive(policy, 'form-action')).toBe(`form-action 'self'`);
    expect(directive(policy, 'connect-src')).toBe(`connect-src 'self'`);
    expect(directive(policy, 'font-src')).toBe(`font-src 'self'`);
  });

  it('lets a page draw a picture this site serves, and one written into the markup', () => {
    expect(directive(policyOn('/en/'), 'img-src')).toBe(`img-src 'self' data:`);
  });

  it('names a secret for a style, so a stylesheet of this site is not refused with the rest', () => {
    const policy = policyOn('/en/');

    expect(directive(policy, 'style-src')).toBe(`style-src 'self' 'nonce-${secretIn(policy)}'`);
  });
});

describe('which requests it answers for', () => {
  /** Every address the matcher of the proxy lets through, read as the edge reads it. */
  const reaches = (address: string): boolean => {
    expect(config.matcher.length).toBeGreaterThan(0);

    return config.matcher.some((pattern) => new RegExp(`^${pattern}$`).test(address));
  };

  it.each(['/en/', '/ru/', '/es/', '/en/privacy/', '/nothing/'])(
    'answers for %s, which is a page',
    (address) => {
      expect(reaches(address)).toBe(true);
    },
  );

  it.each([
    '/_next/static/chunks/main.js',
    '/_next/image',
    '/emi-wordmark.svg',
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml',
  ])('leaves %s alone, because the bucket answers it under the policy of the edge', (address) => {
    expect(reaches(address)).toBe(false);
  });
});
