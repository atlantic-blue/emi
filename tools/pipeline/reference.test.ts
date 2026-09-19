import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import { type Documented, exportsIn, prose, reExportsIn } from '../documentation/exports';
import {
  type ReadFile,
  type Surface,
  checkCommand,
  echoProblems,
  generateCommand,
  referenceCounts,
  referenceIndexPath,
  referencePage,
  referenceResult,
  stalenessProblems,
  surfacesOf,
  undocumentedProblems,
} from '../documentation/generateReference';
import { echoOf, meaningfulWords, stem, wordsIn } from '../documentation/wording';

const repositoryRoot = resolve(__dirname, '..', '..');
const writer = join(repositoryRoot, 'tools', 'documentation', 'writeReference.ts');

const shipped = referenceResult(repositoryRoot);
const counts = referenceCounts(shipped.surfaces);

function symbolNamed(name: string): Documented {
  const found = shipped.surfaces
    .flatMap((surface) => surface.symbols)
    .find((symbol) => symbol.name === name);

  if (found === undefined) {
    throw new Error(`no package exports ${name}, so this test is measuring nothing`);
  }

  return found;
}

/**
 * Takes the comment off one real declaration and leaves the rest of the repository alone, so the
 * mutation the run is watched against is the one a careless edit would make.
 */
function withoutTheCommentOn(contents: string, symbol: Documented): string {
  const lines = contents.split('\n');
  const declaration = symbol.line - 1;
  const closing = lines[declaration - 1]?.trim() ?? '';

  if (closing.startsWith('/**') && closing.endsWith('*/')) {
    lines.splice(declaration - 1, 1);

    return lines.join('\n');
  }

  if (closing !== '*/') {
    throw new Error(`${symbol.name} carries no block comment above line ${symbol.line}`);
  }

  let opening = declaration - 1;

  while (opening > 0 && !(lines[opening] ?? '').trim().startsWith('/**')) {
    opening -= 1;
  }

  lines.splice(opening, declaration - opening);

  return lines.join('\n');
}

/** Where a declaration sits once the lines above it have moved, so no line number is guessed. */
function declarationLineOf(contents: string, name: string): number {
  const at = contents
    .split('\n')
    .findIndex((line) => line.startsWith('export ') && line.includes(name));

  if (at < 0) {
    throw new Error(`no line of the mutated source declares ${name}`);
  }

  return at + 1;
}

function readerWithout(symbol: Documented): ReadFile {
  return (file) => {
    const contents = readFileSync(join(repositoryRoot, file), 'utf8');

    return file === symbol.file ? withoutTheCommentOn(contents, symbol) : contents;
  };
}

function run(...args: string[]): { status: number | null; output: string } {
  const finished = spawnSync(
    process.execPath,
    ['--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', writer, ...args],
    { cwd: repositoryRoot, encoding: 'utf8' },
  );

  return { status: finished.status, output: `${finished.stdout}${finished.stderr}` };
}

const made: string[] = [];

function fixtureHolding(pages: readonly { path: string; contents: string }[]): string {
  const root = mkdtempSync(join(tmpdir(), 'emi-reference-'));

  made.push(root);

  for (const page of pages) {
    mkdirSync(join(root, dirname(page.path)), { recursive: true });
    writeFileSync(join(root, page.path), page.contents);
  }

  return root;
}

afterAll(() => {
  for (const root of made) {
    rmSync(root, { force: true, recursive: true });
  }
});

describe('an export with no documentation comment fails the pipeline', () => {
  describe('the surface the reference is generated from', () => {
    it('is every workspace that offers an index, and no other', () => {
      expect(shipped.surfaces.map((surface) => surface.name)).toEqual([
        '@emi/content',
        '@emi/crypto',
        '@emi/cycle',
        '@emi/tokens',
        '@emi/vault',
      ]);
      expect(shipped.surfaces.map((surface) => surface.page)).toEqual([
        'docs/reference/content.md',
        'docs/reference/crypto.md',
        'docs/reference/cycle.md',
        'docs/reference/tokens.md',
        'docs/reference/vault.md',
      ]);
    });

    it('follows the index into every file it hands on', () => {
      const tokens = shipped.surfaces.find((surface) => surface.name === '@emi/tokens') as Surface;

      expect(tokens.files.map((file) => file.file)).toEqual([
        'packages/tokens/src/index.ts',
        'packages/tokens/src/colour.ts',
        'packages/tokens/src/font.ts',
        'packages/tokens/src/icons.ts',
        'packages/tokens/src/ring.ts',
        'packages/tokens/src/space.ts',
        'packages/tokens/src/text.ts',
        'packages/tokens/src/type.ts',
      ]);
    });

    it('counted a surface worth reading, rather than nothing at all', () => {
      expect(counts.packages).toBe(5);
      expect(counts.files).toBeGreaterThan(12);
      expect(counts.symbols).toBeGreaterThan(100);
    });

    it('refuses an index that names what it hands on, because a symbol could then leave the page', () => {
      expect(() => reExportsIn('src/index.ts', "export { one } from './one';")).toThrow(
        'and the reference reads a star export',
      );
      expect(reExportsIn('src/index.ts', "export * from './one';")).toEqual(['./one']);
    });
  });

  describe('every exported symbol carries one today', () => {
    it('finds no symbol without a comment anywhere in the three packages', () => {
      expect(undocumentedProblems(shipped.surfaces)).toEqual([]);
    });

    it('names the symbol, its file and its line when a comment comes off', () => {
      const symbol = symbolNamed('contrastRatio');
      const read = readerWithout(symbol);
      const at = declarationLineOf(read(symbol.file), 'contrastRatio');
      const problems = undocumentedProblems(surfacesOf(repositoryRoot, read));

      expect(problems).toEqual([
        `@emi/tokens exports \`contrastRatio\` with no documentation comment, at packages/tokens/src/colour.ts line ${at}`,
      ]);
      expect(at).toBeGreaterThan(1);
    });

    it('goes quiet again once that comment is back', () => {
      expect(undocumentedProblems(surfacesOf(repositoryRoot))).toEqual([]);
      expect(symbolNamed('contrastRatio').comment).toContain(
        'Web Content Accessibility Guidelines',
      );
    });

    it('reads a comment off a constant, a function, a class, an interface and a type alike', () => {
      const kinds = new Set(
        shipped.surfaces.flatMap((surface) => surface.symbols.map((symbol) => symbol.kind)),
      );

      expect([...kinds].sort()).toEqual(['class', 'const', 'function', 'interface', 'type']);
    });
  });

  describe('what counts as a documentation comment', () => {
    it('refuses a line comment, because an editor does not show one at the call site', () => {
      const [found] = exportsIn('one.ts', '// A count of days.\nexport const days = 8;\n');

      expect(found?.comment).toBeNull();
    });

    it('refuses a comment a blank line separates from the declaration', () => {
      const [found] = exportsIn('one.ts', '/** A file header. */\n\nexport const days = 8;\n');

      expect(found?.comment).toBeNull();
    });

    it('takes the nearest comment when a file header sits above it', () => {
      const [found] = exportsIn(
        'one.ts',
        '/** A file header. */\n\n/** Eight is the bound. */\nexport const days = 8;\n',
      );

      expect(found?.comment).toBe('Eight is the bound.');
    });

    it('keeps the line breaks and the blank lines the author wrote', () => {
      expect(prose('/**\n * One.\n *\n * Two.\n */')).toBe('One.\n\nTwo.');
    });

    it('prints a constant with its type, and one without a type with its value', () => {
      const found = exportsIn(
        'one.ts',
        '/** A. */\nexport const named: readonly string[] = [];\n/** B. */\nexport const days = 8;\n',
      );

      expect(found.map((symbol) => symbol.signature)).toEqual([
        'const named: readonly string[]',
        'const days = 8',
      ]);
    });
  });

  describe('the check the pipeline runs', () => {
    it('passes on the committed pages and says what it counted', () => {
      const finished = run('--check');

      expect(finished.output).toContain(
        `${shipped.pages.length} pages are what the source generates: ${counts.packages} packages, ${counts.symbols} exported symbols across ${counts.files} files.`,
      );
      expect(finished.status).toBe(0);
    });

    it('goes red on a page written before a signature moved, naming the file and the line', () => {
      const moved = referencePage(
        surfacesOf(repositoryRoot, (file) => {
          const contents = readFileSync(join(repositoryRoot, file), 'utf8');

          return file === 'packages/tokens/src/colour.ts'
            ? contents.replace(
                'export const CONTRAST_FLOOR = 4.5;',
                'export const CONTRAST_FLOOR = 3;',
              )
            : contents;
        }).find((surface) => surface.name === '@emi/tokens') as Surface,
      );

      const finished = run(
        '--check',
        fixtureHolding([
          ...shipped.pages.filter((page) => page.path !== 'docs/reference/tokens.md'),
          { path: 'docs/reference/tokens.md', contents: moved },
        ]),
      );

      expect(finished.status).not.toBe(0);
      expect(finished.output).toContain('docs/reference/tokens.md is stale');
      expect(finished.output).toContain('disagree at line');
      expect(finished.output).toContain('committed: "const CONTRAST_FLOOR = 3"');
      expect(finished.output).toContain('generated: "const CONTRAST_FLOOR = 4.5"');
      expect(finished.output).toContain(`Run ${generateCommand}`);
    });

    it('goes green again once the generator writes the pages back', () => {
      const root = fixtureHolding([{ path: referenceIndexPath, contents: 'stale\n' }]);

      expect(run('--check', root).status).not.toBe(0);

      const written = run(root);

      expect(written.output).toContain(`wrote ${shipped.pages.length} pages from the source`);
      expect(written.status).toBe(0);

      for (const page of shipped.pages) {
        expect(readFileSync(join(root, page.path), 'utf8')).toBe(page.contents);
      }

      expect(run('--check', root).status).toBe(0);
    });

    it('goes red on a page that differs by one character', () => {
      const [first, ...rest] = shipped.pages;
      const root = fixtureHolding([
        {
          path: (first as { path: string }).path,
          contents: `${(first as { contents: string }).contents} `,
        },
        ...rest,
      ]);

      const finished = run('--check', root);

      expect(finished.output).toContain('is stale');
      expect(finished.status).not.toBe(0);
    });

    it('goes red when nobody generated the pages at all', () => {
      const finished = run('--check', fixtureHolding([]));

      expect(finished.output).toContain(`${referenceIndexPath} is missing`);
      expect(finished.status).not.toBe(0);
    });

    it('says how a page and the generator differ, and says nothing when they agree', () => {
      expect(stalenessProblems('one.md', 'a\nb\n', 'a\nb\n')).toEqual([]);
      expect(stalenessProblems('one.md', 'a\nc\n', 'a\nb\n')[0]).toBe(
        'one.md is stale: the committed copy and the generator disagree at line 2.',
      );
    });

    it('is a command the pipeline actually runs', () => {
      const manifest = JSON.parse(readFileSync(join(repositoryRoot, 'package.json'), 'utf8')) as {
        scripts: Record<string, string>;
      };
      const workflow = readFileSync(join(repositoryRoot, '.github/workflows/ci.yml'), 'utf8');

      expect(manifest.scripts['check:reference']).toContain('writeReference.ts');
      expect(manifest.scripts['generate:reference']).toContain('writeReference.ts');
      expect(workflow).toContain(`run: ${checkCommand}`);
    });
  });

  describe('a comment that only repeats the identifier it sits on', () => {
    const echoing = '/** The icon size. */\nexport const ICON_SIZE = 24;\n';
    const saying =
      '/** Points. A drawing on another grid does not match the stroke beside it. */\nexport const ICON_SIZE = 24;\n';

    it('leaves every comment in this repository alone', () => {
      expect(echoProblems(shipped.surfaces)).toEqual([]);
    });

    it('refuses one that holds no word the declaration does not already carry', () => {
      const [found] = exportsIn('packages/tokens/src/icons.ts', echoing);

      expect(echoOf(found?.comment ?? '', found?.signature ?? '')).toEqual({
        newWords: [],
        isEcho: true,
      });
    });

    it('names it with its file and its line, through the surface the pipeline reads', () => {
      const symbol = symbolNamed('ICON_SIZE');
      const echoed = (file: string): string => {
        const contents = readFileSync(join(repositoryRoot, file), 'utf8');

        if (file !== symbol.file) {
          return contents;
        }

        const lines = withoutTheCommentOn(contents, symbol).split('\n');
        lines.splice(
          declarationLineOf(lines.join('\n'), symbol.name) - 1,
          0,
          '/** The icon size. */',
        );

        return lines.join('\n');
      };

      const surfaces = surfacesOf(repositoryRoot, echoed);
      const at = declarationLineOf(echoed(symbol.file), symbol.name);

      expect(echoProblems(surfaces)).toEqual([
        `@emi/tokens documents \`ICON_SIZE\` with a comment that holds no word the declaration does not, at packages/tokens/src/icons.ts line ${at}`,
      ]);
    });

    it('accepts the same declaration once the comment says what the number cannot', () => {
      const [found] = exportsIn('packages/tokens/src/icons.ts', saying);
      const measured = echoOf(found?.comment ?? '', found?.signature ?? '');

      expect(measured.isEcho).toBe(false);
      expect(measured.newWords).toContain('point');
    });

    it('counts a plural and its singular as one word', () => {
      expect(stem('colours')).toBe('colour');
      expect(echoOf('The colours.', 'const colour: string').isEcho).toBe(true);
    });

    it('splits an identifier at its capitals', () => {
      expect(wordsIn('fontNameFor')).toEqual(['font', 'name', 'for']);
      expect(wordsIn('ICON_SIZE')).toEqual(['icon', 'size']);
      expect(meaningfulWords('The name of the font.')).toEqual(['name', 'font']);
    });

    it('refuses a comment that carries no word at all', () => {
      expect(echoOf('The.', 'const days = 8').isEcho).toBe(true);
    });
  });
});
