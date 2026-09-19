import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import { driftProblems } from '../../brand/screens/picture';
import {
  type Beat,
  caveatProblems,
  kindOf,
  scriptsOf,
  featuresIn,
  pictureAt,
  picturesOnDisk,
  sectionsIn,
  storyDocument,
  storyProblems,
} from './story';

const repositoryRoot = resolve(__dirname, '..', '..');
const command = join(repositoryRoot, 'tools', 'pipeline', 'checkStory.ts');

const shipped = storyProblems(repositoryRoot);

function run(...args: string[]): { status: number | null; output: string } {
  const finished = spawnSync(
    process.execPath,
    ['--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', command, ...args],
    { cwd: repositoryRoot, encoding: 'utf8' },
  );

  return { status: finished.status, output: `${finished.stdout}${finished.stderr}` };
}

const made: string[] = [];

interface File {
  readonly path: string;
  readonly contents: string;
}

function fixtureHolding(files: readonly File[]): string {
  const root = mkdtempSync(join(tmpdir(), 'emi-story-'));

  made.push(root);

  for (const file of files) {
    mkdirSync(join(root, dirname(file.path)), { recursive: true });
    writeFileSync(join(root, file.path), file.contents);
  }

  return root;
}

afterAll(() => {
  for (const root of made) {
    rmSync(root, { force: true, recursive: true });
  }
});

const theCaveat =
  'Rendered under the test runner at 390 by 844 points, and not captured from a phone. Draw it ' +
  'again with `npm run generate:welcome-picture`.';

const theDrawingCaveat =
  'Drawn by its own generator, rather than under the test runner. Run ' +
  '`npm run generate:logo`.';

/** A fixture carries the scripts its lines name, because a line naming a script nobody has fails. */
const fixtureScripts = ['generate:welcome-picture', 'generate:logo'];

const fixtureManifest = JSON.stringify({
  scripts: Object.fromEntries(fixtureScripts.map((script) => [script, 'echo'])),
});

const twoFeatures = [
  '# The features',
  '',
  '## Feature 1: The brand exists',
  '',
  'The logo and the palette.',
  '',
  '## Feature 2: She opens Emi and logs her first period',
  '',
  'The first run.',
  '',
].join('\n');

function storyTelling(beats: readonly string[]): string {
  return [
    '# The story',
    '',
    '## Feature 2: She opens Emi and logs her first period',
    '',
    ...beats,
  ].join('\n');
}

const oneBeat = [
  'She opens Emi for the first time and it asks her nothing.',
  '',
  '![The welcome screen](../brand/screens/welcome.png)',
  '',
  theCaveat,
  '',
];

function repositoryWith(beats: readonly string[], pictures: readonly string[]): string {
  return fixtureHolding([
    { path: 'package.json', contents: fixtureManifest },
    { path: 'docs/features.md', contents: twoFeatures },
    { path: 'docs/story.md', contents: storyTelling(beats) },
    ...pictures.map((name) => ({ path: join('brand', 'screens', name), contents: 'a picture' })),
  ]);
}

describe('the story of Emi is a document, and a picture it names that nobody drew fails the pipeline', () => {
  describe('the story this repository ships', () => {
    it('tells each feature in beats, each one a sentence and a picture', () => {
      const sections = sectionsIn(readFileSync(join(repositoryRoot, storyDocument), 'utf8'));
      const firstRun = sections.find((section) => section.number === 2);

      expect(sections.map((section) => section.number)).toEqual([1, 2]);
      expect(firstRun?.beats.length).toBeGreaterThanOrEqual(6);
      expect(firstRun?.beats.map((beat) => beat.picture)).toContain('../brand/screens/welcome.png');
      expect(
        sections.every((section) => section.beats.every((beat) => beat.sentence.length > 20)),
      ).toBe(true);
    });

    it('names a picture that is on disk every time, and carries no problem at all', () => {
      expect(shipped.problems).toEqual([]);
      expect(shipped.shown.length).toBeGreaterThanOrEqual(6);
      expect(
        shipped.shown.every((named) => picturesOnDisk(repositoryRoot).length > 0 && named !== ''),
      ).toBe(true);
    });

    it('says how many features it tells, and how many it does not', () => {
      const checked = run();

      expect(checked.status).toBe(0);
      expect(checked.output).toContain(
        `${storyDocument} tells ${shipped.told.length} of the ${shipped.features.length} feature(s)`,
      );
      expect(shipped.features.length).toBeGreaterThanOrEqual(8);
      expect(shipped.told.map((feature) => feature.number)).toEqual([1, 2]);
    });

    it('names every picture under a line saying it was rendered and not photographed', () => {
      const beats = sectionsIn(readFileSync(join(repositoryRoot, storyDocument), 'utf8')).flatMap(
        (section) => section.beats,
      );

      for (const beat of beats) {
        expect(caveatProblems(beat, scriptsOf(repositoryRoot))).toEqual([]);
      }
    });

    it('names, under each picture, a command a reader can run', () => {
      const beats = sectionsIn(readFileSync(join(repositoryRoot, storyDocument), 'utf8')).flatMap(
        (section) => section.beats,
      );
      const commanded = beats.filter((beat) =>
        /`(npm run [a-z:-]+|node [^`]+)`/.test(beat.caveat ?? ''),
      );

      expect(commanded).toHaveLength(beats.length);
      expect(beats.filter((beat) => kindOf(beat.picture) === 'drawing').length).toBeGreaterThan(0);
      expect(beats.filter((beat) => kindOf(beat.picture) === 'screen').length).toBeGreaterThan(0);
    });
  });

  describe('a feature with no section', () => {
    it('is named out loud and does not fail, which is what step 8 changes', () => {
      const root = repositoryWith(oneBeat, ['welcome.png']);
      const result = storyProblems(root);

      expect(result.problems).toEqual([]);
      expect(result.untold.map((feature) => feature.number)).toEqual([1]);
      expect(result.notes).toContain(
        `${storyDocument} tells no story for feature 1: The brand exists`,
      );
    });

    it('is named in this repository too, for every feature but the one that is told', () => {
      expect(shipped.untold.map((feature) => feature.number)).toEqual([3, 4, 5, 6, 7, 8]);
      expect(run().output).toContain('tells no story for feature 7');
    });
  });

  describe('a picture the story names and nobody drew', () => {
    it('fails, and says which picture and which document', () => {
      const root = repositoryWith(oneBeat, []);
      const result = storyProblems(root);

      expect(result.problems).toEqual([
        `${storyDocument}: the picture ../brand/screens/welcome.png is named there and is not on disk`,
      ]);
    });

    it('fails when a picture in this repository is renamed under the story', () => {
      const shown = shipped.shown[0] as string;
      const drawn = pictureAt(repositoryRoot, shown);
      const aside = `${drawn}.kept`;

      renameSync(drawn, aside);

      try {
        const checked = run();

        expect(checked.status).toBe(1);
        expect(checked.output).toContain(`the picture ${shown} is named there and is not on disk`);
      } finally {
        renameSync(aside, drawn);
      }

      expect(run().status).toBe(0);
    });
  });

  describe('a picture nobody shows', () => {
    it('is named out loud, so one left behind by a rename is visible', () => {
      const root = repositoryWith(oneBeat, ['welcome.png', 'nobody-shows-this.png']);
      const result = storyProblems(root);

      expect(result.problems).toEqual([]);
      expect(result.unnamed).toEqual(['nobody-shows-this.png']);
      expect(result.notes).toContain(
        'brand/screens/nobody-shows-this.png is on disk and no section of the story shows it',
      );
    });
  });

  describe('a run that read nothing', () => {
    it('fails rather than reporting success on an empty document', () => {
      const root = fixtureHolding([
        { path: 'package.json', contents: fixtureManifest },
        { path: 'docs/features.md', contents: twoFeatures },
        { path: 'docs/story.md', contents: '# The story\n' },
      ]);
      const result = storyProblems(root);

      expect(result.problems).toEqual([
        `${storyDocument} tells no feature and shows no picture, so this check read nothing. ` +
          'A check that finds nothing to check reports success, which is worth nothing.',
      ]);
    });

    it('fails when the story is not there at all', () => {
      const root = fixtureHolding([
        { path: 'package.json', contents: fixtureManifest },
        { path: 'docs/features.md', contents: twoFeatures },
      ]);

      expect(storyProblems(root).problems[0]).toContain(`${storyDocument} is missing`);
    });
  });

  describe('the line under a picture of a screen', () => {
    const screen = '../brand/screens/welcome.png';

    function caveated(line: string | null): Beat {
      return { sentence: 'She opens it.', picture: screen, caveat: line };
    }

    it('is missing altogether, and the picture is named', () => {
      expect(caveatProblems(caveated(null), fixtureScripts)).toEqual([
        `${storyDocument}: the picture ${screen} carries no line under it saying where it came from`,
      ]);
    });

    it('does not say the size it was rendered at', () => {
      expect(
        caveatProblems(
          caveated(
            'Rendered under the test runner, and not captured from a phone. Draw it again with ' +
              '`npm run generate:welcome-picture`.',
          ),
          fixtureScripts,
        ),
      ).toEqual([
        `${storyDocument}: the line under ${screen} does not say the size it was rendered at, as "390 by 844 points"`,
      ]);
    });

    it('lets a reader think somebody photographed a phone', () => {
      expect(
        caveatProblems(
          caveated(
            'Rendered under the test runner at 390 by 844 points. Draw it again with ' +
              '`npm run generate:welcome-picture`.',
          ),
          fixtureScripts,
        ),
      ).toEqual([
        `${storyDocument}: the line under ${screen} does not say that it was not captured from a phone`,
      ]);
    });

    it('names no command, so a reader cannot make the picture again', () => {
      expect(
        caveatProblems(
          caveated(
            'Rendered under the test runner at 390 by 844 points, and not captured from a phone.',
          ),
          fixtureScripts,
        ),
      ).toEqual([
        `${storyDocument}: the line under ${screen} names no command that makes the picture again`,
      ]);
    });

    it('names a script package.json does not carry', () => {
      expect(
        caveatProblems(
          caveated(
            'Rendered under the test runner at 390 by 844 points, and not captured from a phone. ' +
              'Draw it again with `npm run generate:nothing`.',
          ),
          fixtureScripts,
        ),
      ).toEqual([
        `${storyDocument}: the line under ${screen} names \`npm run generate:nothing\`, and package.json carries no such script`,
      ]);
    });

    it('is quiet when the line says all three things and names its command', () => {
      expect(caveatProblems(caveated(theCaveat), fixtureScripts)).toEqual([]);
    });
  });

  describe('the line under a drawing, which no test runner made', () => {
    const drawing = '../brand/logo/emi-lockup.svg';

    function caveated(line: string): Beat {
      return { sentence: 'She reads the name.', picture: drawing, caveat: line };
    }

    it('reads a picture outside brand/screens as a drawing', () => {
      expect(kindOf(drawing)).toBe('drawing');
      expect(kindOf('../brand/screens/welcome.png')).toBe('screen');
    });

    it('claims the test runner drew it, which is the wrong half of the story', () => {
      expect(
        caveatProblems(
          caveated(
            'Rendered under the test runner at 390 by 844 points, and not captured from a phone. ' +
              'Draw it again with `npm run generate:logo`.',
          ),
          fixtureScripts,
        ),
      ).toEqual([
        `${storyDocument}: the line under ${drawing} does not say that a generator drew it`,
        `${storyDocument}: the line under ${drawing} does not say that the test runner did not draw it, which is how the screens are drawn`,
      ]);
    });

    it('says a generator drew it and never says which runner did not', () => {
      expect(
        caveatProblems(
          caveated('Written by its own generator. Run `npm run generate:logo`.'),
          fixtureScripts,
        ),
      ).toEqual([
        `${storyDocument}: the line under ${drawing} does not say that the test runner did not draw it, which is how the screens are drawn`,
      ]);
    });

    it('is quiet when the line says a generator drew it and names the command', () => {
      expect(caveatProblems(caveated(theDrawingCaveat), fixtureScripts)).toEqual([]);
    });

    it('takes a command that is not an npm script, because two generators have none', () => {
      expect(
        caveatProblems(
          caveated(
            'Drawn by its own generator, rather than under the test runner. Run ' +
              '`node --experimental-strip-types brand/icons/generate.ts`.',
          ),
          fixtureScripts,
        ),
      ).toEqual([]);
    });
  });

  describe('a section that no feature answers', () => {
    it('fails when the story names a feature the map does not carry', () => {
      const root = fixtureHolding([
        { path: 'package.json', contents: fixtureManifest },
        { path: 'docs/features.md', contents: twoFeatures },
        {
          path: 'docs/story.md',
          contents: ['# The story', '', '## Feature 9: She reads her mind', '', ...oneBeat].join(
            '\n',
          ),
        },
        { path: 'brand/screens/welcome.png', contents: 'a picture' },
      ]);

      expect(storyProblems(root).problems).toContain(
        `${storyDocument}: the section "Feature 9: She reads her mind" names no feature in docs/features.md`,
      );
    });

    it('fails when a feature is renamed in one document and not the other', () => {
      const root = fixtureHolding([
        { path: 'package.json', contents: fixtureManifest },
        { path: 'docs/features.md', contents: twoFeatures },
        {
          path: 'docs/story.md',
          contents: ['# The story', '', '## Feature 2: She logs a period', '', ...oneBeat].join(
            '\n',
          ),
        },
        { path: 'brand/screens/welcome.png', contents: 'a picture' },
      ]);

      expect(storyProblems(root).problems).toContain(
        `${storyDocument}: feature 2 is called "She logs a period" here and "She opens Emi and logs her first period" in docs/features.md`,
      );
    });

    it('fails when a section tells a feature and shows nothing', () => {
      const root = repositoryWith(['She opens Emi and it asks her nothing.', ''], ['welcome.png']);

      expect(storyProblems(root).problems).toContain(
        `${storyDocument}: the section "Feature 2: She opens Emi and logs her first period" shows no picture, so it tells nobody what the product looks like`,
      );
    });
  });

  describe('the feature map is read as its headings, and nothing else', () => {
    it('takes a feature from a heading and not from a line inside a fence', () => {
      const fenced = [
        '# The features',
        '',
        '```mermaid',
        '## Feature 4: Not a heading at all',
        '```',
        '',
        '## Feature 1: The brand exists',
        '',
      ].join('\n');

      expect(featuresIn(fenced)).toEqual([{ number: 1, title: 'The brand exists' }]);
    });
  });

  describe('a picture that drifted from the screen it was drawn from', () => {
    const picture = {
      name: 'welcome',
      screens: [],
      caveat: theCaveat,
      script: 'generate:welcome-picture',
    };

    it('is quiet while the committed markup is what the screens render', () => {
      expect(driftProblems(picture, '<p>the screen</p>', '<p>the screen</p>')).toEqual([]);
    });

    it('says where the two disagree, and which command redraws it', () => {
      const problems = driftProblems(picture, '<p>the screen</p>', '<p>the other screen</p>');

      expect(problems[0]).toBe(
        'brand/screens/welcome.html is stale: the committed copy and the screens disagree at character 8.',
      );
      expect(problems[3]).toContain('Run npm run generate:welcome-picture');
    });

    it('says so when no markup was ever committed', () => {
      expect(driftProblems(picture, null, '<p>the screen</p>')[0]).toContain(
        'brand/screens/welcome.html is missing',
      );
    });
  });
});
