import { useRouter } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import { useDatabase } from '../../data/DatabaseProvider';
import { theFilingOnThisPhone } from '../../features/account/theFilingOnThisPhone';
import { Paywall } from '../../features/paywall/Paywall';
import { theScreenSheOpensEmiOn } from '../../features/paywall/whereSheGoesNext';
import { theSettingTableHolds } from '../../services/store/theAnswerThePhoneHolds';
import { type APlanInTheStore, thePlansInTheStore } from '../../services/store/thePlans';
import { theStoreOnThisPhone } from '../../services/store/theStoreOnThisPhone';
import { theStatesAWriteIsRefusedIn } from '../../services/store/theWriteGate';

/**
 * The one place Emi is sold. Her answers are already written when she arrives, so a woman who
 * closes Emi here comes back to a product that knows her.
 *
 * A purchase and a restore are the two ways off it, and both land where the first run used to land.
 * The home screen replaces the paywall rather than sitting on top of it, so nothing she presses
 * afterwards walks her back into a screen that sells her something she has bought.
 *
 * A woman who paid before is sold the plan at its price, with no free month, and she reaches her
 * export and her delete from here. Both screens come back to this one, because the way back is
 * the press each of them already draws.
 *
 * The plans are asked of the store here rather than a screen earlier, because the store answers
 * over the network and a question asked at the hold would hold up a write that needs nothing.
 */
export default function PaywallRoute(): ReactNode {
  const router = useRouter();
  const database = useDatabase();
  const [plans, setPlans] = useState<readonly APlanInTheStore[]>([]);
  const now = useCallback((): Date => new Date(), []);
  const holding = useMemo(() => theSettingTableHolds(database), [database]);
  const files = useMemo(() => theFilingOnThisPhone(database, now), [database, now]);
  const state = holding.read()?.state ?? null;
  const sheHasPaidBefore = state !== null && theStatesAWriteIsRefusedIn.includes(state);

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
      month={sheHasPaidBefore ? 'spent' : 'hers'}
      now={now}
      onDelete={sheHasPaidBefore ? () => router.push('/settings/delete') : undefined}
      onExport={sheHasPaidBefore ? () => router.push('/export') : undefined}
      onPaid={() => router.replace(theScreenSheOpensEmiOn)}
      openThePage={(address) => void openBrowserAsync(address)}
      plans={plans}
    />
  );
}
