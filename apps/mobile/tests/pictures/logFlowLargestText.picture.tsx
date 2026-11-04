import { OnAPhone, theScreenIn } from '../fixtures/theSafeArea';

import type { Flow } from '@emi/cycle';
import { addDays } from '@emi/cycle';
import { MAXIMUM_TEXT_GROWTH } from '@emi/tokens';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import type { Metrics } from 'react-native-safe-area-context';

import { listCycles } from '../../src/data/cycleRepository';
import { recordedDays } from '../../src/features/cycle/rebuild';
import { ringInputFor } from '../../src/features/cycle/ringInput';
import { flowLabelTestID, flowPickerTestID } from '../../src/features/log/FlowPicker';
import { LogFlow } from '../../src/features/log/LogFlow';
import { logHeaderDoneRoomTestID } from '../../src/features/log/LogHeader';
import { words } from '../../src/language';
import { daysOf, veryRegular } from '../../../../packages/cycle/tests/fixtures/recordedSets';
import type { DrawnScreen, PhoneSize } from '../../../../brand/screens/asHtml';
import { atTextSize } from '../../../../brand/screens/asHtml';
import { drawOrCheck } from '../../../../brand/screens/picture';
import { daysLogged, readDay } from '../fixtures/cycleCache';
import { recordedAt } from '../fixtures/forecast';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'es-ES' }] }));

const theCaveat = [
  'Rendered, not observed: drawn from the tree the flow screen produced under the test runner with',
  'the phone language set to Spanish, at 375 by 667 points, which is the glass of an iPhone SE, with',
  'every run of text grown by 1.3 times, the limit the largest text size reaches. The width of each',
  'word and of Hecho is the one the iPhone SE simulator reported at the largest text size, handed to',
  'the screen as the phone hands it. Reproduce with: npm run generate:flow-largest-text-picture.',
].join(' ');

const theSmallestIPhone: PhoneSize = { width: 375, height: 667 };

const theSmallestIPhoneMetrics: Metrics = {
  frame: { x: 0, y: 0, ...theSmallestIPhone },
  insets: { bottom: 0, left: 0, right: 0, top: 20 },
};

/** Points, read on the iPhone SE simulator in Spanish at the largest text size. */
const theRow = 303;
const ONE_LINE = 23.5;
const theWords: Readonly<Record<Flow, number>> = {
  none: 66.5,
  spotting: 81,
  light: 49.5,
  medium: 48.5,
  heavy: 86.5,
};
const hecho = 75;

const theDaySheOpensIt = 14;

interface State {
  readonly title: string;
  readonly note: string;
  readonly chosen?: Flow;
}

const theStates: readonly State[] = [
  {
    title: 'The largest text size, nothing picked',
    note: 'The five words do not fit on one row, so Manchado and Medio move to a lower line.',
  },
  {
    title: 'She picks Manchado',
    note: 'A word on the lower line picks its flow, and the two lines stay.',
    chosen: 'spotting',
  },
];

async function drawn(state: State): Promise<DrawnScreen> {
  const database = daysLogged(daysOf(veryRegular), recordedAt);
  const cycles = listCycles(database);
  const open = cycles[cycles.length - 1];

  if (open === undefined) {
    throw new Error('the recorded set holds no cycle, so there is no day 14 to draw');
  }

  const ring = ringInputFor({
    cycles,
    records: recordedDays(database, readDay),
    today: addDays(open.startedOn, theDaySheOpensIt - 1),
    statedCycleLengthDays: 28,
  });

  const view = await render(
    <OnAPhone metrics={theSmallestIPhoneMetrics}>
      <LogFlow
        chosen={state.chosen}
        day={addDays(open.startedOn, theDaySheOpensIt - 1)}
        dones="top"
        groups={[]}
        leave="close"
        marked={false}
        note=""
        onDone={() => undefined}
        onLeave={() => undefined}
        onMark={() => undefined}
        onNote={() => undefined}
        onOpenGroup={() => undefined}
        onOtherDischarge={() => undefined}
        onPick={() => undefined}
        onSearch={() => undefined}
        onToggleSymptom={() => undefined}
        ring={ring}
        symptoms={[]}
        title={words('log.title.today')}
      />
    </OnAPhone>,
  );

  for (const [flow, width] of Object.entries(theWords) as [Flow, number][]) {
    await fireEvent(screen.getByTestId(flowLabelTestID(flow)), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width, height: ONE_LINE } },
    });
  }
  await fireEvent(screen.getByTestId(flowPickerTestID), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: theRow, height: 100 } },
  });
  await fireEvent(
    screen.getByTestId(logHeaderDoneRoomTestID, { includeHiddenElements: true }),
    'layout',
    { nativeEvent: { layout: { x: 0, y: 0, width: hecho, height: 0 } } },
  );

  const tree = atTextSize(theScreenIn(view), MAXIMUM_TEXT_GROWTH);

  view.unmount();

  return { title: state.title, note: state.note, tree };
}

const screens: DrawnScreen[] = [];

describe('the flow screen at the largest text size, drawn for somebody to look at', () => {
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
      name: 'log-flow-largest-text',
      screens,
      caveat: theCaveat,
      script: 'generate:flow-largest-text-picture',
      size: theSmallestIPhone,
    });

    expect(result.problems).toEqual([]);
    console.log(result.said);
  });
});
