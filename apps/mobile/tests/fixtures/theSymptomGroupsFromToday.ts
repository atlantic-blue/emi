import { screen } from '@testing-library/react-native';
import { fireEvent } from 'expo-router/testing-library';

import { roundActionTestID } from '../../src/features/home/RoundAction';
import { phaseDiaryAllSymptomsTestID } from '../../src/features/phase/PhaseDiary';

/**
 * The way from Today to the symptom groups of the log. The todayPhases board took the Symptoms
 * action off Today, so she reaches the groups through the Cycle phase action and the "All
 * symptoms" link of its diary. The log is a tab, so its save returns her to Today.
 */
export async function sheOpensTheSymptomGroupsFromToday(): Promise<void> {
  await fireEvent.press(screen.getByTestId(roundActionTestID('phase')));
  await fireEvent.press(screen.getByTestId(phaseDiaryAllSymptomsTestID));
}
