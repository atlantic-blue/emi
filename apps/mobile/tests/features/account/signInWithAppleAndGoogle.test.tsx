import { createHash } from 'node:crypto';
import { join } from 'node:path';

import { tabTestID } from '@emi/ui';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import {
  accountBackTestID,
  accountEmailTestID,
  accountScreenTestID,
  accountSinceTestID,
  accountWayTestID,
} from '../../../src/features/account/Account';
import {
  accountGateAppleTestID,
  accountGateGoogleTestID,
  accountGateLineTestID,
  accountGateScreenTestID,
} from '../../../src/features/account/AccountGate';
import {
  settingsAccountTestID,
  settingsScreenTestID,
} from '../../../src/features/settings/SettingsScreen';
import { rowValueTestID } from '../../../src/components/SettingsRow';
import type { HowTheSessionEnded } from '../../../src/services/signIn/theTelegramSignIn';
import { english } from '../../../src/language';
import { resetExpoSqlite } from '../../data/expoSqlite';
import {
  itemsInTheKeychain,
  resetExpoSecureStore,
  setItemAsync,
} from '../../fixtures/expoSecureStore';
import {
  resetExpoWebBrowser,
  sessionsThatOpened,
  theSessionEnds,
} from '../../fixtures/expoWebBrowser';
import { aBleedingDay, dayOf, herPhoneHolds } from '../../fixtures/herPhone';
import { textIn } from '../../fixtures/renderedText';
import {
  theAddressTheProviderVouchedFor,
  theProviderSignInSheReaches,
  theRefreshTokenThePoolHandsBack,
} from '../../fixtures/theProviderSignInSheReaches';

jest.mock('expo-sqlite', () => jest.requireActual('../../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../../fixtures/expoCrypto'));
jest.mock('expo-web-browser', () => jest.requireActual('../../fixtures/expoWebBrowser'));

const appDirectory = join(__dirname, '..', '..', '..', 'src', 'app');

const whenSheSignsIn = new Date('2026-11-13T12:00:00.000Z');

const theItemSheKeeps = 'emi.identityRefresh.v1';

const theCodeThePoolMade = 'a-code-the-pool-made';

const theReturnAddress = 'emi://sign-in/returning';

/** Each way in, with the press she makes, the name the pool fixes, and what she reads. */
const theWaysIn = [
  {
    provider: 'Apple',
    testID: accountGateAppleTestID,
    identityProvider: 'SignInWithApple',
    way: 'apple',
    named: english['account.way.apple'],
    didNotFinish: english['account.problem.appleDidNotFinish'],
  },
  {
    provider: 'Google',
    testID: accountGateGoogleTestID,
    identityProvider: 'Google',
    way: 'google',
    named: english['account.way.google'],
    didNotFinish: english['account.problem.googleDidNotFinish'],
  },
] as const;

/** The pool sending her back with the state it was given, or with whatever a case puts there. */
function thePoolSendsHerBack(
  withQuery: (theStateThePhoneWrote: string) => string = (state) =>
    `code=${theCodeThePoolMade}&state=${encodeURIComponent(state)}`,
): void {
  theSessionEnds((address) =>
    Promise.resolve({
      type: 'success',
      url: `${theReturnAddress}?${withQuery(new URL(address).searchParams.get('state') ?? '')}`,
    }),
  );
}

function theS256Of(verifier: string): string {
  return createHash('sha256')
    .update(verifier)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function sheOpensTheAccountRow(): Promise<void> {
  await renderRouter(appDirectory, { initialUrl: '/' });
  await fireEvent.press(await screen.findByTestId(tabTestID('settings/index')));
  await fireEvent.press(screen.getByTestId(settingsAccountTestID));
}

async function shePresses(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

/** The gate, still in front of her, with one sentence under the address and nothing kept. */
async function sheIsStillAtTheGateReading(sentence: string): Promise<void> {
  expect(await screen.findByTestId(accountGateLineTestID)).toHaveTextContent(sentence);
  expect(screen.getByTestId(accountGateScreenTestID)).toBeTruthy();
  expect(screen.queryByTestId(accountScreenTestID)).toBeNull();
  expect(itemsInTheKeychain()[theItemSheKeeps]).toBeUndefined();
}

describe.each(theWaysIn)('she signs in to Emi with $provider', (wayIn) => {
  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheSignsIn);
    resetExpoSqlite();
    resetExpoSecureStore();
    resetExpoWebBrowser();
    await herPhoneHolds(whenSheSignsIn, [aBleedingDay(dayOf(whenSheSignsIn))], 28);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('opens the pool in the session of the phone, and exchanges the code with the verifier', async () => {
    const pool = theProviderSignInSheReaches();
    thePoolSendsHerBack();
    await sheOpensTheAccountRow();
    await shePresses(wayIn.testID);
    await screen.findByTestId(accountScreenTestID);

    expect(sessionsThatOpened()).toHaveLength(1);

    const [session] = sessionsThatOpened();
    const address = new URL(session?.address ?? '');
    const asked = Object.fromEntries(address.searchParams);

    expect(session?.endsOn).toBe(theReturnAddress);
    expect(`${address.origin}${address.pathname}`).toBe('https://auth.myemi.app/oauth2/authorize');
    expect(Object.keys(asked).sort()).toEqual([
      'client_id',
      'code_challenge',
      'code_challenge_method',
      'identity_provider',
      'redirect_uri',
      'response_type',
      'scope',
      'state',
    ]);
    expect(asked).toMatchObject({
      response_type: 'code',
      client_id: '2rblpgql4qv6v414pul240odbn',
      identity_provider: wayIn.identityProvider,
      scope: 'openid email',
      redirect_uri: theReturnAddress,
      code_challenge_method: 'S256',
    });
    expect(asked.state).toMatch(/^[A-Za-z0-9_-]{22}$/);

    expect(pool.went).toHaveLength(1);

    const [exchange] = pool.went;
    const verifier = exchange?.body.code_verifier ?? '';

    expect(exchange?.where).toBe('https://auth.myemi.app/oauth2/token');
    expect(exchange?.contentType).toBe('application/x-www-form-urlencoded');
    expect(exchange?.body).toEqual({
      grant_type: 'authorization_code',
      client_id: '2rblpgql4qv6v414pul240odbn',
      code: theCodeThePoolMade,
      redirect_uri: theReturnAddress,
      code_verifier: verifier,
    });
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(asked.code_challenge).toBe(theS256Of(verifier));
    expect(session?.address).not.toContain(verifier);
  });

  it(`lands on Emi on another phone with ${wayIn.provider}, her address and the day`, async () => {
    theProviderSignInSheReaches();
    thePoolSendsHerBack();
    await sheOpensTheAccountRow();
    await shePresses(wayIn.testID);

    expect(textIn(await screen.findByTestId(accountWayTestID))).toEqual([
      english['account.account.signedInWith'],
      wayIn.named,
    ]);
    expect(textIn(screen.getByTestId(accountEmailTestID))).toEqual([
      english['account.account.email'],
      theAddressTheProviderVouchedFor,
    ]);
    expect(textIn(screen.getByTestId(accountSinceTestID))).toEqual([
      english['account.account.since'],
      '13 November 2026',
    ]);
  });

  it(`reads ${wayIn.provider} under the row of Privacy once she goes back`, async () => {
    theProviderSignInSheReaches();
    thePoolSendsHerBack();
    await sheOpensTheAccountRow();
    await shePresses(wayIn.testID);
    await fireEvent.press(await screen.findByTestId(accountBackTestID));

    expect(screen.getByTestId(settingsScreenTestID)).toBeTruthy();
    expect(await screen.findByTestId(rowValueTestID(settingsAccountTestID))).toHaveTextContent(
      wayIn.named,
    );
  });

  it('keeps the refresh token in the keychain with the way, her address and the day', async () => {
    theProviderSignInSheReaches();
    thePoolSendsHerBack();
    await sheOpensTheAccountRow();
    await shePresses(wayIn.testID);
    await screen.findByTestId(accountScreenTestID);

    expect(JSON.parse(itemsInTheKeychain()[theItemSheKeeps] ?? '{}')).toEqual({
      way: wayIn.way,
      address: theAddressTheProviderVouchedFor,
      since: '2026-11-13',
      refreshToken: theRefreshTokenThePoolHandsBack,
    });
  });

  it('signs nobody in when the state that comes back is not the one the phone wrote', async () => {
    const pool = theProviderSignInSheReaches();
    thePoolSendsHerBack(() => `code=${theCodeThePoolMade}&state=a-state-another-phone-wrote`);
    await sheOpensTheAccountRow();
    await shePresses(wayIn.testID);

    await sheIsStillAtTheGateReading(wayIn.didNotFinish);
    expect(pool.went).toEqual([]);
  });

  it('signs nobody in when the return carries no state at all', async () => {
    const pool = theProviderSignInSheReaches();
    thePoolSendsHerBack(() => `code=${theCodeThePoolMade}`);
    await sheOpensTheAccountRow();
    await shePresses(wayIn.testID);

    await sheIsStillAtTheGateReading(wayIn.didNotFinish);
    expect(pool.went).toEqual([]);
  });

  it('says it did not finish when the return carries an error, and asks the pool nothing', async () => {
    const pool = theProviderSignInSheReaches();
    thePoolSendsHerBack((state) => `error=access_denied&state=${encodeURIComponent(state)}`);
    await sheOpensTheAccountRow();
    await shePresses(wayIn.testID);

    await sheIsStillAtTheGateReading(wayIn.didNotFinish);
    expect(pool.went).toEqual([]);
  });

  it.each(['cancel', 'dismiss'] as const)(
    'leaves her on the sign in with nothing new when the sheet ends with %s',
    async (type) => {
      const pool = theProviderSignInSheReaches();
      theSessionEnds(() => Promise.resolve({ type }));
      await sheOpensTheAccountRow();
      await shePresses(wayIn.testID);

      expect(sessionsThatOpened()).toHaveLength(1);
      expect(screen.getByTestId(accountGateScreenTestID)).toBeTruthy();
      expect(screen.queryByTestId(accountGateLineTestID)).toBeNull();
      expect(pool.went).toEqual([]);
      expect(itemsInTheKeychain()[theItemSheKeeps]).toBeUndefined();
    },
  );

  it('shows the one line when the pool refuses the code, and keeps nothing', async () => {
    const pool = theProviderSignInSheReaches();
    pool.refuseTheCode();
    thePoolSendsHerBack();
    await sheOpensTheAccountRow();
    await shePresses(wayIn.testID);

    await sheIsStillAtTheGateReading(wayIn.didNotFinish);
    expect(pool.went).toHaveLength(1);
  });

  it('says the phone could not reach Emi when the exchange reaches nobody', async () => {
    const pool = theProviderSignInSheReaches();
    pool.reachNobody();
    thePoolSendsHerBack();
    await sheOpensTheAccountRow();
    await shePresses(wayIn.testID);

    await sheIsStillAtTheGateReading(english['account.problem.nothingReached']);
  });

  it.each([
    { what: 'no email claim', claims: {} },
    { what: 'an empty email claim', claims: { email: '' } },
    { what: 'an email claim that is not text', claims: { email: 42 } },
  ])('signs nobody in when the id token carries $what', async ({ claims }) => {
    const pool = theProviderSignInSheReaches();
    pool.handBackAnIdTokenCarrying(claims);
    thePoolSendsHerBack();
    await sheOpensTheAccountRow();
    await shePresses(wayIn.testID);

    await sheIsStillAtTheGateReading(wayIn.didNotFinish);
  });

  it('opens one session, however many times she presses while it is open', async () => {
    theProviderSignInSheReaches();
    let endTheSession: (ended: HowTheSessionEnded) => void = () => undefined;
    theSessionEnds(
      () =>
        new Promise((resolve) => {
          endTheSession = resolve;
        }),
    );
    await sheOpensTheAccountRow();
    await shePresses(accountGateAppleTestID);
    await shePresses(accountGateGoogleTestID);
    await shePresses(wayIn.testID);

    expect(sessionsThatOpened()).toHaveLength(1);

    await act(async () => {
      endTheSession({ type: 'cancel' });
      await Promise.resolve();
    });
    await shePresses(wayIn.testID);

    expect(sessionsThatOpened()).toHaveLength(2);
  });

  it.each([
    { what: 'no address', address: undefined },
    { what: 'an empty address', address: '' },
  ])(
    `offers the way in again when the keychain holds ${wayIn.provider} with $what`,
    async ({ address }) => {
      await setItemAsync(
        theItemSheKeeps,
        JSON.stringify({ way: wayIn.way, address, since: '2026-11-13', refreshToken: 'a-token' }),
      );
      await sheOpensTheAccountRow();

      expect(await screen.findByTestId(accountGateScreenTestID)).toBeTruthy();
      expect(screen.queryByTestId(accountScreenTestID)).toBeNull();
    },
  );
});
