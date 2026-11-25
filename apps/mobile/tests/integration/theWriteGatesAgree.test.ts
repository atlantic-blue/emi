import { accountIdFor } from '@emi/crypto';

import { dynamoEntitlementStore } from '../../../../services/vault/src/payments/dynamoEntitlements';
import {
  saysWhetherSheMayWrite,
  theStoreStateThatCovers,
} from '../../../../services/vault/src/payments/writeGate';
import { dynamoStore } from '../../../../services/vault/src/store/dynamo';
import {
  fakeTable,
  type FakeTable,
  tableName,
} from '../../../../services/vault/tests/fixtures/dynamoTable';
import { anAccount, keyPairFromSeed } from '../../../../services/vault/tests/fixtures/requests';
import { theAppleStore, theYearlyProduct } from '../../../../services/vault/src/payments/appStore';
import {
  theScreenSheOpensEmiOn,
  whereSheGoesNext,
} from '../../src/features/paywall/whereSheGoesNext';
import type {
  WhatSheIsEntitledTo,
  WhatSheIsEntitledToNow,
} from '../../src/services/store/theEntitlement';
import { theStatesSheCanBeIn } from '../../src/services/store/theEntitlement';
import {
  THE_STATE_THE_PAYWALL_HOLDS,
  theStatesThatLetHerIn,
} from '../../src/services/store/thePurchase';
import {
  aWriteIsAllowedIn,
  theStatesAWriteIsRefusedIn,
} from '../../src/services/store/theWriteGate';

/**
 * The two write gates, held to one list of states.
 *
 * The phone gate reads the word the launch read left on the phone. The server gate reads the
 * account item and the payment item of each way in. They answer the same question in two places,
 * so a state one allows and the other refuses is a day she writes on her phone that never reaches
 * her vault.
 *
 * Both halves here are the real code: the phone's own gate, and the server's gate over the real
 * store and a table that refuses what the real table refuses.
 */

const herPhone = keyPairFromSeed(37);
const herAccountId = accountIdFor(herPhone.publicKey);

const now = new Date('2026-11-24T10:00:00.000Z');
const aYearOn = '2027-11-24T09:00:00.000Z';
const lastMonth = '2026-10-24T09:00:00.000Z';

/** What the account item holds for one state, as the filing and the notifications write it. */
interface WhatTheServerHolds {
  readonly subscriptionState: string;
  readonly subscribedUntil: string;
}

/**
 * The account item behind each state of the phone. The free month and a paid month are one word on
 * the server, because the server writes what the App Store answered and the store calls both of
 * them active. A refund moves the instant to the refund itself, which is why it reads as past.
 */
const whatTheServerHoldsFor: Readonly<Record<WhatSheIsEntitledTo, WhatTheServerHolds | null>> = {
  neverPaid: null,
  freeMonth: { subscriptionState: 'active', subscribedUntil: aYearOn },
  paid: { subscriptionState: 'active', subscribedUntil: aYearOn },
  cancelling: { subscriptionState: 'cancelling', subscribedUntil: aYearOn },
  lapsed: { subscriptionState: 'lapsed', subscribedUntil: lastMonth },
  refunded: { subscriptionState: 'refunded', subscribedUntil: lastMonth },
};

/** The server gate, over her account on a table of its own. */
async function theServerAnswersFor(held: WhatTheServerHolds | null): Promise<boolean> {
  const table: FakeTable = fakeTable();
  const store = dynamoStore(table, tableName);

  await store.createAccount(anAccount(herPhone, now));

  if (held !== null) {
    const written = await store.writeSubscription({
      accountId: herAccountId,
      subscribedUntil: held.subscribedUntil,
      subscriptionStore: theAppleStore,
      subscriptionTransaction: '2000000845620000',
      subscriptionCheckedAt: now.toISOString(),
      subscriptionState: held.subscriptionState,
      subscriptionEventAt: Math.floor(now.getTime() / 1000),
      subscriptionPlan: theYearlyProduct,
    });

    expect(written).toBe('written');
  }

  return saysWhetherSheMayWrite({
    accounts: store,
    entitlements: dynamoEntitlementStore(table, tableName),
  })(herAccountId, now);
}

const whatThePhoneHolds = (state: WhatSheIsEntitledTo): WhatSheIsEntitledToNow => ({
  state,
  until: whatTheServerHoldsFor[state]?.subscribedUntil ?? null,
  plan: state === 'neverPaid' ? null : theYearlyProduct,
  transaction: state === 'neverPaid' ? null : '2000000845620000',
  readAt: now.toISOString(),
});

describe('the gate on the phone and the gate on the server answer the same question the same way', () => {
  describe('every state a woman can be in', () => {
    it.each(theStatesSheCanBeIn.filter((state) => state !== THE_STATE_THE_PAYWALL_HOLDS))(
      'is answered the same by both gates: %s',
      async (state) => {
        const theServerSaid = await theServerAnswersFor(whatTheServerHoldsFor[state]);

        expect(theServerSaid).toBe(aWriteIsAllowedIn(state));
      },
    );

    it('lets her write in the free month, the paid month and the month she cancelled in', async () => {
      const answers = await Promise.all(
        theStatesThatLetHerIn.map((state) =>
          theServerAnswersFor(whatTheServerHoldsFor[state]).then((said) => [state, said]),
        ),
      );

      expect(answers).toEqual(theStatesThatLetHerIn.map((state) => [state, true]));
    });

    it('refuses her in the two states the phone refuses, and in no others', async () => {
      const answers = await Promise.all(
        theStatesSheCanBeIn.map((state) =>
          theServerAnswersFor(whatTheServerHoldsFor[state]).then((said) => [state, said]),
        ),
      );
      const theServerRefuses = answers.filter(([, said]) => said === false).map(([state]) => state);

      expect(theServerRefuses).toEqual([
        THE_STATE_THE_PAYWALL_HOLDS,
        ...theStatesAWriteIsRefusedIn,
      ]);
    });
  });

  describe('the one state the two lists read differently', () => {
    it('is never paid, where the phone sends her to pay instead of to a screen that writes', () => {
      expect(aWriteIsAllowedIn(THE_STATE_THE_PAYWALL_HOLDS)).toBe(true);
      expect(whereSheGoesNext(whatThePhoneHolds(THE_STATE_THE_PAYWALL_HOLDS), true)).not.toBe(
        theScreenSheOpensEmiOn,
      );
      expect(whereSheGoesNext(null, true)).not.toBe(theScreenSheOpensEmiOn);
    });

    it('is refused by the server, because no screen holds a request back', async () => {
      expect(await theServerAnswersFor(whatTheServerHoldsFor.neverPaid)).toBe(false);
    });
  });

  describe('the card the App Store is still trying', () => {
    it('keeps her writing on the server, as it keeps her writing on the phone', async () => {
      const theServerSaid = await theServerAnswersFor({
        subscriptionState: theStoreStateThatCovers,
        subscribedUntil: lastMonth,
      });

      expect(theServerSaid).toBe(true);
      expect(aWriteIsAllowedIn('paid')).toBe(true);
    });
  });
});
