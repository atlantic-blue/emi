import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';

import { useDatabase } from '../data/DatabaseProvider';
import { listCycles } from '../data/cycleRepository';
import type { Database } from '../data/database';
import { recordedDays } from '../features/cycle/rebuild';
import { type RingInput, ringInputFor } from '../features/cycle/ringInput';
import { forecastOf } from '../features/forecast/fromCache';
import { HomeScreen } from '../features/home/HomeScreen';
import { useFirstRun } from '../features/onboarding/FirstRunProvider';
import { localDay } from '../features/onboarding/days';
import type { DayVault } from '../services/vault/dayVault';
import { useVault } from '../services/vault/VaultProvider';
import { defaultCycleLengthDays, statedCycleLengthDays } from '../features/onboarding/firstRun';

interface Shown {
  readonly ring: RingInput | undefined;
  readonly forecast: ReturnType<typeof forecastOf>;
  readonly cycleLengthDays: number;
}

/**
 * What she is looking at, read back out of the cycle cache. The ring and the sentence under it are
 * built from one read of the same rows, so the screen cannot draw one cycle and name another.
 */
function whatSheIsLookingAt(database: Database, vault: DayVault, today: string): Shown {
  const cycles = listCycles(database);

  return {
    ring: ringInputFor({
      cycles,
      records: recordedDays(database, vault.open),
      today,
      statedCycleLengthDays: statedCycleLengthDays(database) ?? defaultCycleLengthDays,
    }),
    forecast: forecastOf(cycles),
    cycleLengthDays: statedCycleLengthDays(database) ?? defaultCycleLengthDays,
  };
}

/** Nothing recorded means nothing to draw, so a woman who has not answered yet is sent to answer. */
export default function HomeRoute(): ReactNode {
  const database = useDatabase();
  const vault = useVault();
  const router = useRouter();
  const { isDone } = useFirstRun();
  const [today] = useState(() => localDay(new Date()));
  const [shown, setShown] = useState(() => whatSheIsLookingAt(database, vault, today));

  // She logs a day and comes back to this screen rather than to a new one, so the rows are read
  // again every time it is looked at. Reading them once at the first render would leave the ring
  // drawing the cycle she was in before she wrote to it.
  useFocusEffect(
    useCallback(() => {
      setShown(whatSheIsLookingAt(database, vault, today));
    }, [database, today, vault]),
  );

  if (!isDone) {
    return <Redirect href="/onboarding/welcome" />;
  }

  return (
    <HomeScreen
      cycleLengthDays={shown.cycleLengthDays}
      forecast={shown.forecast}
      onExport={() => router.push('/export')}
      onHistory={() => router.push('/history')}
      onLogToday={() => router.push('/log')}
      ring={shown.ring}
    />
  );
}
