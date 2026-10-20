import type { Feeling, Focus, Goal, Regularity } from '@emi/crypto';
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
import { askToRemindHer } from '../../services/notifications/localReminder';
import { useHerVaultsMade } from '../../services/vault/VaultProvider';
import {
  type PastPeriod,
  periodsAfterGiving,
  periodsAfterRemoving,
} from '../pastPeriods/pastPeriods';
import type { ReminderLead } from '../reminder/reminder';
import {
  type TodaySymptom,
  firstRunIsDone,
  focusAfterPressing,
  goalsAfterPressing,
  nameSheGave,
  symptomsAfterPressing,
  writeEverythingAtTheHold,
} from './firstRun';
import { markTourSeen, tourIsSeen } from './tour';

interface FirstRun {
  readonly isDone: boolean;
  /** Whether she has already been shown the four cards, which is the database's answer. */
  readonly tourIsDone: boolean;
  /** Her last periods, the newest first, and empty until she gives one or where she skips. */
  readonly periods: readonly PastPeriod[];
  /** Nothing at all until she turns the wheel or taps a length. */
  readonly cycleLengthDays: number | undefined;
  /** Nothing at all where she said she is not sure, which is that question's way past it. */
  readonly periodLengthDays: number | undefined;
  /** Nothing at all where she skipped the question, which leaves the forecast saying nothing. */
  readonly regularity: Regularity | undefined;
  /** Nothing at all where she skipped the question, which leaves the home screen as it is. */
  readonly feeling: Feeling | undefined;
  /** What she has pressed so far, in the order she pressed it, and empty until she presses one. */
  readonly goals: readonly Goal[];
  /** What she has pressed so far, in the order she pressed it, and empty until she presses one. */
  readonly focus: readonly Focus[];
  /** What she says she feels today, in the order she pressed it, and empty until she presses one. */
  readonly symptoms: readonly string[];
  /** What is in the field, letter by letter. The name she gave is read off it at the hold. */
  readonly nameTyped: string;
  readonly birthYear: number | undefined;
  /** Nothing at all until she presses one of the three, and nothing again after "Not now". */
  readonly reminderLead: ReminderLead | undefined;
  /**
   * Whether the phone refused to raise notifications when she asked for a reminder. The first run
   * asks the phone once, and a refusal is not asked again on the way back through.
   */
  readonly reminderWasRefused: boolean;
  /** One row of the list given, which drops a row below it that is no longer one cycle before. */
  readonly givePeriod: (row: number, period: PastPeriod) => void;
  /** One row of the list taken off, with every row below it. */
  readonly removePeriod: (row: number) => void;
  /**
   * The way past the question about her periods. Every period goes, because a woman who says she
   * will log as she goes has answered nothing, and a row she gave before she read the link is not
   * an answer she gave.
   */
  readonly forgetTheDates: () => void;
  readonly setCycleLengthDays: (days: number) => void;
  /** Nothing is the answer "I am not sure" leaves behind, so the setter takes it as well. */
  readonly setPeriodLengthDays: (days: number | undefined) => void;
  /** Nothing is the answer a Skip leaves behind, so the setter takes it as well as an answer. */
  readonly setRegularity: (answer: Regularity | undefined) => void;
  /** Nothing is the answer a Skip leaves behind, so the setter takes it as well as an answer. */
  readonly setFeeling: (answer: Feeling | undefined) => void;
  /** One row pressed: the goal joins the list, or leaves it where she pressed it a second time. */
  readonly pressGoal: (goal: Goal) => void;
  /** The way past the question, which empties whatever she pressed before she pressed it. */
  readonly forgetTheGoals: () => void;
  /** One tile pressed: the group joins the list, or leaves it where she pressed it a second time. */
  readonly pressFocus: (group: Focus) => void;
  /** The way past the question, which empties whatever she pressed before she pressed it. */
  readonly forgetTheFocus: () => void;
  /** One tile pressed: the feeling joins the list, or leaves it where she pressed it again. */
  readonly pressSymptom: (slug: TodaySymptom) => void;
  /** What she picked on all symptoms, which replaces her list, the tiles she pressed included. */
  readonly chooseSymptoms: (picked: readonly string[]) => void;
  /** The way past the question, which empties whatever she pressed before she pressed it. */
  readonly forgetToday: () => void;
  readonly setNameTyped: (typed: string) => void;
  /** Nothing is the answer a Skip leaves behind, so the setter takes it as well as a year. */
  readonly setBirthYear: (year: number | undefined) => void;
  /** One of the three pressed, which replaces the one she pressed before it. */
  readonly chooseReminder: (lead: ReminderLead) => void;
  /** "Not now" and Skip: the choice goes, and the phone is not asked anything. */
  readonly forgetTheReminder: () => void;
  /**
   * "Remind me". The phone draws its own dialog and she answers it there. Allowed keeps her choice
   * for the hold to write. Refused drops it, so the hold writes no reminder and nothing is
   * scheduled. A phone already refused is not asked a second time.
   */
  readonly askForTheReminder: () => Promise<void>;
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
  const [periods, setPeriods] = useState<readonly PastPeriod[]>([]);
  const [cycleLengthDays, setCycleLengthDays] = useState<number | undefined>(undefined);
  const [periodLengthDays, setPeriodLengthDays] = useState<number | undefined>(undefined);
  const [regularity, setRegularity] = useState<Regularity | undefined>(undefined);
  const [feeling, setFeeling] = useState<Feeling | undefined>(undefined);
  const [goals, setGoals] = useState<readonly Goal[]>([]);
  const [focus, setFocus] = useState<readonly Focus[]>([]);
  const [symptoms, setSymptoms] = useState<readonly string[]>([]);
  const [nameTyped, setNameTyped] = useState('');
  const [birthYear, setBirthYear] = useState<number | undefined>(undefined);
  const [reminderLead, setReminderLead] = useState<ReminderLead | undefined>(undefined);
  const [reminderWasRefused, setReminderWasRefused] = useState(false);
  const writing = useRef(false);

  const writeEverything = useCallback(async () => {
    if (writing.current || firstRunIsDone(database)) {
      return;
    }
    writing.current = true;
    try {
      await writeEverythingAtTheHold(
        database,
        makeHerVaults,
        {
          periods,
          cycleLengthDays,
          periodLengthDays,
          regularity,
          feeling,
          goals,
          focus,
          symptoms,
          name: nameSheGave(nameTyped),
          birthYear,
          reminderLead,
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
    feeling,
    focus,
    goals,
    makeHerVaults,
    nameTyped,
    periodLengthDays,
    periods,
    regularity,
    reminderLead,
    symptoms,
  ]);

  const chooseReminder = useCallback((lead: ReminderLead) => {
    setReminderLead(lead);
  }, []);

  const forgetTheReminder = useCallback(() => {
    setReminderLead(undefined);
  }, []);

  const askForTheReminder = useCallback(async () => {
    if (reminderWasRefused) {
      setReminderLead(undefined);
      return;
    }
    // A phone that cannot answer is read as a refusal, so the first run goes on either way and
    // never writes a reminder the phone cannot raise.
    const answer = await askToRemindHer().catch(() => 'refused' as const);

    if (answer === 'refused') {
      setReminderWasRefused(true);
      setReminderLead(undefined);
    }
  }, [reminderWasRefused]);

  const pressGoal = useCallback((goal: Goal) => {
    setGoals((chosen) => goalsAfterPressing(chosen, goal));
  }, []);

  const givePeriod = useCallback((row: number, period: PastPeriod) => {
    setPeriods((given) => periodsAfterGiving(given, row, period));
  }, []);

  const removePeriod = useCallback((row: number) => {
    setPeriods((given) => periodsAfterRemoving(given, row));
  }, []);

  const forgetTheDates = useCallback(() => {
    setPeriods([]);
  }, []);

  const forgetTheGoals = useCallback(() => {
    setGoals([]);
  }, []);

  const pressFocus = useCallback((group: Focus) => {
    setFocus((chosen) => focusAfterPressing(chosen, group));
  }, []);

  const forgetTheFocus = useCallback(() => {
    setFocus([]);
  }, []);

  const pressSymptom = useCallback((slug: TodaySymptom) => {
    setSymptoms((chosen) => symptomsAfterPressing(chosen, slug));
  }, []);

  const chooseSymptoms = useCallback((picked: readonly string[]) => {
    setSymptoms(picked);
  }, []);

  const forgetToday = useCallback(() => {
    setSymptoms([]);
  }, []);

  const leaveTheTour = useCallback(() => {
    markTourSeen(database, new Date());
    setTourIsDone(tourIsSeen(database));
  }, [database]);

  const reread = useCallback(() => {
    setPeriods([]);
    setCycleLengthDays(undefined);
    setPeriodLengthDays(undefined);
    setRegularity(undefined);
    setFeeling(undefined);
    setGoals([]);
    setFocus([]);
    setSymptoms([]);
    setNameTyped('');
    setBirthYear(undefined);
    setReminderLead(undefined);
    setReminderWasRefused(false);
    setIsDone(firstRunIsDone(database));
    setTourIsDone(tourIsSeen(database));
  }, [database]);

  const held = useMemo(
    () => ({
      isDone,
      tourIsDone,
      periods,
      cycleLengthDays,
      periodLengthDays,
      regularity,
      feeling,
      goals,
      focus,
      symptoms,
      nameTyped,
      birthYear,
      reminderLead,
      reminderWasRefused,
      givePeriod,
      removePeriod,
      forgetTheDates,
      setCycleLengthDays,
      setPeriodLengthDays,
      setRegularity,
      setFeeling,
      pressGoal,
      forgetTheGoals,
      pressFocus,
      forgetTheFocus,
      pressSymptom,
      chooseSymptoms,
      forgetToday,
      setNameTyped,
      setBirthYear,
      chooseReminder,
      forgetTheReminder,
      askForTheReminder,
      leaveTheTour,
      writeEverything,
      reread,
    }),
    [
      askForTheReminder,
      chooseReminder,
      chooseSymptoms,
      forgetTheReminder,
      birthYear,
      cycleLengthDays,
      feeling,
      focus,
      forgetTheDates,
      forgetTheFocus,
      forgetTheGoals,
      forgetToday,
      givePeriod,
      goals,
      isDone,
      leaveTheTour,
      pressFocus,
      pressGoal,
      pressSymptom,
      symptoms,
      nameTyped,
      periodLengthDays,
      periods,
      regularity,
      reminderLead,
      reminderWasRefused,
      removePeriod,
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
