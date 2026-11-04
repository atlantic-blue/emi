import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';

import { useDatabase } from '../data/DatabaseProvider';
import { highlightAddress } from '../features/highlight/highlights';
import { DayRefused } from '../features/log/DayRefused';
import { refusalFor } from '../features/log/editDay';
import { type PeriodAnswers, logPeriod, periodLogged } from '../features/log/logDay';
import { useFirstRun } from '../features/onboarding/FirstRunProvider';
import { localDay } from '../features/onboarding/days';
import { periodAnswersDiffer } from '../features/period/answers';
import { periodDayLabel } from '../features/period/copy';
import { PeriodPage } from '../features/period/PeriodPage';
import { periodAddress } from '../features/period/periodAddress';
import { useRescheduleHerReminder } from '../features/reminder/rescheduleHerReminder';
import { useVault } from '../services/vault/VaultProvider';

/**
 * The Period page of one day: today where the address names no day, and a past day where it names
 * one. A day ahead of her is refused, as every other day she opens is.
 *
 * A date she chooses replaces the page rather than pushing a new one, so Back still leaves to the
 * screen she opened it from.
 */
export default function PeriodRoute(): ReactNode {
  const database = useDatabase();
  const vault = useVault();
  const router = useRouter();
  const { isDone } = useFirstRun();
  const { day: asked } = useLocalSearchParams<{ day?: string }>();
  const [today] = useState(() => localDay(new Date()));
  const day = typeof asked === 'string' && asked !== '' ? asked : today;
  const refusal = refusalFor({ day, today });
  // A flow can start or close a period, which moves the forecast, so the reminder is worked out
  // again, as it is after the flow picker.
  const rescheduleTheReminder = useRescheduleHerReminder();

  const leave = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/');
  }, [router]);

  const save = useCallback(
    (answers: PeriodAnswers) => {
      const held = periodLogged(database, vault, day);

      if (periodAnswersDiffer(answers, held)) {
        logPeriod(database, vault, { day, answers, now: new Date() });
      }
      if (answers.flow !== held.flow) {
        rescheduleTheReminder();
      }
      leave();
    },
    [database, day, leave, rescheduleTheReminder, vault],
  );

  if (!isDone) {
    return <Redirect href="/onboarding/welcome" />;
  }

  if (refusal !== undefined) {
    return <DayRefused onBack={leave} refusal={refusal} />;
  }

  return (
    <PeriodPage
      date={day}
      day={periodDayLabel(day)}
      held={periodLogged(database, vault, day)}
      key={day}
      onBack={leave}
      onChooseDay={(chosen) => router.replace(periodAddress(chosen === today ? undefined : chosen))}
      onHighlight={(slug) => router.push(highlightAddress(slug))}
      onSave={save}
      today={today}
    />
  );
}
