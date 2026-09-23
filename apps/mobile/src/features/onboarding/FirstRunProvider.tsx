import { type ReactNode, createContext, useCallback, useContext, useMemo, useState } from 'react';

import { useDatabase } from '../../data/DatabaseProvider';
import { useVault } from '../../services/vault/VaultProvider';
import { completeFirstRun, defaultCycleLengthDays, firstRunIsDone } from './firstRun';
import { markTourSeen, tourIsSeen } from './tour';

interface FirstRun {
  readonly isDone: boolean;
  /** Whether she has already been shown the four cards, which is the database's answer. */
  readonly tourIsDone: boolean;
  readonly periodStartedOn: string | undefined;
  readonly cycleLengthDays: number;
  readonly setPeriodStartedOn: (day: string) => void;
  readonly setCycleLengthDays: (days: number) => void;
  /**
   * Writes her two answers, once. A second press of Done arrives before the screen goes away.
   * The write refuses a first run that is already done, so this answers the second call itself.
   */
  readonly finish: () => void;
  /**
   * Leaves the tour, by the action of the last card or by the way out on any of them. The
   * instant is written once, so a second visit keeps the first one.
   */
  readonly leaveTheTour: () => void;
  /**
   * Reads the database again. A delete empties the table this answer comes from, and without this
   * she would be sent to her own home screen with nothing on it.
   */
  readonly reread: () => void;
}

const FirstRunContext = createContext<FirstRun | undefined>(undefined);

/**
 * Her two answers are held here and written together on the last screen, so a first run she walks
 * away from halfway leaves nothing behind. Whether the first run is done is the database's answer
 * and never this component's, on the launch after it as much as on the write itself.
 */
export function FirstRunProvider({ children }: { readonly children: ReactNode }): ReactNode {
  const database = useDatabase();
  const vault = useVault();
  const [isDone, setIsDone] = useState(() => firstRunIsDone(database));
  const [tourIsDone, setTourIsDone] = useState(() => tourIsSeen(database));
  const [periodStartedOn, setPeriodStartedOn] = useState<string | undefined>(undefined);
  const [cycleLengthDays, setCycleLengthDays] = useState(defaultCycleLengthDays);

  const finish = useCallback(() => {
    // Read the database, and not the isDone state. Both presses run before anything redraws,
    // so what the first press set has not reached the second.
    if (firstRunIsDone(database)) {
      return;
    }
    if (periodStartedOn === undefined) {
      throw new Error('the first run cannot finish before she has said when her period started');
    }
    completeFirstRun(database, vault, { periodStartedOn, cycleLengthDays }, new Date());
    setIsDone(firstRunIsDone(database));
  }, [cycleLengthDays, database, periodStartedOn, vault]);

  const leaveTheTour = useCallback(() => {
    markTourSeen(database, new Date());
    setTourIsDone(tourIsSeen(database));
  }, [database]);

  const reread = useCallback(() => {
    setPeriodStartedOn(undefined);
    setCycleLengthDays(defaultCycleLengthDays);
    setIsDone(firstRunIsDone(database));
    setTourIsDone(tourIsSeen(database));
  }, [database]);

  const held = useMemo(
    () => ({
      isDone,
      tourIsDone,
      periodStartedOn,
      cycleLengthDays,
      setPeriodStartedOn,
      setCycleLengthDays,
      leaveTheTour,
      finish,
      reread,
    }),
    [cycleLengthDays, finish, isDone, leaveTheTour, periodStartedOn, reread, tourIsDone],
  );

  return <FirstRunContext.Provider value={held}>{children}</FirstRunContext.Provider>;
}

export function useFirstRun(): FirstRun {
  const firstRun = useContext(FirstRunContext);
  if (!firstRun) {
    throw new Error('a screen read the first run from outside the first run provider');
  }
  return firstRun;
}
