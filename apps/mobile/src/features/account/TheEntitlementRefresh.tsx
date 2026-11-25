import { useEffect } from 'react';

import { useDatabase } from '../../data/DatabaseProvider';
import { theSettingTableHolds } from '../../services/store/theAnswerThePhoneHolds';
import {
  theEntitlementWhenSheOpens,
  watchForATransactionElsewhere,
} from '../../services/store/theEntitlementWhenSheOpens';
import { theStoreOnThisPhone } from '../../services/store/theStoreOnThisPhone';

/**
 * Draws nothing, and holds nothing on screen. It asks the App Store what she holds when Emi opens,
 * and it keeps watching for the transactions that happen with nobody pressing anything: a renewal,
 * a purchase on another device, a refund.
 *
 * It is mounted above the screens rather than inside one, because the answer is the same answer
 * everywhere and the first screen she lands on is not always the same screen.
 *
 * Nothing reads the answer yet. The write gate and the paywall are the steps that do.
 */
export function TheEntitlementRefresh(): null {
  const database = useDatabase();

  useEffect(() => {
    const holding = theSettingTableHolds(database);
    const now = (): Date => new Date();

    void theEntitlementWhenSheOpens(theStoreOnThisPhone, holding, now);

    const watching = watchForATransactionElsewhere(theStoreOnThisPhone, holding, now);

    return () => watching.stop();
  }, [database]);

  return null;
}
