import { Redirect, useRouter } from 'expo-router';
import type { ReactNode } from 'react';

import { FirstForecast } from '../../features/onboarding/FirstForecast';
import { useFirstRun } from '../../features/onboarding/FirstRunProvider';
import { forecastFromHerAnswers } from '../../features/onboarding/firstRun';

/**
 * The forecast is worked out here rather than held in the provider, because it is arithmetic over
 * answers she has already given and never an answer of its own.
 *
 * A woman who reaches this route without a day to count from is sent back to the question that
 * asks for one. That is the one answer the first run cannot do without, so the screen behind this
 * one is where she belongs rather than a screen drawing a range from nothing.
 */
export default function FirstForecastRoute(): ReactNode {
  const router = useRouter();
  const { periodStartedOn, periodBeforeStartedOn, cycleLengthDays } = useFirstRun();
  const forecast =
    periodStartedOn === undefined
      ? undefined
      : forecastFromHerAnswers({ periodStartedOn, periodBeforeStartedOn, cycleLengthDays });

  if (forecast?.start === undefined) {
    return <Redirect href="/onboarding/last-period" />;
  }

  return (
    <FirstForecast
      onContinue={() => router.push('/onboarding/the-promise')}
      start={forecast.start}
    />
  );
}
