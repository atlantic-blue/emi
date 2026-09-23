import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useDatabase } from '../../data/DatabaseProvider';
import { useHerVaultsMade } from '../../services/vault/VaultProvider';
import {
  defaultCycleLengthDays,
  firstRunIsDone,
  nameSheGave,
  writeEverythingAtTheHold,
} from './firstRun';
import { markTourSeen, tourIsSeen } from './tour';

interface FirstRun {
  readonly isDone: boolean;
  /** Whether she has already been shown the four cards, which is the database's answer. */
  readonly tourIsDone: boolean;
  readonly periodStartedOn: string | undefined;
  /** The start before that one, and nothing at all where she does not remember it. */
  readonly periodBeforeStartedOn: string | undefined;
  readonly cycleLengthDays: number;
  /** Nothing at all where she said she is not sure, which is that question's way past it. */
  readonly periodLengthDays: number | undefined;
  /** What is in the field, letter by letter. The name she gave is read off it at the hold. */
  readonly nameTyped: string;
  readonly birthYear: number | undefined;
  readonly setPeriodStartedOn: (day: string) => void;
  /** Nothing is the answer "I do not remember" leaves behind, so the setter takes it as well. */
  readonly setPeriodBeforeStartedOn: (day: string | undefined) => void;
  readonly setCycleLengthDays: (days: number) => void;
  /** Nothing is the answer "I am not sure" leaves behind, so the setter takes it as well. */
  readonly setPeriodLengthDays: (days: number | undefined) => void;
  readonly setNameTyped: (typed: string) => void;
  /** Nothing is the answer a Skip leaves behind, so the setter takes it as well as a year. */
  readonly setBirthYear: (year: number | undefined) => void;
  /**
   * The hold, and the one thing in the first run that writes. It makes her key if this phone
   * holds none, then writes her day, her answers and the marker in one transaction.
   *
   * A second hold is answered here. The database is asked again rather than the state above,
   * because both holds land before anything redraws, and a hold that is still writing is held
   * off as well, because the first write has not reached the database for the second to find.
   */
  readonly writeEverything: () => Promise<void>;
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
 * Her answers are held here and written at the hold, so a first run she walks away from at any
 * question leaves nothing behind. Whether the first run is done is the database's answer and never
 * this component's, on the launch after it as much as on the write itself.
 */
export function FirstRunProvider({ children }: { readonly children: ReactNode }): ReactNode {
  const database = useDatabase();
  const makeHerVaults = useHerVaultsMade();
  const [isDone, setIsDone] = useState(() => firstRunIsDone(database));
  const [tourIsDone, setTourIsDone] = useState(() => tourIsSeen(database));
  const [periodStartedOn, setPeriodStartedOn] = useState<string | undefined>(undefined);
  const [periodBeforeStartedOn, setPeriodBeforeStartedOn] = useState<string | undefined>(undefined);
  const [cycleLengthDays, setCycleLengthDays] = useState(defaultCycleLengthDays);
  const [periodLengthDays, setPeriodLengthDays] = useState<number | undefined>(undefined);
  const [nameTyped, setNameTyped] = useState('');
  const [birthYear, setBirthYear] = useState<number | undefined>(undefined);
  const writing = useRef(false);

  const writeEverything = useCallback(async () => {
    if (writing.current || firstRunIsDone(database)) {
      return;
    }
    if (periodStartedOn === undefined) {
      throw new Error(
        'the first run cannot be written before she has said when her period started',
      );
    }

    writing.current = true;
    try {
      await writeEverythingAtTheHold(
        database,
        makeHerVaults,
        {
          periodStartedOn,
          periodBeforeStartedOn,
          cycleLengthDays,
          periodLengthDays,
          name: nameSheGave(nameTyped),
          birthYear,
        },
        new Date(),
      );
    } finally {
      writing.current = false;
    }
    setIsDone(firstRunIsDone(database));
  }, [
    birthYear,
    cycleLengthDays,
    database,
    makeHerVaults,
    nameTyped,
    periodBeforeStartedOn,
    periodLengthDays,
    periodStartedOn,
  ]);

  const leaveTheTour = useCallback(() => {
    markTourSeen(database, new Date());
    setTourIsDone(tourIsSeen(database));
  }, [database]);

  const reread = useCallback(() => {
    setPeriodStartedOn(undefined);
    setPeriodBeforeStartedOn(undefined);
    setCycleLengthDays(defaultCycleLengthDays);
    setPeriodLengthDays(undefined);
    setNameTyped('');
    setBirthYear(undefined);
    setIsDone(firstRunIsDone(database));
    setTourIsDone(tourIsSeen(database));
  }, [database]);

  const held = useMemo(
    () => ({
      isDone,
      tourIsDone,
      periodStartedOn,
      periodBeforeStartedOn,
      cycleLengthDays,
      periodLengthDays,
      nameTyped,
      birthYear,
      setPeriodStartedOn,
      setPeriodBeforeStartedOn,
      setCycleLengthDays,
      setPeriodLengthDays,
      setNameTyped,
      setBirthYear,
      leaveTheTour,
      writeEverything,
      reread,
    }),
    [
      birthYear,
      cycleLengthDays,
      isDone,
      leaveTheTour,
      nameTyped,
      periodBeforeStartedOn,
      periodLengthDays,
      periodStartedOn,
      reread,
      tourIsDone,
      writeEverything,
    ],
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
