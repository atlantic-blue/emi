import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { parse } from 'yaml';

import { fingerprintIn, fingerprintProblem, fingerprintedWorkspace } from './fingerprint';

const repositoryRoot = resolve(__dirname, '..', '..');

function read(file: string): string {
  return readFileSync(join(repositoryRoot, file), 'utf8');
}

/** The shape the command prints on a run that worked, cut down to the two fields read. */
function printed(hash: string, sources: number): string {
  return JSON.stringify({
    sources: [...Array(sources).keys()].map((at) => ({ type: 'file', filePath: `${at}` })),
    hash,
  });
}

/** The words Expo printed when the release of v0.3.2 stopped. */
const whatTheFailureSaid = '(0 , brace_expansion_1.expand) is not a function';

interface Step {
  name?: string;
  run?: string;
}

interface Workflow {
  jobs: Record<string, { steps: Step[] }>;
}

const workflow = parse(read('.github/workflows/ci.yml')) as Workflow;
const checkSteps = (workflow.jobs.check?.steps ?? [])
  .map((step) => step.run?.trim())
  .filter((command): command is string => command !== undefined);

describe('the pipeline takes the fingerprint the Expo build service takes', () => {
  describe('a run that computed one is accepted', () => {
    it('accepts a hash taken over sources', () => {
      expect(
        fingerprintProblem({ status: 0, output: `${printed('abc123', 420)}\n` }),
      ).toBeUndefined();
    });

    it('reads the hash and counts the sources it was taken over', () => {
      expect(fingerprintIn(`${printed('abc123', 420)}\n`)).toEqual({
        hash: 'abc123',
        sources: 420,
      });
    });

    it('reads the fingerprint out from under whatever else the run printed', () => {
      const output = `npm warn something\n${printed('abc123', 7)}\n`;

      expect(fingerprintIn(output)).toEqual({ hash: 'abc123', sources: 7 });
      expect(fingerprintProblem({ status: 0, output })).toBeUndefined();
    });
  });

  describe('a run that computed none is refused', () => {
    it('refuses the failure that stopped the release, with what it said', () => {
      const problem = fingerprintProblem({ status: 1, output: `${whatTheFailureSaid}\n` });

      expect(problem).toContain('status 1');
      expect(problem).toContain(whatTheFailureSaid);
    });

    it('refuses a run that printed a usage message and left with nothing to say', () => {
      const problem = fingerprintProblem({
        status: 0,
        output: 'Usage\n  $ npx @expo/fingerprint <command>\n',
      });

      expect(problem).toContain('printed no fingerprint');
    });

    it('refuses a fingerprint taken over no source, because that is a hash all the same', () => {
      expect(fingerprintProblem({ status: 0, output: `${printed('abc123', 0)}\n` })).toBe(
        'the fingerprint abc123 was taken over no source',
      );
    });

    it('refuses output that holds an object but no hash', () => {
      const output = `${JSON.stringify({ sources: [{ type: 'file' }] })}\n`;

      expect(fingerprintIn(output)).toBeUndefined();
      expect(fingerprintProblem({ status: 0, output })).toContain('printed no fingerprint');
    });

    it('refuses a command that never ran, which leaves no status at all', () => {
      expect(fingerprintProblem({ status: null, output: 'spawn npx ENOENT' })).toContain(
        'status null',
      );
    });
  });

  describe('the check runs in the pipeline', () => {
    it('reads the steps out of the workflow, so agreement is never two empty lists', () => {
      expect(checkSteps.length).toBeGreaterThan(1);
    });

    it('takes the fingerprint in the job that guards a pull request', () => {
      expect(checkSteps).toContain('npm run check:fingerprint');
    });

    it('takes it from the installed copy rather than one fetched for the run', () => {
      const command = read('tools/pipeline/fingerprint.ts');

      expect(command).toContain("'--no', '@expo/fingerprint', 'fingerprint:generate'");
    });

    it('fingerprints the workspace Expo builds', () => {
      expect(fingerprintedWorkspace).toBe(join('apps', 'mobile'));
      expect(read('.github/workflows/release.yml')).toContain(
        `working-directory: release/${fingerprintedWorkspace}`,
      );
    });
  });
});
