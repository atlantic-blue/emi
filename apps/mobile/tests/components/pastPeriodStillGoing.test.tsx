import { fireEvent, render, screen } from '@testing-library/react-native';

import { dayTestID } from '../../src/features/onboarding/Calendar';
import { oldestPeriodStart } from '../../src/features/onboarding/firstRun';
import {
  PastPeriodPicker,
  pastPeriodLengthTestID,
  pastPeriodPickerDoneTestID,
  pastPeriodStillGoingRefusedTestID,
  pastPeriodStillGoingTestID,
} from '../../src/features/pastPeriods/PastPeriodPicker';
import type { PastPeriod } from '../../src/features/pastPeriods/pastPeriods';
import { OnAPhone } from '../fixtures/theSafeArea';

const today = '2026-05-14';
const threeDaysAgo = '2026-05-11';
/** Eight days back, which is longer ago than one period runs. */
const eightDaysAgo = '2026-05-06';

interface Opened {
  readonly row?: number;
  readonly periods?: readonly PastPeriod[];
  readonly newestCanBeStillGoing?: boolean;
}

async function sheOpensThePicker({
  row = 0,
  periods = [],
  newestCanBeStillGoing = true,
}: Opened = {}): Promise<jest.Mock> {
  const onDone = jest.fn();

  await render(
    <OnAPhone>
      <PastPeriodPicker
        newestCanBeStillGoing={newestCanBeStillGoing}
        oldest={oldestPeriodStart(today)}
        onCancel={() => undefined}
        onDone={onDone}
        onRemove={() => undefined}
        periods={periods}
        row={row}
        today={today}
      />
    </OnAPhone>,
  );

  return onDone;
}

async function shePresses(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

describe('the newest period of the first run can be still going', () => {
  it('offers Still going as the other answer to how long it lasted', async () => {
    await sheOpensThePicker();

    expect(screen.getByTestId(pastPeriodStillGoingTestID)).toHaveTextContent('Still going');
  });

  it('gives the period with no length once she presses Still going and Done', async () => {
    const onDone = await sheOpensThePicker();

    await shePresses(dayTestID(threeDaysAgo));
    expect(screen.getByTestId(pastPeriodPickerDoneTestID)).toBeDisabled();
    await shePresses(pastPeriodStillGoingTestID);
    await shePresses(pastPeriodPickerDoneTestID);

    expect(onDone).toHaveBeenCalledWith({ startedOn: threeDaysAgo });
  });

  it('gives a length again once she picks one after Still going', async () => {
    const onDone = await sheOpensThePicker();

    await shePresses(dayTestID(threeDaysAgo));
    await shePresses(pastPeriodStillGoingTestID);
    await shePresses(pastPeriodLengthTestID(4));
    await shePresses(pastPeriodPickerDoneTestID);

    expect(onDone).toHaveBeenCalledWith({ lengthDays: 4, startedOn: threeDaysAgo });
    expect(screen.getByTestId(pastPeriodStillGoingTestID).props.accessibilityState).toMatchObject({
      selected: false,
    });
  });

  it('refuses Still going for a start longer ago than one period runs, and Done waits', async () => {
    const onDone = await sheOpensThePicker();

    await shePresses(dayTestID(eightDaysAgo));
    await shePresses(pastPeriodStillGoingTestID);

    expect(screen.getByTestId(pastPeriodStillGoingRefusedTestID)).toHaveTextContent(
      'A period that is still going started 7 days ago or less. Try a later day.',
    );
    expect(screen.getByTestId(pastPeriodPickerDoneTestID)).toBeDisabled();
    await shePresses(pastPeriodPickerDoneTestID);
    expect(onDone).not.toHaveBeenCalled();
  });

  it('opens on Still going for a newest period she gave as still going', async () => {
    await sheOpensThePicker({ periods: [{ startedOn: threeDaysAgo }] });

    expect(screen.getByTestId(pastPeriodStillGoingTestID).props.accessibilityState).toMatchObject({
      selected: true,
    });
    expect(screen.getByTestId(pastPeriodPickerDoneTestID)).toBeEnabled();
  });

  it('is not offered on a row under the newest, because that period has ended', async () => {
    await sheOpensThePicker({ periods: [{ lengthDays: 5, startedOn: threeDaysAgo }], row: 1 });

    expect(screen.queryByTestId(pastPeriodStillGoingTestID)).toBeNull();
  });

  it('is not offered where the list does not ask for it', async () => {
    await sheOpensThePicker({ newestCanBeStillGoing: false });

    expect(screen.queryByTestId(pastPeriodStillGoingTestID)).toBeNull();
  });
});
