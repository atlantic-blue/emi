import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import {
  type FeatureFile,
  type MappedFeature,
  contractNamedIn,
  coverageProblems,
  featureFileIn,
  featuresMappedIn,
} from './featureCoverage';
import { type LongTermItem, longTermItemsIn } from './documentation';

const repositoryRoot = resolve(__dirname, '..', '..');
const command = join(repositoryRoot, 'tools', 'pipeline', 'checkFeatureCoverage.ts');

const aMap = `# The features

## Feature 2: She opens Emi and logs her first period

The contracts it builds:

- \`TABLE-1\` the day log table.
- \`SCREEN-1\` the first run, in three screens.

## Feature 3: Emi predicts, and says how sure it is

The contracts it builds:

- \`CYCLE-1\` a cycle starts on the first bleeding day.
`;

const aFeatureFile = `Feature: She opens Emi and logs her first period

  Scenario: TABLE-1, her phone keeps the day she logged
    Given a day log table with nothing in it

  Scenario: SCREEN-1, her first run ends on the home screen
    Given she has never opened Emi before
`;

function featuresOf(markdown = aMap): MappedFeature[] {
  return featuresMappedIn(markdown);
}

function fileOf(contents = aFeatureFile, number = 2): FeatureFile {
  return {
    ...featureFileIn('features/2-she-logs-her-first-period.feature', contents),
    number,
  };
}

function runTheCommandIn(root: string): { status: number | null; output: string } {
  const run = spawnSync(
    process.execPath,
    ['--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', command, root],
    { encoding: 'utf8' },
  );

  return { status: run.status, output: `${run.stdout}${run.stderr}` };
}

function aRepositoryHolding(map: string, features: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'emi-feature-coverage-'));

  mkdirSync(join(root, 'docs'), { recursive: true });
  writeFileSync(join(root, 'docs', 'features.md'), map);
  mkdirSync(join(root, 'features'), { recursive: true });

  for (const [name, contents] of Object.entries(features)) {
    writeFileSync(join(root, 'features', name), contents);
  }

  return root;
}

describe('the map is read as features, each with the contracts it owns', () => {
  it('reads the number, the title and the contracts of each feature', () => {
    expect(featuresOf()).toEqual([
      {
        number: 2,
        title: 'She opens Emi and logs her first period',
        contracts: ['TABLE-1', 'SCREEN-1'],
      },
      { number: 3, title: 'Emi predicts, and says how sure it is', contracts: ['CYCLE-1'] },
    ]);
  });
});

describe('a feature file is read as its title and its scenarios', () => {
  it('reads the title once and every scenario under it', () => {
    expect(featureFileIn('features/2-x.feature', aFeatureFile)).toEqual({
      file: 'features/2-x.feature',
      title: 'She opens Emi and logs her first period',
      scenarios: [
        'TABLE-1, her phone keeps the day she logged',
        'SCREEN-1, her first run ends on the home screen',
      ],
    });
  });

  it('takes the contract from the identifier a scenario opens with, and nothing else', () => {
    expect(contractNamedIn('TABLE-1, her phone keeps the day')).toBe('TABLE-1');
    expect(contractNamedIn('ENVELOPE-12, the record format')).toBe('ENVELOPE-12');
    expect(contractNamedIn('she logs a day and the ring moves')).toBeNull();
    expect(contractNamedIn('a day that mentions TABLE-1 halfway through')).toBeNull();
  });
});

describe('the coverage report', () => {
  it('counts the features covered and the contracts the scenarios name', () => {
    const result = coverageProblems(featuresOf(), [fileOf()]);

    expect(result.problems).toEqual([]);
    expect(result).toMatchObject({
      featuresCovered: 1,
      featuresTotal: 2,
      scenarios: 2,
      contractsNamed: 2,
    });
  });

  it('names a feature with no file of its own, and does not fail for it', () => {
    const result = coverageProblems(featuresOf(), [fileOf()]);

    expect(result.notes).toEqual([
      'feature 3, Emi predicts, and says how sure it is, has no file under features/ yet',
    ]);
    expect(result.problems).toEqual([]);
  });

  it('fails a contract of a covered feature that no scenario names', () => {
    const missing = aFeatureFile.replace(/\n  Scenario: SCREEN-1[\s\S]*$/, '\n');

    const result = coverageProblems(featuresOf(), [fileOf(missing)]);

    expect(result.problems).toEqual([
      'docs/features.md gives "SCREEN-1" to feature 2, and features/2-she-logs-her-first-period.feature holds no scenario named for it',
    ]);
  });

  it('fails a scenario that opens with no contract at all', () => {
    const unnamed = `${aFeatureFile}\n  Scenario: she logs a day and the ring moves\n    Given a phone\n`;

    expect(coverageProblems(featuresOf(), [fileOf(unnamed)]).problems).toEqual([
      'features/2-she-logs-her-first-period.feature holds a scenario named "she logs a day and the ring moves", which opens with no contract, so nobody can get to it from docs/features.md',
    ]);
  });

  it('fails a scenario naming a contract that belongs to another feature', () => {
    const borrowed = `${aFeatureFile}\n  Scenario: CYCLE-1, a cycle starts on a bleeding day\n    Given a phone\n`;

    expect(coverageProblems(featuresOf(), [fileOf(borrowed)]).problems).toEqual([
      'features/2-she-logs-her-first-period.feature names "CYCLE-1", and docs/features.md does not give that contract to feature 2',
    ]);
  });

  it('fails a file whose title has drifted from the map', () => {
    const renamed = aFeatureFile.replace('Feature: She opens Emi', 'Feature: She opens something');

    expect(coverageProblems(featuresOf(), [fileOf(renamed)]).problems).toEqual([
      'features/2-she-logs-her-first-period.feature opens "Feature: She opens something and logs her first period", and docs/features.md calls feature 2 "She opens Emi and logs her first period"',
    ]);
  });

  it('fails a file numbered for a feature the map does not name', () => {
    expect(coverageProblems(featuresOf(), [fileOf(aFeatureFile, 9)]).problems).toEqual([
      'features/2-she-logs-her-first-period.feature is named for feature 9, and docs/features.md names no such feature',
    ]);
  });

  it('refuses a tier with no feature file, because a run of it would be empty', () => {
    const result = coverageProblems(featuresOf(), []);

    expect(result.problems).toEqual([
      'features/ holds no feature file, so the behaviour tier proves nothing and a run of it is empty',
    ]);
    expect(result.scenarios).toBe(0);
  });

  it('refuses a tier whose files hold no scenario, for the same reason', () => {
    const empty = 'Feature: She opens Emi and logs her first period\n';

    expect(coverageProblems(featuresOf(), [fileOf(empty)]).problems).toContain(
      'features/ holds no scenario, so the behaviour tier runs nothing and a run of it is empty',
    );
  });
});

const aLongTermList = `## The long term list

### Core cycle tracking

- Period start and end logging. State: in version 1, \`TABLE-1\`.
- Premenstrual syndrome prediction. State: planned.

### Insight

- A conversational assistant. State: conditional. A model must answer on the phone.
`;

describe('the report reads the long term list beside the map', () => {
  const longTermOf = (markdown = aLongTermList): LongTermItem[] => longTermItemsIn(markdown);

  it('counts the items, the groups and each of the three states', () => {
    const result = coverageProblems(featuresOf(), [fileOf()], longTermOf());

    expect(result).toMatchObject({
      longTermItems: 3,
      longTermGroups: 2,
      longTermInVersionOne: 1,
      longTermPlanned: 1,
      longTermConditional: 1,
    });
    expect(result.problems).toEqual([]);
  });

  it('names every planned item as having no feature file, and does not fail for it', () => {
    const result = coverageProblems(featuresOf(), [fileOf()], longTermOf());

    expect(result.notes).toContain(
      'the long term list says "Premenstrual syndrome prediction." is planned, so no file under features/ covers it',
    );
    expect(result.problems).toEqual([]);
  });

  it('says nothing about a conditional item, because nobody agreed to build it', () => {
    const notes = coverageProblems(featuresOf(), [fileOf()], longTermOf()).notes.join(' ');

    expect(notes).not.toContain('A conversational assistant.');
  });

  it('fails an item in version 1 whose contract the map gives to no feature', () => {
    const borrowed = aLongTermList.replace('`TABLE-1`', '`WIRE-1`');

    expect(coverageProblems(featuresOf(), [fileOf()], longTermOf(borrowed)).problems).toEqual([
      'the long term list says "Period start and end logging." is in version 1 and names "WIRE-1", and docs/features.md gives that contract to no feature',
    ]);
  });

  it('keeps an item in version 1 whose contract no scenario names a failure', () => {
    const missing = aFeatureFile.replace(/\n  Scenario: TABLE-1[\s\S]*?(?=\n  Scenario)/, '\n');

    const result = coverageProblems(featuresOf(), [fileOf(missing)], longTermOf());

    expect(result.problems).toEqual([
      'docs/features.md gives "TABLE-1" to feature 2, and features/2-she-logs-her-first-period.feature holds no scenario named for it',
    ]);
    expect(result.notes.join(' ')).not.toContain('Period start and end logging.');
  });

  it('refuses an empty tier even when the long term list is full', () => {
    const result = coverageProblems(featuresOf(), [], longTermOf());

    expect(result.problems).toEqual([
      'features/ holds no feature file, so the behaviour tier proves nothing and a run of it is empty',
    ]);
    expect(result.longTermItems).toBe(3);
  });

  it('counts nothing where the map carries no long term list', () => {
    expect(coverageProblems(featuresOf(), [fileOf()])).toMatchObject({
      longTermItems: 0,
      longTermGroups: 0,
    });
  });
});

describe('the command the pipeline runs', () => {
  let root: string;

  afterEach(() => {
    rmSync(root, { force: true, recursive: true });
  });

  it('reports the counts and passes when every covered contract has a scenario', () => {
    root = aRepositoryHolding(aMap, { '2-she-logs-her-first-period.feature': aFeatureFile });

    const run = runTheCommandIn(root);

    expect(run.output).toContain('1 of 2 feature(s) covered, 2 scenario(s) naming 2 contract(s).');
    expect(run.output).toContain('feature 3, Emi predicts, and says how sure it is, has no file');
    expect(run.status).toBe(0);
  }, 60_000);

  it('fails, and names the contract, when a scenario for it is taken away', () => {
    root = aRepositoryHolding(aMap, {
      '2-she-logs-her-first-period.feature': aFeatureFile.replace(
        /\n  Scenario: SCREEN-1[\s\S]*$/,
        '\n',
      ),
    });

    const run = runTheCommandIn(root);

    expect(run.output).toContain('gives "SCREEN-1" to feature 2');
    expect(run.output).toContain('1 problem(s) in the behaviour tier.');
    expect(run.status).toBe(1);
  }, 60_000);

  it('fails a directory of features holding nothing at all', () => {
    root = aRepositoryHolding(aMap, {});

    const run = runTheCommandIn(root);

    expect(run.output).toContain('holds no feature file');
    expect(run.status).toBe(1);
  }, 60_000);

  it('prints the long term counts beside the coverage counts', () => {
    root = aRepositoryHolding(`${aMap}\n${aLongTermList}`, {
      '2-she-logs-her-first-period.feature': aFeatureFile,
    });

    const run = runTheCommandIn(root);

    expect(run.output).toContain(
      'the long term list holds 3 item(s) in 2 group(s): 1 in version 1, 1 planned, 1 conditional.',
    );
    expect(run.output).toContain('is planned, so no file under features/ covers it');
    expect(run.status).toBe(0);
  }, 60_000);
});
