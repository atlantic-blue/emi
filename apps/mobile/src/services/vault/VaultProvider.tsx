import { type ReactNode, createContext, useCallback, useContext, useEffect, useState } from 'react';

import { useDatabase } from '../../data/DatabaseProvider';
import { type HerVaults, runTheLaunchPasses } from '../../data/launchPasses';
import { LostKey, type LostKeyStage } from '../../features/lostKey/LostKey';
import { serverAccountDelete } from '../sync/deleteAccount';
import { type DayVault, dayVault } from './dayVault';
import { expoKeychain } from './keychain';
import { keyOnThisPhone } from './lostKey';
import { type ProfileVault, profileVault } from './profileVault';
import { phoneRandom, VaultKeyError } from './vaultKey';
import { deleteEverything, nothingIsLeft } from './wipe';

/** Her vaults, asked for rather than held, so the key they carry is the key the keychain holds. */
export type MakeHerVaults = () => Promise<HerVaults>;

export type { HerVaults };

function vaultsFor(key: Uint8Array): HerVaults {
  return { day: dayVault(key, phoneRandom), profile: profileVault(key, phoneRandom) };
}

const VaultContext = createContext<HerVaults | undefined>(undefined);
const MakingContext = createContext<MakeHerVaults | undefined>(undefined);

/**
 * The key reaches the screens from here. Reading the keychain is asynchronous, so nothing under
 * this renders until the key is in hand: a screen that drew her ring first would have to read her
 * days without it, and there is no way to read a day without the key.
 *
 * The two passes that need her key run here too, on the first launch that holds one, because this
 * is the first moment both the key and the database are open. The days she wrote before the
 * envelope existed are sealed, the cycle length she stated leaves the setting table, and the file
 * is written again so neither plain copy is left in it.
 */
export function VaultProvider({ children }: { readonly children: ReactNode }): ReactNode {
  const database = useDatabase();
  const [vaults, setVaults] = useState<HerVaults | undefined>(undefined);
  const [lostKey, setLostKey] = useState<LostKeyStage | undefined>(undefined);

  useEffect(() => {
    let stillMounted = true;

    void keyOnThisPhone(expoKeychain(), phoneRandom, database).then((held) => {
      if (!stillMounted) {
        return;
      }
      if (held.kind === 'lost') {
        setLostKey('ready');
        return;
      }
      const opened = vaultsFor(held.key);
      runTheLaunchPasses(database, opened, new Date());
      setVaults(opened);
    });

    return () => {
      stillMounted = false;
    };
  }, [database]);

  /**
   * Her vaults, built from whatever the keychain holds at the moment they are asked for, and from
   * a key made on the spot when it holds none.
   *
   * Two moments need that. After a delete the keychain is empty, so the key in memory here opens
   * rows that no longer exist and seals new ones under a key her next launch cannot find. At the
   * hold, the first run seals her answers, and it seals them under the key this hands back rather
   * than under the one this component happened to start with.
   */
  const makeHerVaults = useCallback(async () => {
    const held = await keyOnThisPhone(expoKeychain(), phoneRandom, database);

    if (held.kind === 'lost') {
      throw new VaultKeyError(
        'vault-key-is-lost',
        'this phone holds sealed rows and no key, and a new key would open none of them',
      );
    }
    const made = vaultsFor(held.key);

    setVaults(made);

    return made;
  }, [database]);

  /**
   * Her answer on the lost key screen. Everything goes, the way the delete screen takes it, and a
   * key is made only once the database holds nothing a new key would fail to open.
   */
  const onStartAgain = useCallback(() => {
    const keychain = expoKeychain();

    setLostKey('working');
    void deleteEverything(database, keychain, serverAccountDelete(keychain))
      .then(async (outcome) => {
        if (!nothingIsLeft(outcome)) {
          setLostKey('refused');
          return;
        }
        await makeHerVaults();
        setLostKey(undefined);
      })
      .catch(() => setLostKey('refused'));
  }, [database, makeHerVaults]);

  if (lostKey) {
    return <LostKey onStartAgain={onStartAgain} stage={lostKey} />;
  }

  if (!vaults) {
    return null;
  }

  return (
    <MakingContext.Provider value={makeHerVaults}>
      <VaultContext.Provider value={vaults}>{children}</VaultContext.Provider>
    </MakingContext.Provider>
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

/**
 * What the hold and the delete screen call. The first run writes under the vaults this returns,
 * and the delete screen throws away the ones it was holding.
 */
export function useHerVaultsMade(): MakeHerVaults {
  const make = useContext(MakingContext);
  if (!make) {
    throw new Error('a screen made her vaults from outside the vault provider');
  }
  return make;
}
