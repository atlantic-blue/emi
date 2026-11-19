import { createHash } from 'node:crypto';
import { join } from 'node:path';

import { theAddressBackToTheApplication } from '@emi/sign-in';
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
  accountGateLineTestID,
  accountGateScreenTestID,
  accountGateTelegramTestID,
} from '../../../src/features/account/AccountGate';
import {
  settingsAccountTestID,
  settingsScreenTestID,
} from '../../../src/features/settings/SettingsScreen';
import { rowValueTestID } from '../../../src/components/SettingsRow';
import type { HowTheSessionEnded } from '../../../src/services/signIn/theTelegramSignIn';
import { english } from '../../../src/language';
import { resetExpoSqlite } from '../../data/expoSqlite';
import { itemsInTheKeychain, resetExpoSecureStore } from '../../fixtures/expoSecureStore';
import {
  resetExpoWebBrowser,
  sessionsThatOpened,
  theSessionEnds,
} from '../../fixtures/expoWebBrowser';
import { aBleedingDay, dayOf, herPhoneHolds } from '../../fixtures/herPhone';
import { textIn } from '../../fixtures/renderedText';
import {
  theOneTimeAnswer,
  theRefreshTokenTelegramHandsBack,
  theTelegramSignInSheReaches,
  theUserNameOfThePool,
} from '../../fixtures/theTelegramSignInSheReaches';

jest.mock('expo-sqlite', () => jest.requireActual('../../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../../fixtures/expoCrypto'));
jest.mock('expo-web-browser', () => jest.requireActual('../../fixtures/expoWebBrowser'));

const appDirectory = join(__dirname, '..', '..', '..', 'src', 'app');

const whenSheSignsIn = new Date('2026-11-13T12:00:00.000Z');

const theItemSheKeeps = 'emi.identityRefresh.v1';

const theCodeTelegramMade = 'a-code-telegram-made';

/** Telegram, and the relay page of the website, sending her back with the state they were given. */
function telegramSendsHerBack(
  withState: (theStateThePhoneWrote: string) => string = (state) => state,
): void {
  theSessionEnds((address) =>
    Promise.resolve({
      type: 'success',
      url: theAddressBackToTheApplication({
        code: theCodeTelegramMade,
        state: withState(new URL(address).searchParams.get('state') ?? ''),
        error: null,
      }),
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

async function shePressesTelegram(): Promise<void> {
  await fireEvent.press(screen.getByTestId(accountGateTelegramTestID));
}

describe('she signs in to Emi with Telegram', () => {
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

  it('opens Telegram in the session of the phone, with every parameter and the S256 of the verifier', async () => {
    const service = theTelegramSignInSheReaches();
    telegramSendsHerBack();
    await sheOpensTheAccountRow();
    await shePressesTelegram();
    await screen.findByTestId(accountScreenTestID);

    expect(sessionsThatOpened()).toHaveLength(1);

    const [session] = sessionsThatOpened();
    const address = new URL(session?.address ?? '');
    const asked = Object.fromEntries(address.searchParams);

    expect(session?.endsOn).toBe('emi://sign-in/telegram');
    expect(`${address.origin}${address.pathname}`).toBe('https://oauth.telegram.org/auth');
    expect(Object.keys(asked).sort()).toEqual([
      'client_id',
      'code_challenge',
      'code_challenge_method',
      'redirect_uri',
      'response_type',
      'scope',
      'state',
    ]);
    expect(asked).toMatchObject({
      client_id: '9068004348',
      code_challenge_method: 'S256',
      redirect_uri: 'https://myemi.app/en/sign-in/telegram/',
      response_type: 'code',
      scope: 'openid',
    });
    expect(asked.state).toMatch(/^app\.en\.[A-Za-z0-9_-]{22}$/);

    const [toTheFunction, ...toThePool] = service.went;
    const verifier = String(toTheFunction?.body.codeVerifier);

    expect(toTheFunction?.where).toBe(
      'https://2pumohtm7l.execute-api.eu-central-1.amazonaws.com/v1/sign-in/telegram',
    );
    expect(toTheFunction?.body.code).toBe(theCodeTelegramMade);
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(asked.code_challenge).toBe(theS256Of(verifier));
    expect(session?.address).not.toContain(verifier);
    expect(toThePool.map((each) => each.call)).toEqual(['InitiateAuth', 'RespondToAuthChallenge']);
    expect(toThePool[1]?.body.ChallengeResponses).toEqual({
      USERNAME: theUserNameOfThePool,
      ANSWER: theOneTimeAnswer,
    });
  });

  it('lands on Emi on another phone with Telegram and the day, and no email address', async () => {
    theTelegramSignInSheReaches();
    telegramSendsHerBack();
    await sheOpensTheAccountRow();
    await shePressesTelegram();

    expect(textIn(await screen.findByTestId(accountWayTestID))).toEqual([
      english['account.account.signedInWith'],
      english['account.way.telegram'],
    ]);
    expect(textIn(screen.getByTestId(accountSinceTestID))).toEqual([
      english['account.account.since'],
      '13 November 2026',
    ]);
    expect(screen.queryByTestId(accountEmailTestID)).toBeNull();
  });

  it('reads Telegram under the row of Privacy once she goes back', async () => {
    theTelegramSignInSheReaches();
    telegramSendsHerBack();
    await sheOpensTheAccountRow();
    await shePressesTelegram();
    await fireEvent.press(await screen.findByTestId(accountBackTestID));

    expect(screen.getByTestId(settingsScreenTestID)).toBeTruthy();
    expect(await screen.findByTestId(rowValueTestID(settingsAccountTestID))).toHaveTextContent(
      'Telegram',
    );
  });

  it('keeps the refresh token in the keychain under its own item, with the way and the day', async () => {
    theTelegramSignInSheReaches();
    telegramSendsHerBack();
    await sheOpensTheAccountRow();
    await shePressesTelegram();
    await screen.findByTestId(accountScreenTestID);

    expect(JSON.parse(itemsInTheKeychain()[theItemSheKeeps] ?? '{}')).toEqual({
      way: 'telegram',
      since: '2026-11-13',
      refreshToken: theRefreshTokenTelegramHandsBack,
    });
  });

  it('signs nobody in when the state that comes back is not the one the phone wrote', async () => {
    const service = theTelegramSignInSheReaches();
    telegramSendsHerBack(() => 'app.en.a-state-another-phone-wrote');
    await sheOpensTheAccountRow();
    await shePressesTelegram();

    expect(await screen.findByTestId(accountGateLineTestID)).toHaveTextContent(
      english['account.problem.telegramDidNotFinish'],
    );
    expect(screen.getByTestId(accountGateScreenTestID)).toBeTruthy();
    expect(screen.queryByTestId(accountScreenTestID)).toBeNull();
    expect(service.went).toEqual([]);
    expect(itemsInTheKeychain()[theItemSheKeeps]).toBeUndefined();
  });

  it('says it did not finish when Telegram refused, and asks nobody anything', async () => {
    const service = theTelegramSignInSheReaches();
    theSessionEnds((address) =>
      Promise.resolve({
        type: 'success',
        url: theAddressBackToTheApplication({
          code: null,
          state: new URL(address).searchParams.get('state'),
          error: 'access_denied',
        }),
      }),
    );
    await sheOpensTheAccountRow();
    await shePressesTelegram();

    expect(await screen.findByTestId(accountGateLineTestID)).toHaveTextContent(
      english['account.problem.telegramDidNotFinish'],
    );
    expect(service.went).toEqual([]);
  });

  it.each(['cancel', 'dismiss'] as const)(
    'leaves her on the sign in with nothing new when the sheet ends with %s',
    async (type) => {
      const service = theTelegramSignInSheReaches();
      theSessionEnds(() => Promise.resolve({ type }));
      await sheOpensTheAccountRow();
      await shePressesTelegram();

      expect(sessionsThatOpened()).toHaveLength(1);
      expect(screen.getByTestId(accountGateScreenTestID)).toBeTruthy();
      expect(screen.queryByTestId(accountGateLineTestID)).toBeNull();
      expect(service.went).toEqual([]);
      expect(itemsInTheKeychain()[theItemSheKeeps]).toBeUndefined();
    },
  );

  it('shows the one line when the pool refuses the one time answer, and keeps nothing', async () => {
    const service = theTelegramSignInSheReaches();
    service.refuseTheAnswer();
    telegramSendsHerBack();
    await sheOpensTheAccountRow();
    await shePressesTelegram();

    expect(await screen.findByTestId(accountGateLineTestID)).toHaveTextContent(
      english['account.problem.telegramDidNotFinish'],
    );
    expect(service.went.map((each) => each.call)).toEqual([
      '',
      'InitiateAuth',
      'RespondToAuthChallenge',
    ]);
    expect(itemsInTheKeychain()[theItemSheKeeps]).toBeUndefined();
  });

  it('opens one session, however many times she presses while it is open', async () => {
    theTelegramSignInSheReaches();
    let endTheSession: (ended: HowTheSessionEnded) => void = () => undefined;
    theSessionEnds(
      () =>
        new Promise((resolve) => {
          endTheSession = resolve;
        }),
    );
    await sheOpensTheAccountRow();
    await shePressesTelegram();
    await shePressesTelegram();
    await shePressesTelegram();

    expect(sessionsThatOpened()).toHaveLength(1);

    await act(async () => {
      endTheSession({ type: 'cancel' });
      await Promise.resolve();
    });
    await shePressesTelegram();

    expect(sessionsThatOpened()).toHaveLength(2);
  });
});
