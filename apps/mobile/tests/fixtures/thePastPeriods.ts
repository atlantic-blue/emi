import { fireEvent, screen } from '@testing-library/react-native';

import { dayTestID } from '../../src/features/onboarding/Calendar';
import {
  pastPeriodLengthTestID,
  pastPeriodPickerDoneTestID,
  pastPeriodStillGoingTestID,
} from '../../src/features/pastPeriods/PastPeriodPicker';
import { pastPeriodRowTestID } from '../../src/features/pastPeriods/PastPeriodsList';

/**
 * Days. The length a walk gives each period where the test is not about lengths: one day, which is
 * the one bleeding day the first run wrote before it asked for a length.
 */
export const aWalkPeriodLengthDays = 1;

/**
 * One row of the list of her last periods, given: the row opens the picker, she presses the day it
 * started and the number of days it ran, and presses Done. The day must be in the month the picker
 * opens on.
 */
export async function sheGivesAPeriod(
  row: number,
  startedOn: string,
  lengthDays: number = aWalkPeriodLengthDays,
): Promise<void> {
  await fireEvent.press(screen.getByTestId(pastPeriodRowTestID(row)));
  await fireEvent.press(screen.getByTestId(dayTestID(startedOn)));
  await fireEvent.press(screen.getByTestId(pastPeriodLengthTestID(lengthDays)));
  await fireEvent.press(screen.getByTestId(pastPeriodPickerDoneTestID));
}

/**
 * The newest row given as a period that is still going: she presses the day it started, presses
 * Still going in place of a length, and presses Done.
 */
export async function sheGivesAPeriodStillGoing(startedOn: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(pastPeriodRowTestID(0)));
  await fireEvent.press(screen.getByTestId(dayTestID(startedOn)));
  await fireEvent.press(screen.getByTestId(pastPeriodStillGoingTestID));
  await fireEvent.press(screen.getByTestId(pastPeriodPickerDoneTestID));
}
