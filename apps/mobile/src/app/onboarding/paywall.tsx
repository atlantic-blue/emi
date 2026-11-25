import { useRouter } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import { useDatabase } from '../../data/DatabaseProvider';
import { theFilingOnThisPhone } from '../../features/account/theFilingOnThisPhone';
import { Paywall } from '../../features/paywall/Paywall';
import { theSettingTableHolds } from '../../services/store/theAnswerThePhoneHolds';
import { type APlanInTheStore, thePlansInTheStore } from '../../services/store/thePlans';
import { theStoreOnThisPhone } from '../../services/store/theStoreOnThisPhone';

/**
 * The last screen of the first run, and the one place Emi is sold. Her answers are already written
 * when she arrives, so a woman who closes Emi here comes back to a product that knows her.
 *
 * A purchase and a restore are the two ways off it, and both land where the hold used to land. The
 * home screen replaces the paywall rather than sitting on top of it, so nothing she presses
 * afterwards walks her back into a screen that sells her something she has bought.
 *
 * The plans are asked of the store here rather than at the hold, because the store answers over
 * the network and a question asked a screen earlier would hold up a write that needs nothing.
 */
export default function PaywallRoute(): ReactNode {
  const router = useRouter();
  const database = useDatabase();
  const [plans, setPlans] = useState<readonly APlanInTheStore[]>([]);
  const now = useCallback((): Date => new Date(), []);
  const holding = useMemo(() => theSettingTableHolds(database), [database]);
  const files = useMemo(() => theFilingOnThisPhone(database, now), [database, now]);

  // A store that answers after she has left would set state on a screen that is gone, and a store
  // that cannot be reached leaves the list empty rather than taking the screen down.
  useEffect(() => {
    let sheIsStillHere = true;

    void thePlansInTheStore(theStoreOnThisPhone)
      .then((named) => {
        if (sheIsStillHere) {
          setPlans(named.plans);
        }
      })
      .catch(() => undefined);

    return () => {
      sheIsStillHere = false;
    };
  }, []);

  return (
    <Paywall
      buying={theStoreOnThisPhone}
      files={files}
      holding={holding}
      now={now}
      onPaid={() => router.replace('/')}
      openThePage={(address) => void openBrowserAsync(address)}
      plans={plans}
    />
  );
}
