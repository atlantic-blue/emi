import { type ReactNode, createContext, useCallback, useContext, useMemo, useState } from 'react';

import { useDatabase } from '../../data/DatabaseProvider';
import { useVault } from '../../services/vault/VaultProvider';
import { completeFirstRun, defaultCycleLengthDays, firstRunIsDone } from './firstRun';

interface FirstRun {
  readonly isDone: boolean;
  readonly periodStartedOn: string | undefined;
  readonly cycleLengthDays: number;
  readonly setPeriodStartedOn: (day: string) => void;
  readonly setCycleLengthDays: (days: number) => void;
  readonly finish: () => void;
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
  const [periodStartedOn, setPeriodStartedOn] = useState<string | undefined>(undefined);
  const [cycleLengthDays, setCycleLengthDays] = useState(defaultCycleLengthDays);

  const finish = useCallback(() => {
    if (periodStartedOn === undefined) {
      throw new Error('the first run cannot finish before she has said when her period started');
    }
    completeFirstRun(database, vault, { periodStartedOn, cycleLengthDays }, new Date());
    setIsDone(firstRunIsDone(database));
  }, [cycleLengthDays, database, periodStartedOn, vault]);

  const reread = useCallback(() => {
    setPeriodStartedOn(undefined);
    setCycleLengthDays(defaultCycleLengthDays);
    setIsDone(firstRunIsDone(database));
  }, [database]);

  const held = useMemo(
    () => ({
      isDone,
      periodStartedOn,
      cycleLengthDays,
      setPeriodStartedOn,
      setCycleLengthDays,
      finish,
      reread,
    }),
    [cycleLengthDays, finish, isDone, periodStartedOn, reread],
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
