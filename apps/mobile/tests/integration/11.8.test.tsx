import { join } from 'node:path';

import type { Focus } from '@emi/crypto';
import { focusValues } from '@emi/crypto';
import { type SymptomGroup, addDays, symptomGroups } from '@emi/cycle';
import { render, screen } from '@testing-library/react-native';
import { fireEvent, renderRouter } from 'expo-router/testing-library';

import { readProfile } from '../../src/data/profileRepository';
import { migrate } from '../../src/data/schema';
import { writeSetting } from '../../src/data/settingRepository';
import { words } from '../../src/language';
import { LogSheet } from '../../src/features/log/LogSheet';
import { symptomGroupTestID } from '../../src/features/log/SymptomGroup';
import { groupsInHerOrder } from '../../src/features/log/herOrder';
import { dayTestID } from '../../src/features/onboarding/Calendar';
import { Focus as FocusScreen, focusIcons, focusTestID } from '../../src/features/onboarding/Focus';
import {
  onboardingActionTestID,
  onboardingSkipTestID,
} from '../../src/features/onboarding/OnboardingScreen';
import { firstRunCopy, focusLabels } from '../../src/features/onboarding/copy';
import {
  type FirstRunRefusal,
  FirstRunError,
  completeFirstRun,
  statedFocus,
} from '../../src/features/onboarding/firstRun';
import { openTestDatabase } from '../data/nodeDatabase';
import { OnAPhone } from '../fixtures/theSafeArea';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { dayOf, herDatabase } from '../fixtures/herPhone';
import { herProfileVault, herVault, theProfileVaultOnHerPhone } from '../fixtures/herVault';
import { sizedTextIn } from '../fixtures/renderedText';
import { sheAnswersEveryQuestion } from '../fixtures/theFirstRun';
import { sheHoldsTheRing } from '../fixtures/theHold';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday, and well away from any summer time change, so her calendar reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');
const today = dayOf(whenSheOpensIt);

const herCycleLengthDays = 28;

/** A day inside the ninety the first run reaches back over, for the walk through the questions. */
const herPeriodStarted = addDays(today, -5);

/**
 * The groups the sheet draws a heading for. The mood group is drawn by the picker at the top of
 * the sheet instead, so it is never one of the headings below it.
 */
const theGroupsTheSheetHeads: readonly SymptomGroup[] = symptomGroups.filter(
  (group) => group !== 'mood',
);

async function sheOpensEmi(): Promise<{ pathname: () => string }> {
  const app = renderRouter(appDirectory, { initialUrl: '/' });

  await app;

  return { pathname: () => app.getPathname() };
}

async function shePresses(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

/** The four cards, already read, so the first thing she sees is the first question. */
function theTourIsBehindHer(): void {
  const database = herDatabase();

  migrate(database);
  writeSetting(database, 'tourSeenAt', whenSheOpensIt.toISOString());
}

/** Past every question before this one, standing on the one the screen cases are about. */
async function sheReachesTheFocus(): Promise<void> {
  await shePresses(onboardingActionTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(dayTestID(herPeriodStarted));
  await shePresses(onboardingActionTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingActionTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingSkipTestID);
  await shePresses(onboardingSkipTestID);
}

/**
 * Her log sheet, opened the way its host opens it: with the groups read back out of the profile
 * her own phone sealed, under the key her own phone drew.
 */
async function sheOpensHerLog(): Promise<void> {
  const hers = statedFocus(herDatabase(), await theProfileVaultOnHerPhone());

  await render(<LogSheet day={today} focus={hers} onSave={() => undefined} />);
}

/** The groups of her log sheet, in the order she reads them down the glass. */
function theOrderOfHerLog(): readonly SymptomGroup[] {
  const named = symptomGroups.map((group) => symptomGroupTestID(group));

  return screen
    .getAllByTestId(/^symptom-group-(?!.*-chips$)/)
    .map((section) => named.indexOf(String(section.props.testID)))
    .filter((at) => at >= 0)
    .map((at) => symptomGroups[at] as SymptomGroup);
}

/** The refusal a call gives, so a case names the rule rather than the wording of a message. */
function refusalFrom(run: () => void): FirstRunRefusal {
  try {
    run();
  } catch (error) {
    if (error instanceof FirstRunError) {
      return error.refusal;
    }
    throw error;
  }
  throw new Error('the first run accepted an answer it is written to refuse');
}

describe('the log opens on what she said changes with her cycle', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt);
    resetExpoSqlite();
    resetExpoSecureStore();
    theTourIsBehindHer();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('the question she is asked after the goals', () => {
    it('is where the goals hand her, whether she answered them or passed them by', async () => {
      const app = await sheOpensEmi();

      await sheReachesTheFocus();

      expect(app.pathname()).toBe('/onboarding/focus');
    });

    it('offers the six groups, with none of them pressed for her', async () => {
      await sheOpensEmi();

      await sheReachesTheFocus();

      for (const group of focusValues) {
        expect(screen.getByTestId(focusTestID(group))).toHaveTextContent(focusLabels[group]);
        expect(screen.getByTestId(focusTestID(group))).not.toBeSelected();
      }
      expect(focusValues).toHaveLength(6);
    });

    it('names each tile with the heading that group carries in her log', async () => {
      await sheOpensEmi();

      await sheReachesTheFocus();

      expect(screen.getByTestId(focusTestID('sleep'))).toHaveTextContent(words('log.group.sleep'));
      expect(screen.getByTestId(focusTestID('skin'))).toHaveTextContent(words('log.group.skin'));
    });

    it('draws each tile with the drawing of its own group and no other', async () => {
      await sheOpensEmi();

      await sheReachesTheFocus();

      expect(new Set(Object.values(focusIcons)).size).toBe(focusValues.length);
      for (const group of focusValues) {
        expect(focusIcons[group]).toBe(group);
      }
    });

    it('waits for a group before the way on is hers to press', async () => {
      await sheOpensEmi();

      await sheReachesTheFocus();

      expect(screen.getByTestId(onboardingActionTestID)).toBeDisabled();

      await shePresses(focusTestID('pain'));

      expect(screen.getByTestId(onboardingActionTestID)).not.toBeDisabled();
    });

    it('keeps every group she presses, because more than one changes with her cycle', async () => {
      await sheOpensEmi();

      await sheReachesTheFocus();
      await shePresses(focusTestID('pain'));
      await shePresses(focusTestID('sleep'));

      expect(screen.getByTestId(focusTestID('pain'))).toBeSelected();
      expect(screen.getByTestId(focusTestID('sleep'))).toBeSelected();
      expect(screen.getByTestId(focusTestID('skin'))).not.toBeSelected();
    });

    it('takes a group off again when she presses it a second time', async () => {
      await sheOpensEmi();

      await sheReachesTheFocus();
      await shePresses(focusTestID('pain'));
      await shePresses(focusTestID('pain'));

      expect(screen.getByTestId(focusTestID('pain'))).not.toBeSelected();
      expect(screen.getByTestId(onboardingActionTestID)).toBeDisabled();
    });

    it('says Emi puts these first when she logs a day, and promises nothing else', async () => {
      await sheOpensEmi();

      await sheReachesTheFocus();

      expect(screen.getByText(firstRunCopy.focus.title)).toBeTruthy();
      // The line is named on its own rather than read off the copy, so a line taken out of the
      // screen fails here instead of leaving a shorter list that still agrees with itself.
      expect(screen.getByText(words('onboarding.focus.line.first'))).toBeTruthy();
      expect(firstRunCopy.focus.lines).toHaveLength(1);
    });

    it('hands her to today, whether she answers it or passes it by', async () => {
      const app = await sheOpensEmi();

      await sheReachesTheFocus();
      await shePresses(onboardingSkipTestID);

      expect(app.pathname()).toBe('/onboarding/today');
    });
  });

  describe('her answer, at the hold', () => {
    for (const group of focusValues) {
      it(`seals ${group} in her profile, under the key her own phone drew`, async () => {
        await sheOpensEmi();

        await sheAnswersEveryQuestion({ periodStartedOn: herPeriodStarted, focus: [group] });
        await sheHoldsTheRing();

        expect(statedFocus(herDatabase(), await theProfileVaultOnHerPhone())).toEqual([group]);
      });
    }

    it('keeps the order she pressed them in, because the order is the answer', async () => {
      await sheOpensEmi();

      // She presses sleep and then pain, which is neither the order the catalogue holds the two
      // groups in nor the order the screen offers them in, so a list handed back in either of
      // those orders fails here.
      await sheAnswersEveryQuestion({
        periodStartedOn: herPeriodStarted,
        focus: ['sleep', 'pain'],
      });
      await sheHoldsTheRing();

      expect(statedFocus(herDatabase(), await theProfileVaultOnHerPhone())).toEqual([
        'sleep',
        'pain',
      ]);
    });

    it('is the order she pressed and never the order the screen offers', async () => {
      await sheOpensEmi();

      await sheAnswersEveryQuestion({
        periodStartedOn: herPeriodStarted,
        focus: ['pain', 'mood', 'sleep'],
      });
      await sheHoldsTheRing();

      const sealed = statedFocus(herDatabase(), await theProfileVaultOnHerPhone());

      expect(sealed).toEqual(['pain', 'mood', 'sleep']);
      expect(sealed).not.toEqual([...focusValues].filter((group) => sealed?.includes(group)));
    });

    it('forgets the groups she pressed before she pressed the way past it', async () => {
      await sheOpensEmi();

      await sheReachesTheFocus();
      await shePresses(focusTestID('pain'));
      await shePresses(focusTestID('sleep'));
      await shePresses(onboardingSkipTestID);
      await shePresses(onboardingSkipTestID);
      await sheHoldsTheRing();

      const held = readProfile(herDatabase(), await theProfileVaultOnHerPhone());

      expect(held && 'focus' in held).toBe(false);
      // Her log is read as well, because a Skip that kept her presses would show itself here as
      // a sheet that opens on a group she never asked for.
      await sheOpensHerLog();
      expect(theOrderOfHerLog()).toEqual([...theGroupsTheSheetHeads]);
    });

    it('is left off her profile where she passed the question by', async () => {
      await sheOpensEmi();

      await sheAnswersEveryQuestion({ periodStartedOn: herPeriodStarted });
      await sheHoldsTheRing();

      const held = readProfile(herDatabase(), await theProfileVaultOnHerPhone());

      expect(held?.cycleLengthDays).toBe(28);
      expect(held && 'focus' in held).toBe(false);
    });

    it('refuses a group Emi never offered, so the screen is not the only thing holding it', () => {
      const database = openTestDatabase();
      migrate(database);

      expect(
        refusalFrom(() =>
          completeFirstRun(
            database,
            { day: herVault(), profile: herProfileVault() },
            {
              periodStartedOn: herPeriodStarted,
              cycleLengthDays: herCycleLengthDays,
              focus: ['libido' as Focus],
            },
            whenSheOpensIt,
          ),
        ),
      ).toBe('focus-is-not-one-of-the-six');
      expect(readProfile(database, herProfileVault())).toBeUndefined();
    });

    it('refuses the same group twice, because a list she built by tapping holds each once', () => {
      const database = openTestDatabase();
      migrate(database);

      expect(
        refusalFrom(() =>
          completeFirstRun(
            database,
            { day: herVault(), profile: herProfileVault() },
            {
              periodStartedOn: herPeriodStarted,
              cycleLengthDays: herCycleLengthDays,
              focus: ['pain', 'pain'],
            },
            whenSheOpensIt,
          ),
        ),
      ).toBe('focus-is-chosen-twice');
      expect(readProfile(database, herProfileVault())).toBeUndefined();
    });
  });

  describe('the log she opens afterwards', () => {
    it('opens on the groups she named, in the order she named them', async () => {
      await sheOpensEmi();

      await sheAnswersEveryQuestion({
        periodStartedOn: herPeriodStarted,
        focus: ['pain', 'sleep'],
      });
      await sheHoldsTheRing();
      await sheOpensHerLog();

      expect(theOrderOfHerLog().slice(0, 2)).toEqual(['pain', 'sleep']);
    });

    it('opens on her order where it is neither the catalogue order nor the screen order', async () => {
      await sheOpensEmi();

      await sheAnswersEveryQuestion({
        periodStartedOn: herPeriodStarted,
        focus: ['sleep', 'pain'],
      });
      await sheHoldsTheRing();
      await sheOpensHerLog();

      expect(theOrderOfHerLog().slice(0, 2)).toEqual(['sleep', 'pain']);
    });

    it('opens in the order it has today for a woman who passed the question by', async () => {
      await sheOpensEmi();

      await sheAnswersEveryQuestion({ periodStartedOn: herPeriodStarted });
      await sheHoldsTheRing();
      await sheOpensHerLog();

      expect(theOrderOfHerLog()).toEqual([...theGroupsTheSheetHeads]);
    });

    it('still reaches every group, because her answer moves them and drops none', async () => {
      await sheOpensEmi();

      await sheAnswersEveryQuestion({
        periodStartedOn: herPeriodStarted,
        focus: ['pain', 'sleep'],
      });
      await sheHoldsTheRing();
      await sheOpensHerLog();

      expect([...theOrderOfHerLog()].sort()).toEqual([...theGroupsTheSheetHeads].sort());
    });

    it('leaves the groups she did not name in the order they have today, under hers', async () => {
      await sheOpensEmi();

      await sheAnswersEveryQuestion({ periodStartedOn: herPeriodStarted, focus: ['sleep'] });
      await sheHoldsTheRing();
      await sheOpensHerLog();

      expect(theOrderOfHerLog()).toEqual([
        'sleep',
        ...theGroupsTheSheetHeads.filter((group) => group !== 'sleep'),
      ]);
    });

    it('is already headed by the mood she named, so naming it moves nothing below', async () => {
      await sheOpensEmi();

      await sheAnswersEveryQuestion({ periodStartedOn: herPeriodStarted, focus: ['mood'] });
      await sheHoldsTheRing();
      await sheOpensHerLog();

      expect(screen.getByTestId('mood-picker')).toBeTruthy();
      expect(theOrderOfHerLog()).toEqual([...theGroupsTheSheetHeads]);
    });
  });

  describe('the order the sheet is drawn in', () => {
    it('is every group, once, whatever she named', () => {
      for (const named of [[], ['pain'], ['pain', 'sleep'], [...symptomGroups]]) {
        const drawn = groupsInHerOrder(named as readonly SymptomGroup[]);

        expect([...drawn].sort()).toEqual([...symptomGroups].sort());
        expect(drawn).toHaveLength(symptomGroups.length);
      }
    });

    it('is the catalogue order where she named nothing', () => {
      expect(groupsInHerOrder()).toEqual([...symptomGroups]);
      expect(groupsInHerOrder([])).toEqual([...symptomGroups]);
    });

    it('puts hers in front in her order, and the rest behind in the order they had', () => {
      expect(groupsInHerOrder(['sleep', 'pain'])).toEqual([
        'sleep',
        'pain',
        ...symptomGroups.filter((group) => group !== 'sleep' && group !== 'pain'),
      ]);
    });

    it('ignores a name that is not a group of the catalogue', () => {
      expect(groupsInHerOrder(['nonsense' as SymptomGroup, 'pain'])).toEqual([
        'pain',
        ...symptomGroups.filter((group) => group !== 'pain'),
      ]);
    });
  });

  describe('the screen on its own', () => {
    it('presses the group under her thumb and no other', async () => {
      const pressed: Focus[] = [];

      await render(
        <OnAPhone>
          <FocusScreen
            chosen={[]}
            onBack={() => undefined}
            onContinue={() => undefined}
            onPress={(group) => pressed.push(group)}
            onSkip={() => undefined}
          />
        </OnAPhone>,
      );
      await fireEvent.press(screen.getByTestId(focusTestID('digestion')));

      expect(pressed).toEqual(['digestion']);
    });

    it('writes no second line under a tile, because a tile names a group and nothing more', async () => {
      await render(
        <OnAPhone>
          <FocusScreen
            chosen={['energy']}
            onBack={() => undefined}
            onContinue={() => undefined}
            onPress={() => undefined}
            onSkip={() => undefined}
          />
        </OnAPhone>,
      );

      for (const group of focusValues) {
        expect(sizedTextIn(screen.getByTestId(focusTestID(group))).map((run) => run.text)).toEqual([
          focusLabels[group],
        ]);
      }
    });
  });
});
