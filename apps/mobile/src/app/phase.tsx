import { Redirect, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useCallback, useReducer, useState } from 'react';

import { useDatabase } from '../data/DatabaseProvider';
import { listCycles } from '../data/cycleRepository';
import { recordedDays } from '../features/cycle/rebuild';
import { opensOnParameter, theSymptoms } from '../features/log/askedGroup';
import { dayLogged, logDiary } from '../features/log/logDay';
import {
  defaultCycleLengthDays,
  statedCycleLengthDays,
  statedPeriodLengthDays,
} from '../features/onboarding/firstRun';
import { useFirstRun } from '../features/onboarding/FirstRunProvider';
import { localDay } from '../features/onboarding/days';
import { type DiaryChip, listAfterPress } from '../features/phase/diary';
import { herPastPhase } from '../features/phase/pastPhases';
import { PhasePage } from '../features/phase/PhasePage';
import { phaseNowFor } from '../features/phase/phaseNow';
import { useProfileVault, useVault } from '../services/vault/VaultProvider';

/**
 * The page of the phase she is in today, which the phase card on Today opens. Every render reads
 * her days again, because a chip she presses here writes to the day the page reads.
 */
export default function PhaseRoute(): ReactNode {
  const database = useDatabase();
  const vault = useVault();
  const profiles = useProfileVault();
  const router = useRouter();
  const { isDone } = useFirstRun();
  const [today] = useState(() => localDay(new Date()));
  const [, sheWrote] = useReducer((writes: number) => writes + 1, 0);

  const leave = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/');
  }, [router]);

  const press = useCallback(
    (chip: DiaryChip) => {
      const held = dayLogged(database, vault, today);
      logDiary(database, vault, {
        day: today,
        change: { [chip.field]: listAfterPress(held, chip) },
        now: new Date(),
      });
      sheWrote();
    },
    [database, today, vault],
  );

  const note = useCallback(
    (written: string) => {
      if (written === (dayLogged(database, vault, today)?.note ?? '')) {
        return;
      }
      logDiary(database, vault, { day: today, change: { note: written }, now: new Date() });
      sheWrote();
    },
    [database, today, vault],
  );

  if (!isDone) {
    return <Redirect href="/onboarding/welcome" />;
  }

  const cycles = listCycles(database);
  const records = recordedDays(database, vault.open);
  const now = phaseNowFor({
    cycles,
    records,
    today,
    statedCycleLengthDays: statedCycleLengthDays(database, profiles) ?? defaultCycleLengthDays,
    statedPeriodLengthDays: statedPeriodLengthDays(database, profiles),
  });

  // With no period recorded there is no phase to name, so she goes back to the screen that asks.
  if (now === undefined) {
    return <Redirect href="/" />;
  }

  return (
    <PhasePage
      now={now}
      onAllSymptoms={() => router.push(`/log?${opensOnParameter}=${theSymptoms}`)}
      onBack={leave}
      onNote={note}
      onPress={press}
      past={herPastPhase({ cycles, records, phase: now.phase })}
      today={records.find((record) => record.day === today)}
    />
  );
}
