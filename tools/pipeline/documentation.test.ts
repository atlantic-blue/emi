import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import {
  architectureDocument,
  diagramsIn,
  directoriesNamedIn,
  directoryHeading,
  documentedDirectoriesOf,
  driftProblems,
  nameOf,
  readmeFloor,
  readmeProblems,
  sectionsIn,
  statusProblems,
  workspaceDirectoriesOf,
} from './documentation';

const repositoryRoot = resolve(__dirname, '..', '..');
const checker = join(repositoryRoot, 'tools', 'pipeline', 'checkDocuments.ts');

const architecture = readFileSync(join(repositoryRoot, architectureDocument), 'utf8');

const goodDiagram = ['```mermaid', 'flowchart LR', '  A["one (two)"] --> B["three"]', '```'].join(
  '\n',
);

// Unquoted parentheses in a node label is the canonical thing mermaid refuses.
const badDiagram = ['```mermaid', 'flowchart LR', '  A[one (two)] --> B[three]', '```'].join('\n');

function documentOf(directories: string[], body: string): string {
  const list = directories.map((directory) => `- \`${directory}\` is here.`).join('\n');

  return `# The architecture\n\n## ${directoryHeading}\n\nStatus: built\n\n${list}\n\n## The shape\n\nStatus: designed\n\n${body}\n`;
}

function fixtureWith(document: string, workspaces: string[]): string {
  const root = mkdtempSync(join(tmpdir(), 'emi-documents-'));

  writeFileSync(
    join(root, 'package.json'),
    `${JSON.stringify({ name: 'fixture', private: true, workspaces: ['packages/*'] }, null, 2)}\n`,
  );

  for (const workspace of workspaces) {
    mkdirSync(join(root, workspace), { recursive: true });
    writeFileSync(join(root, workspace, 'package.json'), '{}\n');
  }

  mkdirSync(join(root, dirname(architectureDocument)), { recursive: true });
  writeFileSync(join(root, architectureDocument), document);

  const started = spawnSync('git', ['init', '--quiet'], { cwd: root, encoding: 'utf8' });

  expect(started.status).toBe(0);

  return root;
}

function check(root?: string): { status: number | null; output: string } {
  const run = spawnSync(
    process.execPath,
    [
      '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',
      checker,
      ...(root === undefined ? [] : [root]),
    ],
    { cwd: repositoryRoot, encoding: 'utf8' },
  );

  return { status: run.status, output: `${run.stdout}${run.stderr}` };
}

describe('a diagram that does not parse fails the pipeline', () => {
  const made: string[] = [];

  afterAll(() => {
    for (const root of made) {
      rmSync(root, { force: true, recursive: true });
    }
  });

  function fixture(document: string, workspaces: string[] = ['packages/one']): string {
    const root = fixtureWith(document, workspaces);

    made.push(root);

    return root;
  }

  it('renders the documents in this repository and counts what it rendered', () => {
    const run = check();

    expect(run.output).toMatch(/[1-9]\d* diagram\(s\) rendered across [1-9]\d* document\(s\)/);
    expect(run.status).toBe(0);
  }, 180_000);

  it('refuses a node label that holds unquoted parentheses, and names the document', () => {
    const run = check(fixture(documentOf(['packages/one'], badDiagram)));

    expect(run.output).toContain(
      `${architectureDocument} holds a diagram the mermaid tool refused`,
    );
    expect(run.output).toContain('Parse error');
    expect(run.status).not.toBe(0);
  }, 180_000);

  it('accepts the same document once the label is quoted', () => {
    const run = check(fixture(documentOf(['packages/one'], goodDiagram)));

    expect(run.output).toContain('1 diagram(s) rendered across 1 document(s)');
    expect(run.status).toBe(0);
  }, 180_000);

  it('refuses a set of documents that holds no diagram at all', () => {
    const run = check(fixture(documentOf(['packages/one'], 'Prose and no diagram.')));

    expect(run.output).toContain('so the render proved nothing');
    expect(run.status).not.toBe(0);
  }, 180_000);

  it('finds every diagram in the architecture document', () => {
    expect(diagramsIn(architecture).length).toBeGreaterThan(0);
    expect(diagramsIn(architecture).every((diagram) => diagram.includes('flowchart'))).toBe(true);
  });

  it('does not read a fenced block that is not a diagram', () => {
    expect(diagramsIn('```\nflowchart LR\n  A --> B\n```\n')).toEqual([]);
  });
});

describe('the architecture document and the directories on disk cannot drift apart', () => {
  const named = directoriesNamedIn(architecture, directoryHeading);
  const workspaces = workspaceDirectoriesOf(repositoryRoot);

  const onDisk = (directory: string): boolean => existsSync(join(repositoryRoot, directory));

  it('reads the four workspaces that are on disk today', () => {
    expect(workspaces).toEqual([
      'apps/mobile',
      'packages/crypto',
      'packages/cycle',
      'packages/tokens',
    ]);
  });

  it('names every workspace, and names nothing that is absent', () => {
    expect(driftProblems(named, workspaces, onDisk)).toEqual([]);
    expect(named).toEqual(expect.arrayContaining(workspaces));
  });

  it('refuses a directory the document names that is not on disk', () => {
    expect(driftProblems([...named, 'packages/ghost'], workspaces, onDisk)).toEqual([
      `${architectureDocument} names "packages/ghost" under "${directoryHeading}", and no such directory is on disk`,
    ]);
  });

  it('refuses a workspace on disk that the document does not name', () => {
    expect(driftProblems(named, [...workspaces, 'packages/later'], onDisk)).toEqual([
      `the workspace "packages/later" is on disk, and ${architectureDocument} does not name it under "${directoryHeading}"`,
    ]);
  });

  it('takes a directory from the list and not from the prose around it', () => {
    expect(named).not.toContain('services/vault');
    expect(architecture).toContain('services/vault');
  });

  it('takes nothing from a list under another heading', () => {
    const elsewhere = `## ${directoryHeading}\n\n- \`packages/one\` is here.\n\n## Later\n\n- \`packages/two\` is not.\n`;

    expect(directoriesNamedIn(elsewhere, directoryHeading)).toEqual(['packages/one']);
  });
});

describe('every section of the architecture document says built or designed', () => {
  it('leaves no section unmarked today', () => {
    expect(statusProblems(architectureDocument, architecture)).toEqual([]);
  });

  it('marks some sections built and some designed, so the marker means something', () => {
    const marked = sectionsIn(architecture).map((section) => section.status);

    expect(marked).toContain('built');
    expect(marked).toContain('designed');
  });

  it('refuses a section that carries no status line', () => {
    const problems = statusProblems('x.md', '# A\n\n## One\n\nStatus: built\n\n## Two\n\nProse.\n');

    expect(problems).toEqual([
      'x.md: the section "Two" says nothing where it must say built or designed',
    ]);
  });

  it('refuses a status that is neither built nor designed', () => {
    const problems = statusProblems('x.md', '# A\n\n## One\n\nStatus: nearly\n');

    expect(problems).toEqual([
      'x.md: the section "One" says "nearly" where it must say built or designed',
    ]);
  });

  it('refuses a section that ends the document with nothing under it', () => {
    const problems = statusProblems('x.md', '# A\n\n## One\n');

    expect(problems).toEqual([
      'x.md: the section "One" says nothing where it must say built or designed',
    ]);
  });

  it('does not read a heading inside a fenced block as a section', () => {
    const fenced = '# A\n\n## One\n\nStatus: built\n\n```\n## Two\n```\n';

    expect(sectionsIn(fenced).map((section) => section.title)).toEqual(['One']);
  });
});

describe('a new package without a readme fails the pipeline', () => {
  const made: string[] = [];

  afterAll(() => {
    for (const root of made) {
      rmSync(root, { force: true, recursive: true });
    }
  });

  interface Package {
    readonly directory: string;
    readonly name?: string;
    readonly readme?: string;
  }

  const long = (name: string): string =>
    `# ${name}\n\n${'This readme answers what the package is for. '.repeat(10)}\n`;

  // The fixture is a repository of its own, so a package can be added and taken away again without
  // touching the tree the rest of the suite is reading.
  function fixture(packages: Package[]): string {
    const root = mkdtempSync(join(tmpdir(), 'emi-readmes-'));

    made.push(root);

    writeFileSync(
      join(root, 'package.json'),
      `${JSON.stringify({ name: 'fixture', private: true, workspaces: ['packages/*'] }, null, 2)}\n`,
    );

    for (const entry of packages) {
      mkdirSync(join(root, entry.directory), { recursive: true });

      if (entry.name !== undefined) {
        writeFileSync(join(root, entry.directory, 'package.json'), `{ "name": "${entry.name}" }\n`);
      }

      if (entry.readme !== undefined) {
        writeFileSync(join(root, entry.directory, 'README.md'), entry.readme);
      }
    }

    const started = spawnSync('git', ['init', '--quiet'], { cwd: root, encoding: 'utf8' });

    expect(started.status).toBe(0);

    return root;
  }

  describe('every directory in this repository carries one today', () => {
    const directories = documentedDirectoriesOf(repositoryRoot);

    it('reads the five directories somebody can open on their own', () => {
      expect(directories).toEqual([
        'apps/mobile',
        'packages/crypto',
        'packages/cycle',
        'packages/tokens',
        'tools',
      ]);
    });

    it('finds a readme in each of them, and no problem in any', () => {
      expect(readmeProblems(repositoryRoot, directories)).toEqual([]);
    });

    it('takes the name of a workspace from its manifest and the name of tools from its path', () => {
      expect(directories.map((directory) => nameOf(repositoryRoot, directory))).toEqual([
        '@emi/mobile',
        '@emi/crypto',
        '@emi/cycle',
        '@emi/tokens',
        'tools',
      ]);
    });
  });

  describe('a workspace that arrives without one', () => {
    const ghost = { directory: 'packages/ghost', name: '@fixture/ghost' };
    const kept = {
      directory: 'packages/kept',
      name: '@fixture/kept',
      readme: long('@fixture/kept'),
    };

    it('is found on disk as soon as its manifest is written', () => {
      const root = fixture([kept, ghost]);

      expect(workspaceDirectoriesOf(root)).toEqual(['packages/ghost', 'packages/kept']);
    });

    it('names the directory that holds no readme, and leaves the one that does alone', () => {
      const root = fixture([kept, ghost]);

      expect(readmeProblems(root, workspaceDirectoriesOf(root))).toEqual([
        'packages/ghost holds no README.md, so opening that directory alone tells nobody what it is',
      ]);
    });

    it('goes quiet again once that package carries a readme', () => {
      const root = fixture([kept, { ...ghost, readme: long('@fixture/ghost') }]);

      expect(readmeProblems(root, workspaceDirectoriesOf(root))).toEqual([]);
    });
  });

  describe('a readme that answers nothing', () => {
    it('refuses one under the floor, and says how short it is', () => {
      const root = fixture([
        { directory: 'packages/thin', name: '@fixture/thin', readme: '# @fixture/thin\n' },
      ]);

      expect(readmeProblems(root, ['packages/thin'])).toEqual([
        `packages/thin/README.md is 15 characters, under the floor of ${readmeFloor}, so it answers nothing`,
      ]);
    });

    it('refuses one that never writes the name of its own package', () => {
      const root = fixture([
        { directory: 'packages/other', name: '@fixture/other', readme: long('something else') },
      ]);

      expect(readmeProblems(root, ['packages/other'])).toEqual([
        'packages/other/README.md never writes "@fixture/other", so it does not say which package it documents',
      ]);
    });

    it('measures the length after the surrounding blank lines come off', () => {
      const padded = `\n\n\n${'a'.repeat(readmeFloor - 1)}\n\n\n`;
      const root = fixture([{ directory: 'packages/padded', readme: padded }]);

      expect(readmeProblems(root, ['packages/padded'])).toEqual([
        `packages/padded/README.md never writes "packages/padded", so it does not say which package it documents`,
        `packages/padded/README.md is ${readmeFloor - 1} characters, under the floor of ${readmeFloor}, so it answers nothing`,
      ]);
    });
  });
});
