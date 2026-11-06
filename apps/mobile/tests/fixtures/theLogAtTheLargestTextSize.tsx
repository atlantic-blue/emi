import type { ReactElement } from 'react';
import type { Flow } from '@emi/cycle';
import { addDays } from '@emi/cycle';
import { MAXIMUM_TEXT_GROWTH } from '@emi/tokens';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import type { Metrics } from 'react-native-safe-area-context';

import { fluidGridWordTestID } from '../../src/components/FluidGrid';
import { headingRowEndTestID, headingRowMeasureTestID } from '../../src/components/HeadingRow';
import { listCycles } from '../../src/data/cycleRepository';
import { recordedDays } from '../../src/features/cycle/rebuild';
import type { RingInput } from '../../src/features/cycle/ringInput';
import { ringInputFor } from '../../src/features/cycle/ringInput';
import { flowGridTestID, flowLabelTestID } from '../../src/features/log/FlowPicker';
import {
  LogFlow,
  logFlowFlowTopTestID,
  logFlowSymptomsTopTestID,
} from '../../src/features/log/LogFlow';
import { logHeaderDoneRoomTestID } from '../../src/features/log/LogHeader';
import { dateWords } from '../../src/features/onboarding/days';
import { words } from '../../src/language';
import type { Language } from '../../src/language/language';
import { daysOf, veryRegular } from '../../../../packages/cycle/tests/fixtures/recordedSets';
import type { DrawnScreen, PhoneSize } from '../../../../brand/screens/asHtml';
import { atTextSize } from '../../../../brand/screens/asHtml';
import { drawOrCheck } from '../../../../brand/screens/picture';
import { daysLogged, readDay } from './cycleCache';
import { recordedAt } from './forecast';
import { OnAPhone, theScreenIn } from './theSafeArea';

const theNames: Readonly<Record<Language, string>> = {
  en: 'English',
  es: 'Spanish',
  ru: 'Russian',
};

function theCaveat(name: string, picture: string): string {
  return [
    `Rendered, not observed: drawn from the tree the log screen produced under the test runner with`,
    `the phone language set to ${name}, at 375 by 667 points, which is the glass of an iPhone SE, with`,
    'every run of text grown by 1.3 times, the limit the largest text size reaches. The width of each',
    `word, of each card heading and its link, and of the done link is the one the iPhone SE simulator reported at the largest text size,`,
    `handed to the screen as the phone hands it. The page is ${picture}.`,
    'Reproduce with: npm run generate:flow-largest-text-picture.',
  ].join(' ');
}

const theSmallestIPhone: PhoneSize = { width: 375, height: 667 };

const theSmallestIPhoneMetrics: Metrics = {
  frame: { x: 0, y: 0, ...theSmallestIPhone },
  insets: { bottom: 0, left: 0, right: 0, top: 20 },
};

/** Points, read on the iPhone SE simulator at the largest text size. */
const theRow = 303;
const ONE_LINE = 23.5;
const theWords: Readonly<Record<Language, Readonly<Record<Flow, number>>>> = {
  en: { none: 42, spotting: 68.5, light: 40.5, medium: 63, heavy: 50.5 },
  es: { none: 66.5, spotting: 81, light: 49.5, medium: 48.5, heavy: 86.5 },
  ru: { none: 31.5, spotting: 56.5, light: 76.5, medium: 74, heavy: 89 },
};
const theDone: Readonly<Record<Language, number>> = { en: 63, es: 75, ru: 123.5 };
const theCardTops: Readonly<
  Record<Language, Readonly<Record<string, { readonly heading: number; readonly end: number }>>>
> = {
  en: {
    [logFlowFlowTopTestID]: { heading: 71, end: 151.5 },
    [logFlowSymptomsTopTestID]: { heading: 118.5, end: 77 },
  },
  es: {
    [logFlowFlowTopTestID]: { heading: 61.5, end: 99 },
    [logFlowSymptomsTopTestID]: { heading: 102, end: 75.5 },
  },
  ru: {
    [logFlowFlowTopTestID]: { heading: 123, end: 188 },
    [logFlowSymptomsTopTestID]: { heading: 172.5, end: 75 },
  },
};

const theDaySheOpensIt = 14;
const theDaySheGoesBackTo = 3;

const database = daysLogged(daysOf(veryRegular), recordedAt);
const cycles = listCycles(database);
const open = cycles[cycles.length - 1];

if (open === undefined) {
  throw new Error('the recorded set holds no cycle, so there is no day 14 to draw');
}

const today = addDays(open.startedOn, theDaySheOpensIt - 1);
const thePastDay = addDays(open.startedOn, theDaySheGoesBackTo - 1);
const ring: RingInput | undefined = ringInputFor({
  cycles,
  records: recordedDays(database, readDay),
  today,
  statedCycleLengthDays: 28,
});

interface State {
  readonly title: string;
  readonly note: string;
  readonly isPastDay: boolean;
  readonly chosen?: Flow;
}

const theStates: readonly State[] = [
  {
    title: 'The log of today, nothing picked',
    note: 'The widest word does not fit a fifth of the row with a gap, so the five options take three and two, in order.',
    isPastDay: false,
  },
  {
    title: 'A past day, heavy picked',
    note: 'A past day draws the same options, and an option on the second line holds its pick.',
    isPastDay: true,
    chosen: 'heavy',
  },
];

function theScreen(state: State): ReactElement {
  return (
    <OnAPhone metrics={theSmallestIPhoneMetrics}>
      <LogFlow
        chosen={state.chosen}
        day={state.isPastDay ? thePastDay : today}
        dones={state.isPastDay ? 'top-and-foot' : 'top'}
        groups={[]}
        leave={state.isPastDay ? 'back' : 'close'}
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
        title={state.isPastDay ? dateWords(thePastDay) : words('log.title.today')}
      />
    </OnAPhone>
  );
}

async function drawn(language: Language, state: State): Promise<DrawnScreen> {
  const view = await render(theScreen(state));

  await fireEvent(screen.getByTestId(flowGridTestID), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: theRow, height: 100 } },
  });
  for (const [flow, width] of Object.entries(theWords[language]) as [Flow, number][]) {
    const word = String(screen.getByTestId(flowLabelTestID(flow)).props.children);

    await fireEvent(
      screen.getByTestId(fluidGridWordTestID(flowGridTestID, word), {
        includeHiddenElements: true,
      }),
      'layout',
      { nativeEvent: { layout: { x: 0, y: 0, width, height: ONE_LINE } } },
    );
  }
  for (const [testID, top] of Object.entries(theCardTops[language])) {
    for (const [at, width] of [
      [testID, theRow],
      [headingRowMeasureTestID(testID), top.heading],
      [headingRowEndTestID(testID), top.end],
    ] as const) {
      await fireEvent(screen.getByTestId(at, { includeHiddenElements: true }), 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width, height: ONE_LINE } },
      });
    }
  }
  await fireEvent(
    screen.getByTestId(logHeaderDoneRoomTestID, { includeHiddenElements: true }),
    'layout',
    { nativeEvent: { layout: { x: 0, y: 0, width: theDone[language], height: 0 } } },
  );

  const tree = atTextSize(theScreenIn(view), MAXIMUM_TEXT_GROWTH);

  view.unmount();

  return { title: state.title, note: state.note, tree };
}

/**
 * The log and a past day at the largest text size on the iPhone SE, in the language the phone of
 * the calling picture file reads. Each language has its own file, because the catalogue is read
 * once, when the screen is first imported.
 */
export function drawTheLogAtTheLargestTextSize(language: Language): void {
  const name = theNames[language];
  const screens: DrawnScreen[] = [];

  describe(`the log and a past day at the largest text size in ${name}, drawn for somebody to look at`, () => {
    beforeEach(() => {
      jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    for (const state of theStates) {
      it(`renders ${state.title.toLowerCase()}`, async () => {
        screens.push(await drawn(language, state));
      });
    }

    it('draws them into one picture', () => {
      expect(screens).toHaveLength(theStates.length);

      const picture = `log-flow-largest-text-${name.toLowerCase()}`;
      const result = drawOrCheck({
        name: picture,
        screens,
        caveat: theCaveat(name, picture),
        script: 'generate:flow-largest-text-picture',
        size: theSmallestIPhone,
        language: language === 'en' ? undefined : language,
      });

      expect(result.problems).toEqual([]);
      console.log(result.said);
    });
  });
}
