import type { Flow, SymptomGroup } from '@emi/cycle';
import { Redirect, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useCallback, useReducer, useState } from 'react';

import { useDatabase } from '../../../data/DatabaseProvider';
import { ringNow } from '../../../features/cycle/ringNow';
import { logTitleToday } from '../../../features/log/copy';
import { LogFlow } from '../../../features/log/LogFlow';
import { LogSymptoms, type SymptomsAsked } from '../../../features/log/LogSymptoms';
import {
  flowLogged,
  logFlow,
  logSymptoms,
  symptomsLogged,
  unexpectedLogged,
} from '../../../features/log/logDay';
import {
  groupParameter,
  opensOnParameter,
  symptomsAskedBy,
  symptomsBySearch,
  symptomsOfAGroup,
} from '../../../features/log/askedGroup';
import { groupsInHerOrder } from '../../../features/log/herOrder';
import { useFirstRun } from '../../../features/onboarding/FirstRunProvider';
import { useRescheduleHerReminder } from '../../../features/reminder/rescheduleHerReminder';
import { statedFocus } from '../../../features/onboarding/firstRun';
import { localDay } from '../../../features/onboarding/days';
import { useProfileVault, useVault } from '../../../services/vault/VaultProvider';

/** Two lists hold the same symptoms, whatever order she pressed them in. */
function sameSymptoms(one: readonly string[], other: readonly string[]): boolean {
  return one.length === other.length && one.every((slug) => other.includes(slug));
}

export default function LogFlowRoute(): ReactNode {
  const database = useDatabase();
  const vault = useVault();
  const profiles = useProfileVault();
  const router = useRouter();
  const { isDone } = useFirstRun();
  const address = useLocalSearchParams<{ group?: string; on?: string }>();
  const [today] = useState(() => localDay(new Date()));
  // Her groups, read when the tab is looked at rather than when it was first drawn. She changes
  // this answer on a screen of its own and comes back here.
  const [hers, setHers] = useState(() => statedFocus(database, profiles) ?? []);
  // The symptoms she opened from a tile or from Search on this screen. The address asks for the
  // symptoms in the other case, when a line on Today or the phase page sent her here.
  const [fromTheLog, setFromTheLog] = useState<SymptomsAsked | undefined>(undefined);
  const [opened, sheOpened] = useReducer((times: number) => times + 1, 0);
  // A write lands in the database, which React cannot see, so the write says it happened and the
  // day and the ring are read again on the render that follows.
  const [, sheWrote] = useReducer((writes: number) => writes + 1, 0);
  // A flow can start a period, which moves the forecast, so the reminder is worked out again.
  const rescheduleTheReminder = useRescheduleHerReminder();
  const askedByTheAddress = symptomsAskedBy(address, hers);
  const symptomsAsked = fromTheLog ?? askedByTheAddress;

  useFocusEffect(
    useCallback(() => {
      setHers(statedFocus(database, profiles) ?? []);

      // The symptoms she opened from a tile close when she leaves the tab, so the tab opens on
      // the flow the next time. The dock clears the address for the same reason.
      return () => {
        setFromTheLog(undefined);
      };
    }, [database, profiles]),
  );

  const leaveTheLog = useCallback(() => {
    router.navigate('/');
  }, [router]);

  const leaveTheSymptoms = useCallback(() => {
    if (fromTheLog !== undefined) {
      setFromTheLog(undefined);
      return;
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.setParams({ [groupParameter]: undefined, [opensOnParameter]: undefined });
  }, [fromTheLog, router]);

  const openTheSymptoms = useCallback((asked: SymptomsAsked) => {
    sheOpened();
    setFromTheLog(asked);
  }, []);

  const pick = useCallback(
    (flow: Flow) => {
      logFlow(database, vault, {
        day: today,
        flow,
        bleedingIsUnexpected: unexpectedLogged(database, vault, today),
        now: new Date(),
      });
      sheWrote();
      rescheduleTheReminder();
    },
    [database, rescheduleTheReminder, today, vault],
  );

  // The write is the whole day, so a mark needs the flow it belongs to. A day she logged no flow
  // on has no bleeding to mark.
  const mark = useCallback(
    (marked: boolean) => {
      const flow = flowLogged(database, vault, today);

      if (flow === undefined) {
        return;
      }

      logFlow(database, vault, { day: today, flow, bleedingIsUnexpected: marked, now: new Date() });
      sheWrote();
    },
    [database, today, vault],
  );

  const writeTheSymptoms = useCallback(
    (wanted: readonly string[]) => {
      if (!sameSymptoms(wanted, symptomsLogged(database, vault, today))) {
        logSymptoms(database, vault, { day: today, symptoms: wanted, now: new Date() });
        sheWrote();
      }
    },
    [database, today, vault],
  );

  // A chip of the day takes its symptom off the day at once, as a flow is written at once.
  const takeOff = useCallback(
    (slug: string) => {
      writeTheSymptoms(symptomsLogged(database, vault, today).filter((each) => each !== slug));
    },
    [database, today, vault, writeTheSymptoms],
  );

  if (!isDone) {
    return <Redirect href="/onboarding/welcome" />;
  }

  if (symptomsAsked !== undefined) {
    return (
      <LogSymptoms
        asked={symptomsAsked}
        focus={hers}
        held={symptomsLogged(database, vault, today)}
        key={fromTheLog === undefined ? 'address' : opened}
        leave="close"
        onLeave={leaveTheSymptoms}
        onSave={(picked) => {
          writeTheSymptoms(picked);
          leaveTheSymptoms();
        }}
        title={logTitleToday}
      />
    );
  }

  return (
    <LogFlow
      chosen={flowLogged(database, vault, today)}
      day={today}
      dones="top"
      groups={groupsInHerOrder(hers)}
      leave="close"
      marked={unexpectedLogged(database, vault, today)}
      onDone={leaveTheLog}
      onLeave={leaveTheLog}
      onMark={mark}
      onOpenGroup={(group: SymptomGroup) => openTheSymptoms(symptomsOfAGroup(group))}
      onPick={pick}
      onSearch={() => openTheSymptoms(symptomsBySearch(hers))}
      onToggleSymptom={takeOff}
      ring={ringNow(database, vault, profiles, today)}
      symptoms={symptomsLogged(database, vault, today)}
      title={logTitleToday}
    />
  );
}
