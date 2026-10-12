import type { ReactNode } from 'react';

import { Calendar } from './Calendar';
import { OnboardingScreen } from './OnboardingScreen';
import { firstRunCopy } from './copy';
import { localDay } from './days';
import { oldestPeriodStart, periodStartIsInRange } from './firstRun';

interface Props {
  readonly now: Date;
  readonly chosen: string | undefined;
  readonly onChoose: (day: string) => void;
  readonly onContinue: () => void;
  readonly onBack: () => void;
  /** The way past, for a woman who has read the question and cannot name the day. */
  readonly onWayPast: () => void;
}

/**
 * The day her last period started, picked from a calendar rather than typed.
 *
 * The day the first forecast is counted from, so the button waits until she has picked one. A
 * woman who cannot name it takes "I do not remember" over the button, which is always drawn,
 * because she must always be able to go on.
 */
export function LastPeriod({
  now,
  chosen,
  onChoose,
  onContinue,
  onBack,
  onWayPast,
}: Props): ReactNode {
  const today = localDay(now);

  return (
    <OnboardingScreen
      actionIsReady={chosen !== undefined}
      actionLabel={firstRunCopy.lastPeriod.action}
      lines={firstRunCopy.lastPeriod.lines}
      linesAlign="center"
      onAction={onContinue}
      onBack={onBack}
      onWayPast={onWayPast}
      screen="lastPeriod"
      title={firstRunCopy.lastPeriod.title}
      wayPastLabel={firstRunCopy.lastPeriod.wayPast}
    >
      <Calendar
        canChoose={(day) => periodStartIsInRange(day, today)}
        chosen={chosen}
        earliest={oldestPeriodStart(today)}
        latest={today}
        onChoose={onChoose}
        opensOn={today}
        today={today}
      />
    </OnboardingScreen>
  );
}
