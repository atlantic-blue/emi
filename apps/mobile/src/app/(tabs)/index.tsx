import type { Feeling, Goal, Regularity } from '@emi/crypto';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';

import { useDatabase } from '../../data/DatabaseProvider';
import { listCycles } from '../../data/cycleRepository';
import { readProfile } from '../../data/profileRepository';
import type { Database } from '../../data/database';
import { type DayOfHerWeek, herWeek } from '../../features/cycle/herWeek';
import { recordedDays } from '../../features/cycle/rebuild';
import { type RingInput, ringInputFor } from '../../features/cycle/ringInput';
import { forecastOf } from '../../features/forecast/fromCache';
import { groupParameter, painGroup } from '../../features/log/askedGroup';
import { HomeScreen } from '../../features/home/HomeScreen';
import { type MeasuredNumber, herNumbers } from '../../features/home/herNumbers';
import { useFirstRun } from '../../features/onboarding/FirstRunProvider';
import { localDay } from '../../features/onboarding/days';
import type { DayVault } from '../../services/vault/dayVault';
import type { ProfileVault } from '../../services/vault/profileVault';
import { useProfileVault, useVault } from '../../services/vault/VaultProvider';
import { defaultCycleLengthDays } from '../../features/onboarding/firstRun';

interface Shown {
  readonly ring: RingInput | undefined;
  /** Her week, Monday to Sunday, read out of the same rows the ring is built from. */
  readonly week: readonly DayOfHerWeek[];
  readonly forecast: ReturnType<typeof forecastOf>;
  readonly cycleLengthDays: number;
  /** Her name, where she gave one, which is the only thing the home screen greets her by. */
  readonly name: string | undefined;
  /** How steady she said her cycle is, where she answered, which adds one sentence and no more. */
  readonly regularity: Regularity | undefined;
  /** How she said her period feels, where she answered, which adds one line and no more. */
  readonly feeling: Feeling | undefined;
  /** What she asked Emi for, where she answered, which chooses the cards under the forecast. */
  readonly goals: readonly Goal[] | undefined;
  /** Her three measurements beside the published figures, or nothing until her days carry them. */
  readonly numbers: readonly MeasuredNumber[] | undefined;
}

/**
 * What she is looking at, read back out of the cycle cache. The ring and the sentence under it are
 * built from one read of the same rows, so the screen cannot draw one cycle and name another.
 */
function whatSheIsLookingAt(
  database: Database,
  vault: DayVault,
  profiles: ProfileVault,
  today: string,
): Shown {
  const cycles = listCycles(database);
  // One read of the sealed profile, so the length the ring is drawn from and the name at the top
  // of the screen are the same answers opened once rather than twice.
  const herAnswers = readProfile(database, profiles);
  const stated = herAnswers?.cycleLengthDays ?? defaultCycleLengthDays;
  // One forecast, read by the sentence under the ring and by the variation row, so the spread the
  // range is drawn from and the spread she reads cannot be two different numbers.
  const forecast = forecastOf(cycles, stated);
  // One read of her days for the ring and for the strip. Reading them twice would let the two
  // stand on different rows, which is the one thing the strip may never do.
  const readBack = {
    cycles,
    records: recordedDays(database, vault.open),
    today,
    statedCycleLengthDays: stated,
    statedPeriodLengthDays: herAnswers?.periodLengthDays,
  };

  return {
    ring: ringInputFor(readBack),
    week: herWeek(readBack),
    forecast,
    numbers: herNumbers(cycles, forecast),
    cycleLengthDays: stated,
    name: herAnswers?.name,
    regularity: herAnswers?.regularity,
    feeling: herAnswers?.feeling,
    goals: herAnswers?.goals,
  };
}

/** Nothing recorded means nothing to draw, so a woman who has not answered yet is sent to answer. */
export default function HomeRoute(): ReactNode {
  const database = useDatabase();
  const vault = useVault();
  const profiles = useProfileVault();
  const router = useRouter();
  const { isDone, tourIsDone } = useFirstRun();
  const [today] = useState(() => localDay(new Date()));
  const [shown, setShown] = useState(() => whatSheIsLookingAt(database, vault, profiles, today));

  // She logs a day and comes back to this screen rather than to a new one, so the rows are read
  // again every time it is looked at. Reading them once at the first render would leave the ring
  // drawing the cycle she was in before she wrote to it.
  useFocusEffect(
    useCallback(() => {
      setShown(whatSheIsLookingAt(database, vault, profiles, today));
    }, [database, profiles, today, vault]),
  );

  // The tour comes first, because a woman asked for the day her last period started has been
  // told nothing about what the answer buys her.
  if (!tourIsDone) {
    return <Redirect href="/onboarding/tour" />;
  }

  if (!isDone) {
    return <Redirect href="/onboarding/welcome" />;
  }

  return (
    <HomeScreen
      cycleLengthDays={shown.cycleLengthDays}
      feeling={shown.feeling}
      forecast={shown.forecast}
      goals={shown.goals}
      name={shown.name}
      numbers={shown.numbers}
      onExport={() => router.push('/export')}
      onLogPain={() => router.push(`/log?${groupParameter}=${painGroup}`)}
      onPeriod={() => router.push('/log')}
      onSymptoms={() => router.push('/log')}
      regularity={shown.regularity}
      ring={shown.ring}
      today={today}
      week={shown.week}
    />
  );
}
