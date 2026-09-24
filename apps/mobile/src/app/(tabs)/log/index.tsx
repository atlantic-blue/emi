import type { Flow } from '@emi/cycle';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useCallback, useReducer, useState } from 'react';

import { useDatabase } from '../../../data/DatabaseProvider';
import { ringNow } from '../../../features/cycle/ringNow';
import { LogFlow } from '../../../features/log/LogFlow';
import {
  flowLogged,
  logFlow,
  logSymptoms,
  symptomsLogged,
  unexpectedLogged,
} from '../../../features/log/logDay';
import { groupAskedFor, groupParameter } from '../../../features/log/askedGroup';
import { groupsUnderTheFlow } from '../../../features/log/herOrder';
import { useFirstRun } from '../../../features/onboarding/FirstRunProvider';
import { statedFocus } from '../../../features/onboarding/firstRun';
import { localDay } from '../../../features/onboarding/days';
import { useProfileVault, useVault } from '../../../services/vault/VaultProvider';

export default function LogFlowRoute(): ReactNode {
  const database = useDatabase();
  const vault = useVault();
  const profiles = useProfileVault();
  const router = useRouter();
  const { isDone } = useFirstRun();
  const asked = useLocalSearchParams<{ group?: string }>();
  const [today] = useState(() => localDay(new Date()));
  // The group the address asked for. The home line is the only thing that names one today, and it
  // names the group it offered, so she lands on the one she pressed for.
  const group = groupAskedFor(asked[groupParameter]);
  // A write lands in the database, which React cannot see, so the write says it happened and the
  // day and the ring are read again on the render that follows.
  const [, sheWrote] = useReducer((writes: number) => writes + 1, 0);

  const pick = useCallback(
    (flow: Flow) => {
      logFlow(database, vault, {
        day: today,
        flow,
        bleedingIsUnexpected: unexpectedLogged(database, vault, today),
        now: new Date(),
      });
      sheWrote();
    },
    [database, today, vault],
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

  // One press writes the whole list, so the symptom she pressed is added to or taken out of what
  // the day already holds rather than replacing it.
  const toggle = useCallback(
    (slug: string) => {
      const held = symptomsLogged(database, vault, today);
      const wanted = held.includes(slug) ? held.filter((each) => each !== slug) : [...held, slug];

      logSymptoms(database, vault, { day: today, symptoms: wanted, now: new Date() });
      sheWrote();
    },
    [database, today, vault],
  );

  if (!isDone) {
    return <Redirect href="/onboarding/welcome" />;
  }

  return (
    <LogFlow
      chosen={flowLogged(database, vault, today)}
      day={today}
      group={group}
      groups={groupsUnderTheFlow(statedFocus(database, profiles), group)}
      marked={unexpectedLogged(database, vault, today)}
      onDone={() => router.back()}
      onMark={mark}
      onPick={pick}
      onToggleSymptom={toggle}
      ring={ringNow(database, vault, profiles, today)}
      symptoms={symptomsLogged(database, vault, today)}
      today={today}
    />
  );
}
