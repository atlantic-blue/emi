import { fireEvent, render, screen } from '@testing-library/react-native';
import { OnAPhone } from '../fixtures/theSafeArea';

import {
  dayTestID,
  earlierMonthTestID,
  laterMonthTestID,
  monthTestID,
} from '../../src/features/onboarding/Calendar';
import { LastPeriod, namedDayTestID } from '../../src/features/onboarding/LastPeriod';
import { longestLookBackDays } from '../../src/features/onboarding/firstRun';

/** Well away from any summer time change, so the grid below reads the same in any timezone. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');
const today = '2026-05-14';
const yesterday = '2026-05-13';
const tomorrow = '2026-05-15';
/** The oldest day the first run accepts, ninety days back, and the day before it. */
const oldest = '2026-02-13';
const tooOld = '2026-02-12';

interface Painted {
  readonly chose: jest.Mock;
  readonly continued: jest.Mock;
}

async function sheOpensTheCalendar(chosen?: string): Promise<Painted> {
  const chose = jest.fn();
  const continued = jest.fn();

  await render(
    <OnAPhone>
      <LastPeriod
        chosen={chosen}
        now={whenSheOpensIt}
        onBack={() => undefined}
        onChoose={chose}
        onContinue={continued}
      />
    </OnAPhone>,
  );

  return { chose, continued };
}

async function shePresses(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

function everyDayHandle(): string[] {
  return screen
    .queryAllByTestId(/^day-\d{4}-\d{2}-\d{2}$/)
    .map((handle) => String(handle.props.testID));
}

describe('she picks the day her last period started from a month calendar', () => {
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
      const painted = await sheOpensTheCalendar();

      await shePresses(dayTestID(tomorrow));

      expect(painted.chose).not.toHaveBeenCalled();
    });

    it('does not answer when she presses a day further back than the first run reaches', async () => {
      const painted = await sheOpensTheCalendar();
      await shePresses(earlierMonthTestID);
      await shePresses(earlierMonthTestID);
      await shePresses(earlierMonthTestID);

      await shePresses(dayTestID(tooOld));

      expect(painted.chose).not.toHaveBeenCalled();
    });

    it('answers on the oldest day the first run does accept', async () => {
      const painted = await sheOpensTheCalendar();
      await shePresses(earlierMonthTestID);
      await shePresses(earlierMonthTestID);
      await shePresses(earlierMonthTestID);

      await shePresses(dayTestID(oldest));

      expect(painted.chose).toHaveBeenCalledWith(oldest);
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

  describe('the two answers she gives most often', () => {
    it('names today and yesterday, so she does not count squares', async () => {
      await sheOpensTheCalendar();

      expect(screen.getByTestId(namedDayTestID(today))).toHaveTextContent('Today');
      expect(screen.getByTestId(namedDayTestID(yesterday))).toHaveTextContent('Yesterday');
    });

    it('answers with the same day the square under it would', async () => {
      const painted = await sheOpensTheCalendar();

      await shePresses(namedDayTestID(yesterday));

      expect(painted.chose).toHaveBeenCalledWith(yesterday);
    });

    it('is marked when she has chosen that day', async () => {
      await sheOpensTheCalendar(today);

      expect(screen.getByTestId(namedDayTestID(today)).props.accessibilityState).toMatchObject({
        selected: true,
      });
      expect(screen.getByTestId(namedDayTestID(yesterday)).props.accessibilityState).toMatchObject({
        selected: false,
      });
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

      expect(screen.getAllByRole('radio')).toHaveLength(31 + 2);
    });
  });
});
