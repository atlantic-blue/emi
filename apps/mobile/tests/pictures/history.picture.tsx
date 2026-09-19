import type { DayRecord } from '@emi/crypto';
import { addDays } from '@emi/cycle';
import { render } from '@testing-library/react-native';

import type { Database } from '../../src/data/database';
import { logDay } from '../../src/features/cycle/rebuild';
import { HistoryScreen } from '../../src/features/history/HistoryScreen';
import { historyNow } from '../../src/features/history/historyNow';
import type { DrawnScreen } from '../../../../brand/screens/asHtml';
import { drawOrCheck } from '../../../../brand/screens/picture';
import { migratedDatabase } from '../fixtures/cycleCache';
import { OnAPhone, theScreenIn } from '../fixtures/theSafeArea';
import { herVault } from '../fixtures/herVault';

const theCaveat = [
  'Rendered from the tree the history screen produced under the test runner, at 390 by 844 points,',
  'and not captured from a phone. The page loads the same font files the application loads, so the',
  'words are drawn in Plus Jakarta Sans.',
  'The room kept at the top and the bottom of each screen is the room an iPhone with a dynamic',
  'island keeps for itself, which is 59 points and 34 points.',
].join(' ');

const recordedAt = new Date('2026-05-14T20:00:00.000Z');

const herCycleLengthDays = 28;
const herPeriodDays = 4;
const herLastPeriodStarted = '2026-05-01';

function herPeriodStarts(count: number): string[] {
  return Array.from({ length: count }, (_unused, back) =>
    addDays(herLastPeriodStarted, -(count - 1 - back) * herCycleLengthDays),
  );
}

function bleedingDays(starts: readonly string[]): DayRecord[] {
  return starts.flatMap((start) =>
    Array.from({ length: herPeriodDays }, (_unused, day) => ({
      day: addDays(start, day),
      flow: 'medium' as const,
      recordedAt: `${addDays(start, day)}T08:00:00.000Z`,
    })),
  );
}

function herDays(cycles: number): DayRecord[] {
  const starts = herPeriodStarts(cycles + 1);
  const closed = starts.slice(1);

  return [
    ...bleedingDays(starts),
    ...closed.map((period) => ({
      day: addDays(period, -3),
      symptoms: ['cramps'],
      moods: ['irritable'],
      recordedAt: `${addDays(period, -3)}T20:00:00.000Z`,
    })),
    ...closed.slice(-4).map((period) => ({
      day: addDays(period, -12),
      symptoms: ['acne'],
      recordedAt: `${addDays(period, -12)}T20:00:00.000Z`,
    })),
  ];
}

function herPhone(cycles: number): Database {
  const database = migratedDatabase();

  for (const record of herDays(cycles)) {
    logDay(
      database,
      { day: record.day, payload: herVault().seal(record), now: recordedAt },
      herVault().open,
    );
  }

  return database;
}

interface State {
  readonly title: string;
  readonly note: string;
  readonly cycles: number;
}

const theStates: readonly State[] = [
  {
    title: 'Six cycles behind her',
    note: 'Three came back often enough to name, and each line carries the count behind it.',
    cycles: 6,
  },
  {
    title: 'One cycle behind her',
    note: 'Too few cycles to read a pattern from, so Emi says how many it wants.',
    cycles: 1,
  },
];

async function drawn(state: State): Promise<DrawnScreen> {
  const view = await render(
    <OnAPhone>
      <HistoryScreen
        history={historyNow(herPhone(state.cycles), herVault())}
        onBack={() => undefined}
        onOpenDay={() => undefined}
      />
    </OnAPhone>,
  );
  const tree: unknown = theScreenIn(view);

  view.unmount();

  return { title: state.title, note: state.note, tree };
}

const screens: DrawnScreen[] = [];

describe('the history screen, drawn for somebody to look at', () => {
  for (const state of theStates) {
    it(`renders ${state.title.toLowerCase()}`, async () => {
      screens.push(await drawn(state));
    });
  }

  it('draws them into one picture', async () => {
    expect(screens).toHaveLength(theStates.length);

    const result = drawOrCheck({
      name: 'history',
      screens: screens,
      caveat: theCaveat,
      script: 'generate:history-picture',
    });

    expect(result.problems).toEqual([]);
    console.log(result.said);
  });
});
