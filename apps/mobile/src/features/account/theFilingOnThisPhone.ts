import type { Database } from '../../data/database';
import { fetchSender } from '../../services/sync/send';
import type { FilesWhatTheStoreNamed } from '../../services/store/theEntitlementWhenSheOpens';
import {
  filesEachPurchase,
  theSettingTableHoldsTheFiling,
} from '../../services/store/theFilingOfEachPurchase';
import { expoKeychain } from '../../services/vault/keychain';

/**
 * Contract PAY-3, bound to this phone: the setting table, the keychain, the network and the clock.
 *
 * The launch read and the paywall both file what the store named, and a second copy of this
 * binding would let one of them file against a different row or sign with a different key.
 */
export function theFilingOnThisPhone(database: Database, now: () => Date): FilesWhatTheStoreNamed {
  return (these) =>
    filesEachPurchase(these, {
      holding: theSettingTableHoldsTheFiling(database),
      keychain: expoKeychain(),
      send: fetchSender,
      now,
    });
}
