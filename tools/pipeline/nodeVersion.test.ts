import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { parse } from 'yaml';

const repositoryRoot = resolve(__dirname, '..', '..');

type Version = { major: number; minor: number; patch: number };

/**
 * Most npm scripts in this repository run a TypeScript file through node with no flag. Node reads
 * a type annotation without one from 22.18.0. Under that, the first of those scripts exits with a
 * syntax error, or with an unknown file extension. The number comes from the Node release notes.
 */
const strippingFloor: Version = { major: 22, minor: 18, patch: 0 };

function read(file: string): string {
  return readFileSync(join(repositoryRoot, file), 'utf8');
}

/** A three number version, refusing what it cannot compare rather than reading past it. */
function versionOf(text: string, source: string): Version {
  const found = /^(\d+)\.(\d+)\.(\d+)$/.exec(text.trim());
  if (found === null) {
    throw new Error(`${source} does not name a three number version: "${text.trim()}"`);
  }

  return { major: Number(found[1]), minor: Number(found[2]), patch: Number(found[3]) };
}

/** The lowest version a range admits. This repository writes a floor and nothing else. */
function floorOf(range: string, source: string): Version {
  const found = /^>=\s*(.+)$/.exec(range.trim());
  if (found === null) {
    throw new Error(`${source} is not a floor this test can read: "${range.trim()}"`);
  }

  return versionOf(found[1] ?? '', source);
}

function isAtLeast(version: Version, floor: Version): boolean {
  if (version.major !== floor.major) {
    return version.major > floor.major;
  }
  if (version.minor !== floor.minor) {
    return version.minor > floor.minor;
  }

  return version.patch >= floor.patch;
}

function written(version: Version): string {
  return `${version.major}.${version.minor}.${version.patch}`;
}

// A workflow input arrives as whatever yaml makes of it, so a bare 22 is a number here.
type Step = { uses?: string; with?: Record<string, unknown> };
type Workflow = { jobs?: Record<string, { steps?: Step[] }> };

const pinned = versionOf(read('.nvmrc'), '.nvmrc');
const declared = (JSON.parse(read('package.json')) as { engines?: { node?: string } }).engines
  ?.node;

const pipeline = parse(read('.github/workflows/ci.yml')) as Workflow;
const setups = Object.values(pipeline.jobs ?? {})
  .flatMap((job) => job.steps ?? [])
  .filter((step) => (step.uses ?? '').startsWith('actions/setup-node@'));

describe('the Node version has one home', () => {
  describe('.nvmrc names the version a person and the pipeline both install', () => {
    it('carries one version and nothing else, so the reads below compare something', () => {
      expect(read('.nvmrc').trim()).toBe(written(pinned));
    });

    it('names a version that runs a TypeScript file with no flag', () => {
      expect(isAtLeast(pinned, strippingFloor)).toBe(true);
    });
  });

  describe('the manifest is held to the same version', () => {
    it('declares a floor', () => {
      expect(declared).toMatch(/^>=/);
    });

    it('admits the version in .nvmrc', () => {
      expect(isAtLeast(pinned, floorOf(declared ?? '', 'engines.node'))).toBe(true);
    });

    it('admits no version that cannot run the scripts', () => {
      expect(isAtLeast(floorOf(declared ?? '', 'engines.node'), strippingFloor)).toBe(true);
    });
  });

  describe('the pipeline reads the file rather than saying the version again', () => {
    it('sets Node up, so the two reads below are not reads of an empty list', () => {
      expect(setups.length).toBeGreaterThan(0);
    });

    it('points every setup at .nvmrc', () => {
      expect(setups.map((step) => step.with?.['node-version-file'])).toEqual(
        setups.map(() => '.nvmrc'),
      );
    });

    it('states no version of its own', () => {
      expect(setups.filter((step) => step.with?.['node-version'] !== undefined)).toEqual([]);
    });
  });
});
