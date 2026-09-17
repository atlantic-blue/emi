import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const architectureDocument = 'docs/architecture.md';

export const directoryHeading = 'The directories';

const statuses = ['built', 'designed'];

export interface Section {
  readonly title: string;
  readonly status: string | null;
}

interface Line {
  readonly text: string;
  readonly fenced: boolean;
}

// A heading inside a fenced block is text and not a heading, so every reader below walks the lines
// once and carries the fence state with it.
function linesOf(markdown: string): Line[] {
  let fenced = false;

  return markdown.split('\n').map((text) => {
    if (text.startsWith('```')) {
      fenced = !fenced;
      return { text, fenced: true };
    }

    return { text, fenced };
  });
}

export function sectionsIn(markdown: string): Section[] {
  const sections: Section[] = [];
  let awaiting: string | null = null;

  for (const line of linesOf(markdown)) {
    if (line.fenced) {
      continue;
    }

    if (line.text.startsWith('## ')) {
      if (awaiting !== null) {
        sections.push({ title: awaiting, status: null });
      }

      awaiting = line.text.slice(3).trim();
      continue;
    }

    if (awaiting === null || line.text.trim().length === 0) {
      continue;
    }

    const status = line.text.startsWith('Status: ') ? line.text.slice(8).trim() : null;

    sections.push({ title: awaiting, status });
    awaiting = null;
  }

  if (awaiting !== null) {
    sections.push({ title: awaiting, status: null });
  }

  return sections;
}

export function statusProblems(file: string, markdown: string): string[] {
  const sections = sectionsIn(markdown);

  if (sections.length === 0) {
    return [`${file} carries no section, so nothing in it says built or designed`];
  }

  return sections
    .filter((section) => section.status === null || !statuses.includes(section.status))
    .map((section) => {
      const said = section.status === null ? 'nothing' : `"${section.status}"`;

      return `${file}: the section "${section.title}" says ${said} where it must say built or designed`;
    });
}

export function diagramsIn(markdown: string): string[] {
  const diagrams: string[] = [];
  let collecting: string[] | null = null;

  for (const text of markdown.split('\n')) {
    if (collecting !== null) {
      if (text.startsWith('```')) {
        diagrams.push(collecting.join('\n'));
        collecting = null;
      } else {
        collecting.push(text);
      }

      continue;
    }

    if (text.trim() === '```mermaid') {
      collecting = [];
    }
  }

  return diagrams;
}

export function directoriesNamedIn(markdown: string, heading: string): string[] {
  const named: string[] = [];
  let inside = false;

  for (const line of linesOf(markdown)) {
    if (!line.fenced && line.text.startsWith('## ')) {
      inside = line.text.slice(3).trim() === heading;
      continue;
    }

    if (!inside || line.fenced || !line.text.startsWith('- `')) {
      continue;
    }

    const closing = line.text.indexOf('`', 3);

    if (closing > 3) {
      named.push(line.text.slice(3, closing));
    }
  }

  return named;
}

function trackedFiles(root: string, pathspec: string[]): string[] {
  const listed = spawnSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', ...pathspec],
    { cwd: root, encoding: 'utf8' },
  );

  if (listed.status !== 0) {
    throw new Error(`git could not list the files in ${root}: ${listed.stderr}`);
  }

  return listed.stdout
    .split('\n')
    .filter((file) => file.length > 0)
    .sort();
}

export function workspaceDirectoriesOf(root: string): string[] {
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
    workspaces?: string[];
  };

  const parents = (manifest.workspaces ?? [])
    .filter((pattern) => pattern.endsWith('/*'))
    .map((pattern) => pattern.slice(0, -2));

  const found = new Set<string>();

  for (const file of trackedFiles(root, [])) {
    for (const parent of parents) {
      if (!file.startsWith(`${parent}/`)) {
        continue;
      }

      const child = file.slice(parent.length + 1).split('/')[0];

      if (child !== undefined && child.length > 0) {
        found.add(`${parent}/${child}`);
      }
    }
  }

  return [...found].sort();
}

export function markdownFilesOf(root: string): string[] {
  return trackedFiles(root, ['*.md']);
}

export function driftProblems(
  named: string[],
  workspaces: string[],
  exists: (directory: string) => boolean,
): string[] {
  const missing = named
    .filter((directory) => !exists(directory))
    .map(
      (directory) =>
        `${architectureDocument} names "${directory}" under "${directoryHeading}", and no such directory is on disk`,
    );

  const unnamed = workspaces
    .filter((directory) => !named.includes(directory))
    .map(
      (directory) =>
        `the workspace "${directory}" is on disk, and ${architectureDocument} does not name it under "${directoryHeading}"`,
    );

  return [...missing, ...unnamed];
}

export interface RenderResult {
  readonly diagrams: number;
  readonly problems: string[];
}

// The tool draws through a browser, so each document costs one launch. Only a document that holds
// a diagram is handed to it.
export function renderProblems(root: string, files: string[], tooling: string): RenderResult {
  const tool = join(tooling, 'node_modules', '.bin', 'mmdc');
  const configuration = join(tooling, 'tools', 'pipeline', 'puppeteer.json');
  const output = mkdtempSync(join(tmpdir(), 'emi-diagrams-'));
  const problems: string[] = [];
  let diagrams = 0;

  try {
    for (const file of files) {
      const found = diagramsIn(readFileSync(join(root, file), 'utf8')).length;

      if (found === 0) {
        continue;
      }

      diagrams += found;

      const run = spawnSync(
        tool,
        [
          '--input',
          join(root, file),
          '--output',
          join(output, 'rendered.md'),
          '--puppeteerConfigFile',
          configuration,
        ],
        { encoding: 'utf8' },
      );

      if (run.status !== 0) {
        problems.push(
          `${file} holds a diagram the mermaid tool refused:\n${run.stdout}${run.stderr}`,
        );
      }
    }
  } finally {
    rmSync(output, { force: true, recursive: true });
  }

  // A render that finds nothing to render exits zero and prints a tick, so the count is the check.
  if (diagrams === 0) {
    problems.push(
      `no mermaid diagram was found in ${files.length} document(s), so the render proved nothing`,
    );
  }

  return { diagrams, problems };
}

export const featureDocument = 'docs/features.md';

export const contractDocument = 'docs/contracts.md';

export const refusalHeading = 'What version 1 does not do';

const contractPattern = /^([A-Z]+-\d+)\b/;

const featurePattern = /^## (Feature \d+)\b/;

export interface MappedContract {
  readonly contract: string;
  readonly feature: string;
}

// A bullet may wrap onto an indented line, so the reader joins the wrapped part back on before
// anybody reads the text of the item.
function bulletsUnder(markdown: string, heading: string): string[] {
  const bullets: string[] = [];
  let inside = false;

  for (const line of linesOf(markdown)) {
    if (!line.fenced && line.text.startsWith('## ')) {
      inside = line.text.slice(3).trim() === heading;
      continue;
    }

    if (!inside || line.fenced) {
      continue;
    }

    if (line.text.startsWith('- ')) {
      bullets.push(line.text.slice(2).trim());
      continue;
    }

    const continued = line.text.startsWith('  ') && line.text.trim().length > 0;
    const last = bullets.length - 1;

    if (continued && last >= 0) {
      bullets[last] = `${bullets[last]} ${line.text.trim()}`;
    }
  }

  return bullets;
}

export function contractsDeclaredIn(markdown: string): string[] {
  const declared: string[] = [];

  for (const line of linesOf(markdown)) {
    if (line.fenced || !line.text.startsWith('### ')) {
      continue;
    }

    const found = contractPattern.exec(line.text.slice(4).trim());

    if (found !== null) {
      declared.push(found[1] as string);
    }
  }

  return declared;
}

export function contractsMappedIn(markdown: string): MappedContract[] {
  const mapped: MappedContract[] = [];
  let feature: string | null = null;

  for (const line of linesOf(markdown)) {
    if (line.fenced) {
      continue;
    }

    if (line.text.startsWith('## ')) {
      const heading = featurePattern.exec(line.text);

      feature = heading === null ? null : (heading[1] as string);
      continue;
    }

    if (feature === null || !line.text.startsWith('- `')) {
      continue;
    }

    const closing = line.text.indexOf('`', 3);

    if (closing <= 3) {
      continue;
    }

    const found = contractPattern.exec(line.text.slice(3, closing));

    if (found !== null) {
      mapped.push({ contract: found[1] as string, feature });
    }
  }

  return mapped;
}

export function contractProblems(declared: string[], mapped: MappedContract[]): string[] {
  const problems: string[] = [];
  const features = new Map<string, string[]>();

  for (const entry of mapped) {
    features.set(entry.contract, [...(features.get(entry.contract) ?? []), entry.feature]);
  }

  if (declared.length === 0) {
    problems.push(`${contractDocument} declares no contract, so the map proves nothing`);
  }

  for (const contract of declared) {
    if (!features.has(contract)) {
      problems.push(
        `${contractDocument} declares "${contract}", and ${featureDocument} names it under no feature`,
      );
    }
  }

  for (const [contract, named] of features) {
    if (!declared.includes(contract)) {
      problems.push(
        `${featureDocument} names "${contract}" under ${named[0]}, and ${contractDocument} declares no such contract`,
      );

      continue;
    }

    if (named.length > 1) {
      problems.push(
        `${featureDocument} names "${contract}" under ${named.join(' and ')}, and one feature builds a contract`,
      );
    }
  }

  return problems;
}

export function refusalsIn(markdown: string): string[] {
  return bulletsUnder(markdown, refusalHeading);
}

export function refusalProblems(file: string, refusals: string[]): string[] {
  if (refusals.length === 0) {
    return [`${file} names no refusal under "${refusalHeading}", so version 1 refuses nothing`];
  }

  const seen = new Set<string>();
  const problems: string[] = [];

  for (const refusal of refusals) {
    const said = refusal.toLowerCase().replace(/\s+/g, ' ').replace(/\.$/, '');

    if (seen.has(said)) {
      problems.push(`${file} names the refusal "${refusal}" twice under "${refusalHeading}"`);
    }

    seen.add(said);
  }

  return problems;
}

export interface DocumentResult {
  readonly diagrams: number;
  readonly contracts: number;
  readonly refusals: number;
  readonly problems: string[];
}

function documentIn(root: string, file: string): { markdown: string; problems: string[] } {
  if (!existsSync(join(root, file))) {
    return { markdown: '', problems: [`${file} is absent, and the pipeline reads it`] };
  }

  return { markdown: readFileSync(join(root, file), 'utf8'), problems: [] };
}

export function documentProblems(root: string, tooling: string): DocumentResult {
  const files = markdownFilesOf(root);
  const architecture = readFileSync(join(root, architectureDocument), 'utf8');

  const drift = driftProblems(
    directoriesNamedIn(architecture, directoryHeading),
    workspaceDirectoriesOf(root),
    (directory) => existsSync(join(root, directory)),
  );

  const marked = statusProblems(architectureDocument, architecture);
  const features = documentIn(root, featureDocument);
  const contracts = documentIn(root, contractDocument);

  const declared = contractsDeclaredIn(contracts.markdown);
  const mapped = contractsMappedIn(features.markdown);
  const refusals = refusalsIn(features.markdown);

  const agreement =
    features.problems.length + contracts.problems.length > 0
      ? []
      : [...contractProblems(declared, mapped), ...refusalProblems(featureDocument, refusals)];

  const rendered = renderProblems(root, files, tooling);

  return {
    diagrams: rendered.diagrams,
    contracts: mapped.length,
    refusals: refusals.length,
    problems: [
      ...drift,
      ...marked,
      ...features.problems,
      ...contracts.problems,
      ...agreement,
      ...rendered.problems,
    ],
  };
}
