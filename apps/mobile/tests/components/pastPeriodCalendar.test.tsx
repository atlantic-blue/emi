import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { OnAPhone } from '../fixtures/theSafeArea';

import {
  calendarTestID,
  dayTestID,
  earlierMonthTestID,
  laterMonthTestID,
  monthTestID,
} from '../../src/features/onboarding/Calendar';
import { longestLookBackDays, oldestPeriodStart } from '../../src/features/onboarding/firstRun';
import { PastPeriodPicker } from '../../src/features/pastPeriods/PastPeriodPicker';

const today = '2026-05-14';
const tomorrow = '2026-05-15';
/** The oldest day the first run accepts, ninety days back, and the day before it. */
const oldest = '2026-02-13';
const tooOld = '2026-02-12';

async function sheOpensTheCalendar(chosen?: string): Promise<void> {
  await render(
    <OnAPhone>
      <PastPeriodPicker
        oldest={oldestPeriodStart(today)}
        onCancel={() => undefined}
        onDone={() => undefined}
        onRemove={() => undefined}
        periods={chosen === undefined ? [] : [{ lengthDays: 5, startedOn: chosen }]}
        row={0}
        today={today}
      />
    </OnAPhone>,
  );
}

function isChosen(day: string): boolean {
  return screen.getByTestId(dayTestID(day)).props.accessibilityState?.selected === true;
}

async function shePresses(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

function everyDayHandle(): string[] {
  return screen
    .queryAllByTestId(/^day-\d{4}-\d{2}-\d{2}$/)
    .map((handle) => String(handle.props.testID));
}

describe('she picks the day her newest period started from a month calendar', () => {
  describe('the month it opens on', () => {
    it('is the month she is in, named above the squares', async () => {
      await sheOpensTheCalendar();

      expect(screen.getByTestId(monthTestID)).toHaveTextContent('May 2026');
    });

    it('holds one handle for each of its days and no more', async () => {
      await sheOpensTheCalendar();

      expect(everyDayHandle()).toHaveLength(31);
      expect(everyDayHandle()).toContain(dayTestID('2026-05-01'));
      expect(everyDayHandle()).toContain(dayTestID('2026-05-31'));
    });

    it('lays the weekdays out from Monday, above the squares', async () => {
      await sheOpensTheCalendar();

      expect(screen.getByLabelText('Monday')).toBeTruthy();
      expect(screen.getByLabelText('Sunday')).toBeTruthy();
    });
  });

  describe('a day she may not choose', () => {
    it('does not answer when she presses a day after today', async () => {
      await sheOpensTheCalendar();

      await shePresses(dayTestID(tomorrow));

      expect(isChosen(tomorrow)).toBe(false);
    });

    it('does not answer when she presses a day further back than the first run reaches', async () => {
      await sheOpensTheCalendar();
      await shePresses(earlierMonthTestID);
      await shePresses(earlierMonthTestID);
      await shePresses(earlierMonthTestID);

      await shePresses(dayTestID(tooOld));

      expect(isChosen(tooOld)).toBe(false);
    });

    it('answers on the oldest day the first run does accept', async () => {
      await sheOpensTheCalendar();
      await shePresses(earlierMonthTestID);
      await shePresses(earlierMonthTestID);
      await shePresses(earlierMonthTestID);

      await shePresses(dayTestID(oldest));

      expect(isChosen(oldest)).toBe(true);
      expect(longestLookBackDays).toBe(90);
    });

    it('says through its state that it cannot be pressed', async () => {
      await sheOpensTheCalendar();

      expect(screen.getByTestId(dayTestID(tomorrow)).props.accessibilityState).toMatchObject({
        disabled: true,
      });
      expect(screen.getByTestId(dayTestID(today)).props.accessibilityState).toMatchObject({
        disabled: false,
      });
    });

    it('is still on the screen, because a month with holes in it cannot be read', async () => {
      await sheOpensTheCalendar();

      expect(screen.getByTestId(dayTestID(tomorrow))).toBeTruthy();
      expect(everyDayHandle()).toContain(dayTestID('2026-05-31'));
    });
  });

  describe('paging from month to month', () => {
    it('reaches the month holding the oldest day she may choose', async () => {
      await sheOpensTheCalendar();

      await shePresses(earlierMonthTestID);
      await shePresses(earlierMonthTestID);
      await shePresses(earlierMonthTestID);

      expect(screen.getByTestId(monthTestID)).toHaveTextContent('February 2026');
      expect(screen.getByTestId(dayTestID(oldest))).toBeTruthy();
    });

    it('goes no further back than that month', async () => {
      await sheOpensTheCalendar();
      await shePresses(earlierMonthTestID);
      await shePresses(earlierMonthTestID);
      await shePresses(earlierMonthTestID);

      await shePresses(earlierMonthTestID);

      expect(screen.getByTestId(monthTestID)).toHaveTextContent('February 2026');
      expect(screen.getByTestId(earlierMonthTestID).props.accessibilityState).toMatchObject({
        disabled: true,
      });
    });

    it('goes no further forward than the month she is in', async () => {
      await sheOpensTheCalendar();

      await shePresses(laterMonthTestID);

      expect(screen.getByTestId(monthTestID)).toHaveTextContent('May 2026');
      expect(screen.getByTestId(laterMonthTestID).props.accessibilityState).toMatchObject({
        disabled: true,
      });
    });

    it('leaves her chosen day chosen when she pages away and back', async () => {
      await sheOpensTheCalendar('2026-05-09');

      await shePresses(earlierMonthTestID);
      expect(screen.queryByTestId(dayTestID('2026-05-09'))).toBeNull();

      await shePresses(laterMonthTestID);

      expect(screen.getByTestId(dayTestID('2026-05-09')).props.accessibilityState).toMatchObject({
        selected: true,
      });
    });
  });

  describe('the named days the redesign took away', () => {
    it('offers no Today and no Yesterday beside the month, only its squares', async () => {
      await sheOpensTheCalendar();

      expect(screen.queryByText('Yesterday')).toBeNull();
      expect(screen.queryAllByTestId(/^named-day-/)).toHaveLength(0);
    });
  });

  describe('what a screen reader hears', () => {
    it('reads a day out as a date rather than as a number', async () => {
      await sheOpensTheCalendar();

      expect(screen.getByLabelText('Saturday 9 May')).toBeTruthy();
      expect(screen.getByLabelText('Today')).toBeTruthy();
    });

    it('gives every square the role of a choice in a set', async () => {
      await sheOpensTheCalendar();

      expect(within(screen.getByTestId(calendarTestID)).getAllByRole('radio')).toHaveLength(31);
    });
  });
});
