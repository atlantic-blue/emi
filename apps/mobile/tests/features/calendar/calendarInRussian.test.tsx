import { render, screen } from '@testing-library/react-native';

import { CalendarScreen, calendarTitleTestID } from '../../../src/features/calendar/CalendarScreen';
import { legendTestID } from '../../../src/features/calendar/CycleMonth';
import { herMonth } from '../../../src/features/calendar/herMonth';
import { monthLabel } from '../../../src/features/onboarding/days';
import { russian } from '../../../src/language/russian';
import { textIn } from '../../fixtures/renderedText';
import { OnAPhone } from '../../fixtures/theSafeArea';

jest.mock('expo-localization', () => ({ getLocales: jest.fn(() => [{ languageTag: 'ru-RU' }]) }));

/**
 * Issue 270 in Russian: a month standing alone as a title is written in the nominative, with a
 * capital letter, and the legend says "Месячные", as the board calendarNovemberRussian draws it.
 */

const november = '2026-11-01';
const today = '2026-10-05';

async function sheReadsNovember(): Promise<void> {
  await render(
    <OnAPhone>
      <CalendarScreen
        days={herMonth({ cycles: [], records: [], statedCycleLengthDays: 28, today }, november)}
        month={november}
        onBack={() => undefined}
        onEarlierMonth={() => undefined}
        onEditPeriod={() => undefined}
        onLaterMonth={() => undefined}
        onOpenDay={() => undefined}
        onRecordSex={() => undefined}
        onPressDay={() => undefined}
        onToday={() => undefined}
        today={today}
      />
    </OnAPhone>,
  );
}

function saidUnder(testID: string): string {
  return textIn(screen.getByTestId(testID)).join('');
}

describe('the calendar in Russian', () => {
  it('names the month in the nominative, with a capital letter, as the title', async () => {
    await sheReadsNovember();

    expect(saidUnder(calendarTitleTestID)).toBe('Ноябрь 2026');
    expect(monthLabel('2026-10-01')).toBe('Октябрь 2026');
  });

  it('no longer uses the genitive a date takes, which issue 270 found in the title', async () => {
    await sheReadsNovember();

    expect(saidUnder(calendarTitleTestID)).not.toContain(russian['calendar.month.november']);
    expect(russian['calendar.month.november']).toBe('ноября');
  });

  it('names the three entries of the legend as the Russian board does', async () => {
    await sheReadsNovember();

    expect(saidUnder(legendTestID('period'))).toBe('Месячные');
    expect(saidUnder(legendTestID('forecast'))).toBe('Прогноз');
    expect(saidUnder(legendTestID('fertile'))).toBe('Фертильные дни');
  });

  it('keeps the four strings issue 276 corrected', () => {
    expect(russian['calendar.legend.fertile']).toBe('Фертильные дни');
    // The opening the native speaker wrote for issue 276 stays, with its corrected spacing.
    expect(russian['calendar.editPeriod.leadWithNoDay']).toMatch(/^Укажите дни с месячными\. /);
    expect(russian['calendar.editPeriod.leadWithNoDay']).not.toMatch(/ {2}| \./);
  });
});
