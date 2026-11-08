import { CycleError, addDays } from '@emi/cycle';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';

import { useDatabase } from '../../data/DatabaseProvider';
import { listCycles } from '../../data/cycleRepository';
import { EditPeriodScreen } from '../../features/calendar/EditPeriodScreen';
import { dayParameter } from '../../features/calendar/askedMonth';
import {
  type DaysListed,
  deletePeriod,
  savePeriodRange,
  theDaysOf,
  whatAPressHolds,
  whereTheEditorOpens,
} from '../../features/calendar/savePeriod';
import { theExpectedDays } from '../../features/cycle/expectedDays';
import { recordedDays } from '../../features/cycle/rebuild';
import { useFirstRun } from '../../features/onboarding/FirstRunProvider';
import { statedPeriodLengthDays } from '../../features/onboarding/firstRun';
import { localDay, startOfMonth } from '../../features/onboarding/days';
import { useRescheduleHerReminder } from '../../features/reminder/rescheduleHerReminder';
import { useProfileVault, useVault } from '../../services/vault/VaultProvider';

/** A day as the address carries it, or nothing where the address names no readable day. */
function theDayAskedFor(asked: string | undefined): string | undefined {
  if (asked === undefined) {
    return undefined;
  }

  try {
    startOfMonth(asked);
    return asked;
  } catch (thrown) {
    if (thrown instanceof CycleError) {
      return undefined;
    }
    throw thrown;
  }
}

/**
 * The whole period of the day she pressed, corrected in one action.
 *
 * The days Emi holds are read once, when the screen stands up, because they are what the save
 * counts its difference from. Reading them again on every press would compare her presses against
 * themselves.
 */
export default function EditPeriodRoute(): ReactNode {
  const database = useDatabase();
  const vault = useVault();
  const profiles = useProfileVault();
  const router = useRouter();
  const { isDone } = useFirstRun();
  const asked = useLocalSearchParams<Record<string, string>>()[dayParameter];
  const [today] = useState(() => localDay(new Date()));
  const day = theDayAskedFor(asked) ?? today;
  const [opened] = useState(() => {
    const records = recordedDays(database, vault.open);
    const cycles = listCycles(database);
    const usual = statedPeriodLengthDays(database, profiles);
    const expected = theExpectedDays({
      cycles,
      records,
      today,
      ...(usual === undefined ? {} : { statedPeriodLengthDays: usual }),
    });

    return whereTheEditorOpens(records, cycles, { day, expected, today });
  });
  const { expected, held } = opened;
  const [listed, setListed] = useState<DaysListed>(opened.listed);
  const [ticked, setTicked] = useState<readonly string[]>(() => [...held, ...expected].sort());
  const [filled, setFilled] = useState<readonly string[]>([]);
  const rescheduleTheReminder = useRescheduleHerReminder();

  const leave = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(`/calendar?${dayParameter}=${day}`);
  }, [day, router]);

  const save = useCallback(() => {
    savePeriodRange(database, vault, { expected, held, now: new Date(), ticked, today });
    rescheduleTheReminder();
    leave();
  }, [database, expected, held, leave, rescheduleTheReminder, ticked, today, vault]);

  const deleteIt = useCallback(() => {
    deletePeriod(database, vault, { held, now: new Date(), today });
    rescheduleTheReminder();
    leave();
  }, [database, held, leave, rescheduleTheReminder, today, vault]);

  const toggle = useCallback(
    (each: string) => {
      const after = whatAPressHolds(ticked, each);
      setTicked(after.ticked);
      setFilled((marked) => [...marked.filter((one) => one !== each), ...after.filled]);
    },
    [ticked],
  );

  const addTheDay = useCallback((each: string) => {
    setTicked((hersNow) => (hersNow.includes(each) ? hersNow : [...hersNow, each].sort()));
  }, []);

  const addBefore = useCallback(() => {
    const before = addDays(listed.from, -1);
    setListed({ from: before, to: listed.to });
    addTheDay(before);
  }, [addTheDay, listed]);

  const after = addDays(listed.to, 1);
  const addAfter = useCallback(() => {
    setListed({ from: listed.from, to: after });
    addTheDay(after);
  }, [addTheDay, after, listed]);

  if (!isDone) {
    return <Redirect href="/onboarding/welcome" />;
  }

  return (
    <EditPeriodScreen
      expected={expected}
      filled={filled}
      held={held}
      listed={theDaysOf(listed)}
      onAddBefore={addBefore}
      onCancel={leave}
      onDelete={deleteIt}
      onSave={save}
      onToggle={toggle}
      ticked={ticked}
      {...(after > today ? {} : { onAddAfter: addAfter })}
    />
  );
}
