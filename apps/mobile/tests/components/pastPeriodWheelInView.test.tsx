import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { createRef } from 'react';
import { ScrollView } from 'react-native';

import { ROWS_EACH_SIDE, WHEEL_ROW_HEIGHT } from '../../src/components/NumberWheel';
import { dayTestID } from '../../src/features/onboarding/Calendar';
import { oldestPeriodStart } from '../../src/features/onboarding/firstRun';
import {
  PastPeriodPicker,
  pastPeriodLengthAnswersTestID,
  pastPeriodPickerBodyTestID,
} from '../../src/features/pastPeriods/PastPeriodPicker';
import type { PastPeriod } from '../../src/features/pastPeriods/pastPeriods';
import { OnAPhone } from '../fixtures/theSafeArea';

const today = '2026-10-27';
const sheStartedOn = '2026-10-12';

/**
 * Points, read off the sheet of the newest period on an iPhone SE of the third generation, 375 by
 * 667, with October 2026 open. The body shows 473.5 points between the top of the sheet and the
 * foot that holds Done. The wheel and Still going under it take 312 points, and they start 13.5
 * points lower once a day is picked, because the picked week grows to hold its tick.
 */
const theSmallestPhone = {
  bodyShows: 473.5,
  lengthHeight: 312,
  lengthStartsAt: 499,
  lengthStartsAtOnceADayIsPicked: 512.5,
} as const;

const tallerPhoneBodyShows = 900;

const pillStartsInTheWheel = ROWS_EACH_SIDE * WHEEL_ROW_HEIGHT;

/** The runner's scroll view is a double whose one `scrollTo` is shared by every instance of it. */
let scrollTo: jest.Mock;

beforeAll(async () => {
  const any = createRef<ScrollView>();
  await render(<ScrollView ref={any} />);
  scrollTo = any.current?.scrollTo as unknown as jest.Mock;
  await cleanup();
});

beforeEach(() => {
  scrollTo.mockClear();
});

async function sheOpensTheSheet(periods: readonly PastPeriod[], bodyShows: number): Promise<void> {
  await render(
    <OnAPhone>
      <PastPeriodPicker
        newestCanBeStillGoing
        oldest={oldestPeriodStart(today)}
        onCancel={() => undefined}
        onDone={() => undefined}
        onRemove={() => undefined}
        periods={periods}
        row={0}
        today={today}
      />
    </OnAPhone>,
  );

  await fireEvent(screen.getByTestId(pastPeriodPickerBodyTestID), 'layout', {
    nativeEvent: { layout: { height: bodyShows, width: 343, x: 0, y: 0 } },
  });
  await theLengthIsLaidOutAt(
    periods.length === 0
      ? theSmallestPhone.lengthStartsAt
      : theSmallestPhone.lengthStartsAtOnceADayIsPicked,
  );
}

async function theLengthIsLaidOutAt(y: number): Promise<void> {
  await fireEvent(screen.getByTestId(pastPeriodLengthAnswersTestID), 'layout', {
    nativeEvent: { layout: { height: theSmallestPhone.lengthHeight, width: 343, x: 0, y } },
  });
}

function howFarTheBodyScrolled(): number {
  const bodyCalls = scrollTo.mock.calls.filter(
    (_call, at) =>
      (scrollTo.mock.contexts[at] as { props?: { testID?: string } } | undefined)?.props?.testID ===
      pastPeriodPickerBodyTestID,
  );
  const last = bodyCalls.at(-1)?.[0] as { y?: number } | undefined;
  return last?.y ?? 0;
}

function whereItSitsInTheBody(lengthStartsAt: number): {
  pillTop: number;
  pillBottom: number;
  lengthBottom: number;
} {
  const scrolled = howFarTheBodyScrolled();
  const pillTop = lengthStartsAt + pillStartsInTheWheel - scrolled;
  return {
    lengthBottom: lengthStartsAt + theSmallestPhone.lengthHeight - scrolled,
    pillBottom: pillTop + WHEEL_ROW_HEIGHT,
    pillTop,
  };
}

describe('the length she picks shows above Done on the smallest iPhone', () => {
  it('should scroll the pill above the buttons when she picks the day it started', async () => {
    await sheOpensTheSheet([], theSmallestPhone.bodyShows);

    await fireEvent.press(screen.getByTestId(dayTestID(sheStartedOn)));
    await theLengthIsLaidOutAt(theSmallestPhone.lengthStartsAtOnceADayIsPicked);

    const placed = whereItSitsInTheBody(theSmallestPhone.lengthStartsAtOnceADayIsPicked);
    expect(placed.pillTop).toBeGreaterThanOrEqual(0);
    expect(placed.pillBottom).toBeLessThanOrEqual(theSmallestPhone.bodyShows);
  });

  it('should keep Still going above the buttons when the picked week grows after the pick', async () => {
    await sheOpensTheSheet([], theSmallestPhone.bodyShows);

    await fireEvent.press(screen.getByTestId(dayTestID(sheStartedOn)));
    await theLengthIsLaidOutAt(theSmallestPhone.lengthStartsAtOnceADayIsPicked);

    const placed = whereItSitsInTheBody(theSmallestPhone.lengthStartsAtOnceADayIsPicked);
    expect(placed.lengthBottom).toBeLessThanOrEqual(theSmallestPhone.bodyShows);
  });

  it('should show the pill above the buttons when she opens a period she already gave', async () => {
    await sheOpensTheSheet(
      [{ lengthDays: 5, startedOn: sheStartedOn }],
      theSmallestPhone.bodyShows,
    );

    const placed = whereItSitsInTheBody(theSmallestPhone.lengthStartsAtOnceADayIsPicked);
    expect(placed.pillTop).toBeGreaterThanOrEqual(0);
    expect(placed.pillBottom).toBeLessThanOrEqual(theSmallestPhone.bodyShows);
  });

  it('should stop following the length once she drags the body herself', async () => {
    await sheOpensTheSheet([], theSmallestPhone.bodyShows);
    await fireEvent.press(screen.getByTestId(dayTestID(sheStartedOn)));
    await fireEvent(screen.getByTestId(pastPeriodPickerBodyTestID), 'scrollBeginDrag');
    scrollTo.mockClear();

    await theLengthIsLaidOutAt(theSmallestPhone.lengthStartsAt);

    expect(howFarTheBodyScrolled()).toBe(0);
  });

  it('should leave the body where it is on a phone tall enough to show the wheel', async () => {
    await sheOpensTheSheet([], tallerPhoneBodyShows);

    await fireEvent.press(screen.getByTestId(dayTestID(sheStartedOn)));
    await theLengthIsLaidOutAt(theSmallestPhone.lengthStartsAtOnceADayIsPicked);

    expect(howFarTheBodyScrolled()).toBe(0);
  });
});
