import { join } from 'node:path';

import type { Focus } from '@emi/crypto';
import { type SymptomGroup, addDays, symptomGroups } from '@emi/cycle';
import { tabTestID } from '@emi/ui';
import { screen, within } from '@testing-library/react-native';
import { fireEvent, renderRouter } from 'expo-router/testing-library';

import { readDayLog } from '../../src/data/dayLogRepository';
import { migrate } from '../../src/data/schema';
import { writeSetting } from '../../src/data/settingRepository';
import { flowOptionTestID, flowPickerTestID } from '../../src/features/log/FlowPicker';
import {
  logFlowGroupTestID,
  logFlowGroupsTestID,
  logFlowTestID,
} from '../../src/features/log/LogFlow';
import { symptomGroupTestID } from '../../src/features/log/SymptomGroup';
import { painGroup } from '../../src/features/log/askedGroup';
import { groupsUnderTheFlow } from '../../src/features/log/herOrder';
import { resetExpoSqlite } from '../data/expoSqlite';
import { resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { aBleedingDay, dayOf, herDatabase, herPhoneHolds } from '../fixtures/herPhone';
import { herVault } from '../fixtures/herVault';
import { sheAnswersEveryQuestion } from '../fixtures/theFirstRun';
import { sheHoldsTheRing } from '../fixtures/theHold';

jest.mock('expo-sqlite', () => jest.requireActual('../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', 'src', 'app');

/** Midday, and well away from any summer time change, so her calendar reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');
const today = dayOf(whenSheOpensIt);

/** A day inside the ninety the first run reaches back over, for the walk through the questions. */
const herPeriodStarted = addDays(today, -5);

/** The tab she presses in the dock, named as the navigator names the screen it reaches. */
const theLogTab = 'log/index';
const theTodayTab = 'index';

/** A symptom of the sleep group, which is one of the six the focus screen offers her. */
const theSleepSymptom = 'insomnia';

/** A symptom of the pain group, which is the group the home line names in its address. */
const thePainSymptom = 'cramps';

interface Drawn {
  readonly props: { readonly testID?: unknown };
  readonly children: readonly (Drawn | string)[];
}

async function sheOpensEmi(at = '/'): Promise<{ pathname: () => string }> {
  const app = renderRouter(appDirectory, { initialUrl: at });

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

/** The whole first run, answered as she answered it, and written by her own thumb at the hold. */
async function sheFinishesTheFirstRun(focus?: readonly Focus[]): Promise<void> {
  await sheAnswersEveryQuestion({
    periodStartedOn: herPeriodStarted,
    ...(focus === undefined ? {} : { focus }),
  });
  await sheHoldsTheRing();
}

/** The log tab, pressed in the dock, which is the way she reaches the log on an ordinary day. */
async function sheOpensTheLogTab(): Promise<void> {
  await shePresses(tabTestID(theLogTab));
}

/** The groups she reads under the flow picker, in the order they are drawn down the glass. */
function theGroupsUnderTheFlow(): readonly SymptomGroup[] {
  const named = symptomGroups.map((group) => symptomGroupTestID(group));

  return within(screen.getByTestId(logFlowGroupsTestID))
    .getAllByTestId(/^symptom-group-(?!.*-chips$)/)
    .map((section) => named.indexOf(String(section.props.testID)))
    .filter((at) => at >= 0)
    .map((at) => symptomGroups[at] as SymptomGroup);
}

/**
 * Every name on the log screen, in the order it is drawn, so a case can say that one thing is
 * above another rather than only that both are there.
 */
function theOrderDownTheGlass(): readonly string[] {
  const found: string[] = [];
  const walk = (node: Drawn): void => {
    if (typeof node.props.testID === 'string') {
      found.push(node.props.testID);
    }

    for (const child of node.children) {
      if (typeof child !== 'string') {
        walk(child);
      }
    }
  };

  walk(screen.getByTestId(logFlowTestID) as unknown as Drawn);

  return found;
}

/** What today's record carries, opened under her own key, and nothing where no row exists. */
function theSymptomsRecordedToday(): readonly string[] {
  const row = readDayLog(herDatabase(), today);

  return row === undefined ? [] : (herVault().open(row.payload).symptoms ?? []);
}

describe('she opens the log tab and her groups come first', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt);
    resetExpoSqlite();
    resetExpoSecureStore();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('the groups under the flow picker', () => {
    beforeEach(() => {
      theTourIsBehindHer();
    });

    it('come in the order she tapped them on the focus screen', async () => {
      await sheOpensEmi();

      await sheFinishesTheFirstRun(['pain', 'sleep']);
      await sheOpensTheLogTab();

      expect(theGroupsUnderTheFlow().slice(0, 2)).toEqual(['pain', 'sleep']);
    });

    it('come in her order where it is neither the catalogue order nor the screen order', async () => {
      await sheOpensEmi();

      await sheFinishesTheFirstRun(['sleep', 'pain']);
      await sheOpensTheLogTab();

      expect(theGroupsUnderTheFlow().slice(0, 2)).toEqual(['sleep', 'pain']);
    });

    it('leave the groups she did not name in the order they had, under hers', async () => {
      await sheOpensEmi();

      await sheFinishesTheFirstRun(['sleep']);
      await sheOpensTheLogTab();

      expect(theGroupsUnderTheFlow()).toEqual([
        'sleep',
        ...symptomGroups.filter((group) => group !== 'sleep'),
      ]);
    });

    it('come in the order the catalogue holds for a woman who passed the question by', async () => {
      await sheOpensEmi();

      await sheFinishesTheFirstRun();
      await sheOpensTheLogTab();

      expect(theGroupsUnderTheFlow()).toEqual([...symptomGroups]);
    });

    it('are every group of the catalogue, once, so her answer drops none of them', async () => {
      await sheOpensEmi();

      await sheFinishesTheFirstRun(['pain', 'sleep']);
      await sheOpensTheLogTab();

      const drawn = theGroupsUnderTheFlow();

      expect([...drawn].sort()).toEqual([...symptomGroups].sort());
      expect(screen.getAllByTestId(`symptom-chip-${theSleepSymptom}`)).toHaveLength(1);
    });

    it('sit under the flow picker, which keeps the place it had on this screen', async () => {
      await sheOpensEmi();

      await sheFinishesTheFirstRun(['pain', 'sleep']);
      await sheOpensTheLogTab();

      const order = theOrderDownTheGlass();

      expect(order.indexOf(flowPickerTestID)).toBeGreaterThanOrEqual(0);
      expect(order.indexOf(logFlowGroupsTestID)).toBeGreaterThan(order.indexOf(flowPickerTestID));
    });
  });

  describe('the day one of those groups writes', () => {
    it('carries the symptom she pressed, and the flow the day already held', async () => {
      await herPhoneHolds(whenSheOpensIt, [aBleedingDay(today)]);
      await sheOpensEmi();

      await sheOpensTheLogTab();
      await shePresses(`symptom-chip-${theSleepSymptom}`);

      const row = readDayLog(herDatabase(), today);
      const record = row === undefined ? undefined : herVault().open(row.payload);

      expect(record?.flow).toBe('medium');
      expect(record?.symptoms).toEqual([theSleepSymptom]);
    });

    it('is still carrying both of them when she opens the tab again', async () => {
      await herPhoneHolds(whenSheOpensIt, [aBleedingDay(today)]);
      await sheOpensEmi();

      await sheOpensTheLogTab();
      await shePresses(`symptom-chip-${theSleepSymptom}`);
      await shePresses(tabTestID(theTodayTab));
      await sheOpensTheLogTab();

      expect(screen.getByTestId(flowOptionTestID('medium'))).toBeChecked();
      expect(screen.getByTestId(`symptom-chip-${theSleepSymptom}`)).toBeChecked();
    });

    it('lets go of the symptom again when she presses it a second time', async () => {
      await herPhoneHolds(whenSheOpensIt, [aBleedingDay(today)]);
      await sheOpensEmi();

      await sheOpensTheLogTab();
      await shePresses(`symptom-chip-${theSleepSymptom}`);
      await shePresses(`symptom-chip-${theSleepSymptom}`);

      expect(theSymptomsRecordedToday()).toEqual([]);
      expect(screen.getByTestId(`symptom-chip-${theSleepSymptom}`)).not.toBeChecked();
    });
  });

  describe('the group the address names', () => {
    it('stays above the flow picker, where the line that offered it put it', async () => {
      await herPhoneHolds(whenSheOpensIt, [aBleedingDay(today)]);
      await sheOpensEmi(`/log?group=${painGroup}`);

      const order = theOrderDownTheGlass();

      expect(order.indexOf(logFlowGroupTestID(painGroup))).toBeLessThan(
        order.indexOf(flowPickerTestID),
      );
    });

    it('is not drawn a second time under the picker, so one press is one answer', async () => {
      await herPhoneHolds(whenSheOpensIt, [aBleedingDay(today)]);
      await sheOpensEmi(`/log?group=${painGroup}`);

      expect(screen.getAllByTestId(`symptom-chip-${thePainSymptom}`)).toHaveLength(1);
      expect(theGroupsUnderTheFlow()).not.toContain(painGroup);
    });

    it('leaves every other group under the picker, in the order she reads them', async () => {
      await herPhoneHolds(
        whenSheOpensIt,
        [aBleedingDay(today)],
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        ['sleep'],
      );
      await sheOpensEmi(`/log?group=${painGroup}`);

      expect(theGroupsUnderTheFlow()).toEqual([
        'sleep',
        ...symptomGroups.filter((group) => group !== 'sleep' && group !== painGroup),
      ]);
    });
  });

  describe('the order the tab asks for', () => {
    it('is every group but the one the address named', () => {
      expect(groupsUnderTheFlow(['sleep'], 'pain')).toEqual([
        'sleep',
        ...symptomGroups.filter((group) => group !== 'sleep' && group !== 'pain'),
      ]);
    });

    it('is every group where the address named none', () => {
      expect(groupsUnderTheFlow()).toEqual([...symptomGroups]);
      expect(groupsUnderTheFlow(['pain'])).toEqual([
        'pain',
        ...symptomGroups.filter((group) => group !== 'pain'),
      ]);
    });
  });
});
