import { resolve } from 'node:path';

import {
  type Mockups,
  deliveryProblems,
  fixtureCalls,
  mockupProblems,
  mockupsArtifact,
  mockupsIn,
  namedKeyProblems,
  partlessProblems,
  partsOf,
  partsOfTheScreen,
  readNothingProblems,
  screenKeysNamedIn,
  screenKeysNamedUnder,
  screenKeysOf,
  screensDelivered,
  testFilesOf,
  theFixture,
} from './mockups';

const repositoryRoot = resolve(__dirname, '..', '..');

const theStage = mockupsIn(repositoryRoot);

/** A stage of one screen, built here rather than read, so a rule can be shown a bad one. */
function aStageOf(screens: Record<string, string>): Mockups {
  return {
    screens: Object.fromEntries(
      Object.entries(screens).map(([key, html]) => [
        key,
        {
          html,
          name: key,
          route: `/${key}`,
          source: `${key}.tsx`,
          status: 'built' as const,
          surface: 'mobile',
        },
      ]),
    ),
    stories: [],
  };
}

describe('the approved mockups stage, as the repository reads it', () => {
  describe('the stage that is committed', () => {
    it('holds the screens the stage delivered, and the promise among them', () => {
      expect(screenKeysOf(theStage)).toHaveLength(screensDelivered);
      expect(screenKeysOf(theStage)).toContain('thePromise');
    });

    it('names the parts of the promise screen, in the order the drawing places them', () => {
      expect(partsOfTheScreen(theStage, 'thePromise')).toEqual([
        'ThePromise',
        'Card',
        'PrimaryButton',
      ]);
    });

    it('gives every one of its screens a part to be held to', () => {
      expect(partlessProblems(theStage)).toEqual([]);
    });

    it('refuses a key it does not hold, rather than reading as a screen of no parts', () => {
      expect(() => partsOfTheScreen(theStage, 'aScreenNobodyDrew')).toThrow(
        'holds no screen called "aScreenNobodyDrew"',
      );
    });
  });

  describe('a wrapper that repeats the name of the part inside it', () => {
    it('is dropped, so a bar of four columns asks for four and not five', () => {
      const dock =
        '<nav data-component="BottomNavigation">' +
        '<a data-component="BottomNavigation">Today</a>' +
        '<a data-component="BottomNavigation">Log</a>' +
        '</nav>';

      expect(partsOf(dock)).toEqual(['BottomNavigation', 'BottomNavigation']);
    });

    it('is dropped on the home screen the stage draws, which carries two of them', () => {
      expect(partsOfTheScreen(theStage, 'todayNext')).toEqual([
        'HomeHeader',
        'WeekStrip',
        'PhaseLine',
        'CycleRing',
        'RoundAction',
        'RoundAction',
        'NextPeriod',
        'BottomNavigation',
        'BottomNavigation',
        'BottomNavigation',
        'BottomNavigation',
      ]);
    });

    it('is not dropped where the name inside it is a different name', () => {
      const card =
        '<section data-component="Card"><a data-component="PrimaryButton">Go</a></section>';

      expect(partsOf(card)).toEqual(['Card', 'PrimaryButton']);
    });

    it('leaves a part standing where the repeat is beside it rather than inside it', () => {
      const beside =
        '<div><a data-component="RoundAction">One</a><a data-component="RoundAction">Two</a></div>';

      expect(partsOf(beside)).toEqual(['RoundAction', 'RoundAction']);
    });

    it('reads through an element that closes itself and one that never closes', () => {
      const drawn =
        '<figure data-component="CycleRing"><svg><circle r="1"/></svg><img src="a"></figure>' +
        '<a data-component="PrimaryButton">Go</a>';

      expect(partsOf(drawn)).toEqual(['CycleRing', 'PrimaryButton']);
    });
  });

  describe('the screen keys the suite names', () => {
    const named = screenKeysNamedUnder(repositoryRoot, testFilesOf(repositoryRoot));

    it('reads them out of the tests, and the promise is one of them', () => {
      expect(named.keys).toContain('thePromise');
      expect(named.unreadable).toEqual([]);
    });

    it('reads every call the fixture offers, so a new one cannot be missed', () => {
      const source = fixtureCalls
        .map((call, at) => `expect(${call}('aScreen${at}')).toEqual([]);`)
        .join('\n');

      expect(screenKeysNamedIn('a.test.tsx', source).keys).toEqual(
        fixtureCalls.map((_unused, at) => `aScreen${at}`),
      );
    });

    it('names a key it cannot read rather than passing over the call', () => {
      const built = `expect(${fixtureCalls[0] ?? ''}(theDrawing)).toEqual([]);`;

      expect(screenKeysNamedIn('a.test.tsx', built).unreadable).toEqual([
        `a.test.tsx calls ${fixtureCalls[0] ?? ''} with a key that is not written out at the call`,
      ]);
    });

    it('leaves the fixture itself out, because it hands on the key it was given', () => {
      expect(testFilesOf(repositoryRoot)).not.toContain(theFixture);
      expect(testFilesOf(repositoryRoot).length).toBeGreaterThan(20);
    });
  });

  describe('the four things the check refuses', () => {
    it('refuses a stage that arrives short of what it delivered', () => {
      const [said] = deliveryProblems(['one', 'two']);

      expect(said).toContain('holds 2 screen(s)');
      expect(said).toContain(`under the ${screensDelivered}`);
      expect(deliveryProblems(screenKeysOf(theStage))).toEqual([]);
    });

    it('refuses a key a test names and the stage does not hold', () => {
      expect(namedKeyProblems(['thePromise', 'aScreenNobodyDrew'], ['thePromise'])).toEqual([
        `a test names the mockup screen "aScreenNobodyDrew", and ${mockupsArtifact} holds no screen of that name`,
      ]);
    });

    it('refuses a screen whose drawing names no part at all', () => {
      expect(
        partlessProblems(aStageOf({ aBlankScreen: '<main><p>Words alone</p></main>' })),
      ).toEqual([
        'the mockup screen "aBlankScreen" names no part, so nothing built against it can be held to it',
      ]);
    });

    it('refuses a run that read no screen, because it reads the same as reading them all', () => {
      const [said] = readNothingProblems([]);

      expect(said).toContain('names a mockup screen');
      expect(said).toContain('proved nothing');
      expect(readNothingProblems(['thePromise'])).toEqual([]);
    });
  });

  describe('the check the pipeline runs', () => {
    it('passes on the stage and the suite as they stand, and says what it read', () => {
      const checked = mockupProblems(
        theStage,
        screenKeysNamedUnder(repositoryRoot, testFilesOf(repositoryRoot)),
      );

      expect(checked.problems).toEqual([]);
      expect(checked.said).toContain(`${screensDelivered} drawing(s)`);
      expect(checked.named).toContain('thePromise');
    });

    it('fails on a stage of no screens, which no test can then be held to', () => {
      const checked = mockupProblems(aStageOf({}), { keys: [], unreadable: [] });

      expect(checked.problems).toHaveLength(2);
      expect(checked.screens).toEqual([]);
    });
  });
});
