import { render } from '@testing-library/react-native';

import { listCycles } from '../../src/data/cycleRepository';
import { EditPeriodScreen } from '../../src/features/calendar/PeriodRangePicker';
import { herMonth } from '../../src/features/calendar/herMonth';
import { thePeriodEmiHoldsIn } from '../../src/features/calendar/savePeriod';
import { recordedDays } from '../../src/features/cycle/rebuild';
import type { DrawnScreen } from '../../../../brand/screens/asHtml';
import { iPhone16Size } from '../../../../brand/screens/asHtml';
import { drawOrCheck } from '../../../../brand/screens/picture';
import { daysLogged } from '../fixtures/cycleCache';
import { herVault } from '../fixtures/herVault';
import { OnAPhone, theScreenIn } from '../fixtures/theSafeArea';
import {
  herCycleRuns,
  herRecordedDays,
  theDaySheOpensEmi,
  theDaySheTakesOff,
  theDaysEmiHolds,
  theDaysSheAdds,
  theMonthSheCorrects,
} from '../fixtures/thePeriodSheCorrects';

/**
 * The period picker, drawn from days written into a database of its own, so every cycle day and
 * every tick on the page is the one her own records produce.
 *
 * It is not part of the suite: the file is named for a picture rather than for a test, and the
 * runner is pointed at it by `npm run generate:edit-period-picture`.
 */

const theCaveat = [
  'Rendered from the tree the period picker produced under the test runner, at 393 by 852 points,',
  'which is the glass of an iPhone 16, and not captured from a phone. The page loads the same font',
  'files the application loads, so the words are drawn in Plus Jakarta Sans. Reproduce with:',
  'npm run generate:edit-period-picture.',
  'The room kept at the top and the bottom of each screen is the room an iPhone with a dynamic',
  'island keeps for itself, which is 59 points and 34 points.',
].join(' ');

const recordedAt = new Date(`${theDaySheOpensEmi()}T20:00:00.000Z`);

/** The month she is correcting, worked out from the days her phone holds. */
function herReading(): {
  readonly days: ReturnType<typeof herMonth>;
  readonly held: readonly string[];
} {
  const database = daysLogged(herRecordedDays(), recordedAt);
  const records = recordedDays(database, (payload) => herVault().open(payload));

  return {
    days: herMonth(
      {
        cycles: listCycles(database),
        records,
        today: theDaySheOpensEmi(),
        statedCycleLengthDays: herCycleRuns,
        statedPeriodLengthDays: theDaysEmiHolds().length,
      },
      theMonthSheCorrects,
    ),
    held: thePeriodEmiHoldsIn(records, theMonthSheCorrects),
  };
}

interface State {
  readonly title: string;
  readonly note: string;
  /** The days she is holding at that moment, which is what carries a tick. */
  readonly ticked: readonly string[];
}

const theStates: readonly State[] = [
  {
    title: 'The period Emi holds, as she opens the screen',
    note: 'The four days she recorded bleeding on carry a tick. Nothing has changed yet, so the line under the month says there is nothing to save and Save takes no press.',
    ticked: theDaysEmiHolds(),
  },
  {
    title: 'The period she corrected, ready to save',
    note: 'She added the two days her period ran on for, and took off the day it did not start on. The line under the month names both changes, and Save is offered. One press writes a record for each of those three days and rebuilds the cycles from her day log.',
    ticked: [
      ...theDaysEmiHolds().filter((day) => day !== theDaySheTakesOff()),
      ...theDaysSheAdds(),
    ].sort(),
  },
];

async function drawn(state: State): Promise<DrawnScreen> {
  const hers = herReading();
  const view = await render(
    <OnAPhone>
      <EditPeriodScreen
        days={hers.days}
        held={hers.held}
        month={theMonthSheCorrects}
        onCancel={() => undefined}
        onSave={() => undefined}
        onToggle={() => undefined}
        ticked={state.ticked}
        today={theDaySheOpensEmi()}
      />
    </OnAPhone>,
  );
  const tree: unknown = theScreenIn(view);

  view.unmount();

  return { title: state.title, note: state.note, tree };
}

const screens: DrawnScreen[] = [];

describe('the period she corrects, drawn for somebody to look at', () => {
  for (const state of theStates) {
    it(`renders ${state.title.toLowerCase()}`, async () => {
      screens.push(await drawn(state));
    });
  }

  it('draws them into one picture', async () => {
    expect(screens).toHaveLength(theStates.length);

    const result = drawOrCheck({
      name: 'edit-period',
      screens: screens,
      caveat: theCaveat,
      script: 'generate:edit-period-picture',
      size: iPhone16Size,
    });

    expect(result.problems).toEqual([]);
    console.log(result.said);
  });
});
