import {
  CONTRAST_FLOOR,
  type ColourName,
  colour,
  colourNames,
  colours,
  contrastRatio,
  faceFamily,
  fontFile,
  hasRole,
  phaseLabel,
  phaseNames,
  phasePalette,
  typeRoleNames,
  typeScale,
} from '@emi/tokens';
import { screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { join } from 'node:path';

import type { DayRecord } from '@emi/crypto';

import { addDays } from '@emi/cycle';
import { drawnRuns, registeredFaces, runsDrawnInAnUnloadedFace } from '../fixtures/drawnFaces';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { aBleedingDay, dayOf, herPhoneHolds } from '../fixtures/herPhone';
import { colourOf, textDrawnOnAPhaseFill } from '../fixtures/phaseInk';
import { resetExpoSqlite } from '../data/expoSqlite';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday, away from any summer time change, so her calendar reads the same in any timezone. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');

const today = dayOf(whenSheOpensIt);

/** She is on the second day of the cycle she is in, and she bled on the first. */
const thisCycleStarted = addDays(today, -1);

const herCycleLengthDays = 28;
const herPeriodDays = 4;
const herCompleteCycles = 6;

/**
 * Six cycles of her own, and then the cycle she is in with its first day recorded. The ring draws
 * nothing while Emi is still learning, so the screen under test needs a history behind it.
 */
function herSixCycles(): DayRecord[] {
  const records: DayRecord[] = [];

  for (let cycle = herCompleteCycles; cycle >= 1; cycle -= 1) {
    const started = addDays(thisCycleStarted, -cycle * herCycleLengthDays);
    for (let day = 0; day < herPeriodDays; day += 1) {
      records.push(aBleedingDay(addDays(started, day)));
    }
  }
  records.push(aBleedingDay(thisCycleStarted));

  return records;
}

beforeEach(() => {
  resetExpoSqlite();
  resetExpoSecureStore();
});

async function herHomeScreen(): Promise<void> {
  await herPhoneHolds(whenSheOpensIt, herSixCycles());

  const app = renderRouter(appDirectory, { initialUrl: '/' });
  await app;
}

interface Pair {
  readonly text: ColourName;
  readonly ground: ColourName;
  readonly ratio: number;
}

function measure(text: ColourName, ground: ColourName): Pair {
  return { text, ground, ratio: contrastRatio(colours[text].value, colours[ground].value) };
}

function report(pair: Pair): string {
  return `${pair.text} on ${pair.ground} is ${pair.ratio.toFixed(2)} to 1`;
}

/** Every pair the palette approves, which is the set the floor is applied to. */
const approved: readonly Pair[] = colourNames
  .filter((name) => hasRole(name, 'text'))
  .flatMap((text) => colours[text].textOn.map((ground) => measure(text, ground)));

describe('a text colour below the contrast floor fails the build', () => {
  describe('the floor the palette is held to', () => {
    it('measures every approved pair, so an empty set is not read as a pass', () => {
      expect(approved.length).toBeGreaterThan(50);
      expect(approved.filter((pair) => pair.ratio < CONTRAST_FLOOR).map(report)).toEqual([]);
    });

    it('names the token and the ratio when a colour moves under it', () => {
      // The value of outline, which the design system names and the floor refuses as a word.
      const moved = colours.outline.value;
      const under = colours.onSurfaceVariant.textOn
        .map((ground) => ({
          text: 'onSurfaceVariant' as ColourName,
          ground,
          ratio: contrastRatio(moved, colours[ground].value),
        }))
        .filter((pair) => pair.ratio < CONTRAST_FLOOR);

      expect(under.map(report)).toContain('onSurfaceVariant on surface is 4.27 to 1');
      expect(under.length).toBe(colours.onSurfaceVariant.textOn.length);
    });

    it('gives every text colour a ground, because an unmeasured colour is what this stops', () => {
      const unmeasured = colourNames
        .filter((name) => hasRole(name, 'text'))
        .filter((name) => colours[name].textOn.length === 0);

      expect(unmeasured).toEqual([]);
    });
  });

  describe('what she is left looking at, on the home screen', () => {
    it('writes the phase name in that phase’s own ink, and never on its own fill', async () => {
      await herHomeScreen();

      // The phase is read off the screen rather than assumed, so the case holds whichever day of
      // her own history she happens to be on.
      const shown = phaseNames.find((phase) => screen.queryByText(phaseLabel[phase]) !== null);

      expect(shown).toBeDefined();
      expect(colourOf(screen.getByText(phaseLabel[shown ?? 'period']) as never)).toBe(
        colour[phasePalette[shown ?? 'period'].ink],
      );
      expect(textDrawnOnAPhaseFill(screen.toJSON())).toEqual([]);
    });

    it('draws the cycle day in the monospaced face, so a number holds its place', async () => {
      await herHomeScreen();

      const day = drawnRuns(screen.toJSON()).find(
        (run) => /^\d+$/.test(run.text) && run.points === typeScale['data-lg'].size,
      );

      expect(day).toBeDefined();
      expect(day?.family).toBe(fontFile(faceFamily.data, 'medium').name);
    });

    it('draws every word in a face the application loaded', async () => {
      await herHomeScreen();

      const measured = drawnRuns(screen.toJSON()).filter(
        (run) => run.text.trim().length > 0 && run.points !== undefined,
      );

      expect(measured.length).toBeGreaterThan(5);
      expect(runsDrawnInAnUnloadedFace(screen.toJSON())).toEqual([]);
      expect(registeredFaces).toHaveLength(6);
    });

    it('draws every size at one of the roles the design system names', async () => {
      await herHomeScreen();

      const sizes = new Set(typeRoleNames.map((role) => typeScale[role].size));
      const drawn = drawnRuns(screen.toJSON())
        .map((run) => run.points)
        .filter((points): points is number => points !== undefined);

      expect(drawn.length).toBeGreaterThan(5);
      expect([...new Set(drawn)].filter((points) => !sizes.has(points))).toEqual([]);
    });
  });

  describe('the four phases, now that each one has a colour of its own', () => {
    it('pairs every phase with a fill and an ink from the design system', () => {
      expect(phaseNames.map((phase) => phasePalette[phase].fill)).toEqual([
        'period',
        'follicular',
        'ovulation',
        'luteal',
      ]);
      expect(phaseNames.map((phase) => phasePalette[phase].ink)).toEqual([
        'periodInk',
        'follicularInk',
        'ovulationInk',
        'lutealInk',
      ]);
    });

    it('measures each ink on the ground it is written on, and never on its own fill', () => {
      const onTheGround = phaseNames.map((phase) => measure(phasePalette[phase].ink, 'background'));

      expect(onTheGround.map(report)).toEqual([
        'periodInk on background is 11.94 to 1',
        'follicularInk on background is 9.48 to 1',
        'ovulationInk on background is 9.95 to 1',
        'lutealInk on background is 11.21 to 1',
      ]);
      expect(phaseNames.flatMap((phase) => colours[phasePalette[phase].fill].textOn)).toEqual([]);
    });

    it('would fall under the floor if an ink were written on its own fill, which is why none is', () => {
      const onItsOwnFill = phaseNames.map((phase) =>
        measure(phasePalette[phase].ink, phasePalette[phase].fill),
      );

      expect(onItsOwnFill.filter((pair) => pair.ratio < CONTRAST_FLOOR).map(report)).toEqual([
        'periodInk on period is 4.24 to 1',
        'ovulationInk on ovulation is 4.13 to 1',
        'lutealInk on luteal is 3.47 to 1',
      ]);
    });
  });
});
