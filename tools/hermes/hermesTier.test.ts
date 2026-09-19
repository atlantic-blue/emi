import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { EngineError, engineBinaryFor, engineVersion, runnablePlatforms } from './engine';
import { check, forgetEveryCase, runEveryCase } from './harness';
import { describeTierOutcome, readTierOutcome } from './outcome';

const repositoryRoot = resolve(__dirname, '..', '..');

function scriptsOf(packageFile: string): Record<string, string> {
  const contents = JSON.parse(readFileSync(join(repositoryRoot, packageFile), 'utf8')) as {
    scripts?: Record<string, string>;
  };

  return contents.scripts ?? {};
}

describe('a third test tier runs on the engine the phone runs', () => {
  describe('the engine is real, and it is chosen rather than assumed', () => {
    it('names a binary for each platform the engine ships for', () => {
      expect(engineBinaryFor('darwin', '/somewhere')).toBe(
        join('/somewhere', 'node_modules', 'hermes-engine-cli', 'osx-bin', 'hermes'),
      );
      expect(engineBinaryFor('linux', '/somewhere')).toBe(
        join('/somewhere', 'node_modules', 'hermes-engine-cli', 'linux64-bin', 'hermes'),
      );
    });

    it('refuses a platform it ships no engine for, rather than falling back to Node', () => {
      expect(() => engineBinaryFor('sunos', repositoryRoot)).toThrow(EngineError);

      try {
        engineBinaryFor('sunos', repositoryRoot);
      } catch (thrown) {
        const message = (thrown as Error).message;

        expect(message).toContain('sunos');
        expect(message).toContain('Node is the engine this tier exists to stop trusting');

        for (const platform of runnablePlatforms) {
          expect(message).toContain(platform);
        }
      }
    });

    it('installs an engine on this machine that says which version it is', () => {
      const binary = engineBinaryFor(process.platform, repositoryRoot);

      expect(existsSync(binary)).toBe(true);

      const run = spawnSync(binary, ['-version'], { encoding: 'utf8' });

      expect(run.status).toBe(0);
      expect(`${run.stdout}${run.stderr}`).toContain(`Hermes release version: ${engineVersion}`);
    });

    it('runs a script on that engine and shows it has no crypto, which is the whole gate', () => {
      const binary = engineBinaryFor(process.platform, repositoryRoot);
      const run = spawnSync(binary, ['-'], {
        encoding: 'utf8',
        input: "print('crypto is ' + typeof globalThis.crypto);\n",
      });

      expect(run.status).toBe(0);
      expect(run.stdout).toContain('crypto is undefined');
    });
  });

  describe('the runner inside the bundle refuses a run that did nothing', () => {
    let written: string[];
    let writing: jest.SpyInstance;

    beforeEach(() => {
      forgetEveryCase();
      written = [];
      writing = jest.spyOn(console, 'log').mockImplementation((line: unknown) => {
        written.push(String(line));
      });
    });

    afterEach(() => {
      writing.mockRestore();
      forgetEveryCase();
    });

    it('refuses a run that collected no case, and still prints the count', () => {
      expect(() => {
        runEveryCase();
      }).toThrow('discovered no case');

      expect(written).toContain('cases ran 0');
    });

    it('reports the count and passes when every case passed', () => {
      check('one', () => undefined);
      check('two', () => undefined);

      expect(() => {
        runEveryCase();
      }).not.toThrow();

      expect(written).toEqual(['case ok one', 'case ok two', 'cases ran 2']);
    });

    it('names every case that failed and refuses the run', () => {
      check('this one holds', () => undefined);
      check('this one does not', () => {
        throw new Error('the nonce was never drawn');
      });

      expect(() => {
        runEveryCase();
      }).toThrow('1 of 2 cases failed');

      expect(written).toContain('case failed this one does not: the nonce was never drawn');
      expect(written).toContain('cases ran 2');
    });
  });

  describe('the reader refuses anything that is not a whole green run', () => {
    const green = ['case ok seals her day', 'cases ran 1'].join('\n');

    it('reads a whole green run as passed and says how many ran', () => {
      const outcome = readTierOutcome(green, 0);

      expect(outcome.passed).toBe(true);
      expect(outcome.ranCount).toBe(1);
      expect(describeTierOutcome(outcome)).toBe(
        'hermes: 1 cases ran on the engine and every one passed',
      );
    });

    it('refuses a run that printed no count, because nothing says it ran at all', () => {
      const outcome = readTierOutcome('case ok seals her day', 0);

      expect(outcome.passed).toBe(false);
      expect(outcome.ranCount).toBeNull();
      expect(outcome.problems).toContain(
        'the engine reported no count of cases, so nothing here says the tier ran at all',
      );
    });

    it('refuses a run that discovered no case, even when the engine was happy', () => {
      const outcome = readTierOutcome('cases ran 0', 0);

      expect(outcome.passed).toBe(false);
      expect(outcome.problems).toContain(
        'the engine discovered no case, and finding nothing to do is not a pass',
      );
    });

    it('refuses a run that reported more than one count', () => {
      const outcome = readTierOutcome('cases ran 2\ncases ran 3', 0);

      expect(outcome.passed).toBe(false);
      expect(outcome.ranCount).toBeNull();
      expect(outcome.problems).toContain(
        'the engine reported 2 counts, and one run reports one count',
      );
    });

    it('carries a failed case through to the problems, with the reason the engine gave', () => {
      const outcome = readTierOutcome(
        'case failed seals her day: random-source-is-missing\ncases ran 1',
        1,
      );

      expect(outcome.passed).toBe(false);
      expect(outcome.failures).toEqual([
        { name: 'seals her day', reason: 'random-source-is-missing' },
      ]);
      expect(describeTierOutcome(outcome)).toContain('random-source-is-missing');
    });

    it('refuses a run the engine itself ended badly, however green the lines read', () => {
      const outcome = readTierOutcome(green, 1);

      expect(outcome.passed).toBe(false);
      expect(outcome.problems).toContain('the engine exited with 1');
    });
  });

  describe('the tier is wired in, so it cannot be green by never running', () => {
    it('is the third thing npm test runs', () => {
      const scripts = scriptsOf('package.json');

      expect(scripts.test).toBe(
        'npm run test:workspace && npm run test:mobile && npm run test:hermes',
      );
      expect(scripts['test:hermes']).toContain('tools/hermes/run.ts');
    });

    it('is a step of its own in the pipeline', () => {
      const workflow = readFileSync(join(repositoryRoot, '.github/workflows/ci.yml'), 'utf8');

      expect(workflow).toContain('npm run test:hermes');
    });

    it('never lets the runner be told to pass with nothing to do', () => {
      const scripts = Object.values(scriptsOf('package.json'));

      expect(scripts.filter((script) => script.includes('passWithNoTests'))).toEqual([]);
    });
  });
});
