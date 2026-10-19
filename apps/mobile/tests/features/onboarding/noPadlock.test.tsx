import { join } from 'node:path';

import { render } from '@testing-library/react-native';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { LockLine } from '../../../src/components/LockLine';
import { welcomeWhoCanSeeTestID } from '../../../src/features/onboarding/WhatEmiIs';
import {
  whoCanSeeBackTestID,
  whoCanSeeScreenTestID,
} from '../../../src/features/settings/WhoCanSee';
import { settingsCopy } from '../../../src/features/settings/copy';
import { catalogueOf, languages, words } from '../../../src/language';
import { resetExpoSqlite } from '../../data/expoSqlite';
import { locksDrawnIn } from '../../fixtures/drawnLocks';
import { resetExpoSecureStore } from '../../fixtures/expoSecureStore';
import { textIn } from '../../fixtures/renderedText';
import { type FirstRunLook, sheIsLookingAt } from '../../fixtures/theFirstRunLook';

jest.mock('expo-sqlite', () => jest.requireActual('../../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', '..', 'src', 'app');

/** The first run screens that drew a padlock line or the card about this phone. */
const theScreensThatDrewAPadlock: readonly FirstRunLook[] = [
  'welcome',
  'name',
  'yearOfBirth',
  'threePeriods',
  'feeling',
  'goals',
  'todayFirstRun',
  'reminder',
  'firstForecast',
  'firstForecastLearning',
];

/** The keys of the sentences the padlock lines and the forecast card said. */
const theKeysThatAreGone: readonly string[] = [
  'onboarding.encryptedHere',
  'onboarding.encryptsIt',
  'onboarding.encryptsYourAnswers',
  'onboarding.reminder.promise',
  'onboarding.firstForecast.onThisPhone.title',
  'onboarding.firstForecast.onThisPhone.line',
];

describe('the first run draws no padlock', () => {
  it('counts a lock where one is drawn, so a count of none means something', async () => {
    await render(<LockLine words="A line" />);

    expect(locksDrawnIn(screen.root)).toBe(1);
  });

  for (const look of theScreensThatDrewAPadlock) {
    it(`draws no lock on ${look}`, async () => {
      await sheIsLookingAt(look);

      expect(locksDrawnIn(screen.root)).toBe(0);
      expect(textIn(screen.root)).not.toContain(words('onboarding.encrypts'));
    });
  }

  for (const language of languages) {
    it(`holds none of the removed sentences in ${language}`, () => {
      const held = Object.keys(catalogueOf(language));

      expect(theKeysThatAreGone.filter((key) => held.includes(key))).toEqual([]);
    });
  }
});

describe('the welcome links to who can see her records', () => {
  beforeEach(() => {
    resetExpoSqlite();
    resetExpoSecureStore();
  });

  it('opens the page from the welcome and comes back to the welcome', async () => {
    const app = renderRouter(appDirectory, { initialUrl: '/onboarding/welcome' });

    await app;

    expect(screen.getByTestId(welcomeWhoCanSeeTestID)).toHaveTextContent(
      settingsCopy.whoCanSee.title,
    );

    await fireEvent.press(screen.getByTestId(welcomeWhoCanSeeTestID));

    expect(screen.getByTestId(whoCanSeeScreenTestID)).toBeTruthy();
    expect(app.getPathname()).toBe('/settings/who-can-see');

    await fireEvent.press(screen.getByTestId(whoCanSeeBackTestID));

    expect(screen.queryByTestId(whoCanSeeScreenTestID)).toBeNull();
    expect(screen.getByTestId('onboarding-welcome')).toBeTruthy();
    expect(app.getPathname()).toBe('/onboarding/welcome');
  });
});
