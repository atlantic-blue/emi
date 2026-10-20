import type { DayRecord, ProfileRecord } from '@emi/crypto';
import { type Forecast, addDays, confidenceFor } from '@emi/cycle';
import { render } from '@testing-library/react-native';

import { HomeScreen } from '../../src/features/home/HomeScreen';
import { firstRunFlow } from '../../src/features/onboarding/firstRun';

import { herPhoneHoldsTheseAnswers } from './herPhone';
import { OnAPhone } from './theSafeArea';

/**
 * Home after the forecast window has passed, for the screen tests in each language and for the
 * scenario. The window of the drawn forecast runs from the 15th to the 17th of October, which is the
 * window three periods 28 days apart give when the last one started on the 18th of September.
 */

export const theDaySheIsLate = '2026-10-19';

/** Midday on that day, so the day reads the same in any zone. */
export const whenSheIsLate = new Date(`${theDaySheIsLate}T12:00:00.000Z`);

export const theLateForecast: Forecast = {
  kind: 'forecast',
  fromCycles: 2,
  medianLengthDays: 28,
  spreadDays: 0,
  confidence: confidenceFor(0),
  expectedStart: '2026-10-16',
  start: { from: '2026-10-15', to: '2026-10-17' },
  estimatedOvulation: '2026-10-03',
  fertileWindow: { from: '2026-09-28', to: '2026-10-04' },
  lutealLengthDays: 13,
};

interface LateHome {
  readonly daysLate?: number;
  readonly onItStarted?: () => void;
}

export async function homeWhenSheIsLate({ daysLate, onItStarted }: LateHome): Promise<void> {
  const nothing = (): void => undefined;

  await render(
    <OnAPhone>
      <HomeScreen
        cycleLengthDays={28}
        daysLate={daysLate}
        forecast={theLateForecast}
        onExport={nothing}
        onItStarted={onItStarted}
        onLogPain={nothing}
        onLogToday={nothing}
        onOpenLogged={nothing}
        onPeriod={nothing}
        onSex={nothing}
        ring={undefined}
        today={theDaySheIsLate}
      />
    </OnAPhone>,
  );
}

/** Her three period starts, 28 days apart, so the window above ends two days before today. */
export const herPeriodStartsBeforeTheLateOne: readonly string[] = [
  '2026-07-24',
  '2026-08-21',
  '2026-09-18',
];

/** Four days of flow from each start, and a day of no flow after them that closes the period. */
function herDays(): DayRecord[] {
  return herPeriodStartsBeforeTheLateOne.flatMap((start) =>
    [0, 1, 2, 3, 4].map((offset) => {
      const day = addDays(start, offset);

      return {
        day,
        flow: offset === 4 ? ('none' as const) : firstRunFlow,
        recordedAt: `${day}T08:00:00.000Z`,
      };
    }),
  );
}

/** Her phone on the day she is late: her three periods and the answers of the first run. */
export async function herPhoneHoldsThreePeriodsAndNoLateOne(): Promise<void> {
  const profile: ProfileRecord = {
    kind: 'profile',
    cycleLengthDays: 28,
    periodLengthDays: 4,
    recordedAt: whenSheIsLate.toISOString(),
  };

  await herPhoneHoldsTheseAnswers(whenSheIsLate, profile, herDays());
}
