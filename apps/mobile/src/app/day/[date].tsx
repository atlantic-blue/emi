import type { Flow } from '@emi/cycle';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useCallback, useReducer, useState } from 'react';

import { useDatabase } from '../../data/DatabaseProvider';
import { ringNow } from '../../features/cycle/ringNow';
import { DayRefused } from '../../features/log/DayRefused';
import { LogFlow } from '../../features/log/LogFlow';
import { editFlow, flowOn, refusalFor, unexpectedOn } from '../../features/log/editDay';
import { useFirstRun } from '../../features/onboarding/FirstRunProvider';
import { localDay } from '../../features/onboarding/days';
import { useVault } from '../../services/vault/VaultProvider';

/**
 * A day she already lived, opened from its own address. The ring beside the picker is the cycle she
 * is in today rather than a ring for that day, because what a corrected Tuesday changes is where
 * she stands now.
 */
export default function DayRoute(): ReactNode {
  const database = useDatabase();
  const vault = useVault();
  const router = useRouter();
  const { isDone } = useFirstRun();
  const { date } = useLocalSearchParams<{ date: string }>();
  const [today] = useState(() => localDay(new Date()));
  // A write lands in the database, which React cannot see, so the write says it happened and the
  // day and the ring are read again on the render that follows.
  const [, sheWrote] = useReducer((writes: number) => writes + 1, 0);

  const day = String(date ?? '');
  const refusal = refusalFor({ day, today });

  const leave = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/');
  }, [router]);

  const pick = useCallback(
    (flow: Flow) => {
      editFlow(database, vault, {
        day,
        flow,
        bleedingIsUnexpected: unexpectedOn(database, vault, { day, today }),
        now: new Date(),
        today,
      });
      sheWrote();
    },
    [database, day, today, vault],
  );

  // The write is the whole day, so a mark needs the flow it belongs to. A day she logged no flow
  // on has no bleeding to mark.
  const mark = useCallback(
    (marked: boolean) => {
      const flow = flowOn(database, vault, { day, today });

      if (flow === undefined) {
        return;
      }

      editFlow(database, vault, {
        day,
        flow,
        bleedingIsUnexpected: marked,
        now: new Date(),
        today,
      });
      sheWrote();
    },
    [database, day, today, vault],
  );

  if (!isDone) {
    return <Redirect href="/onboarding/welcome" />;
  }

  if (refusal !== undefined) {
    return <DayRefused onBack={leave} refusal={refusal} />;
  }

  return (
    <LogFlow
      chosen={flowOn(database, vault, { day, today })}
      day={day}
      marked={unexpectedOn(database, vault, { day, today })}
      onDone={leave}
      onMark={mark}
      onPick={pick}
      ring={ringNow(database, vault, today)}
      today={today}
    />
  );
}
