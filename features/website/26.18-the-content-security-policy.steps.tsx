import { join } from 'node:path';

import { defineFeature, loadFeature } from 'jest-cucumber';
import { getScriptNonceFromHeader } from 'next/dist/server/app-render/get-script-nonce-from-header';
import { NextRequest } from 'next/server';
import { renderToStaticMarkup } from 'react-dom/server';

import NotFound from '../../apps/website/app/[lang]/not-found';
import HomePage from '../../apps/website/app/[lang]/page';
import { languages } from '../../apps/website/app/words';
import proxy from '../../apps/website/proxy';
import { moduleDirectory } from '../../infrastructure/modules/nextjs-site/tests/runArtifact';
import { bodyOf, configurationOf } from '../../tools/pipeline/policy';

const feature = loadFeature(join(__dirname, '26.18-the-content-security-policy.feature'));

/** The header the policy travels under, in a request and in a response alike. */
const policyHeader = 'content-security-policy';

/**
 * How Next.js hands a request header on to the page it is about to draw. The function in front of
 * the page lists the headers it set, each one prefixed, and Next.js reads the page's headers back
 * out of that list. So this is where the copy the page is given can be read.
 */
const onTheRequest = `x-middleware-request-${policyHeader}`;

/** The shortest secret this step accepts, in bits, and what a byte of it is worth. */
const SHORTEST_SECRET_IN_BITS = 128;

const BITS_IN_A_BYTE = 8;

/** What a page answers with: the policy her browser reads, and the copy the page is given. */
interface Answered {
  readonly forHer: string;
  readonly forThePage: string;
}

function policiesFor(address: string): Answered {
  const answer = proxy(new NextRequest(new URL(address, 'https://myemi.app')));

  return {
    forHer: answer.headers.get(policyHeader) ?? '',
    forThePage: answer.headers.get(onTheRequest) ?? '',
  };
}

/** One directive of a policy, by name, as the browser splits them. */
function directive(policy: string, named: string): string {
  const found = policy
    .split(';')
    .map((each) => each.trim())
    .find((each) => each.startsWith(`${named} `) || each === named);

  return found ?? '';
}

/** The secret named in a policy, read by the very function Next.js reads it with. */
function secretIn(policy: string): string {
  return getScriptNonceFromHeader(policy) ?? '';
}

/** Every value a markup carries as a style written on an element, or as a block of its own. */
function stylesWrittenInto(markup: string): string[] {
  return [
    ...[...markup.matchAll(/style="[^"]*"/g)].map(([found]) => found),
    ...[...markup.matchAll(/<style[\s>]/g)].map(([found]) => found),
  ];
}

defineFeature(feature, (test) => {
  test('the scripts of the site run under the content security policy', ({
    given,
    when,
    then,
    and,
  }) => {
    let edge = '';
    let first: Answered = { forHer: '', forThePage: '' };
    let second: Answered = { forHer: '', forThePage: '' };

    given('the site Emi serves her pages from', () => {
      edge = bodyOf(
        configurationOf(moduleDirectory),
        'resource "aws_cloudfront_response_headers_policy" "site"',
      );

      expect(edge).toContain('content_security_policy {');
    });

    when('she opens a page of myemi.app', () => {
      first = policiesFor('/en/');
    });

    then('her browser is told to run the scripts that draw the page', () => {
      const secret = secretIn(first.forHer);

      expect(secret).not.toBe('');
      expect(directive(first.forHer, 'script-src')).toContain(`'nonce-${secret}'`);
      // Next.js loads the rest of the page by name from the script that carries the secret, and
      // this is what lets that one go on loading them without naming any of their addresses.
      expect(directive(first.forHer, 'script-src')).toContain(`'strict-dynamic'`);
    });

    and('it is told to run no other script written into the page', () => {
      expect(first.forHer).not.toContain('unsafe-inline');
      expect(first.forHer).not.toContain('unsafe-eval');
      expect(directive(first.forHer, 'object-src')).toBe(`object-src 'none'`);
      expect(directive(first.forHer, 'frame-ancestors')).toBe(`frame-ancestors 'none'`);
    });

    and('the secret is long enough that nobody can guess it before the page arrives', () => {
      const secret = secretIn(first.forHer);
      const bytes = Buffer.from(secret, 'base64');

      expect(bytes.length * BITS_IN_A_BYTE).toBeGreaterThanOrEqual(SHORTEST_SECRET_IN_BITS);
    });

    and('Next.js reads that secret, so the scripts of the page carry it', () => {
      expect(secretIn(first.forThePage)).toBe(secretIn(first.forHer));
    });

    when('she opens a second page', () => {
      second = policiesFor('/en/');
    });

    then(
      "that page carries a secret of its own, so the first page's scripts are dead in it",
      () => {
        expect(secretIn(second.forHer)).not.toBe(secretIn(first.forHer));
        expect(secretIn(second.forThePage)).toBe(secretIn(second.forHer));
      },
    );

    and('no page of the site asks her browser for a style this policy refuses', async () => {
      const pages = [
        renderToStaticMarkup(<NotFound />),
        ...(await Promise.all(
          languages.map(async (language) =>
            renderToStaticMarkup(await HomePage({ params: Promise.resolve({ lang: language }) })),
          ),
        )),
      ];

      expect(directive(first.forHer, 'style-src')).not.toContain('unsafe-inline');
      expect(pages.flatMap(stylesWrittenInto)).toEqual([]);
    });

    and('the edge keeps the policy of the page, and still covers a file from the bucket', () => {
      expect(bodyOf(edge, 'content_security_policy {')).toMatch(/override\s*=\s*false/);
      expect(bodyOf(edge, 'content_security_policy {')).toContain(
        `content_security_policy = "default-src 'self'; frame-ancestors 'none'"`,
      );
    });
  });
});
