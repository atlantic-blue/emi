import { type ReactNode, createContext, useCallback, useContext, useEffect, useState } from 'react';

import { useDatabase } from '../../data/DatabaseProvider';
import { encryptPlainPayloads } from '../../data/migrations/004-encrypt-payloads';
import { moveCycleLengthIntoProfile } from '../../data/migrations/006-cycle-length-into-profile';
import { type DayVault, dayVault } from './dayVault';
import { expoKeychain } from './keychain';
import { type ProfileVault, profileVault } from './profileVault';
import { phoneRandom, vaultKey } from './vaultKey';

/** Her one key, bound to the two shapes it seals. Both are made here so both hold the same key. */
interface HerVaults {
  readonly day: DayVault;
  readonly profile: ProfileVault;
}

function vaultsFor(key: Uint8Array): HerVaults {
  return { day: dayVault(key, phoneRandom), profile: profileVault(key, phoneRandom) };
}

const VaultContext = createContext<HerVaults | undefined>(undefined);
const RenewalContext = createContext<(() => Promise<void>) | undefined>(undefined);

/**
 * The key reaches the screens from here. Reading the keychain is asynchronous, so nothing under
 * this renders until the key is in hand: a screen that drew her ring first would have to read her
 * days without it, and there is no way to read a day without the key.
 *
 * The days she wrote before the envelope existed are sealed here too, on the first launch that
 * holds a key, because this is the first moment both the key and the database are open. The cycle
 * length she stated moves out of the setting table here for the same reason.
 */
export function VaultProvider({ children }: { readonly children: ReactNode }): ReactNode {
  const database = useDatabase();
  const [vaults, setVaults] = useState<HerVaults | undefined>(undefined);

  useEffect(() => {
    let stillMounted = true;

    void vaultKey(expoKeychain(), phoneRandom).then((key) => {
      if (!stillMounted) {
        return;
      }
      const opened = vaultsFor(key);
      const now = new Date();
      encryptPlainPayloads(database, opened.day, now);
      moveCycleLengthIntoProfile(database, opened.profile, now);
      setVaults(opened);
    });

    return () => {
      stillMounted = false;
    };
  }, [database]);

  /**
   * After a delete the keychain holds nothing, so the key in memory here opens rows that no longer
   * exist and seals new ones under a key her next launch cannot find. This reads the keychain
   * again and takes whatever it now holds, which after a delete is a key made on the spot. It
   * resolves once the swap is done, so nothing writes a day in the gap.
   */
  const renew = useCallback(async () => {
    const key = await vaultKey(expoKeychain(), phoneRandom);
    setVaults(vaultsFor(key));
  }, []);

  if (!vaults) {
    return null;
  }

  return (
    <RenewalContext.Provider value={renew}>
      <VaultContext.Provider value={vaults}>{children}</VaultContext.Provider>
    </RenewalContext.Provider>
  );
}

export function useVault(): DayVault {
  return useHerVaults().day;
}

/** What a screen reads her answers through, which is the same key her days are sealed with. */
export function useProfileVault(): ProfileVault {
  return useHerVaults().profile;
}

function useHerVaults(): HerVaults {
  const vaults = useContext(VaultContext);
  if (!vaults) {
    throw new Error('a screen read the vault from outside the vault provider');
  }
  return vaults;
}

/** What the delete screen calls once the keychain is empty, and nothing else has any use for. */
export function useRenewVault(): () => Promise<void> {
  const renew = useContext(RenewalContext);
  if (!renew) {
    throw new Error('a screen renewed the vault from outside the vault provider');
  }
  return renew;
}
