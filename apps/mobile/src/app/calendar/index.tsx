import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';

import { useDatabase } from '../../data/DatabaseProvider';
import { listCycles } from '../../data/cycleRepository';
import type { Database } from '../../data/database';
import { readProfile } from '../../data/profileRepository';
import { CalendarScreen } from '../../features/calendar/CalendarScreen';
import { herMonth } from '../../features/calendar/herMonth';
import type { HerDay } from '../../features/cycle/herWeek';
import { recordedDays } from '../../features/cycle/rebuild';
import { useFirstRun } from '../../features/onboarding/FirstRunProvider';
import { localDay, startOfMonth } from '../../features/onboarding/days';
import { defaultCycleLengthDays } from '../../features/onboarding/firstRun';
import type { DayVault } from '../../services/vault/dayVault';
import type { ProfileVault } from '../../services/vault/profileVault';
import { useProfileVault, useVault } from '../../services/vault/VaultProvider';

/**
 * The month she reads her own days back from. It opens on the month today falls in, which is the
 * month she is most likely to be correcting.
 *
 * The days are read out of the cycle cache and the day log on every look, because she reaches a day
 * from here and comes back to this screen after changing it.
 */
function herDaysOfTheMonth(
  database: Database,
  vault: DayVault,
  profiles: ProfileVault,
  today: string,
): HerDay[] {
  const herAnswers = readProfile(database, profiles);

  return herMonth(
    {
      cycles: listCycles(database),
      records: recordedDays(database, vault.open),
      today,
      statedCycleLengthDays: herAnswers?.cycleLengthDays ?? defaultCycleLengthDays,
      ...(herAnswers?.periodLengthDays === undefined
        ? {}
        : { statedPeriodLengthDays: herAnswers.periodLengthDays }),
    },
    startOfMonth(today),
  );
}

export default function CalendarRoute(): ReactNode {
  const database = useDatabase();
  const vault = useVault();
  const profiles = useProfileVault();
  const router = useRouter();
  const { isDone } = useFirstRun();
  const [today] = useState(() => localDay(new Date()));
  const [days, setDays] = useState(() => herDaysOfTheMonth(database, vault, profiles, today));

  useFocusEffect(
    useCallback(() => {
      setDays(herDaysOfTheMonth(database, vault, profiles, today));
    }, [database, profiles, today, vault]),
  );

  const leave = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/');
  }, [router]);

  if (!isDone) {
    return <Redirect href="/onboarding/welcome" />;
  }

  return (
    <CalendarScreen
      days={days}
      month={startOfMonth(today)}
      onBack={leave}
      onToday={() => router.replace('/')}
      today={today}
    />
  );
}
