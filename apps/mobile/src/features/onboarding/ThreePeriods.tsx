import { type ReactNode, useState } from 'react';

import { PastPeriodPicker } from '../pastPeriods/PastPeriodPicker';
import { PastPeriodsList } from '../pastPeriods/PastPeriodsList';
import { pastPeriodsCopy } from '../pastPeriods/copy';
import type { PastPeriod } from '../pastPeriods/pastPeriods';
import { OnboardingScreen } from './OnboardingScreen';
import { localDay } from './days';
import { oldestPeriodStart } from './firstRun';

interface Props {
  readonly now: Date;
  /** The periods she gave, the newest first. */
  readonly periods: readonly PastPeriod[];
  readonly onGive: (row: number, period: PastPeriod) => void;
  readonly onRemove: (row: number) => void;
  readonly onContinue: () => void;
  readonly onBack: () => void;
  /** "Skip, I will log as I go", for a woman who remembers none of them. */
  readonly onWayPast: () => void;
}

/**
 * Her last three periods, in one step: each one a start day and a length, picked on a sheet over
 * the list. The newest one can be still going, for a period that began and has not ended. Continue waits until she gives one. She can skip the second and third, and a woman who
 * remembers none takes the way past under the button, which is always drawn.
 */
export function ThreePeriods({
  now,
  periods,
  onGive,
  onRemove,
  onContinue,
  onBack,
  onWayPast,
}: Props): ReactNode {
  const today = localDay(now);
  const [open, setOpen] = useState<number | undefined>(undefined);

  return (
    <OnboardingScreen
      actionIsReady={periods.length > 0}
      actionLabel={pastPeriodsCopy.action}
      lines={[]}
      onAction={onContinue}
      onBack={onBack}
      onWayPast={onWayPast}
      question={`${pastPeriodsCopy.forecastLine} ${pastPeriodsCopy.estimateLine} ${pastPeriodsCopy.mostRecentFirstLine}`}
      screen="threePeriods"
      title={pastPeriodsCopy.title}
      wayPastLabel={pastPeriodsCopy.wayPast}
      wayPastSits="underTheAction"
    >
      <PastPeriodsList onOpen={setOpen} periods={periods} />

      {open === undefined ? null : (
        <PastPeriodPicker
          key={open}
          newestCanBeStillGoing
          oldest={oldestPeriodStart(today)}
          onCancel={() => setOpen(undefined)}
          onDone={(period) => {
            onGive(open, period);
            setOpen(undefined);
          }}
          onRemove={() => {
            onRemove(open);
            setOpen(undefined);
          }}
          periods={periods}
          row={open}
          today={today}
        />
      )}
    </OnboardingScreen>
  );
}
