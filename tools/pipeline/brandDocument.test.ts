import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import {
  CONTRAST_FLOOR,
  colourNames,
  colours,
  contrastRatio,
} from '../../packages/tokens/src/colour';
import {
  MINIMUM_TAP_TARGET,
  radius,
  space,
  spaceNames,
  stroke,
} from '../../packages/tokens/src/space';
import { face, letterSpacingOf, typeRoleNames, typeScale } from '../../packages/tokens/src/type';
import {
  type BrandSources,
  approvedPairs,
  brandCounts,
  brandDocument,
  brandDocumentPath,
  fillPairs,
  generateCommand,
  inkPartnerOf,
  refusedPairs,
  report,
  shippedSources,
  stalenessProblems,
} from '../brand/generateBrandDocument';
import { statusProblems } from './documentation';

const repositoryRoot = resolve(__dirname, '..', '..');
const writer = join(repositoryRoot, 'tools', 'brand', 'writeBrandDocument.ts');

const committed = readFileSync(join(repositoryRoot, brandDocumentPath), 'utf8');
const generated = brandDocument();
const counts = brandCounts();

// One colour moved to the value of another, which is what a token change looks like from here.
const moved: BrandSources = {
  ...shippedSources,
  palette: { ...colours, ember: { ...colours.ember, value: colours.emberPressed.value } },
};

function run(...args: string[]): { status: number | null; output: string } {
  const finished = spawnSync(
    process.execPath,
    ['--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', writer, ...args],
    { cwd: repositoryRoot, encoding: 'utf8' },
  );

  return { status: finished.status, output: `${finished.stdout}${finished.stderr}` };
}

const made: string[] = [];

function fixtureHolding(document: string | null): string {
  const root = mkdtempSync(join(tmpdir(), 'emi-brand-'));

  made.push(root);

  if (document !== null) {
    mkdirSync(join(root, dirname(brandDocumentPath)), { recursive: true });
    writeFileSync(join(root, brandDocumentPath), document);
  }

  return root;
}

afterAll(() => {
  for (const root of made) {
    rmSync(root, { force: true, recursive: true });
  }
});

describe('a changed token leaves the brand document stale and the run red', () => {
  describe('the check the pipeline runs', () => {
    it('passes on the committed document and says what it counted', () => {
      const finished = run('--check');

      expect(finished.output).toContain(
        `${brandDocumentPath} is what the tokens generate: ${counts.colours} colours, ${counts.approved} approved pairs, ${counts.refused} refused pairs and ${counts.sizes} type sizes.`,
      );
      expect(finished.status).toBe(0);
      expect(counts.colours).toBeGreaterThan(0);
      expect(counts.approved).toBeGreaterThan(0);
    });

    it('goes red on a document written before a colour token moved, naming the file and the line', () => {
      const finished = run('--check', fixtureHolding(brandDocument(moved)));

      expect(finished.status).not.toBe(0);
      expect(finished.output).toContain(`${brandDocumentPath} is stale`);
      expect(finished.output).toContain('disagree at line');
      expect(finished.output).toContain(
        `committed: "- \`ember\` is \`${colours.emberPressed.value}\``,
      );
      expect(finished.output).toContain(`generated: "- \`ember\` is \`${colours.ember.value}\``);
      expect(finished.output).toContain(`Run ${generateCommand}.`);
    });

    it('goes green again once the generator writes the document back', () => {
      const root = fixtureHolding(brandDocument(moved));

      expect(run('--check', root).status).not.toBe(0);

      const written = run(root);

      expect(written.output).toContain(`wrote ${brandDocumentPath} from the tokens`);
      expect(written.status).toBe(0);
      expect(readFileSync(join(root, brandDocumentPath), 'utf8')).toBe(generated);
      expect(run('--check', root).status).toBe(0);
    });

    it('goes red on a document that differs by one character', () => {
      const finished = run('--check', fixtureHolding(`${generated} `));

      expect(finished.output).toContain(`${brandDocumentPath} is stale`);
      expect(finished.status).not.toBe(0);
    });

    it('goes red when nobody generated the document at all', () => {
      const finished = run('--check', fixtureHolding(null));

      expect(finished.output).toContain(`${brandDocumentPath} is missing`);
      expect(finished.status).not.toBe(0);
    });

    it('writes the document where none exists, rather than refusing', () => {
      const root = fixtureHolding(null);

      expect(run(root).status).toBe(0);
      expect(readFileSync(join(root, brandDocumentPath), 'utf8')).toBe(generated);
    });
  });

  describe('the palette the document prints', () => {
    it('is the committed document, so the tests below read what a reader reads', () => {
      expect(committed).toBe(generated);
    });

    it('names every colour with the value the application uses', () => {
      const absent = colourNames.filter(
        (name) => !committed.includes(`- \`${name}\` is \`${colours[name].value}\``),
      );

      expect(absent).toEqual([]);
      expect(colourNames).toHaveLength(counts.colours);
    });

    it('holds no colour the token package does not hold', () => {
      const printed = [...committed.matchAll(/#[0-9A-Fa-f]{3,8}\b/g)].map((found) => found[0]);
      const known = new Set(colourNames.map((name) => colours[name].value));

      expect(printed.length).toBe(counts.colours);
      expect([...new Set(printed)].filter((value) => !known.has(value))).toEqual([]);
    });

    it('prints the ratio the contrast test measures, for every approved pair', () => {
      const pairs = approvedPairs();
      const absent = pairs.filter((pair) => !committed.includes(`- ${report(pair)}`));

      expect(absent).toEqual([]);
      expect(pairs).toHaveLength(counts.approved);
      expect(committed).toContain(`These ${counts.approved} pairs are approved:`);
    });

    it('measures every approved pair at or above the floor', () => {
      const under = approvedPairs()
        .filter((pair) => pair.ratio < CONTRAST_FLOOR)
        .map(report);

      expect(under).toEqual([]);
    });

    it('measures the pairs it refuses instead of leaving them unexplained', () => {
      const refused = refusedPairs();

      expect(committed).toContain('- muted on sunk is 4.43 to 1');
      expect(committed).toContain('- muted on emberTint is 4.36 to 1');
      expect(refused.every((pair) => pair.ratio < CONTRAST_FLOOR)).toBe(true);
      expect(refused.filter((pair) => !committed.includes(`- ${report(pair)}`))).toEqual([]);
      expect(refused.length).toBeGreaterThan(0);
    });

    it('measures each phase fill on the ground, and names the ink that carries its text', () => {
      const fills = fillPairs();
      const unnamed = fills.filter(
        (pair) =>
          !committed.includes(`- ${report(pair)}, so \`${pair.text}Ink\` carries the text.`),
      );

      expect(fills.map((pair) => pair.text)).toEqual([
        'period',
        'follicular',
        'ovulation',
        'luteal',
      ]);
      expect(unnamed).toEqual([]);
    });

    it('takes ember for a fill and not for a phase, because no colour is named emberInk', () => {
      const fills = fillPairs().map((pair) => pair.text);

      expect(inkPartnerOf(shippedSources, 'period')).toBe('periodInk');
      expect(inkPartnerOf(shippedSources, 'ember')).toBeNull();
      expect(inkPartnerOf(shippedSources, 'emberPressed')).toBeNull();
      expect(fills).not.toContain('ember');
      expect(fills).not.toContain('emberPressed');
    });

    it('says which fill measures above the floor and is refused as text anyway', () => {
      const passing = fillPairs().filter((pair) => pair.ratio >= CONTRAST_FLOOR);

      expect(passing.map((pair) => pair.text)).toEqual(['luteal']);
      expect(committed).toContain('The fill `luteal` measures above the floor.');
    });

    it('moves the ratio it prints when the colour under it moves', () => {
      const before = report({
        text: 'ember',
        ground: 'stone',
        ratio: contrastRatio(colours.ember.value, colours.stone.value),
      });
      const after = brandDocument(moved);

      expect(committed).toContain(before);
      expect(after).not.toContain(before);
      expect(stalenessProblems(committed, after)[0]).toContain(`${brandDocumentPath} is stale`);
    });
  });

  describe('the type, the space and the markers the other checks read', () => {
    it('names every role with its line height and its weight', () => {
      const absent = typeRoleNames.filter((name) => {
        const style = typeScale[name];

        return !committed.includes(
          `- \`${name}\` is ${style.size} points over ${style.lineHeight} at weight ${style.weight}`,
        );
      });

      expect(absent).toEqual([]);
      expect(typeRoleNames).toHaveLength(counts.sizes);
    });

    it('says the one family every role is set in', () => {
      expect(committed).toContain(`every one of them is set in ${face.text}`);
      expect(letterSpacingOf(11, 0.04)).toBe(0.44);
    });

    it('names every space, every radius and every stroke', () => {
      const numbers = [
        ...spaceNames.map((name) => [name, space[name]] as const),
        ...Object.entries(radius),
        ...Object.entries(stroke),
      ];

      expect(
        numbers.filter(([name, value]) => !committed.includes(`- \`${name}\` is ${value}.`)),
      ).toEqual([]);
      expect(numbers.length).toBeGreaterThan(10);
      expect(committed).toContain(
        `The smallest tap target is ${MINIMUM_TAP_TARGET} points square.`,
      );
    });

    it('marks every section built or designed, as the documents check demands', () => {
      expect(statusProblems(brandDocumentPath, committed)).toEqual([]);
      expect(committed.split('\n').filter((line) => line.startsWith('## ')).length).toBeGreaterThan(
        2,
      );
    });

    it('is already formatted, so the formatter does not fight the generator', () => {
      const formatter = join(repositoryRoot, 'node_modules', 'prettier', 'bin', 'prettier.cjs');
      const finished = spawnSync(process.execPath, [formatter, '--check', brandDocumentPath], {
        cwd: repositoryRoot,
        encoding: 'utf8',
      });

      expect(`${finished.stdout}${finished.stderr}`).toContain(
        'All matched files use Prettier code style!',
      );
      expect(finished.status).toBe(0);
    });
  });
});
