import { type ReactNode, createContext, useCallback, useContext, useEffect, useState } from 'react';

import { useDatabase } from '../../data/DatabaseProvider';
import { encryptPlainPayloads } from '../../data/migrations/004-encrypt-payloads';
import { type DayVault, dayVault } from './dayVault';
import { expoKeychain } from './keychain';
import { phoneRandom, vaultKey } from './vaultKey';

const VaultContext = createContext<DayVault | undefined>(undefined);
const RenewalContext = createContext<(() => Promise<void>) | undefined>(undefined);

/**
 * The key reaches the screens from here. Reading the keychain is asynchronous, so nothing under
 * this renders until the key is in hand: a screen that drew her ring first would have to read her
 * days without it, and there is no way to read a day without the key.
 *
 * The days she wrote before the envelope existed are sealed here too, on the first launch that
 * holds a key, because this is the first moment both the key and the database are open.
 */
export function VaultProvider({ children }: { readonly children: ReactNode }): ReactNode {
  const database = useDatabase();
  const [vault, setVault] = useState<DayVault | undefined>(undefined);

  useEffect(() => {
    let stillMounted = true;

    void vaultKey(expoKeychain(), phoneRandom).then((key) => {
      if (!stillMounted) {
        return;
      }
      const opened = dayVault(key);
      encryptPlainPayloads(database, opened, new Date());
      setVault(opened);
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
    setVault(dayVault(key));
  }, []);

  if (!vault) {
    return null;
  }

  return (
    <RenewalContext.Provider value={renew}>
      <VaultContext.Provider value={vault}>{children}</VaultContext.Provider>
    </RenewalContext.Provider>
  );
}

export function useVault(): DayVault {
  const vault = useContext(VaultContext);
  if (!vault) {
    throw new Error('a screen read the vault from outside the vault provider');
  }
  return vault;
}

/** What the delete screen calls once the keychain is empty, and nothing else has any use for. */
export function useRenewVault(): () => Promise<void> {
  const renew = useContext(RenewalContext);
  if (!renew) {
    throw new Error('a screen renewed the vault from outside the vault provider');
  }
  return renew;
}
