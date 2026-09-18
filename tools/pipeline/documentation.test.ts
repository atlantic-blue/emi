import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import {
  architectureDocument,
  contractDocument,
  contractProblems,
  contractsDeclaredIn,
  contractsMappedIn,
  diagramsIn,
  directoriesNamedIn,
  directoryHeading,
  driftProblems,
  featureDocument,
  refusalHeading,
  refusalProblems,
  refusalsIn,
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

const featuresOf = (mapped: string[], refusals: string[] = ['Partner sharing.']): string =>
  [
    '# The features',
    '',
    '## Feature 1: The brand exists',
    '',
    ...mapped.map((line) => `- ${line}`),
    '',
    `## ${refusalHeading}`,
    '',
    ...refusals.map((refusal) => `- ${refusal}`),
    '',
  ].join('\n');

const contractsOf = (declared: string[]): string =>
  [
    '# The contracts',
    '',
    '## TOKEN, the design tokens',
    '',
    ...declared.flatMap((contract) => [
      `### ${contract}, a contract`,
      '',
      'Verified by a test.',
      '',
    ]),
  ].join('\n');

interface Documents {
  readonly features?: string;
  readonly contracts?: string;
}

function fixtureWith(document: string, workspaces: string[], documents: Documents = {}): string {
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

  writeFileSync(
    join(root, featureDocument),
    documents.features ?? featuresOf(['`TOKEN-1` the colour set.']),
  );

  writeFileSync(join(root, contractDocument), documents.contracts ?? contractsOf(['TOKEN-1']));

  const started = spawnSync('git', ['init', '--quiet'], { cwd: root, encoding: 'utf8' });

  expect(started.status).toBe(0);

  return root;
}

const made: string[] = [];

afterAll(() => {
  for (const root of made) {
    rmSync(root, { force: true, recursive: true });
  }
});

function fixture(
  document: string,
  workspaces: string[] = ['packages/one'],
  documents: Documents = {},
): string {
  const root = fixtureWith(document, workspaces, documents);

  made.push(root);

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

    expect(run.output).toContain('1 diagram(s) rendered across 3 document(s)');
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

const features = readFileSync(join(repositoryRoot, featureDocument), 'utf8');
const contracts = readFileSync(join(repositoryRoot, contractDocument), 'utf8');

describe('a contract in one document and missing from the other fails the run', () => {
  const declared = contractsDeclaredIn(contracts);
  const mapped = contractsMappedIn(features);

  it('declares forty five contracts across twelve groups', () => {
    expect(declared).toHaveLength(45);
    expect(new Set(declared).size).toBe(45);
    expect(new Set(declared.map((contract) => contract.split('-')[0])).size).toBe(12);
  });

  it('names every declared contract under exactly one feature', () => {
    expect(contractProblems(declared, mapped)).toEqual([]);
    expect(mapped).toHaveLength(declared.length);
  });

  it('spreads the contracts over the seven features that build them', () => {
    const built = new Set(mapped.map((entry) => entry.feature));

    expect([...built].sort()).toEqual([
      'Feature 1',
      'Feature 2',
      'Feature 3',
      'Feature 4',
      'Feature 5',
      'Feature 6',
      'Feature 7',
    ]);
  });

  it('counts the mapped contracts in the run this repository makes', () => {
    const run = check();

    expect(run.output).toContain(`45 contract(s) mapped to a feature in ${featureDocument}`);
    expect(run.status).toBe(0);
  }, 180_000);

  it('refuses a contract the contracts document declares and the map never names', () => {
    const problems = contractProblems(
      ['TOKEN-1', 'TOKEN-2'],
      [{ contract: 'TOKEN-1', feature: 'Feature 1' }],
    );

    expect(problems).toEqual([
      `${contractDocument} declares "TOKEN-2", and ${featureDocument} names it under no feature`,
    ]);
  });

  it('refuses a contract the map names and the contracts document never declares', () => {
    const problems = contractProblems(
      ['TOKEN-1'],
      [
        { contract: 'TOKEN-1', feature: 'Feature 1' },
        { contract: 'TOKEN-9', feature: 'Feature 2' },
      ],
    );

    expect(problems).toEqual([
      `${featureDocument} names "TOKEN-9" under Feature 2, and ${contractDocument} declares no such contract`,
    ]);
  });

  it('refuses a contract that two features both claim to build', () => {
    const problems = contractProblems(
      ['TOKEN-1'],
      [
        { contract: 'TOKEN-1', feature: 'Feature 1' },
        { contract: 'TOKEN-1', feature: 'Feature 2' },
      ],
    );

    expect(problems).toEqual([
      `${featureDocument} names "TOKEN-1" under Feature 1 and Feature 2, and one feature builds a contract`,
    ]);
  });

  it('refuses a contracts document that declares nothing at all', () => {
    expect(contractProblems([], [])).toEqual([
      `${contractDocument} declares no contract, so the map proves nothing`,
    ]);
  });

  it('fails the whole run when the map drops a contract the other document declares', () => {
    const root = fixture(documentOf(['packages/one'], goodDiagram), ['packages/one'], {
      contracts: contractsOf(['TOKEN-1', 'TOKEN-2']),
    });

    const run = check(root);

    expect(run.output).toContain(
      `${contractDocument} declares "TOKEN-2", and ${featureDocument} names it under no feature`,
    );
    expect(run.status).not.toBe(0);
  }, 180_000);

  it('fails the whole run when the map names a contract nobody declares', () => {
    const root = fixture(documentOf(['packages/one'], goodDiagram), ['packages/one'], {
      features: featuresOf(['`TOKEN-1` the colour set.', '`WIRE-3` pull records.']),
    });

    const run = check(root);

    expect(run.output).toContain(
      `${featureDocument} names "WIRE-3" under Feature 1, and ${contractDocument} declares no such contract`,
    );
    expect(run.status).not.toBe(0);
  }, 180_000);

  it('reads an identifier from a bullet under a feature, and not from the prose beside it', () => {
    const document = [
      '## Feature 1: The brand exists',
      '',
      'The prose names `TOKEN-3` and the map does not.',
      '',
      '- `TOKEN-1` the colour set.',
      '',
      '## How to read this document',
      '',
      '- `TOKEN-2` is under no feature.',
    ].join('\n');

    expect(contractsMappedIn(document)).toEqual([{ contract: 'TOKEN-1', feature: 'Feature 1' }]);
  });

  it('reads a declaration from a heading, and not from a fenced block', () => {
    const document = [
      '### TOKEN-1, the colour set',
      '',
      '```',
      '### TOKEN-2, a sample',
      '```',
    ].join('\n');

    expect(contractsDeclaredIn(document)).toEqual(['TOKEN-1']);
  });
});

describe('the feature map names what version 1 refuses, and names each one once', () => {
  const refusals = refusalsIn(features);

  it('refuses the six things the design took out of version 1', () => {
    const said = refusals.join(' ').toLowerCase();

    expect(said).toContain('partner sharing');
    expect(said).toContain('medication tracking');
    expect(said).toContain('polycystic ovary syndrome');
    expect(said).toContain('import from');
    expect(said).toContain('wearable');
    expect(said).toContain('conversational assistant');
  });

  it('names each refusal once', () => {
    expect(refusals.length).toBeGreaterThan(5);
    expect(refusalProblems(featureDocument, refusals)).toEqual([]);
  });

  it('refuses a refusal list that is empty', () => {
    expect(refusalProblems(featureDocument, [])).toEqual([
      `${featureDocument} names no refusal under "${refusalHeading}", so version 1 refuses nothing`,
    ]);
  });

  it('refuses the same item named twice, whatever its case and its full stop', () => {
    const problems = refusalProblems(featureDocument, [
      'The conversational assistant.',
      'the conversational assistant',
    ]);

    expect(problems).toEqual([
      `${featureDocument} names the refusal "the conversational assistant" twice under "${refusalHeading}"`,
    ]);
  });

  it('fails the whole run when the refusal list is empty', () => {
    const root = fixture(documentOf(['packages/one'], goodDiagram), ['packages/one'], {
      features: featuresOf(['`TOKEN-1` the colour set.'], []),
    });

    const run = check(root);

    expect(run.output).toContain(
      `${featureDocument} names no refusal under "${refusalHeading}", so version 1 refuses nothing`,
    );
    expect(run.status).not.toBe(0);
  }, 180_000);

  it('joins a refusal that wraps onto a second line', () => {
    const document = [
      `## ${refusalHeading}`,
      '',
      '- Import from another tracker,',
      '  such as Flo or Clue.',
      '- Every wearable device.',
    ].join('\n');

    expect(refusalsIn(document)).toEqual([
      'Import from another tracker, such as Flo or Clue.',
      'Every wearable device.',
    ]);
  });

  it('takes nothing from a list under another heading', () => {
    const document = [
      '## The features',
      '',
      '- Partner sharing is in version 2.',
      '',
      `## ${refusalHeading}`,
      '',
      '- Every wearable device.',
    ].join('\n');

    expect(refusalsIn(document)).toEqual(['Every wearable device.']);
  });
});
