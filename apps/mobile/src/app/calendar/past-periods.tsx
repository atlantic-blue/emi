import { Redirect, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';

import { useDatabase } from '../../data/DatabaseProvider';
import { listCycles } from '../../data/cycleRepository';
import { recordedDays } from '../../features/cycle/rebuild';
import { useFirstRun } from '../../features/onboarding/FirstRunProvider';
import { localDay } from '../../features/onboarding/days';
import { oldestPeriodStart } from '../../features/onboarding/firstRun';
import { PastPeriodsScreen } from '../../features/pastPeriods/PastPeriodsScreen';
import {
  type PastPeriod,
  periodsAfterGiving,
  periodsAfterRemoving,
} from '../../features/pastPeriods/pastPeriods';
import {
  pastPeriodsCanSave,
  savePastPeriods,
  thePeriodsEmiHolds,
} from '../../features/pastPeriods/savePastPeriods';
import { useRescheduleHerReminder } from '../../features/reminder/rescheduleHerReminder';
import { useVault } from '../../services/vault/VaultProvider';

/**
 * Her last three periods, added outside the first run. The forecast popup opens it. The periods
 * Emi holds are read once, when the screen stands up, because they are what the save counts its
 * difference from.
 */
export default function PastPeriodsRoute(): ReactNode {
  const database = useDatabase();
  const vault = useVault();
  const router = useRouter();
  const { isDone } = useFirstRun();
  const [today] = useState(() => localDay(new Date()));
  const [held] = useState(() =>
    thePeriodsEmiHolds(recordedDays(database, vault.open), listCycles(database), today),
  );
  const [periods, setPeriods] = useState<readonly PastPeriod[]>(() =>
    held.map((each) => each.period),
  );
  const rescheduleTheReminder = useRescheduleHerReminder();
  const newestHeld = held[0]?.period.startedOn;
  const oldestOffered = oldestPeriodStart(today);
  const oldest =
    newestHeld !== undefined && newestHeld < oldestOffered ? newestHeld : oldestOffered;

  const leave = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/calendar');
  }, [router]);

  const save = useCallback(() => {
    savePastPeriods(database, vault, { held, now: new Date(), periods, today });
    rescheduleTheReminder();
    leave();
  }, [database, held, leave, periods, rescheduleTheReminder, today, vault]);

  if (!isDone) {
    return <Redirect href="/onboarding/welcome" />;
  }

  return (
    <PastPeriodsScreen
      canSave={pastPeriodsCanSave(held, periods, today)}
      oldest={oldest}
      onCancel={leave}
      onGive={(row, period) => setPeriods((given) => periodsAfterGiving(given, row, period))}
      onRemove={(row) => setPeriods((given) => periodsAfterRemoving(given, row))}
      onSave={save}
      periods={periods}
      today={today}
    />
  );
}
