import { Redirect, useRouter } from 'expo-router';
import type { ReactNode } from 'react';

import { FirstForecast } from '../../features/onboarding/FirstForecast';
import { useFirstRun } from '../../features/onboarding/FirstRunProvider';
import { forecastFromHerAnswers } from '../../features/onboarding/firstRun';

/**
 * The forecast is worked out here rather than held in the provider, because it is arithmetic over
 * answers she has already given and never an answer of its own.
 *
 * A woman who reaches this route without a day to count from has no range to read, and she
 * passed the question that asks for one, so she goes on to the promise rather than back to it.
 */
export default function FirstForecastRoute(): ReactNode {
  const router = useRouter();
  const { periodStartedOn, periodBeforeStartedOn, cycleLengthDays } = useFirstRun();
  const forecast =
    periodStartedOn === undefined
      ? undefined
      : forecastFromHerAnswers({ periodStartedOn, periodBeforeStartedOn, cycleLengthDays });

  if (forecast?.start === undefined) {
    return <Redirect href="/onboarding/the-promise" />;
  }

  return (
    <FirstForecast
      cycleLengthDays={cycleLengthDays}
      forecast={forecast}
      onContinue={() => router.push('/onboarding/the-promise')}
    />
  );
}
