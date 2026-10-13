import type { DayRecord } from '@emi/crypto';
import { addDays } from '@emi/cycle';
import { render } from '@testing-library/react-native';

import { listCycles } from '../../src/data/cycleRepository';
import { CalendarScreen } from '../../src/features/calendar/CalendarScreen';
import { theCyclesAhead } from '../../src/features/calendar/forecastAhead';
import { herMonth } from '../../src/features/calendar/herMonth';
import { theDayPhaseOn } from '../../src/features/calendar/herMonthPhases';
import { type HerReading, whatTheSheetSays } from '../../src/features/calendar/theDaySheet';
import { herDaysOn } from '../../src/features/cycle/herWeek';
import { recordedDays } from '../../src/features/cycle/rebuild';
import type { DrawnScreen } from '../../../../brand/screens/asHtml';
import { iPhone16Size } from '../../../../brand/screens/asHtml';
import { drawOrCheck } from '../../../../brand/screens/picture';
import { daysLogged } from '../fixtures/cycleCache';
import { herVault } from '../fixtures/herVault';
import { OnAPhone, theScreenIn } from '../fixtures/theSafeArea';

jest.mock('expo-localization', () => ({ getLocales: jest.fn(() => [{ languageTag: 'ru-RU' }]) }));

/**
 * November in Russian, drawn from days written into a database of its own. The application reads
 * the language of the phone and has no switch of its own, so this picture is rendered with the
 * phone language set to Russian under the test runner, and not captured from a phone.
 *
 * It is not part of the suite: the runner is pointed at it by
 * `npm run generate:calendar-russian-picture`.
 */

const theCaveat = [
  'Rendered, not observed: drawn from the tree the month screen produced under the test runner with',
  'the phone language set to Russian, at 393 by 852 points, which is the glass of an iPhone 16. The',
  'shipped faces carry no Cyrillic, so the page draws the Russian words in a face the browser picks.',
  'Reproduce with: npm run generate:calendar-russian-picture.',
].join(' ');

const today = '2026-10-05';
const herPeriodRuns = 5;
const herPeriodStarts = ['2026-07-25', '2026-08-22', '2026-09-19'];

function herDays(): DayRecord[] {
  return herPeriodStarts.flatMap((start) =>
    Array.from({ length: herPeriodRuns + 1 }, (_unused, offset) => {
      const day = addDays(start, offset);

      return {
        day,
        flow: offset === herPeriodRuns ? ('none' as const) : ('medium' as const),
        recordedAt: `${day}T08:00:00.000Z`,
      };
    }),
  );
}

function herReading(): HerReading {
  const database = daysLogged(herDays(), new Date(`${today}T20:00:00.000Z`));

  return {
    cycles: listCycles(database),
    records: recordedDays(database, (payload) => herVault().open(payload)),
    today,
    statedCycleLengthDays: 28,
    statedPeriodLengthDays: herPeriodRuns,
  };
}

async function drawn(): Promise<DrawnScreen> {
  const from = herReading();
  const month = '2026-11-01';
  const pressed = theCyclesAhead(from).find((cycle) => cycle.startsOn >= month)?.startsOn;
  const hers = pressed === undefined ? undefined : herDaysOn(from, [pressed])[0];

  if (hers === undefined) {
    throw new Error('her three cycles reached no forecast period in November');
  }

  const view = await render(
    <OnAPhone>
      <CalendarScreen
        days={herMonth(from, month)}
        month={month}
        onBack={() => undefined}
        onEarlierMonth={() => undefined}
        onEditPeriod={() => undefined}
        onLaterMonth={() => undefined}
        onOpenDay={() => undefined}
        onPressDay={() => undefined}
        onToday={() => undefined}
        phaseOn={(day) => theDayPhaseOn(from, day)}
        shePressed={whatTheSheetSays(from, hers, undefined)}
        today={today}
      />
    </OnAPhone>,
  );
  const tree: unknown = theScreenIn(view);

  view.unmount();

  return {
    title: 'Ноябрь 2026, with the first day of a forecast period pressed',
    note: 'The title is the nominative month name. The legend reads Месячные, Прогноз and Фертильные дни. The forecast period starts again at day 1 in dashed rings, and the card says when that period is likely to start.',
    tree,
  };
}

const screens: DrawnScreen[] = [];

describe('November in Russian, drawn for somebody to look at', () => {
  it('renders the month', async () => {
    screens.push(await drawn());
  });

  it('draws it into one picture', async () => {
    expect(screens).toHaveLength(1);

    const result = drawOrCheck({
      name: 'calendar-russian',
      screens: screens,
      caveat: theCaveat,
      script: 'generate:calendar-russian-picture',
      size: iPhone16Size,
    });

    expect(result.problems).toEqual([]);
    console.log(result.said);
  });
});
