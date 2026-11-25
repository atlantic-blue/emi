import { useEffect } from 'react';

import { useDatabase } from '../../data/DatabaseProvider';
import { fetchSender } from '../../services/sync/send';
import { theSettingTableHolds } from '../../services/store/theAnswerThePhoneHolds';
import {
  type FilesWhatTheStoreNamed,
  theEntitlementWhenSheOpens,
  watchForATransactionElsewhere,
} from '../../services/store/theEntitlementWhenSheOpens';
import {
  filesEachPurchase,
  theSettingTableHoldsTheFiling,
} from '../../services/store/theFilingOfEachPurchase';
import { theStoreOnThisPhone } from '../../services/store/theStoreOnThisPhone';
import { expoKeychain } from '../../services/vault/keychain';

/**
 * Draws nothing, and holds nothing on screen. It asks the App Store what she holds when Emi opens,
 * and it keeps watching for the transactions that happen with nobody pressing anything: a renewal,
 * a purchase on another device, a refund. Each one is filed with the server.
 *
 * It is mounted above the screens rather than inside one, because the answer is the same answer
 * everywhere and the first screen she lands on is not always the same screen.
 *
 * The paywall is the step that puts any of this on a screen.
 */
export function TheEntitlementRefresh(): null {
  const database = useDatabase();

  useEffect(() => {
    const holding = theSettingTableHolds(database);
    const now = (): Date => new Date();
    const files: FilesWhatTheStoreNamed = (these) =>
      filesEachPurchase(these, {
        holding: theSettingTableHoldsTheFiling(database),
        keychain: expoKeychain(),
        send: fetchSender,
        now,
      });

    void theEntitlementWhenSheOpens(theStoreOnThisPhone, holding, now, files);

    const watching = watchForATransactionElsewhere(theStoreOnThisPhone, holding, now, files);

    return () => watching.stop();
  }, [database]);

  return null;
}
