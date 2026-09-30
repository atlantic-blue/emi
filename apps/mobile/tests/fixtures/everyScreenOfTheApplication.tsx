import type { ReactElement } from 'react';

import { CalendarScreen, calendarScreenTestID } from '../../src/features/calendar/CalendarScreen';
import { ExportScreen, exportScreenTestID } from '../../src/features/export/ExportScreen';
import { HistoryScreen, historyScreenTestID } from '../../src/features/history/HistoryScreen';
import { HomeScreen, homeScreenTestID } from '../../src/features/home/HomeScreen';
import { Cover, coverTestID } from '../../src/features/lock/Cover';
import { LockScreen, lockScreenTestID } from '../../src/features/lock/LockScreen';
import { DayRefused, dayRefusedTestID } from '../../src/features/log/DayRefused';
import { LogFlow, logFlowTestID } from '../../src/features/log/LogFlow';
import { FirstForecast, firstForecastTestID } from '../../src/features/onboarding/FirstForecast';
import { HoldToBegin, holdScreenTestID } from '../../src/features/onboarding/HoldToBegin';
import { OnboardingScreen } from '../../src/features/onboarding/OnboardingScreen';
import { ThePromise, thePromiseTestID } from '../../src/features/onboarding/ThePromise';
import { TourScreen, tourScreenTestID } from '../../src/features/onboarding/TourScreen';
import {
  WhatEmiDoesWithIt,
  whatEmiDoesTestID,
} from '../../src/features/onboarding/WhatEmiDoesWithIt';
import { RecoveryScreen } from '../../src/features/recovery/RecoveryScreen';
import { AnswerScreen, answerScreenTestID } from '../../src/features/settings/AnswerScreen';
import {
  DeleteEverything,
  deleteScreenTestID,
  deletedScreenTestID,
} from '../../src/features/settings/DeleteEverything';
import { SettingsScreen, settingsScreenTestID } from '../../src/features/settings/SettingsScreen';
import { YourAnswers, yourAnswersScreenTestID } from '../../src/features/settings/YourAnswers';
import type { HerDay } from '../../src/features/cycle/herWeek';
import { monthWeeks, weekdayLetter } from '../../src/features/onboarding/days';
import { aProfileRecord } from './profileRecord';

/**
 * Every screen the application draws, each named by the test identifier it carries on the glass and
 * built with the least a rule about layout needs.
 *
 * A rule that holds for every screen is read off this list, so a nineteenth screen is added here
 * once and every such rule covers it. The two stages of the deletion screen are two screens,
 * because each one draws a body of its own.
 */

const nothing = (): void => undefined;
const neverRun = async (): Promise<never> => {
  throw new Error('nothing is saved or exported here, because this measures where a screen sits');
};

const learning = { completeCycles: 0, kind: 'learning', needsCycles: 3 } as const;

/**
 * A whole month of days for the month screen, because that screen refuses a month it was handed
 * only part of. Nothing here is read for its numbers: this list exists so the screen draws.
 */
function theDaysOfOneMonth(month: string, today: string): HerDay[] {
  return monthWeeks(month)
    .flat()
    .filter((day): day is string => day !== undefined)
    .map((day) => ({
      cycleDay: Number(day.slice(8, 10)),
      date: Number(day.slice(8, 10)),
      day,
      letter: weekdayLetter(day),
      mark: day === today ? 'today' : 'plain',
    }));
}

export const everyScreenOfTheApplication: readonly (readonly [string, () => ReactElement])[] = [
  [
    'onboarding-welcome',
    (): ReactElement => (
      <OnboardingScreen
        actionLabel="Continue"
        lines={['It asks for no account and no email address.']}
        onAction={nothing}
        onBack={nothing}
        screen="welcome"
        title="Emi"
      />
    ),
  ],
  [
    tourScreenTestID('ring'),
    (): ReactElement => (
      <TourScreen card="ring" onBack={nothing} onNext={nothing} onSkip={nothing} />
    ),
  ],
  [thePromiseTestID, (): ReactElement => <ThePromise onContinue={nothing} />],
  [
    whatEmiDoesTestID,
    (): ReactElement => <WhatEmiDoesWithIt focus={['mood']} onContinue={nothing} />,
  ],
  [
    firstForecastTestID,
    (): ReactElement => (
      <FirstForecast onContinue={nothing} start={{ from: '2026-06-06', to: '2026-06-10' }} />
    ),
  ],
  [holdScreenTestID, (): ReactElement => <HoldToBegin onHeld={neverRun} />],
  [
    'recovery-before',
    (): ReactElement => (
      <RecoveryScreen
        actionLabel="Continue"
        lines={['A code she keeps, because nobody else holds one.']}
        onAction={nothing}
        screen="before"
        title="Your recovery code"
      />
    ),
  ],
  [
    homeScreenTestID,
    (): ReactElement => (
      <HomeScreen
        cycleLengthDays={28}
        forecast={learning}
        onExport={nothing}
        onLogPain={nothing}
        onPeriod={nothing}
        onSymptoms={nothing}
        ring={undefined}
      />
    ),
  ],
  [
    logFlowTestID,
    (): ReactElement => (
      <LogFlow
        day="2026-05-14"
        marked={false}
        onDone={nothing}
        onMark={nothing}
        onPick={nothing}
        ring={undefined}
        today="2026-05-14"
      />
    ),
  ],
  [
    dayRefusedTestID,
    (): ReactElement => <DayRefused onBack={nothing} refusal="day-is-in-the-future" />,
  ],
  [
    calendarScreenTestID,
    (): ReactElement => (
      <CalendarScreen
        days={theDaysOfOneMonth('2026-05-01', '2026-05-14')}
        month="2026-05-01"
        onBack={nothing}
        onEarlierMonth={nothing}
        onLaterMonth={nothing}
        onOpenDay={nothing}
        onPressDay={nothing}
        onToday={nothing}
        today="2026-05-14"
      />
    ),
  ],
  [
    historyScreenTestID,
    (): ReactElement => (
      <HistoryScreen
        history={{ completeCycles: 0, cycles: [], patterns: [] }}
        onBack={nothing}
        onOpenDay={nothing}
      />
    ),
  ],
  [
    exportScreenTestID,
    (): ReactElement => (
      <ExportScreen canShare={false} onBack={nothing} onExport={neverRun} onShare={neverRun} />
    ),
  ],
  [
    settingsScreenTestID,
    (): ReactElement => (
      <SettingsScreen onAnswers={nothing} onBack={nothing} onDelete={nothing} onExport={nothing} />
    ),
  ],
  [
    yourAnswersScreenTestID,
    (): ReactElement => <YourAnswers answers={aProfileRecord()} onBack={nothing} />,
  ],
  [
    answerScreenTestID,
    (): ReactElement => (
      <AnswerScreen
        held="28 days"
        lines={['Emi counts from the day it starts.']}
        onCancel={nothing}
        onSave={nothing}
        question="How long is your cycle?"
        title="Cycle length"
      >
        {null}
      </AnswerScreen>
    ),
  ],
  [
    deleteScreenTestID,
    (): ReactElement => (
      <DeleteEverything onBack={nothing} onDelete={nothing} onStartAgain={nothing} stage="ready" />
    ),
  ],
  [
    deletedScreenTestID,
    (): ReactElement => (
      <DeleteEverything
        onBack={nothing}
        onDelete={nothing}
        onStartAgain={nothing}
        stage="deleted"
      />
    ),
  ],
  [coverTestID, (): ReactElement => <Cover />],
  [lockScreenTestID, (): ReactElement => <LockScreen onUnlock={nothing} wasRefused={false} />],
];
