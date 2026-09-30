import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const repositoryRoot = resolve(__dirname, '..', '..');

/**
 * Jest starts one worker for each processor less one when nothing tells it otherwise, and a worker
 * grows as it takes more files. A session here sees fourteen processors, so the application tier
 * ran thirteen workers and peaked at 17,027 MiB, which is most of a 24 GiB machine: two sessions
 * running their tests together exhausted it and the kernel killed the control plane. Four workers
 * that restart when one passes a gibibyte held the same run far lower. Both numbers come from a
 * measured run at commit 40b46f2, not from a rule of thumb.
 */
const workerCount = 4;
const restartAbove = '1GB';

interface Tier {
  /** What a person calls the run this configuration drives. */
  readonly tier: string;
  readonly file: string;
}

const tiers: readonly Tier[] = [
  { tier: 'the application tier', file: join('apps', 'mobile', 'jest.config.js') },
  { tier: 'the workspace tier', file: 'jest.node.config.js' },
  { tier: 'the behaviour tier', file: 'jest.behaviour.config.js' },
  { tier: 'the pictures', file: join('brand', 'screens', 'jest.config.js') },
];

/**
 * Every jest configuration committed, found rather than named, so the tier added next cannot run
 * uncapped simply because nobody added it to the list above.
 */
function configurationsOnDisk(directory: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
      continue;
    }
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      found.push(...configurationsOnDisk(path));
    } else if (/^jest(\..+)?\.config\.js$/.test(entry.name)) {
      found.push(relative(repositoryRoot, path));
    }
  }

  return found.sort();
}

function sourceOf(file: string): string {
  return readFileSync(join(repositoryRoot, file), 'utf8');
}

function loaded(file: string): { maxWorkers?: unknown; workerIdleMemoryLimit?: unknown } {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(join(repositoryRoot, file)) as Record<string, unknown>;
}

describe('a test run fits in a session', () => {
  describe('every jest configuration is held to the cap', () => {
    it('reads every configuration on disk, so a new tier cannot be missed', () => {
      expect(configurationsOnDisk(repositoryRoot)).toEqual(tiers.map((one) => one.file).sort());
    });
  });

  describe.each(tiers)('$tier', ({ file }) => {
    it('runs four workers', () => {
      expect(loaded(file).maxWorkers).toBe(workerCount);
    });

    it('restarts a worker that passes a gibibyte', () => {
      expect(loaded(file).workerIdleMemoryLimit).toBe(restartAbove);
    });

    // The behaviour tier and the pictures both start from the application configuration. Reading
    // the loaded object cannot tell a value they state from a value they borrowed, so a change to
    // the application tier would quietly uncap them both.
    it('states both numbers itself rather than borrowing them', () => {
      expect(sourceOf(file)).toMatch(new RegExp(`maxWorkers:\\s*${workerCount}\\b`));
      expect(sourceOf(file)).toMatch(new RegExp(`workerIdleMemoryLimit:\\s*'${restartAbove}'`));
    });
  });
});
