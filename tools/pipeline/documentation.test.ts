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
  documentedDirectoriesOf,
  driftProblems,
  featureDocument,
  holdsWorkingCode,
  nameOf,
  readmeFloor,
  readmeProblems,
  longTermHeading,
  longTermItemsIn,
  longTermProblems,
  longTermStates,
  refusalHeading,
  refusalProblems,
  refusalsIn,
  pathsNamedIn,
  promiseWording,
  sectionBodiesIn,
  sectionsIn,
  staleStatusProblems,
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

const aLongTermList = [
  '### Core cycle tracking',
  '',
  '- Period logging. State: in version 1, \`TOKEN-1\`.',
  '- Premenstrual syndrome prediction. State: planned.',
  '- A badge from an auditor. State: conditional. An auditor has to read Emi and sign it.',
];

const featuresOf = (
  mapped: string[],
  refusals: string[] = ['Partner sharing.'],
  longTerm: string[] = aLongTermList,
): string =>
  [
    '# The features',
    '',
    '## Feature 1: The brand exists',
    '',
    ...mapped.map((line) => `- ${line}`),
    '',
    `## ${longTermHeading}`,
    '',
    ...longTerm,
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

  it('reads the seven workspaces that are on disk today', () => {
    expect(workspaces).toEqual([
      'apps/mobile',
      'packages/content',
      'packages/crypto',
      'packages/cycle',
      'packages/tokens',
      'packages/ui',
      'services/vault',
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
    expect(named).not.toContain('packages/crypto/tests/vectors.json');
    expect(architecture).toContain('packages/crypto/tests/vectors.json');
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

describe('a status the repository disagrees with', () => {
  const aPromise = promiseWording[0] as string;

  function sectionSaying(status: string, body: string): string {
    return `# A\n\n## The thing\n\nStatus: ${status}\n\n${body}\n`;
  }

  function repositoryHolding(entries: readonly { path: string; contents: string }[]): string {
    const root = mkdtempSync(join(tmpdir(), 'emi-status-'));

    made.push(root);

    for (const entry of entries) {
      mkdirSync(join(root, dirname(entry.path)), { recursive: true });
      writeFileSync(join(root, entry.path), entry.contents);
    }

    return root;
  }

  const workingCode = [
    { path: 'packages/one/src/one.ts', contents: 'export const one = 1;\n' },
    { path: 'packages/one/tests/one.test.ts', contents: 'it("runs", () => undefined);\n' },
  ];

  describe('the architecture document as it stands today', () => {
    it('carries no section the repository disagrees with', () => {
      expect(staleStatusProblems(repositoryRoot, architectureDocument, architecture)).toEqual([]);
    });

    it('leaves a designed section that names built source and promises nothing', () => {
      const vault = sectionBodiesIn(architecture).find(
        (section) => section.status === 'designed' && section.body.includes('services/vault'),
      );

      expect(vault).toBeDefined();
      expect(holdsWorkingCode(repositoryRoot, 'services/vault')).toBe(true);
      expect(
        staleStatusProblems(repositoryRoot, architectureDocument, architecture).join(' '),
      ).not.toContain(vault?.title ?? 'a section that is absent');
    });
  });

  describe('a designed section that promises a package the repository holds', () => {
    it('names the section, the promise and the package', () => {
      const root = repositoryHolding(workingCode);
      const document = sectionSaying('designed', `The code ${aPromise} in \`packages/one\`.`);

      expect(staleStatusProblems(root, 'x.md', document)).toEqual([
        `x.md: the section "The thing" says designed and says "${aPromise}" of \`packages/one\`, ` +
          'which holds source and the tests that run it',
      ]);
    });

    it('reads the promise across a line that wrapped', () => {
      const root = repositoryHolding(workingCode);
      const wrapped = sectionSaying('designed', 'The code will\nbe in `packages/one`.');

      expect(staleStatusProblems(root, 'x.md', wrapped)).toHaveLength(1);
    });
  });

  describe('what it leaves alone', () => {
    it('a designed section that promises nothing', () => {
      const root = repositoryHolding(workingCode);
      const document = sectionSaying('designed', 'The code is in `packages/one`, undeployed.');

      expect(staleStatusProblems(root, 'x.md', document)).toEqual([]);
    });

    it('a built section, whatever it promises', () => {
      const root = repositoryHolding(workingCode);
      const document = sectionSaying('built', `More ${aPromise} in \`packages/one\`.`);

      expect(staleStatusProblems(root, 'x.md', document)).toEqual([]);
    });

    it('a promise about a directory that is not there', () => {
      const root = repositoryHolding(workingCode);
      const document = sectionSaying('designed', `The code ${aPromise} in \`packages/later\`.`);

      expect(staleStatusProblems(root, 'x.md', document)).toEqual([]);
    });

    it('a promise about source nobody wrote a test for', () => {
      const root = repositoryHolding([
        { path: 'packages/two/src/two.ts', contents: 'export const two = 2;\n' },
      ]);
      const document = sectionSaying('designed', `The code ${aPromise} in \`packages/two\`.`);

      expect(holdsWorkingCode(root, 'packages/two')).toBe(false);
      expect(staleStatusProblems(root, 'x.md', document)).toEqual([]);
    });

    it('a promise about a test directory holding no test', () => {
      const root = repositoryHolding([
        { path: 'packages/three/src/three.ts', contents: 'export const three = 3;\n' },
        { path: 'packages/three/tests/fixtures/a.ts', contents: 'export const a = 1;\n' },
      ]);

      expect(holdsWorkingCode(root, 'packages/three')).toBe(false);
    });
  });

  describe('the paths a section names', () => {
    it('reads what is written between backticks and holds a slash', () => {
      expect(pathsNamedIn('Read `packages/one` and `apps/mobile`, never `built`.')).toEqual([
        'apps/mobile',
        'packages/one',
      ]);
    });

    it('reads a sentence with no path as naming none', () => {
      expect(pathsNamedIn('It is `built` today.')).toEqual([]);
    });
  });

  describe('the body each section carries', () => {
    it('gives every section its own lines and its own status', () => {
      const two =
        '# A\n\n## One\n\nStatus: built\n\nFirst.\n\n## Two\n\nStatus: designed\n\nSecond.\n';

      expect(sectionBodiesIn(two).map((section) => [section.title, section.status])).toEqual([
        ['One', 'built'],
        ['Two', 'designed'],
      ]);
      expect(sectionBodiesIn(two)[0]?.body).toContain('First.');
      expect(sectionBodiesIn(two)[0]?.body).not.toContain('Second.');
    });

    it('does not read a heading inside a fenced block as a section', () => {
      const fenced = '# A\n\n## One\n\nStatus: built\n\n```\n## Two\n```\n';

      expect(sectionBodiesIn(fenced).map((section) => section.title)).toEqual(['One']);
    });
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

describe('the long term list carries one of three states on every item, and never a fourth', () => {
  const items = longTermItemsIn(features);
  const declared = contractsDeclaredIn(contracts);

  const brokenBy = (change: (markdown: string) => string): string[] =>
    longTermProblems(featureDocument, longTermItemsIn(change(features)), declared);

  it('reads every item under the group the operator grouped it in', () => {
    expect(items.length).toBeGreaterThan(40);
    expect(new Set(items.map((item) => item.group)).size).toBe(12);
    expect(items.filter((item) => item.text.length === 0)).toEqual([]);
  });

  it('takes nothing from the bullets that explain how to read the list', () => {
    expect(items.map((item) => item.text)).not.toContain('Planned. The operator agreed the item.');
  });

  it('gives every item one of the three states, and uses all three', () => {
    expect(items.filter((item) => item.state === null)).toEqual([]);
    expect([...new Set(items.map((item) => item.state))].sort()).toEqual(
      [...longTermStates].sort(),
    );
  });

  it('names a contract that the contract document declares on every item in version 1', () => {
    const inVersionOne = items.filter((item) => item.state === 'in version 1');

    expect(inVersionOne.length).toBeGreaterThan(0);
    expect(inVersionOne.filter((item) => item.contract === null)).toEqual([]);
    expect(inVersionOne.filter((item) => !declared.includes(item.contract ?? ''))).toEqual([]);
  });

  it('says the condition on each of the three items that carry one', () => {
    const conditional = items.filter((item) => item.state === 'conditional');

    expect(conditional.map((item) => item.text)).toEqual([
      'A badge from an auditor.',
      'A fitness recovery score aware of the cycle, which reads heart rate variability and sleep.',
      'A conversational assistant for questions about a cycle.',
    ]);
    expect(conditional.filter((item) => item.condition === null)).toEqual([]);
  });

  it('holds the document in this repository to all three rules', () => {
    expect(longTermProblems(featureDocument, items, declared)).toEqual([]);
  });

  it('fails an item that carries no state at all', () => {
    const problems = brokenBy((markdown) =>
      markdown.replace(
        '- Ovulation prediction. State: in version 1, `CYCLE-4`.',
        '- Ovulation prediction.',
      ),
    );

    expect(problems).toEqual([
      `${featureDocument}: the item "Ovulation prediction." under "${longTermHeading}" says nothing where it must say ${longTermStates.join(', ')}`,
    ]);
  });

  it('fails an item that invents a fourth state', () => {
    const problems = brokenBy((markdown) =>
      markdown.replace(
        '- Ovulation prediction. State: in version 1, `CYCLE-4`.',
        '- Ovulation prediction. State: soon.',
      ),
    );

    expect(problems).toEqual([
      `${featureDocument}: the item "Ovulation prediction." under "${longTermHeading}" says "soon." where it must say ${longTermStates.join(', ')}`,
    ]);
  });

  it('fails an item in version 1 that names no contract', () => {
    const problems = brokenBy((markdown) =>
      markdown.replace(
        '- Ovulation prediction. State: in version 1, `CYCLE-4`.',
        '- Ovulation prediction. State: in version 1.',
      ),
    );

    expect(problems).toEqual([
      `${featureDocument}: the item "Ovulation prediction." is in version 1 and names no contract, so nobody can get from it to ${contractDocument}`,
    ]);
  });

  it('fails an item in version 1 whose contract the contract document does not declare', () => {
    const problems = brokenBy((markdown) =>
      markdown.replace(
        '- Ovulation prediction. State: in version 1, `CYCLE-4`.',
        '- Ovulation prediction. State: in version 1, `CYCLE-9`.',
      ),
    );

    expect(problems).toEqual([
      `${featureDocument}: the item "Ovulation prediction." names "CYCLE-9", and ${contractDocument} declares no such contract`,
    ]);
  });

  it('fails a conditional item that does not say what has to happen first', () => {
    const list = [
      `## ${longTermHeading}`,
      '',
      '### Insight',
      '',
      '- A fitness recovery score aware of the cycle. State: conditional.',
    ].join('\n');

    expect(longTermProblems(featureDocument, longTermItemsIn(list), declared)).toEqual([
      `${featureDocument}: the item "A fitness recovery score aware of the cycle." is conditional and does not say what has to happen before it can be written as a fact`,
    ]);
  });

  it('refuses a document that carries no long term list at all', () => {
    expect(longTermProblems(featureDocument, [], declared)).toEqual([
      `${featureDocument} carries no item under "${longTermHeading}", so nothing says where Emi goes`,
    ]);
  });

  it('fails the whole run when an item carries no state', () => {
    const root = fixture(documentOf(['packages/one'], goodDiagram), ['packages/one'], {
      features: featuresOf(
        ['`TOKEN-1` the colour set.'],
        ['Partner sharing.'],
        ['### Core cycle tracking', '', '- Period logging.'],
      ),
    });

    const run = check(root);

    expect(run.output).toContain(
      `the item "Period logging." under "${longTermHeading}" says nothing`,
    );
    expect(run.status).not.toBe(0);
  }, 180_000);

  it('fails the whole run when the long term list is empty', () => {
    const root = fixture(documentOf(['packages/one'], goodDiagram), ['packages/one'], {
      features: featuresOf(['`TOKEN-1` the colour set.'], ['Partner sharing.'], []),
    });

    const run = check(root);

    expect(run.output).toContain(
      `${featureDocument} carries no item under "${longTermHeading}", so nothing says where Emi goes`,
    );
    expect(run.status).not.toBe(0);
  }, 180_000);
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

    it('reads the ten directories somebody can open on their own', () => {
      expect(directories).toEqual([
        'apps/mobile',
        'brand',
        'features',
        'packages/content',
        'packages/crypto',
        'packages/cycle',
        'packages/tokens',
        'packages/ui',
        'services/vault',
        'tools',
      ]);
    });

    it('finds a readme in each of them, and no problem in any', () => {
      expect(readmeProblems(repositoryRoot, directories)).toEqual([]);
    });

    it('takes the name of a workspace from its manifest, and the others from their path', () => {
      expect(directories.map((directory) => nameOf(repositoryRoot, directory))).toEqual([
        '@emi/mobile',
        'brand',
        'features',
        '@emi/content',
        '@emi/crypto',
        '@emi/cycle',
        '@emi/tokens',
        '@emi/ui',
        '@emi/vault',
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
