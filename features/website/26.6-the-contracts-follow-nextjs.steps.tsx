import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { defineFeature, loadFeature } from 'jest-cucumber';

import {
  type MappedContract,
  contractDocument,
  contractProblems,
  contractsDeclaredIn,
  contractsMappedIn,
  featureDocument,
} from '../../tools/pipeline/documentation';
import { coverageOf } from '../../tools/pipeline/featureCoverage';

const feature = loadFeature(join(__dirname, '26.6-the-contracts-follow-nextjs.feature'));

const repositoryRoot = join(__dirname, '..', '..');

/** The three the move to Next.js changes, and the six the website declares in all. */
const changed = ['SITE-2', 'SITE-4', 'SITE-5'];

const website = ['SITE-1', 'SITE-2', 'SITE-3', 'SITE-4', 'SITE-5', 'SITE-6'];

/**
 * The wording of the site that was going to be built by a script. Each phrase is searched over the
 * contracts of the website and over the lines of the map that name them, and nowhere else: a
 * TypeScript program still draws the icons, and `BRAND-2` says so.
 */
const retired = [
  'static pages',
  'one stylesheet',
  'by a TypeScript program',
  'on the machine that builds the site',
  'uploads it to the bucket',
];

function read(file: string): string {
  return readFileSync(join(repositoryRoot, file), 'utf8');
}

/** One contract, from its own heading to the next, on one line, so a wrapped sentence reads whole. */
function saidAbout(markdown: string, contract: string): string {
  const opening = markdown.indexOf(`### ${contract},`);

  if (opening < 0) {
    return '';
  }

  const rest = markdown.slice(opening);
  const next = rest.search(/\n#{2,3} /);

  return (next < 0 ? rest : rest.slice(0, next)).replace(/\s+/g, ' ');
}

interface Contract {
  /** What the heading calls it, after the identifier. */
  readonly title: string;
  readonly output: string;
  readonly errors: string;
}

function contractIn(markdown: string, contract: string): Contract {
  const said = saidAbout(markdown, contract);
  const heading = said.slice(0, said.indexOf('Verified')).replace(`### ${contract},`, '');
  const output = said.slice(said.indexOf('Output:'), said.indexOf('Errors:'));

  return {
    title: heading.trim(),
    output,
    errors: said.slice(said.indexOf('Errors:')),
  };
}

/** The line of the map that gives one contract to a feature, with any wrapped part joined back on. */
function mapLineFor(markdown: string, contract: string): string {
  const lines = markdown.split('\n');
  const at = lines.findIndex((line) => line.startsWith(`- \`${contract}\``));

  if (at < 0) {
    return '';
  }

  const wrapped: string[] = [lines[at] as string];

  for (const line of lines.slice(at + 1)) {
    if (!line.startsWith('  ') || line.trim().length === 0) {
      break;
    }

    wrapped.push(line.trim());
  }

  return wrapped.join(' ');
}

defineFeature(feature, (test) => {
  test('the website contracts describe a Next.js site on Lambda', ({ given, when, then, and }) => {
    let contracts = '';
    let features = '';
    let declared: string[] = [];
    let mapped: MappedContract[] = [];
    let parts: Record<string, Contract> = {};

    given('the two documents that carry the contracts of Emi', () => {
      contracts = read(contractDocument);
      features = read(featureDocument);

      declared = contractsDeclaredIn(contracts);
      mapped = contractsMappedIn(features);

      expect(declared.filter((each) => each.startsWith('SITE-'))).toEqual(website);
      expect(mapped.length).toBeGreaterThan(0);
    });

    when('the three contracts the move to Next.js changes are read', () => {
      parts = Object.fromEntries(changed.map((each) => [each, contractIn(contracts, each)]));
    });

    then('the origins are a private bucket of assets and a server function on Lambda', () => {
      const origins = parts['SITE-2'] as Contract;

      expect(origins.title).toBe('the origins');
      expect(origins.output).toContain('private bucket in Amazon S3');
      expect(origins.output).toContain('eu-central-1');
      expect(origins.output).toContain('static assets');
      expect(origins.output).toContain('Amazon Web Services Lambda');
      expect(origins.output).toContain('`AWS_IAM`');
      expect(origins.output).toMatch(
        /Only the Amazon CloudFront distribution reads the bucket and calls the function/,
      );
      expect(origins.output).toContain('origin access control');
    });

    and(
      'a function url with no authentication, and any other caller of the function, are refused',
      () => {
        const origins = parts['SITE-2'] as Contract;

        expect(origins.errors).toContain('public access on the bucket');
        expect(origins.errors).toContain('website endpoint of the bucket turned on');
        expect(origins.errors).toContain('function url with no authentication');
        expect(origins.errors).toMatch(
          /other than the distribution allowed to read the bucket or call the function/,
        );
      },
    );

    and('the pages come from Next.js through OpenNext, with every value from the tokens', () => {
      const pages = parts['SITE-4'] as Contract;

      expect(pages.title).toBe('the pages');
      expect(pages.output).toContain('Next.js App Router');
      expect(pages.output).toContain('Amazon Web Services Lambda');
      expect(pages.output).toContain('OpenNext');
      expect(pages.output).toContain('shadcn');
      expect(pages.output).toContain('React JSX');
      expect(pages.output).toContain('`packages/tokens`');
      expect(pages.output).toMatch(/serves its own fonts/);
    });

    and('a page that reaches another host, and telemetry in the build, are refused', () => {
      const pages = parts['SITE-4'] as Contract;

      expect(pages.errors).toMatch(/colour or a font that is not a token/);
      expect(pages.errors).toContain('any host other than myemi.app');
      expect(pages.errors).toContain('A cookie');
      expect(pages.errors).toMatch(/Next\.js telemetry turned on in the build/);
    });

    and('a merge updates the code of the server function and checks the live site', () => {
      const deploy = parts['SITE-5'] as Contract;

      expect(deploy.title).toBe('the deploy');
      expect(deploy.output).toContain('builds it with OpenNext');
      expect(deploy.output).toContain('updates the code of the server function');
      expect(deploy.output).toContain('uploads the assets to the bucket');
      expect(deploy.output).toContain('clears the cache of the distribution');
      expect(deploy.output).toContain('checks the live site');
    });

    and('a code update from a pull request, and one from a machine, are refused', () => {
      const deploy = parts['SITE-5'] as Contract;

      expect(deploy.errors).toContain('an upload or a code update from a pull request');
      expect(deploy.errors).toContain('an upload or a code update from a machine');
      expect(deploy.errors).toMatch(/password, a key or a token written into the repository/);
    });

    and(
      'nothing about the website still promises pages a program writes on a build machine',
      () => {
        const said = [
          ...website.map((each) => saidAbout(contracts, each)),
          ...website.map((each) => mapLineFor(features, each)),
        ]
          .join(' ')
          .toLowerCase();

        for (const wording of retired) {
          expect(said).not.toContain(wording);
        }
      },
    );

    and('the map names the origins and the Next.js pages', () => {
      expect(mapLineFor(features, 'SITE-2')).toContain('server function');
      expect(mapLineFor(features, 'SITE-4')).toContain('Next.js');
    });

    and('the two checks the pipeline runs over the documents report no problem', () => {
      expect(contractProblems(declared, mapped)).toEqual([]);
      expect(coverageOf(repositoryRoot).problems).toEqual([]);
    });
  });
});
