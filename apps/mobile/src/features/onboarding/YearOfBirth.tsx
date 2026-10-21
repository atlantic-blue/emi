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
 * SCREEN-1 names it as the exception, and the line under the wheel says so rather than giving her a
 * reason the code does not have.
 *
 * The wheel runs newest first and opens part way down, on the year thirty years back from this
 * one. A list that opened on 1940, or on the newest year it offers, would ask most women to travel
 * a long way before they reached a year they could have been born in.
 *
 * The year in the middle of the wheel is only a place to start. Nothing is chosen until she turns
 * the wheel or taps a year, so Continue waits, and Emi never keeps a year she did not pick. The Skip
 * above it is the way past, and it writes nothing.
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
