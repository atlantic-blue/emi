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

  const held = useMemo(
    () => ({
      isDone,
      periodStartedOn,
      cycleLengthDays,
      setPeriodStartedOn,
      setCycleLengthDays,
      finish,
    }),
    [cycleLengthDays, finish, isDone, periodStartedOn],
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
