import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import type { LongTermItem } from './documentation.ts';
import { contractsMappedIn, featureDocument, longTermItemsIn } from './documentation.ts';

/**
 * The behaviour tier against the map of features. `docs/features.md` says which contract each
 * feature builds, and the feature files say which contract each scenario proves, so the two can be
 * read against each other and the gap between them named.
 *
 * A feature with no file of its own is a note here and a failure at the end of the path. A
 * contract inside a feature that does have a file is a failure now, because a covered feature that
 * skips one of its contracts is the drift this report exists to catch.
 *
 * The same document carries the long term list, which is the whole product rather than version 1.
 * An item of it that is planned is a note, for the same reason a feature with no file is: nobody
 * agreed to build it yet. An item that says version 1 builds it is held to the map like anything
 * else in version 1.
 */

export const featureDirectory = 'features';

/** The identifier a scenario opens with, which is how a reader gets from the map to the scenario. */
const scenarioPattern = /^([A-Z]+-\d+),\s+\S/;

const headingPattern = /^## Feature (\d+): (.+)$/;

const featureLinePattern = /^Feature:\s*(.+)$/;

const scenarioLinePattern = /^Scenario(?: Outline)?:\s*(.+)$/;

const fileNamePattern = /^(\d+)-[a-z0-9-]+\.feature$/;

export interface MappedFeature {
  readonly number: number;
  readonly title: string;
  readonly contracts: readonly string[];
}

export interface FeatureFile {
  /** The path as a reader would type it, from the root of the repository. */
  readonly file: string;
  readonly number: number;
  readonly title: string;
  readonly scenarios: readonly string[];
}

export interface CoverageResult {
  readonly problems: readonly string[];
  /** A feature the map names and the tier does not cover yet. Named, and not yet a failure. */
  readonly notes: readonly string[];
  readonly featuresCovered: number;
  readonly featuresTotal: number;
  readonly scenarios: number;
  readonly contractsNamed: number;
  readonly longTermItems: number;
  readonly longTermGroups: number;
  readonly longTermInVersionOne: number;
  readonly longTermPlanned: number;
  readonly longTermConditional: number;
}

/** Every feature the map names, with the contracts it owns, in the order the document lists them. */
export function featuresMappedIn(markdown: string): MappedFeature[] {
  const contracts = contractsMappedIn(markdown);
  const features: MappedFeature[] = [];

  for (const line of markdown.split('\n')) {
    const heading = headingPattern.exec(line.trim());

    if (heading === null) {
      continue;
    }

    const number = Number(heading[1]);

    features.push({
      number,
      title: (heading[2] as string).trim(),
      contracts: contracts
        .filter((mapped) => mapped.feature === `Feature ${number}`)
        .map((mapped) => mapped.contract),
    });
  }

  return features;
}

/** One feature file, read as a reader reads it: its title, and the scenarios under it. */
export function featureFileIn(file: string, contents: string): Omit<FeatureFile, 'number'> {
  const scenarios: string[] = [];
  let title = '';

  for (const line of contents.split('\n')) {
    const text = line.trim();
    const named = featureLinePattern.exec(text);

    if (named !== null && title === '') {
      title = (named[1] as string).trim();
      continue;
    }

    const scenario = scenarioLinePattern.exec(text);

    if (scenario !== null) {
      scenarios.push((scenario[1] as string).trim());
    }
  }

  return { file, title, scenarios };
}

export function featureFilesOf(root: string): FeatureFile[] {
  const directory = join(root, featureDirectory);

  if (!existsSync(directory)) {
    return [];
  }

  return readdirSync(directory)
    .filter((name) => name.endsWith('.feature'))
    .sort()
    .map((name) => {
      const found = fileNamePattern.exec(name);
      const file = `${featureDirectory}/${name}`;
      const read = featureFileIn(file, readFileSync(join(directory, name), 'utf8'));

      return { ...read, number: found === null ? Number.NaN : Number(found[1]) };
    });
}

/** The contract a scenario proves, taken from the identifier it opens with. */
export function contractNamedIn(scenario: string): string | null {
  const found = scenarioPattern.exec(scenario);

  return found === null ? null : (found[1] as string);
}

export function coverageProblems(
  features: MappedFeature[],
  files: FeatureFile[],
  longTerm: readonly LongTermItem[] = [],
): CoverageResult {
  const problems: string[] = [];
  const notes: string[] = [];
  const scenarios = files.flatMap((file) => file.scenarios);

  if (files.length === 0) {
    problems.push(
      `${featureDirectory}/ holds no feature file, so the behaviour tier proves nothing and a run of it is empty`,
    );
  }

  if (files.length > 0 && scenarios.length === 0) {
    problems.push(
      `${featureDirectory}/ holds no scenario, so the behaviour tier runs nothing and a run of it is empty`,
    );
  }

  for (const file of files) {
    const feature = features.find((each) => each.number === file.number);

    if (Number.isNaN(file.number) || feature === undefined) {
      problems.push(
        `${file.file} is named for feature ${Number.isNaN(file.number) ? 'nothing' : file.number}, and ${featureDocument} names no such feature`,
      );
      continue;
    }

    if (file.title !== feature.title) {
      problems.push(
        `${file.file} opens "Feature: ${file.title}", and ${featureDocument} calls feature ${feature.number} "${feature.title}"`,
      );
    }

    const named = new Set(
      file.scenarios
        .map(contractNamedIn)
        .filter((contract): contract is string => contract !== null),
    );

    for (const scenario of file.scenarios) {
      if (contractNamedIn(scenario) === null) {
        problems.push(
          `${file.file} holds a scenario named "${scenario}", which opens with no contract, so nobody can get to it from ${featureDocument}`,
        );
      }
    }

    for (const contract of named) {
      if (!feature.contracts.includes(contract)) {
        problems.push(
          `${file.file} names "${contract}", and ${featureDocument} does not give that contract to feature ${feature.number}`,
        );
      }
    }

    for (const contract of feature.contracts) {
      if (!named.has(contract)) {
        problems.push(
          `${featureDocument} gives "${contract}" to feature ${feature.number}, and ${file.file} holds no scenario named for it`,
        );
      }
    }
  }

  for (const feature of features) {
    if (!files.some((file) => file.number === feature.number)) {
      notes.push(
        `feature ${feature.number}, ${feature.title}, has no file under ${featureDirectory}/ yet`,
      );
    }
  }

  const owned = new Set(features.flatMap((feature) => feature.contracts));

  for (const item of longTerm) {
    if (item.state === 'planned') {
      notes.push(
        `the long term list says "${item.text}" is planned, so no file under ${featureDirectory}/ covers it`,
      );
      continue;
    }

    // A contract of a covered feature that no scenario names is already a failure above, and a
    // contract of a feature with no file at all is already a note. What is left for the list to
    // catch is an item that says version 1 builds it while the map gives that contract to nobody.
    if (item.state === 'in version 1' && item.contract !== null && !owned.has(item.contract)) {
      problems.push(
        `the long term list says "${item.text}" is in version 1 and names "${item.contract}", and ${featureDocument} gives that contract to no feature`,
      );
    }
  }

  return {
    problems,
    notes,
    longTermItems: longTerm.length,
    longTermGroups: new Set(longTerm.map((item) => item.group)).size,
    longTermInVersionOne: longTerm.filter((item) => item.state === 'in version 1').length,
    longTermPlanned: longTerm.filter((item) => item.state === 'planned').length,
    longTermConditional: longTerm.filter((item) => item.state === 'conditional').length,
    featuresCovered: files.filter((file) =>
      features.some((feature) => feature.number === file.number),
    ).length,
    featuresTotal: features.length,
    scenarios: scenarios.length,
    contractsNamed: new Set(
      scenarios.map(contractNamedIn).filter((contract): contract is string => contract !== null),
    ).size,
  };
}

export function coverageOf(root: string): CoverageResult {
  const map = readFileSync(join(root, featureDocument), 'utf8');

  return coverageProblems(featuresMappedIn(map), featureFilesOf(root), longTermItemsIn(map));
}
