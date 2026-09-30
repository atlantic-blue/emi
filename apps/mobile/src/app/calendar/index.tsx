import { Redirect, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';

import { useDatabase } from '../../data/DatabaseProvider';
import { listCycles } from '../../data/cycleRepository';
import type { Database } from '../../data/database';
import { readProfile } from '../../data/profileRepository';
import { CalendarScreen } from '../../features/calendar/CalendarScreen';
import { dayParameter, theMonthAskedFor } from '../../features/calendar/askedMonth';
import { herMonth } from '../../features/calendar/herMonth';
import {
  type HerReading,
  type WhatTheSheetSays,
  whatTheSheetSays,
} from '../../features/calendar/theDaySheet';
import type { HerDay } from '../../features/cycle/herWeek';
import { recordedDays } from '../../features/cycle/rebuild';
import { useFirstRun } from '../../features/onboarding/FirstRunProvider';
import { addMonths, localDay, startOfMonth } from '../../features/onboarding/days';
import { defaultCycleLengthDays } from '../../features/onboarding/firstRun';
import type { DayVault } from '../../services/vault/dayVault';
import type { ProfileVault } from '../../services/vault/profileVault';
import { useProfileVault, useVault } from '../../services/vault/VaultProvider';

/**
 * The month she reads her own days back from. It opens on the month the address names, which is the
 * month the day she pressed on her week falls in, and on the month today falls in where the address
 * names none.
 *
 * The days are read out of the cycle cache and the day log on every look, because she reaches a day
 * from here and comes back to this screen after changing it.
 */
function herReading(
  database: Database,
  vault: DayVault,
  profiles: ProfileVault,
  today: string,
): HerReading {
  const herAnswers = readProfile(database, profiles);

  return {
    cycles: listCycles(database),
    records: recordedDays(database, vault.open),
    today,
    statedCycleLengthDays: herAnswers?.cycleLengthDays ?? defaultCycleLengthDays,
    ...(herAnswers?.periodLengthDays === undefined
      ? {}
      : { statedPeriodLengthDays: herAnswers.periodLengthDays }),
  };
}

/** The month she is reading, and the sheet for the day she pressed, from one reading of her days. */
interface HerMonth {
  readonly days: HerDay[];
  readonly sheetFor: (day: string) => WhatTheSheetSays | undefined;
}

function herMonthOf(
  database: Database,
  vault: DayVault,
  profiles: ProfileVault,
  today: string,
  month: string,
): HerMonth {
  const from = herReading(database, vault, profiles, today);
  const days = herMonth(from, month);

  return {
    days,
    sheetFor: (day) => {
      const hers = days.find((each) => each.day === day);

      return hers === undefined
        ? undefined
        : whatTheSheetSays(
            from,
            hers,
            from.records.find((record) => record.day === day),
          );
    },
  };
}

export default function CalendarRoute(): ReactNode {
  const database = useDatabase();
  const vault = useVault();
  const profiles = useProfileVault();
  const router = useRouter();
  const { isDone } = useFirstRun();
  const asked = useLocalSearchParams<Record<string, string>>()[dayParameter];
  const [today] = useState(() => localDay(new Date()));
  const month = theMonthAskedFor(asked) ?? startOfMonth(today);
  const [hers, setHers] = useState(() => herMonthOf(database, vault, profiles, today, month));
  // The day she pressed, and not what the sheet says about it: she comes back from that day
  // having changed it, and the sheet is worked out again from the days read on the way back.
  const [shePressed, setShePressed] = useState<string | undefined>(undefined);

  useFocusEffect(
    useCallback(() => {
      setHers(herMonthOf(database, vault, profiles, today, month));
    }, [database, month, profiles, today, vault]),
  );

  // The month travels in the address and nowhere else, so the month she was reading is the month
  // she comes back to from a day she opened in it.
  //
  // The entry is replaced rather than pushed, so the way back still belongs to the screen she
  // opened the month from however many months she moved through. A replaced entry stands the
  // screen up again on the month it names, which is also how her days come to be read for that
  // month rather than for the one she left.
  const sheMovesTo = useCallback(
    (to: string) => {
      router.replace(`/calendar?${dayParameter}=${to}`);
    },
    [router],
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
      days={hers.days}
      month={month}
      onBack={leave}
      onEarlierMonth={() => sheMovesTo(addMonths(month, -1))}
      onEditPeriod={() => router.push(`/calendar/period?${dayParameter}=${month}`)}
      onLaterMonth={() => sheMovesTo(addMonths(month, 1))}
      onOpenDay={(day) => router.push(`/day/${day}`)}
      onPressDay={setShePressed}
      onToday={() => router.replace('/')}
      today={today}
      {...(shePressed === undefined ? {} : { shePressed: hers.sheetFor(shePressed) })}
    />
  );
}
