import type { Flow, SymptomGroup } from '@emi/cycle';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useCallback, useReducer, useState } from 'react';

import { useDatabase } from '../../data/DatabaseProvider';
import { ringNow } from '../../features/cycle/ringNow';
import { DayRefused } from '../../features/log/DayRefused';
import { LogFlow } from '../../features/log/LogFlow';
import { LogSymptoms, type SymptomsAsked } from '../../features/log/LogSymptoms';
import { symptomsBySearch, symptomsOfAGroup } from '../../features/log/askedGroup';
import {
  editFlow,
  editSymptoms,
  flowOn,
  refusalFor,
  symptomsOn,
  unexpectedOn,
} from '../../features/log/editDay';
import { groupsInHerOrder } from '../../features/log/herOrder';
import { useFirstRun } from '../../features/onboarding/FirstRunProvider';
import { statedFocus } from '../../features/onboarding/firstRun';
import { periodAddress } from '../../features/period/periodAddress';
import { useRescheduleHerReminder } from '../../features/reminder/rescheduleHerReminder';
import { sexAddress } from '../../features/sex/sexAddress';
import { dateWords, localDay } from '../../features/onboarding/days';
import { useProfileVault, useVault } from '../../services/vault/VaultProvider';

/** Two lists hold the same symptoms, whatever order she pressed them in. */
function sameSymptoms(one: readonly string[], other: readonly string[]): boolean {
  return one.length === other.length && one.every((slug) => other.includes(slug));
}

/**
 * A day she already lived, opened from its own address. The ring beside the flow is the cycle she
 * is in today rather than a ring for that day, because what a corrected Tuesday changes is where
 * she stands now.
 */
export default function DayRoute(): ReactNode {
  const database = useDatabase();
  const vault = useVault();
  const profiles = useProfileVault();
  const router = useRouter();
  const { isDone } = useFirstRun();
  const { date } = useLocalSearchParams<{ date: string }>();
  const [today] = useState(() => localDay(new Date()));
  const [hers] = useState(() => statedFocus(database, profiles) ?? []);
  const [symptomsAsked, setSymptomsAsked] = useState<SymptomsAsked | undefined>(undefined);
  const [opened, sheOpened] = useReducer((times: number) => times + 1, 0);
  // A write lands in the database, which React cannot see, so the write says it happened and the
  // day and the ring are read again on the render that follows.
  const [, sheWrote] = useReducer((writes: number) => writes + 1, 0);
  // A flow on a day she already lived can move the start of a cycle, and the forecast with it.
  const rescheduleTheReminder = useRescheduleHerReminder();

  const day = String(date ?? '');
  const refusal = refusalFor({ day, today });

  const leave = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/');
  }, [router]);

  const openTheSymptoms = useCallback((asked: SymptomsAsked) => {
    sheOpened();
    setSymptomsAsked(asked);
  }, []);

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
      rescheduleTheReminder();
    },
    [database, day, rescheduleTheReminder, today, vault],
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

  const writeTheSymptoms = useCallback(
    (wanted: readonly string[]) => {
      if (!sameSymptoms(wanted, symptomsOn(database, vault, { day, today }))) {
        editSymptoms(database, vault, { day, symptoms: wanted, now: new Date(), today });
        sheWrote();
      }
    },
    [database, day, today, vault],
  );

  if (!isDone) {
    return <Redirect href="/onboarding/welcome" />;
  }

  if (refusal !== undefined) {
    return <DayRefused onBack={leave} refusal={refusal} />;
  }

  const held = symptomsOn(database, vault, { day, today });

  if (symptomsAsked !== undefined) {
    return (
      <LogSymptoms
        asked={symptomsAsked}
        focus={hers}
        held={held}
        key={opened}
        leave="back"
        onLeave={() => setSymptomsAsked(undefined)}
        onSave={(picked) => {
          writeTheSymptoms(picked);
          setSymptomsAsked(undefined);
        }}
        title={dateWords(day)}
      />
    );
  }

  return (
    <LogFlow
      chosen={flowOn(database, vault, { day, today })}
      day={day}
      dayPages={{
        onPeriod: () => router.push(periodAddress(day)),
        onSex: () => router.push(sexAddress(day)),
      }}
      dones="top-and-foot"
      groups={groupsInHerOrder(hers)}
      leave="back"
      marked={unexpectedOn(database, vault, { day, today })}
      onDone={leave}
      onLeave={leave}
      onMark={mark}
      onOpenGroup={(group: SymptomGroup) => openTheSymptoms(symptomsOfAGroup(group))}
      onPick={pick}
      onOtherDischarge={() => router.push(periodAddress(day))}
      onSearch={() => openTheSymptoms(symptomsBySearch(hers))}
      onToggleSymptom={(slug) => writeTheSymptoms(held.filter((each) => each !== slug))}
      ring={ringNow(database, vault, profiles, today)}
      symptoms={held}
      title={dateWords(day)}
    />
  );
}
