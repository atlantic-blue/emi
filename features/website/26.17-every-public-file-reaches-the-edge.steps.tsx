import { readdirSync, statSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

import { defineFeature, loadFeature } from 'jest-cucumber';

import { ICON_FILE } from '../../apps/website/components/siteHeader';
import { moduleDirectory } from '../../infrastructure/modules/nextjs-site/tests/runArtifact';
import { bodyOf, configurationOf, listedIn } from '../../tools/pipeline/policy';

const feature = loadFeature(join(__dirname, '26.17-every-public-file-reaches-the-edge.feature'));

const repositoryRoot = resolve(__dirname, '..', '..');

/** The two origins the distribution has. One holds files, the other draws pages. */
type Origin = 'the bucket' | 'the function that draws pages';

/**
 * Every address a browser asks this site for a file at. Next.js copies `apps/website/public` into
 * the assets of the build under the same names, and the deploy uploads that whole folder, so each
 * name here is an object in the bucket.
 */
function addressesOfThePublicFolder(): string[] {
  const folder = join(repositoryRoot, 'apps', 'website', 'public');

  return readdirSync(folder, { encoding: 'utf8', recursive: true })
    .filter((entry) => statSync(join(folder, entry)).isFile())
    .map((entry) => `/${entry.split(sep).join('/')}`)
    .sort();
}

/**
 * A CloudFront path pattern, as the edge reads it: `*` stands for any run of characters and `?`
 * for one, and the whole address has to match, not part of it.
 */
function matches(pattern: string, address: string): boolean {
  const asRegExp = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');

  return new RegExp(`^${asRegExp}$`).test(address);
}

defineFeature(feature, (test) => {
  test('every public file reaches the edge', ({ given, when, then, and }) => {
    let sentToTheBucket: string[] = [];
    let files: string[] = [];
    let asked = '';

    /**
     * Which origin answers one address. The edge reads the behaviours it was given in order and
     * takes the first whose pattern matches, and anything no pattern matches falls to the default.
     */
    const answeredBy = (address: string): Origin =>
      sentToTheBucket.some((pattern) => matches(pattern, address))
        ? 'the bucket'
        : 'the function that draws pages';

    given('the site Emi is served from, and the files it keeps beside its pages', () => {
      const site = configurationOf(moduleDirectory);

      sentToTheBucket = listedIn(bodyOf(site, 'locals'), 'asset_paths');
      files = addressesOfThePublicFolder();

      expect(bodyOf(site, 'dynamic "ordered_cache_behavior"')).toContain(
        'for_each = local.asset_paths',
      );
      expect(bodyOf(site, 'default_cache_behavior')).toContain(
        'target_origin_id           = "server"',
      );
      expect(files.length).toBeGreaterThan(0);
    });

    when('her browser asks for the drawing of the name that every page carries', () => {
      asked = ICON_FILE;

      expect(files).toContain(asked);
    });

    then('the bucket answers, so she reads the name of the product at the top of the page', () => {
      expect(answeredBy(asked)).toBe('the bucket');
    });

    and('the bucket answers for every other file the site keeps beside its pages', () => {
      expect(files.filter((file) => answeredBy(file) !== 'the bucket')).toEqual([]);
    });

    and('a file the edge was never told about does not reach her at all', () => {
      const neverListed = '/a-drawing-nobody-put-in-the-list.svg';

      expect(files).not.toContain(neverListed);
      expect(answeredBy(neverListed)).toBe('the function that draws pages');
    });

    and('the page she asked for still comes from the function that draws pages', () => {
      expect(answeredBy('/en/privacy/')).toBe('the function that draws pages');
    });
  });
});
