import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';

import { FirstForecast } from '../../features/onboarding/FirstForecast';
import { useFirstRun } from '../../features/onboarding/FirstRunProvider';
import { forecastFromHerAnswers, nameSheGave } from '../../features/onboarding/firstRun';

/**
 * The forecast is worked out here rather than held in the provider, because it is arithmetic over
 * answers she has already given and never an answer of its own.
 *
 * The arithmetic answers for a woman who gave no day as well: it says it is still learning and
 * carries no range, which is contract CYCLE-3. So every woman reads this screen, and the screen
 * says what Emi has rather than carrying her past it in silence.
 */
export default function FirstForecastRoute(): ReactNode {
  const router = useRouter();
  const { periodStartedOn, periodBeforeStartedOn, cycleLengthDays, nameTyped } = useFirstRun();
  const forecast = forecastFromHerAnswers({
    cycleLengthDays,
    periodBeforeStartedOn,
    periodStartedOn,
  });

  return (
    <FirstForecast
      cycleLengthDays={cycleLengthDays}
      forecast={forecast}
      name={nameSheGave(nameTyped)}
      onContinue={() => router.push('/onboarding/the-promise')}
    />
  );
}
