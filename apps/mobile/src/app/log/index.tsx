import { recordFromBytes } from '@emi/crypto';
import type { Flow } from '@emi/cycle';
import { Redirect, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';

import { useDatabase } from '../../data/DatabaseProvider';
import { listCycles } from '../../data/cycleRepository';
import type { Database } from '../../data/database';
import { recordedDays } from '../../features/cycle/rebuild';
import { type RingInput, ringInputFor } from '../../features/cycle/ringInput';
import { LogFlow } from '../../features/log/LogFlow';
import { flowLogged, logFlow } from '../../features/log/logDay';
import { useFirstRun } from '../../features/onboarding/FirstRunProvider';
import { localDay } from '../../features/onboarding/days';
import { defaultCycleLengthDays, statedCycleLengthDays } from '../../features/onboarding/firstRun';

interface Shown {
  readonly chosen: Flow | undefined;
  readonly ring: RingInput | undefined;
}

/**
 * What she is looking at, read back out of the database. Nothing is patched in memory, because a
 * flow she logs can move the cycle she is in, and the ring then has to be drawn from the cycle
 * cache rather than from the press that changed it.
 */
function whatSheIsLookingAt(database: Database, today: string): Shown {
  return {
    chosen: flowLogged(database, today),
    ring: ringInputFor({
      cycles: listCycles(database),
      records: recordedDays(database, recordFromBytes),
      today,
      statedCycleLengthDays: statedCycleLengthDays(database) ?? defaultCycleLengthDays,
    }),
  };
}

export default function LogFlowRoute(): ReactNode {
  const database = useDatabase();
  const router = useRouter();
  const { isDone } = useFirstRun();
  const [today] = useState(() => localDay(new Date()));
  const [shown, setShown] = useState(() => whatSheIsLookingAt(database, today));

  const pick = useCallback(
    (flow: Flow) => {
      logFlow(database, { day: today, flow, now: new Date() });
      setShown(whatSheIsLookingAt(database, today));
    },
    [database, today],
  );

  if (!isDone) {
    return <Redirect href="/onboarding/welcome" />;
  }

  return (
    <LogFlow
      chosen={shown.chosen}
      day={today}
      onDone={() => router.back()}
      onPick={pick}
      ring={shown.ring}
      today={today}
    />
  );
}
