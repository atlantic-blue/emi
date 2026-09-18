import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { parse } from 'yaml';

const repositoryRoot = resolve(__dirname, '..', '..');

/**
 * The help recipe finds a documented target by this expression. The test composes the same one, so
 * the list a person is printed and the list the test reads cannot be different lists.
 */
const targetName = '[a-z][a-z-]*';
const helpPattern = `^${targetName}:[^#]*## `;
const documented = new RegExp(`^(${targetName}):[^#]*## (.+)$`);

function read(file: string): string {
  return readFileSync(join(repositoryRoot, file), 'utf8');
}

const makefile = read('Makefile');
const makefileLines = makefile.split('\n');

/** The recipe of one target, which is the run of tab indented lines under its rule. */
function recipeOf(target: string): string[] {
  const rule = makefileLines.findIndex((line) => line.startsWith(`${target}:`));
  if (rule < 0) {
    throw new Error(`the Makefile has no ${target} target`);
  }

  const recipe: string[] = [];
  for (let at = rule + 1; at < makefileLines.length; at += 1) {
    const line = makefileLines[at] ?? '';
    if (!line.startsWith('\t')) {
      break;
    }
    recipe.push(
      line
        .slice(1)
        .replace(/^[@-]+/, '')
        .trim(),
    );
  }

  return recipe;
}

const phony = (makefile.match(/^\.PHONY:(.*)$/m)?.[1] ?? '').split(/\s+/).filter(Boolean);

const helpOutput = makefileLines
  .map((line) => documented.exec(line))
  .filter((found): found is RegExpExecArray => found !== null)
  .map((found) => ({ target: found[1] ?? '', description: found[2] ?? '' }));

type Step = { run?: string };
type Workflow = { jobs?: Record<string, { steps?: Step[] }> };

const pipeline = parse(read('.github/workflows/ci.yml')) as Workflow;
const pipelineCommands = (pipeline.jobs?.check?.steps ?? [])
  .map((step) => step.run?.trim())
  .filter((command): command is string => command !== undefined);

describe('one word runs what somebody needs', () => {
  describe('the check target and the pipeline run the same commands', () => {
    it('reads commands out of both files, so agreement is never two empty lists', () => {
      expect(pipelineCommands.length).toBeGreaterThan(1);
      expect(recipeOf('check').length).toBeGreaterThan(1);
    });

    it('runs the pipeline commands, in the pipeline order, less the install', () => {
      const expected = pipelineCommands.filter((command) => command !== 'npm ci');

      expect(recipeOf('check')).toEqual(expected);
    });

    it('leaves the install to its own target', () => {
      expect(pipelineCommands).toContain('npm ci');
      expect(recipeOf('install')).toEqual(['npm ci']);
    });
  });

  describe('the help output tells a person every target exists', () => {
    it('reads the Makefile by the expression the help recipe reads it by', () => {
      expect(makefile).toContain(helpPattern);
      expect(helpOutput.length).toBeGreaterThan(1);
    });

    it('prints a line for every target in .PHONY', () => {
      const printed = helpOutput.map((line) => line.target).sort();

      expect(phony.length).toBeGreaterThan(1);
      expect(printed).toEqual([...phony].sort());
    });

    it('gives every target a description of its own', () => {
      const descriptions = helpOutput.map((line) => line.description.trim());

      expect(descriptions.filter((description) => description === '')).toEqual([]);
      expect(new Set(descriptions).size).toBe(descriptions.length);
    });
  });
});
