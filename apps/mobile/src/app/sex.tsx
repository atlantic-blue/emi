import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';

import { useDatabase } from '../data/DatabaseProvider';
import { listCycles } from '../data/cycleRepository';
import { isFertileOn, theFertileWindowOn } from '../features/calendar/herMonthPhases';
import type { RingInputFrom } from '../features/cycle/ringInput';
import { recordedDays } from '../features/cycle/rebuild';
import { highlightAddress } from '../features/highlight/highlights';
import { DayRefused } from '../features/log/DayRefused';
import { refusalFor } from '../features/log/editDay';
import { type SexAnswers, logSex, sexLogged } from '../features/log/logDay';
import {
  defaultCycleLengthDays,
  statedCycleLengthDays,
  statedPeriodLengthDays,
} from '../features/onboarding/firstRun';
import { useFirstRun } from '../features/onboarding/FirstRunProvider';
import { localDay } from '../features/onboarding/days';
import { answersDiffer } from '../features/sex/answers';
import { fertileNote, sexDayHeading, sexQuestion } from '../features/sex/copy';
import { SexPage } from '../features/sex/SexPage';
import { useProfileVault, useVault } from '../services/vault/VaultProvider';

/**
 * The Sex page of one day: today where the address names no day, and a past day where it names
 * one. A day ahead of her is refused, as every other day she opens is.
 */
export default function SexRoute(): ReactNode {
  const database = useDatabase();
  const vault = useVault();
  const profiles = useProfileVault();
  const router = useRouter();
  const { isDone } = useFirstRun();
  const { day: asked } = useLocalSearchParams<{ day?: string }>();
  const [today] = useState(() => localDay(new Date()));
  const day = typeof asked === 'string' && asked !== '' ? asked : today;
  const refusal = refusalFor({ day, today });

  const leave = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/');
  }, [router]);

  const save = useCallback(
    (answers: SexAnswers) => {
      if (answersDiffer(answers, sexLogged(database, vault, day))) {
        logSex(database, vault, { day, answers, now: new Date() });
      }
      leave();
    },
    [database, day, leave, vault],
  );

  if (!isDone) {
    return <Redirect href="/onboarding/welcome" />;
  }

  if (refusal !== undefined) {
    return <DayRefused onBack={leave} refusal={refusal} />;
  }

  const periodLengthDays = statedPeriodLengthDays(database, profiles);
  const from: RingInputFrom = {
    cycles: listCycles(database),
    records: recordedDays(database, vault.open),
    today,
    statedCycleLengthDays: statedCycleLengthDays(database, profiles) ?? defaultCycleLengthDays,
    ...(periodLengthDays === undefined ? {} : { statedPeriodLengthDays: periodLengthDays }),
  };
  const window = isFertileOn(from, day) ? theFertileWindowOn(from, day) : undefined;

  return (
    <SexPage
      heading={sexDayHeading(day)}
      held={sexLogged(database, vault, day)}
      onBack={leave}
      onHighlight={(slug) => router.push(highlightAddress(slug))}
      onSave={save}
      question={sexQuestion(day, today)}
      {...(window === undefined ? {} : { fertileNote: fertileNote(window, day, today) })}
    />
  );
}
