import type { DayRecord } from '@emi/crypto';
import { FORECAST_WINDOW_CYCLES, addDays } from '@emi/cycle';
import { colour } from '@emi/tokens';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet, type ViewStyle } from 'react-native';

import { listCycles } from '../../../src/data/cycleRepository';
import { CalendarScreen } from '../../../src/features/calendar/CalendarScreen';
import {
  cycleDayTestID,
  dateDiscTestID,
  legendTestID,
} from '../../../src/features/calendar/CycleMonth';
import { daySheetLineTestID, daySheetOpenTestID } from '../../../src/features/calendar/DaySheet';
import { daySheetWords, monthLegendCopy } from '../../../src/features/calendar/copy';
import {
  FORECAST_CYCLES_AHEAD,
  theCyclesAhead,
} from '../../../src/features/calendar/forecastAhead';
import { herMonth } from '../../../src/features/calendar/herMonth';
import { theDayPhaseOn } from '../../../src/features/calendar/herMonthPhases';
import { type HerReading, whatTheSheetSays } from '../../../src/features/calendar/theDaySheet';
import { type HerDay, herDaysOn } from '../../../src/features/cycle/herWeek';
import { recordedDays } from '../../../src/features/cycle/rebuild';
import { monthLabel } from '../../../src/features/onboarding/days';
import { english } from '../../../src/language/english';
import { daysLogged } from '../../fixtures/cycleCache';
import { herVault } from '../../fixtures/herVault';
import { OnAPhone } from '../../fixtures/theSafeArea';
import { symptomName } from '../../../src/features/log/symptomName';

/**
 * Issue 270: the calendar draws the forecast periods in the months ahead, starts the cycle day
 * again at 1 on each of them, and carries the fertile window into those months.
 */

const herCycleRuns = 28;
const herPeriodRuns = 5;
const today = '2026-10-05';

function aPeriodFrom(start: string): DayRecord[] {
  return Array.from({ length: herPeriodRuns + 1 }, (_unused, offset) => {
    const day = addDays(start, offset);

    return {
      day,
      flow: offset === herPeriodRuns ? ('none' as const) : ('medium' as const),
      recordedAt: `${day}T08:00:00.000Z`,
    };
  });
}

/** Her phone, read the way the calendar reads it. */
function herReading(starts: readonly string[], andAlso: readonly DayRecord[] = []): HerReading {
  const database = daysLogged(
    [...starts.flatMap(aPeriodFrom), ...andAlso],
    new Date(`${today}T20:00:00.000Z`),
  );

  return {
    cycles: listCycles(database),
    records: recordedDays(database, (payload) => herVault().open(payload)),
    today,
    statedCycleLengthDays: herCycleRuns,
    statedPeriodLengthDays: herPeriodRuns,
  };
}

/** Three periods, so two complete cycles of 28 days and a forecast of her own. */
const herThreePeriods = ['2026-07-25', '2026-08-22', '2026-09-19'];
/** One period, so Emi is still learning. */
const herOnePeriod = ['2026-09-19'];

function theDaysMarkedForecastIn(from: HerReading, month: string): string[] {
  return herMonth(from, month)
    .filter((day) => day.mark === 'forecast')
    .map((day) => day.day);
}

describe('the forecast periods in the months ahead', () => {
  it('reaches as many cycles ahead as the forecast reads cycles to make its median', () => {
    const ahead = theCyclesAhead(herReading(herThreePeriods));

    expect(FORECAST_CYCLES_AHEAD).toBe(FORECAST_WINDOW_CYCLES);
    expect(ahead.map((cycle) => cycle.startsOn)).toEqual([
      '2026-10-16',
      '2026-11-13',
      '2026-12-11',
      '2027-01-08',
      '2027-02-05',
      '2027-03-05',
    ]);
  });

  it('rings every day the forecast period may fall on in a month ahead, and nothing else', () => {
    // It may start on 13, 14 or 15 November and runs five days, so 13 to 19 November.
    expect(theDaysMarkedForecastIn(herReading(herThreePeriods), '2026-11-01')).toEqual([
      '2026-11-13',
      '2026-11-14',
      '2026-11-15',
      '2026-11-16',
      '2026-11-17',
      '2026-11-18',
      '2026-11-19',
    ]);
  });

  it('rings nothing past the reach of the forecast', () => {
    expect(theDaysMarkedForecastIn(herReading(herThreePeriods), '2027-03-01')).toHaveLength(7);
    expect(theDaysMarkedForecastIn(herReading(herThreePeriods), '2027-05-01')).toEqual([]);
  });

  it('draws only her next period while Emi is still learning, from the length she gave', () => {
    const from = herReading(herOnePeriod);

    expect(theCyclesAhead(from).map((cycle) => cycle.startsOn)).toEqual(['2026-10-14']);
    expect(theDaysMarkedForecastIn(from, '2026-10-01')).toEqual([
      '2026-10-14',
      '2026-10-15',
      '2026-10-16',
      '2026-10-17',
      '2026-10-18',
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
      '2026-10-24',
    ]);
    expect(theDaysMarkedForecastIn(from, '2026-11-01')).toEqual([]);
  });
});

describe('the cycle day over a date ahead of her', () => {
  it('starts again at 1 on each forecast period, and counts on from there', () => {
    const november = herMonth(herReading(herThreePeriods), '2026-11-01');
    const cycleDayOn = (day: string): number | undefined =>
      november.find((each) => each.day === day)?.cycleDay;

    expect(cycleDayOn('2026-11-12')).toBe(28);
    expect(cycleDayOn('2026-11-13')).toBe(1);
    expect(cycleDayOn('2026-11-30')).toBe(18);
  });

  it('keeps counting the cycle she is in once the range of her next period has opened', () => {
    // On 17 October the range of 16 to 18 October is open and she has not bled.
    const late = { ...herReading(herThreePeriods), today: '2026-10-17' };
    const october = herMonth(late, '2026-10-01');
    const dayOf = (day: string): HerDay | undefined => october.find((each) => each.day === day);

    expect(dayOf('2026-10-18')?.cycleDay).toBe(30);
    expect(dayOf('2026-10-18')?.mark).toBe('forecast');
    expect(dayOf('2026-10-22')?.mark).toBe('forecast');
    expect(dayOf('2026-10-23')?.mark).toBe('plain');
  });

  it('counts on past the forecast reach rather than inventing a period', () => {
    const may = herMonth(herReading(herThreePeriods), '2027-05-01');

    expect(may[0]?.cycleDay).toBeGreaterThan(herCycleRuns);
  });
});

describe('the fertile window in a month ahead', () => {
  it('marks the fertile days of the forecast cycle, with its ovulation day darker', () => {
    const from = herReading(herThreePeriods);
    const fertile = herMonth(from, '2026-11-01')
      .map((day) => day.day)
      .filter((day) => theDayPhaseOn(from, day)?.fertile === true);

    // The first is the end of the window of the forecast cycle that may start on 16 October.
    expect(fertile).toEqual([
      '2026-11-01',
      '2026-11-23',
      '2026-11-24',
      '2026-11-25',
      '2026-11-26',
      '2026-11-27',
      '2026-11-28',
      '2026-11-29',
    ]);
    expect(theDayPhaseOn(from, '2026-10-31')?.ovulating).toBe(true);
    expect(theDayPhaseOn(from, '2026-11-28')?.ovulating).toBe(true);
    expect(theDayPhaseOn(from, '2026-11-27')?.ovulating).toBe(false);
    expect(theDayPhaseOn(from, '2026-11-14')).toEqual(
      expect.objectContaining({ fertile: false, phase: 'period' }),
    );
  });
});

describe('the card at the foot, for the three kinds of day', () => {
  const from = herReading(herThreePeriods, [
    { day: '2026-10-01', symptoms: ['cramps'], recordedAt: '2026-10-01T09:00:00.000Z' },
  ]);
  const said = (day: string): ReturnType<typeof daySheetWords> => {
    const hers = herDaysOn(from, [day])[0];

    if (hers === undefined) {
      throw new Error(`${day} gave no day`);
    }

    return daySheetWords(
      whatTheSheetSays(
        from,
        hers,
        from.records.find((record) => record.day === day),
      ),
    );
  };

  it('says when her next period is likely to start, on a forecast day', () => {
    expect(said('2026-10-17')).toEqual({
      lead: 'Saturday, 17 October',
      line: 'Your next period is likely to start between 16 and 18 October.',
    });
  });

  it('says a later period, and the range that crosses two months, on a later forecast day', () => {
    expect(said('2026-11-30').line).toBe(
      'A later period is likely to start between 11 and 13 December.',
    );
    expect(said('2026-10-31').line).toBe(
      'A later period is likely to start between 13 and 15 November.',
    );
  });

  it('says her cycle day, the phase and what she logged, on a day she lived', () => {
    expect(said('2026-10-01')).toEqual({
      lead: 'Thursday, 1 October',
      line: `Day 13, follicular. ${symptomName('cramps')}`,
    });
  });

  it('says Nothing logged on a day she lived and logged nothing on', () => {
    expect(said('2026-09-28').line).toBe(
      `Day 10, follicular. ${english['calendar.daySheet.nothingLogged']}`,
    );
  });
});

describe('the month ahead, drawn', () => {
  async function sheReads(month: string, pressed: string): Promise<void> {
    const from = herReading(herThreePeriods);
    const hers = herDaysOn(from, [pressed])[0];

    if (hers === undefined) {
      throw new Error(`${pressed} gave no day`);
    }

    await render(
      <OnAPhone>
        <CalendarScreen
          days={herMonth(from, month)}
          month={month}
          onBack={() => undefined}
          onEarlierMonth={() => undefined}
          onEditPeriod={() => undefined}
          onLaterMonth={() => undefined}
          onOpenDay={() => undefined}
          onRecordSex={() => undefined}
          onPressDay={() => undefined}
          onToday={() => undefined}
          phaseOn={(day) => theDayPhaseOn(from, day)}
          shePressed={whatTheSheetSays(from, hers, undefined)}
          today={today}
        />
      </OnAPhone>,
    );
  }

  const discOf = (day: string): ViewStyle =>
    StyleSheet.flatten(screen.getByTestId(dateDiscTestID(day)).props.style) as ViewStyle;

  it('names the month and the year as the title, and the three entries of the legend', async () => {
    await sheReads('2026-11-01', '2026-11-14');

    expect(screen.getByText(monthLabel('2026-11-01'))).toBeTruthy();
    expect(monthLabel('2026-11-01')).toBe('November 2026');
    expect(screen.getByTestId(legendTestID('forecast'))).toBeTruthy();
    expect(screen.getByText(monthLegendCopy.forecast)).toBeTruthy();
  });

  it('draws the forecast period in dashed rings, the cycle day 1 over its first day', async () => {
    await sheReads('2026-11-01', '2026-11-14');

    expect(discOf('2026-11-13').borderStyle).toBe('dashed');
    expect(discOf('2026-11-19').borderStyle).toBe('dashed');
    expect(discOf('2026-11-13').borderColor).toBe(colour.period);
    expect(discOf('2026-11-12').borderStyle).toBeUndefined();
    expect(discOf('2026-11-20').borderStyle).toBeUndefined();
    expect(screen.getByTestId(cycleDayTestID('2026-11-13')).props.children).toBe(1);
    expect(discOf('2026-11-28').backgroundColor).toBe(colour.ovulation);
    expect(discOf('2026-11-25').backgroundColor).toBe(colour.washWarm);
  });

  it('gives a forecast day a card with no way into the day', async () => {
    await sheReads('2026-11-01', '2026-11-14');

    expect(screen.queryByTestId(daySheetOpenTestID)).toBeNull();
    expect(screen.getByTestId(daySheetLineTestID).props.children).toBe(
      'A later period is likely to start between 13 and 15 November.',
    );
  });
});
