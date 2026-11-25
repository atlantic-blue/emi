import { useEffect } from 'react';

import { useDatabase } from '../../data/DatabaseProvider';
import { theSettingTableHolds } from '../../services/store/theAnswerThePhoneHolds';
import {
  theEntitlementWhenSheOpens,
  watchForATransactionElsewhere,
} from '../../services/store/theEntitlementWhenSheOpens';
import { theStoreOnThisPhone } from '../../services/store/theStoreOnThisPhone';
import { theFilingOnThisPhone } from './theFilingOnThisPhone';

/**
 * Draws nothing, and holds nothing on screen. It asks the App Store what she holds when Emi opens,
 * and it keeps watching for the transactions that happen with nobody pressing anything: a renewal,
 * a purchase on another device, a refund. Each one is filed with the server.
 *
 * It is mounted above the screens rather than inside one, because the answer is the same answer
 * everywhere and the first screen she lands on is not always the same screen.
 *
 * The answer this writes is the answer the end of the first run reads, so a woman who already pays
 * walks past the paywall.
 */
export function TheEntitlementRefresh(): null {
  const database = useDatabase();

  useEffect(() => {
    const holding = theSettingTableHolds(database);
    const now = (): Date => new Date();
    const files = theFilingOnThisPhone(database, now);

    void theEntitlementWhenSheOpens(theStoreOnThisPhone, holding, now, files);

    const watching = watchForATransactionElsewhere(theStoreOnThisPhone, holding, now, files);

    return () => watching.stop();
  }, [database]);

  return null;
}
