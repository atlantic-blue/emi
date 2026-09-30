import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';

import { useDatabase } from '../../data/DatabaseProvider';
import { listCycles } from '../../data/cycleRepository';
import type { Database } from '../../data/database';
import { readProfile } from '../../data/profileRepository';
import { EditPeriodScreen } from '../../features/calendar/PeriodRangePicker';
import { dayParameter, theMonthAskedFor } from '../../features/calendar/askedMonth';
import { herMonth } from '../../features/calendar/herMonth';
import { savePeriodRange, thePeriodEmiHoldsIn } from '../../features/calendar/savePeriod';
import type { HerDay } from '../../features/cycle/herWeek';
import { recordedDays } from '../../features/cycle/rebuild';
import { useFirstRun } from '../../features/onboarding/FirstRunProvider';
import { localDay, startOfMonth } from '../../features/onboarding/days';
import { defaultCycleLengthDays } from '../../features/onboarding/firstRun';
import type { DayVault } from '../../services/vault/dayVault';
import type { ProfileVault } from '../../services/vault/profileVault';
import { useProfileVault, useVault } from '../../services/vault/VaultProvider';

/**
 * The whole period, corrected in one action. It opens on the month the address names, which is the
 * month she was reading, so the period she corrects is the one drawn in front of her.
 *
 * The days Emi holds are read once, when the screen stands up, because they are what the save
 * counts its difference from. Reading them again on every press would compare her presses against
 * themselves.
 */
interface HerPeriod {
  readonly days: readonly HerDay[];
  /** The days of that month she recorded bleeding on, which arrive ticked. */
  readonly held: readonly string[];
}

function herPeriodIn(
  database: Database,
  vault: DayVault,
  profiles: ProfileVault,
  today: string,
  month: string,
): HerPeriod {
  const herAnswers = readProfile(database, profiles);
  const records = recordedDays(database, vault.open);

  return {
    days: herMonth(
      {
        cycles: listCycles(database),
        records,
        today,
        statedCycleLengthDays: herAnswers?.cycleLengthDays ?? defaultCycleLengthDays,
        ...(herAnswers?.periodLengthDays === undefined
          ? {}
          : { statedPeriodLengthDays: herAnswers.periodLengthDays }),
      },
      month,
    ),
    held: thePeriodEmiHoldsIn(records, month),
  };
}

export default function EditPeriodRoute(): ReactNode {
  const database = useDatabase();
  const vault = useVault();
  const profiles = useProfileVault();
  const router = useRouter();
  const { isDone } = useFirstRun();
  const asked = useLocalSearchParams<Record<string, string>>()[dayParameter];
  const [today] = useState(() => localDay(new Date()));
  const month = theMonthAskedFor(asked) ?? startOfMonth(today);
  const [hers] = useState(() => herPeriodIn(database, vault, profiles, today, month));
  const [ticked, setTicked] = useState<readonly string[]>(() => hers.held);

  const leave = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(`/calendar?${dayParameter}=${month}`);
  }, [month, router]);

  const save = useCallback(() => {
    savePeriodRange(database, vault, { held: hers.held, now: new Date(), ticked, today });
    leave();
  }, [database, hers.held, leave, ticked, today, vault]);

  const toggle = useCallback((day: string) => {
    setTicked((hersNow) =>
      hersNow.includes(day) ? hersNow.filter((each) => each !== day) : [...hersNow, day].sort(),
    );
  }, []);

  if (!isDone) {
    return <Redirect href="/onboarding/welcome" />;
  }

  return (
    <EditPeriodScreen
      days={hers.days}
      held={hers.held}
      month={month}
      onCancel={leave}
      onSave={save}
      onToggle={toggle}
      ticked={ticked}
      today={today}
    />
  );
}
