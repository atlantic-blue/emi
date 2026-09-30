import type { ReactNode } from 'react';

import { YearWheel } from '../../components/YearWheel';
import { OnboardingScreen } from './OnboardingScreen';
import { birthYearLabel, firstRunCopy } from './copy';
import { birthYearsOffered, middleBirthYear } from './firstRun';

interface Props {
  readonly now: Date;
  readonly chosen: number | undefined;
  readonly onChoose: (year: number) => void;
  readonly onContinue: () => void;
  readonly onSkip: () => void;
  readonly onBack: () => void;
}

/**
 * The year she was born, and the one question in Emi whose answer nothing reads. Contract
 * SCREEN-1 names it as the exception.
 *
 * The wheel runs newest first and opens part way down, on the year thirty years back from this
 * one. A list that opened on 1940, or on the newest year it offers, would ask most women to travel
 * a long way before they reached a year they could have been born in.
 *
 * Nothing is chosen when she arrives, so Continue waits for a year. The Skip above it is the way
 * past, and it writes nothing.
 */
export function YearOfBirth({
  now,
  chosen,
  onChoose,
  onContinue,
  onSkip,
  onBack,
}: Props): ReactNode {
  return (
    <OnboardingScreen
      actionIsReady={chosen !== undefined}
      actionLabel={firstRunCopy.birthYear.action}
      lines={firstRunCopy.birthYear.lines}
      onAction={onContinue}
      onBack={onBack}
      onSkip={onSkip}
      screen="birthYear"
      title={firstRunCopy.birthYear.title}
    >
      <YearWheel
        chosen={chosen}
        labelOf={birthYearLabel}
        onChoose={onChoose}
        opensOn={middleBirthYear(now)}
        years={birthYearsOffered(now)}
      />
    </OnboardingScreen>
  );
}
