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
import { coverageOf, featuresMappedIn } from '../../tools/pipeline/featureCoverage';

const feature = loadFeature(join(__dirname, '26.1-the-website-contracts.feature'));

const repositoryRoot = join(__dirname, '..', '..');

/** The six the step writes, in the order it writes them. */
const promised = ['SITE-1', 'SITE-2', 'SITE-3', 'SITE-4', 'SITE-5', 'SITE-6'];

const site = (contract: string): boolean => contract.startsWith('SITE-');

function read(file: string): string {
  return readFileSync(join(repositoryRoot, file), 'utf8');
}

/**
 * What one contract says: its own heading, and everything under it until the next heading, on one
 * line, so a sentence the document wrapped still reads as a sentence.
 */
function saidAbout(markdown: string, contract: string): string {
  const opening = markdown.indexOf(`### ${contract},`);

  if (opening < 0) {
    return '';
  }

  const rest = markdown.slice(opening);
  const next = rest.search(/\n#{2,3} /);

  return (next < 0 ? rest : rest.slice(0, next)).replace(/\s+/g, ' ');
}

defineFeature(feature, (test) => {
  test('every website contract is mapped to a feature', ({ given, when, then, and }) => {
    let contracts = '';
    let features = '';
    let declared: string[] = [];
    let mapped: MappedContract[] = [];
    let ofTheWebsite: string[] = [];

    given('the two documents that carry the contracts of Emi', () => {
      contracts = read(contractDocument);
      features = read(featureDocument);

      declared = contractsDeclaredIn(contracts);
      mapped = contractsMappedIn(features);

      expect(declared.length).toBeGreaterThan(0);
      expect(mapped.length).toBeGreaterThan(0);
    });

    when('the contracts of the website are read', () => {
      ofTheWebsite = declared.filter(site);
    });

    then('the six contracts of the website are declared', () => {
      expect(ofTheWebsite).toEqual(promised);
    });

    and('each one says how it is verified, what it outputs and every error it produces', () => {
      for (const contract of promised) {
        const said = saidAbout(contracts, contract);

        expect(said).toContain('Verified by a test.');
        expect(said).toContain('Output:');
        expect(said).toContain('Errors:');
      }
    });

    and('the map gives each one to one feature, once', () => {
      const owning = featuresMappedIn(features).filter((each) => each.contracts.some(site));

      expect(owning).toHaveLength(1);
      expect(owning.at(0)?.contracts).toEqual(promised);
      expect(owning.at(0)?.title).toContain('myemi.app');
    });

    and('the two checks the pipeline runs over the documents report no problem', () => {
      expect(contractProblems(declared, mapped)).toEqual([]);
      expect(coverageOf(repositoryRoot).problems).toEqual([]);
    });

    and('a contract of the website that the map gives to two features is refused', () => {
      const twice = [...mapped, { contract: 'SITE-1', feature: 'Feature 1' }];

      expect(contractProblems(declared, twice).join(' ')).toContain(
        `${featureDocument} names "SITE-1" under`,
      );
      expect(contractProblems(declared, twice).join(' ')).toContain(
        'and one feature builds a contract',
      );
    });

    and('a contract of the website that the map gives to no feature is refused', () => {
      const dropped = mapped.filter((each) => each.contract !== 'SITE-6');

      expect(contractProblems(declared, dropped)).toContain(
        `${contractDocument} declares "SITE-6", and ${featureDocument} names it under no feature`,
      );
    });
  });
});
