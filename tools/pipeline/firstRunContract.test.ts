import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { contractDocument, featureDocument } from './documentation';
import {
  contractSectionsIn,
  firstRunDesign,
  firstRunProblems,
  firstRunProblemsOf,
  requiredWording,
  retiredWording,
  sectionFor,
  wordsOf,
} from './firstRunContract';

const repositoryRoot = resolve(__dirname, '..', '..');

function document(file: string): string {
  return readFileSync(join(repositoryRoot, file), 'utf8');
}

const design = document(firstRunDesign);
const contracts = document(contractDocument);
const features = document(featureDocument);

describe('the contract for the first run names the hold as the only write', () => {
  const shipped = firstRunProblemsOf(repositoryRoot);

  it('reads both documents, so a read of nothing is not taken for agreement', () => {
    expect(shipped.designSections).toBeGreaterThan(0);
    expect(shipped.contractSections).toBeGreaterThan(20);
  });

  it('finds nothing to report in the repository', () => {
    expect(shipped.problems).toEqual([]);
  });

  describe('SCREEN-1 as the two documents write it', () => {
    it('is the same words in the contracts and in the design', () => {
      const inContracts = sectionFor(contractSectionsIn(contracts), 'SCREEN-1');
      const inDesign = sectionFor(contractSectionsIn(design), 'SCREEN-1');

      expect(inContracts).not.toBeNull();
      expect(wordsOf(inContracts as string)).toBe(wordsOf(inDesign as string));
    });

    it('says the answers are written in one transaction at the hold', () => {
      const said = wordsOf(sectionFor(contractSectionsIn(contracts), 'SCREEN-1') as string);

      expect(said).toContain('written in one transaction at the hold');
      expect(said).toContain('Anything written before the hold');
    });

    it('holds the first run to eleven questions and five other screens, and no longer to three', () => {
      const said = wordsOf(sectionFor(contractSectionsIn(contracts), 'SCREEN-1') as string);

      expect(said).toContain('at most eleven questions and five other screens');

      for (const wording of retiredWording) {
        expect(said.toLowerCase()).not.toContain(wording);
      }
    });

    it('asks for no account, no email address and no password, as it always did', () => {
      const said = wordsOf(sectionFor(contractSectionsIn(contracts), 'SCREEN-1') as string);

      expect(said).toContain('An account, an email address or a password asked for');
    });
  });

  describe('where her answers land', () => {
    it('declares TABLE-5, the table that holds one sealed profile', () => {
      const said = wordsOf(sectionFor(contractSectionsIn(contracts), 'TABLE-5') as string);

      expect(said).toContain('one table that holds at most one row');
      expect(said).toContain('a second row');
    });

    it('gives TABLE-5 to exactly one feature of the map', () => {
      expect(features.match(/`TABLE-5`/g)).toHaveLength(1);
    });

    it('names the profile record in ENVELOPE-2, beside the day record', () => {
      const said = wordsOf(sectionFor(contractSectionsIn(contracts), 'ENVELOPE-2') as string);

      expect(said).toContain('the day record, and the profile record');
      expect(said).toContain('In a profile record');
    });
  });

  describe('the drift each check is written against', () => {
    const staleScreenOne = contracts.replace(
      /Output: at most eleven questions[\s\S]*?at the hold\./,
      'Output: three screens, ending with her last period recorded.',
    );

    it('names SCREEN-1 when the contracts keep wording the design took off it', () => {
      expect(staleScreenOne.length).toBeLessThan(contracts.length);

      const said = firstRunProblems(design, staleScreenOne, features).problems.join('\n');

      expect(said).toContain('disagree about SCREEN-1');
      expect(said).toContain('still says "three screens"');
    });

    it('names each wording the hold needs when SCREEN-1 goes quiet about it', () => {
      const quiet = contracts
        .replace('written in one transaction at the hold.', 'written as she answers.')
        .replace('Anything written before the hold.', 'Anything written twice.');

      const said = firstRunProblems(design, quiet, features).problems.join('\n');

      for (const wording of requiredWording) {
        expect(said).toContain(`never says "${wording}"`);
      }
    });

    it('names ENVELOPE-2 when its input carries only a day', () => {
      const dayOnly = contracts.replace(
        /Input: the fields of the design[\s\S]*?apart at all\./,
        'Input: the fields of the design, as canonical JSON with sorted keys and no whitespace.',
      );

      expect(dayOnly).not.toBe(contracts);

      const said = firstRunProblems(design, dayOnly, features).problems.join('\n');

      expect(said).toContain('the input of ENVELOPE-2 never names the profile record');
    });

    it('names TABLE-5 when the contracts declare it and the map gives it to nobody', () => {
      const unmapped = features.replace(/^- `TABLE-5`.*$/m, '- nothing.');
      const said = firstRunProblems(design, contracts, unmapped).problems.join('\n');

      expect(unmapped).not.toBe(features);
      expect(said).toContain('gives TABLE-5 to no feature');
    });

    it('names TABLE-5 when two features both claim it', () => {
      const twice = features.replace(
        '- `TABLE-5` the profile table',
        '- `TABLE-5` the profile table, claimed here as well.\n- `TABLE-5` the profile table',
      );

      const said = firstRunProblems(design, contracts, twice).problems.join('\n');

      expect(said).toContain('and one feature builds a contract');
    });

    it('refuses a document with no contract written out, rather than reading it as agreement', () => {
      const empty = firstRunProblems('# nothing here\n', '# nothing here\n', '# nothing here\n');

      expect(empty.designSections).toBe(0);
      expect(empty.contractSections).toBe(0);
      expect(empty.problems.join('\n')).toContain('writes out no SCREEN-1');
      expect(empty.problems.join('\n')).toContain('declares no SCREEN-1');
      expect(empty.problems.join('\n')).toContain('declares no TABLE-5');
    });
  });
});
