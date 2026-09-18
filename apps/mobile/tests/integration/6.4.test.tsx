import { drawRecoveryCode, openRecord, recoveryCodeLength, sealRecord } from '@emi/crypto';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import {
  recoveryEntryTestID,
  recoveryWrongTestID,
} from '../../src/features/recovery/ConfirmRecoveryCode';
import { RecoverySetup } from '../../src/features/recovery/RecoverySetup';
import { recoveryActionTestID } from '../../src/features/recovery/RecoveryScreen';
import { recoveryCodeTestID } from '../../src/features/recovery/ShowRecoveryCode';
import { groupedRecoveryCode, recoveryCopy } from '../../src/features/recovery/copy';
import { expoKeychain } from '../../src/services/vault/keychain';
import {
  readRecoveryConfirmed,
  recoveryConfirmedItem,
} from '../../src/services/vault/recoveryConfirmed';
import { createVaultKey } from '../../src/services/vault/vaultKey';
import {
  type HeldRecovery,
  makeRecovery,
  vaultKeyFromRecovery,
} from '../../src/services/vault/wrapKey';
import { aDayRecord } from '../fixtures/dayRecord';
import { itemsInTheKeychain, resetExpoSecureStore } from '../fixtures/expoSecureStore';
import { fixedRandom } from '../fixtures/secureStore';

jest.mock('expo-secure-store', () => jest.requireActual('../fixtures/expoSecureStore'));

const sheConfirmedAt = new Date('2026-09-18T19:04:00.000Z');

/**
 * Her phone, at the moment it registers: a vault key in the keychain, and a recovery made once
 * from it. Everything below drives that one recovery, because the code she wrote on paper is the
 * code the server's wrapped bytes were sealed with and there is never a second one.
 */
async function herPhone() {
  resetExpoSecureStore();
  const store = expoKeychain();
  const vaultKey = await createVaultKey(store, fixedRandom(11));
  const recovery = makeRecovery(vaultKey, fixedRandom(29));

  return { store, vaultKey, recovery };
}

/** What the server holds for her, and the whole of what a second phone is given back. */
const whatTheServerHolds = (recovery: HeldRecovery): HeldRecovery => ({
  salt: recovery.salt,
  wrappedVaultKey: recovery.wrappedVaultKey,
});

async function press(testID: string): Promise<void> {
  await act(async () => {
    fireEvent.press(screen.getByTestId(testID));
    await Promise.resolve();
  });
}

async function type(entered: string): Promise<void> {
  await act(async () => {
    fireEvent.changeText(screen.getByTestId(recoveryEntryTestID), entered);
    await Promise.resolve();
  });
}

describe('the vault key is recovered from the code alone', () => {
  describe('before Emi shows her the code', () => {
    it('says that nobody at Emi can recover it, while the code is still off screen', async () => {
      const { store, recovery } = await herPhone();

      await render(
        <RecoverySetup
          now={() => sheConfirmedAt}
          onDone={() => undefined}
          recovery={recovery}
          store={store}
        />,
      );

      expect(
        screen.getByText(
          'Nobody at Emi can recover it for you. An Emi that could recover your code would be an Emi that could read your days.',
        ),
      ).toBeTruthy();
      expect(screen.queryByTestId(recoveryCodeTestID)).toBeNull();
    });

    it('shows the code only after she has pressed on past that sentence', async () => {
      const { store, recovery } = await herPhone();

      await render(
        <RecoverySetup
          now={() => sheConfirmedAt}
          onDone={() => undefined}
          recovery={recovery}
          store={store}
        />,
      );
      await press(recoveryActionTestID);

      expect(screen.getByTestId(recoveryCodeTestID)).toHaveTextContent(
        groupedRecoveryCode(recovery.code),
      );
    });

    it('draws all 26 characters, in groups she can keep her place in', async () => {
      const { store, recovery } = await herPhone();

      await render(
        <RecoverySetup
          now={() => sheConfirmedAt}
          onDone={() => undefined}
          recovery={recovery}
          store={store}
        />,
      );
      await press(recoveryActionTestID);

      const drawn = screen.getByTestId(recoveryCodeTestID).props.children as string;

      expect(recovery.code).toHaveLength(recoveryCodeLength);
      expect(drawn.replace(/ /g, '')).toBe(recovery.code);
      expect(drawn.split(' ')).toHaveLength(7);
    });
  });

  describe('typing the code back', () => {
    async function atTheConfirmation() {
      const phone = await herPhone();
      const done: string[] = [];

      await render(
        <RecoverySetup
          now={() => sheConfirmedAt}
          onDone={() => done.push('done')}
          recovery={phone.recovery}
          store={phone.store}
        />,
      );
      await press(recoveryActionTestID);
      await press(recoveryActionTestID);

      return { ...phone, done };
    }

    it('will not go on while the field is empty', async () => {
      const { done } = await atTheConfirmation();

      await press(recoveryActionTestID);

      expect(screen.getByTestId(recoveryEntryTestID)).toBeTruthy();
      expect(screen.queryByTestId(recoveryWrongTestID)).toBeNull();
      expect(done).toEqual([]);
    });

    it('will not go on for a code that stops short of 26 characters', async () => {
      const { recovery, done } = await atTheConfirmation();

      await type(recovery.code.slice(0, -1));
      await press(recoveryActionTestID);

      expect(done).toEqual([]);
    });

    it('tells her the code is wrong once she has typed a whole one that is not hers', async () => {
      const { recovery, done } = await atTheConfirmation();

      await type(reversed(recovery.code));
      await press(recoveryActionTestID);

      expect(screen.getByTestId(recoveryWrongTestID)).toHaveTextContent(recoveryCopy.confirm.wrong);
      expect(done).toEqual([]);
    });

    it('will not go on for a code that is 26 characters and not hers', async () => {
      const { recovery, done } = await atTheConfirmation();
      const nearlyRight = `${recovery.code.slice(0, -1)}${recovery.code.endsWith('7') ? '8' : '7'}`;

      await type(nearlyRight);
      await press(recoveryActionTestID);

      expect(nearlyRight).toHaveLength(recoveryCodeLength);
      expect(screen.getByTestId(recoveryWrongTestID)).toBeTruthy();
      expect(done).toEqual([]);
    });

    it('writes nothing to the keychain while she has not typed it back', async () => {
      const { done } = await atTheConfirmation();

      await type('0'.repeat(recoveryCodeLength));
      await press(recoveryActionTestID);

      expect(Object.keys(itemsInTheKeychain())).not.toContain(recoveryConfirmedItem);
      expect(done).toEqual([]);
    });

    it('takes the wrong message away the moment she types again', async () => {
      const { recovery } = await atTheConfirmation();

      await type(reversed(recovery.code));
      await press(recoveryActionTestID);
      expect(screen.getByTestId(recoveryWrongTestID)).toBeTruthy();

      await type(recovery.code.slice(0, 4));

      expect(screen.queryByTestId(recoveryWrongTestID)).toBeNull();
    });

    it('goes on when she types the code she was shown', async () => {
      const { recovery, done } = await atTheConfirmation();

      await type(recovery.code);
      await press(recoveryActionTestID);

      expect(done).toEqual(['done']);
    });

    it('reads it back in lower case, with the spaces she was shown it in', async () => {
      const { recovery, done } = await atTheConfirmation();

      await type(groupedRecoveryCode(recovery.code).toLowerCase());
      await press(recoveryActionTestID);

      expect(done).toEqual(['done']);
    });
  });

  describe('what the phone keeps once she has confirmed', () => {
    async function afterSheConfirmed() {
      const phone = await herPhone();

      await render(
        <RecoverySetup
          now={() => sheConfirmedAt}
          onDone={() => undefined}
          recovery={phone.recovery}
          store={phone.store}
        />,
      );
      await press(recoveryActionTestID);
      await press(recoveryActionTestID);
      await type(phone.recovery.code);
      await press(recoveryActionTestID);

      return phone;
    }

    it('keeps the instant she said she had written it down', async () => {
      const { store } = await afterSheConfirmed();

      expect(await readRecoveryConfirmed(store)).toEqual(sheConfirmedAt);
    });

    it('keeps the code itself in no keychain item, in any spelling', async () => {
      const { recovery } = await afterSheConfirmed();
      const everything = JSON.stringify(itemsInTheKeychain());

      for (const spelling of everySpellingOf(recovery.code)) {
        expect(everything).not.toContain(spelling);
      }
    });

    it('holds only the two items this phone has made, and no third', async () => {
      const { store } = await afterSheConfirmed();

      expect(Object.keys(itemsInTheKeychain()).sort()).toEqual([
        recoveryConfirmedItem,
        'emi.vaultKey.v1',
      ]);
      expect(await readRecoveryConfirmed(store)).toEqual(sheConfirmedAt);
    });
  });

  describe('the code she was shown is the code the key is wrapped under', () => {
    /**
     * A generator that never gives the same bytes twice, which is what a real one does. The shared
     * fixed source answers only from the length it is asked for, so under it a second draw of a
     * code is the first draw again, and a wrap under a freshly drawn code would still open.
     */
    function walkingRandom(): (byteCount: number) => Uint8Array {
      let next = 1;

      return (byteCount) =>
        new Uint8Array(byteCount).map(() => {
          next = (next * 37 + 11) % 251;

          return next + 1;
        });
    }

    it('opens under the code it returned, and not under anything drawn after it', () => {
      const random = walkingRandom();
      const vaultKey = new Uint8Array(32).map((_, at) => (at * 3 + 1) % 255 || 2);
      const recovery = makeRecovery(vaultKey, random);
      const drawnAfterwards = drawRecoveryCode(random);

      expect(drawnAfterwards).not.toBe(recovery.code);
      expect([...vaultKeyFromRecovery(recovery.code, whatTheServerHolds(recovery))]).toEqual([
        ...vaultKey,
      ]);
      expect(() => vaultKeyFromRecovery(drawnAfterwards, whatTheServerHolds(recovery))).toThrow(
        'that recovery code does not open this vault',
      );
    });
  });

  describe('her new phone, holding nothing but the code on the paper', () => {
    it('recovers the vault key from the code alone, and opens a day she sealed', async () => {
      const { vaultKey, recovery } = await herPhone();
      const herDay = aDayRecord({ note: 'the day she wrote before she lost the phone' });
      const sealed = sealRecord(herDay, vaultKey, { random: fixedRandom(5) });
      const fromTheServer = whatTheServerHolds(recovery);

      // A new phone. The keychain is empty, and the only thing she carried across is the paper.
      resetExpoSecureStore();

      const recovered = vaultKeyFromRecovery(recovery.code, fromTheServer);

      expect(Object.keys(itemsInTheKeychain())).toEqual([]);
      expect([...recovered]).toEqual([...vaultKey]);
      expect(openRecord(sealed, recovered).note).toBe(herDay.note);
    });

    it('recovers nothing at all from a code that is not hers', async () => {
      const { recovery } = await herPhone();
      const somebodyElses = makeRecovery(new Uint8Array(32).fill(3), fixedRandom(41)).code;

      expect(somebodyElses).not.toBe(recovery.code);
      expect(() => vaultKeyFromRecovery(somebodyElses, whatTheServerHolds(recovery))).toThrow(
        'that recovery code does not open this vault',
      );
    });

    it('recovers nothing from her own code against another account’s salt', async () => {
      const { recovery } = await herPhone();
      const anotherAccount = makeRecovery(new Uint8Array(32).fill(3), fixedRandom(41));

      expect(() =>
        vaultKeyFromRecovery(recovery.code, {
          salt: anotherAccount.salt,
          wrappedVaultKey: recovery.wrappedVaultKey,
        }),
      ).toThrow('that recovery code does not open this vault');
    });
  });
});

/** Her code backwards: 26 characters of the alphabet, and not the code she was shown. */
function reversed(code: string): string {
  return [...code].reverse().join('');
}

/** The ways a code could reach an item: as itself, in lower case, or in part. */
function everySpellingOf(code: string): string[] {
  return [code, code.toLowerCase(), groupedRecoveryCode(code), code.slice(0, 8), code.slice(-8)];
}
