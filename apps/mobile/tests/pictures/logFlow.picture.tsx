import { OnAPhone, theScreenIn } from '../fixtures/theSafeArea';

import type { Flow } from '@emi/cycle';
import { addDays } from '@emi/cycle';
import { render } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { listCycles } from '../../src/data/cycleRepository';
import { recordedDays } from '../../src/features/cycle/rebuild';
import { ringInputFor } from '../../src/features/cycle/ringInput';
import { LogFlow } from '../../src/features/log/LogFlow';
import { LogSymptoms } from '../../src/features/log/LogSymptoms';
import { symptomsAskedBy } from '../../src/features/log/askedGroup';
import { groupsInHerOrder } from '../../src/features/log/herOrder';
import { daysOf, veryRegular } from '../../../../packages/cycle/tests/fixtures/recordedSets';
import type { DrawnScreen } from '../../../../brand/screens/asHtml';
import { drawOrCheck } from '../../../../brand/screens/picture';
import { daysLogged, readDay } from '../fixtures/cycleCache';
import { recordedAt } from '../fixtures/forecast';

const theCaveat = [
  'Rendered from the tree the flow screen produced under the test runner, at 390 by 844 points,',
  'and not captured from a phone. The page loads the same font files the application loads, so the',
  'words are drawn in Figtree.',
  'The room kept at the top and the bottom of each screen is the room an iPhone with a dynamic',
  'island keeps for itself, which is 59 points and 34 points.',
].join(' ');

const theDaySheOpensIt = 14;

interface State {
  readonly title: string;
  readonly note: string;
  readonly chosen?: Flow;
  readonly marked: boolean;
  /** What the screen opens on, which the address she arrived by decides. */
  readonly opensOn?: 'flow' | 'symptoms';
}

const theStates: readonly State[] = [
  {
    title: 'Day 14, nothing picked yet',
    note: 'No bleeding, so there is nothing to mark.',
    marked: false,
  },
  {
    title: 'She picks spotting',
    note: 'The question arrives under the flow she picked.',
    chosen: 'spotting',
    marked: false,
  },
  {
    title: 'She says it is not her period',
    note: 'The mark is on, and the line says what it did.',
    chosen: 'spotting',
    marked: true,
  },
  {
    title: 'She pressed All symptoms',
    note: 'The log opens on the symptoms of her two groups, with the search above them and Save at the foot.',
    marked: false,
    opensOn: 'symptoms',
  },
];

/** The two groups she named at her first run, which is what opens them first. */
const sheSaidTheseChangeWithHerCycle = ['mood', 'pain'] as const;

async function drawn(state: State): Promise<DrawnScreen> {
  const database = daysLogged(daysOf(veryRegular), recordedAt);
  const cycles = listCycles(database);
  const open = cycles[cycles.length - 1];

  if (open === undefined) {
    throw new Error('the recorded set holds no cycle, so there is no day 14 to draw');
  }

  const today = addDays(open.startedOn, theDaySheOpensIt - 1);
  const ring = ringInputFor({
    cycles,
    records: recordedDays(database, readDay),
    today,
    statedCycleLengthDays: 28,
  });

  const view = await render(
    <OnAPhone>
      {state.opensOn === 'symptoms' ? (
        <LogSymptoms
          asked={
            symptomsAskedBy({ on: 'symptoms' }, sheSaidTheseChangeWithHerCycle) ?? {
              groups: [],
              opensOn: 'groups',
            }
          }
          focus={sheSaidTheseChangeWithHerCycle}
          held={['cramps']}
          leave="close"
          onLeave={() => undefined}
          onSave={() => undefined}
          title="Today"
        />
      ) : (
        <LogFlow
          chosen={state.chosen}
          day={today}
          dones="top"
          groups={groupsInHerOrder(sheSaidTheseChangeWithHerCycle)}
          leave="close"
          marked={state.marked}
          onDone={() => undefined}
          onLeave={() => undefined}
          note=""
          onMark={() => undefined}
          onNote={() => undefined}
          onOpenGroup={() => undefined}
          onPick={() => undefined}
          onOtherDischarge={() => undefined}
          onSearch={() => undefined}
          onToggleSymptom={() => undefined}
          ring={ring}
          symptoms={[]}
          title="Today"
        />
      )}
    </OnAPhone>,
  );
  const tree: unknown = theScreenIn(view);

  view.unmount();

  return { title: state.title, note: state.note, tree };
}

const screens: DrawnScreen[] = [];

describe('the flow screen, drawn for somebody to look at', () => {
  beforeEach(() => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  for (const state of theStates) {
    it(`renders ${state.title.toLowerCase()}`, async () => {
      screens.push(await drawn(state));
    });
  }

  it('draws them into one picture', async () => {
    expect(screens).toHaveLength(theStates.length);

    const result = drawOrCheck({
      name: 'log-flow',
      screens: screens,
      caveat: theCaveat,
      script: 'generate:flow-picture',
    });

    expect(result.problems).toEqual([]);
    console.log(result.said);
  });
});
