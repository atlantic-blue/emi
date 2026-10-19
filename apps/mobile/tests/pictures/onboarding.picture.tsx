import { OnAPhone, theScreenIn } from '../fixtures/theSafeArea';

import { render } from '@testing-library/react-native';

import { CycleLength } from '../../src/features/onboarding/CycleLength';
import { HerName } from '../../src/features/onboarding/HerName';
import { Feeling } from '../../src/features/onboarding/Feeling';
import { Focus } from '../../src/features/onboarding/Focus';
import { Goals } from '../../src/features/onboarding/Goals';
import { ThreePeriods } from '../../src/features/onboarding/ThreePeriods';
import { PeriodLength } from '../../src/features/onboarding/PeriodLength';
import { Regularity } from '../../src/features/onboarding/Regularity';
import { Reminder } from '../../src/features/onboarding/Reminder';
import { Today } from '../../src/features/onboarding/Today';
import { WhatEmiIs } from '../../src/features/onboarding/WhatEmiIs';
import { YearOfBirth } from '../../src/features/onboarding/YearOfBirth';
import type { DrawnScreen } from '../../../../brand/screens/asHtml';
import { iPhone16Size } from '../../../../brand/screens/asHtml';
import { drawOrCheck } from '../../../../brand/screens/picture';

/**
 * The screens of the first run, drawn for somebody to look at. They are the first thing she sees
 * of Emi, so the thing worth checking here is whether they look like one product.
 *
 * It is not part of the suite. The file is named for a picture rather than for a test, and the
 * runner is pointed at it by `npm run generate:onboarding-picture`.
 */

/** Midday, and away from any summer time change, so the day list reads the same anywhere. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');

const theCaveat = [
  'Rendered from the trees the twelve first run screens produced under the test runner, at 393 by',
  '852 points, which is the glass of an iPhone 16, and not captured from a phone.',
  'The number names the monospaced',
  'face, which no screen loads yet, so it falls back here and on a phone. Reproduce with:',
  'npm run generate:onboarding-picture.',
  'The room kept at the top and the bottom of each screen is the room an iPhone with a dynamic',
  'island keeps for itself, which is 59 points and 34 points.',
].join(' ');

interface Screen {
  readonly title: string;
  readonly note: string;
  readonly element: React.ReactElement;
}

const theScreens: readonly Screen[] = [
  {
    title: 'One of twelve',
    note: 'What Emi is, and what it will not do. She is asked for nothing here.',
    element: <WhatEmiIs onContinue={() => undefined} onWhoCanSee={() => undefined} />,
  },
  {
    title: 'Two of twelve',
    note: 'What Emi should call her. The one field in the first run, and it carries a way past it.',
    element: (
      <HerName
        onBack={() => undefined}
        onContinue={() => undefined}
        onSkip={() => undefined}
        onType={() => undefined}
        typed=""
      />
    ),
  },
  {
    title: 'Three of twelve',
    note: 'The year she was born, under the name she gave on the screen before. Nothing is picked\n      for her, and the wheel opens on 1996, thirty years back, which the drawing cannot show:\n      it draws every list from the top.',
    element: (
      <YearOfBirth
        chosen={undefined}
        now={whenSheOpensIt}
        onBack={() => undefined}
        onChoose={() => undefined}
        onContinue={() => undefined}
        onSkip={() => undefined}
      />
    ),
  },
  {
    title: 'Four of twelve',
    note: 'Her last three periods in one list. Two are given, each with its start and its length,\n      and the third row says she can skip it.',
    element: (
      <ThreePeriods
        now={whenSheOpensIt}
        onBack={() => undefined}
        onContinue={() => undefined}
        onGive={() => undefined}
        onRemove={() => undefined}
        onWayPast={() => undefined}
        periods={[
          { startedOn: '2026-05-11', lengthDays: 5 },
          { startedOn: '2026-04-13', lengthDays: 6 },
        ]}
      />
    ),
  },
  {
    title: 'Five of twelve',
    note: 'The length the first forecast is counted with, on a wheel that opens on 28 days and\n      keeps nothing until she turns it or taps a length.',
    element: (
      <CycleLength
        chosen={undefined}
        onBack={() => undefined}
        onChoose={() => undefined}
        onDone={() => undefined}
      />
    ),
  },
  {
    title: 'Six of twelve',
    note: 'It is what the period arc is drawn at until she logs a period end of her own, and she\n      may answer that she is not sure.',
    element: (
      <PeriodLength
        chosen={undefined}
        onBack={() => undefined}
        onChoose={() => undefined}
        onDone={() => undefined}
        onNotSure={() => undefined}
      />
    ),
  },
  {
    title: 'Seven of twelve',
    note: 'Three rows, none of them chosen for her until she presses one. It moves one sentence\n      under the forecast and never the range.',
    element: (
      <Regularity
        chosen="moves"
        onBack={() => undefined}
        onChoose={() => undefined}
        onContinue={() => undefined}
        onSkip={() => undefined}
      />
    ),
  },
  {
    title: 'Eight of twelve',
    note: 'It moves one line on the home screen, on the days inside her period, and nothing else\n      anywhere.',
    element: (
      <Feeling
        chosen={undefined}
        onBack={() => undefined}
        onChoose={() => undefined}
        onContinue={() => undefined}
        onSkip={() => undefined}
      />
    ),
  },
  {
    title: 'Nine of twelve',
    note: 'The one question she may answer more than once. Each box she ticks adds one card to her\n      home screen, and ticking none is the way past it.',
    element: (
      <Goals
        chosen={[]}
        onBack={() => undefined}
        onContinue={() => undefined}
        onPress={() => undefined}
        onSkip={() => undefined}
      />
    ),
  },
  {
    title: 'Ten of twelve',
    note: 'The last answer she gives. The order she presses the tiles in is the order her log sheet\n      puts the groups in, and pressing none leaves the log as it is for everybody.',
    element: (
      <Focus
        chosen={['pain', 'sleep']}
        onBack={() => undefined}
        onContinue={() => undefined}
        onPress={() => undefined}
        onSkip={() => undefined}
      />
    ),
  },
  {
    title: 'Eleven of twelve',
    note: 'What she feels today, which becomes her first logged day. Save today waits for a tile.\n      Skip and Nothing to add both go on, and then today gets no row at all.',
    element: (
      <Today
        chosen={['cramps', 'fatigue']}
        onAllSymptoms={() => undefined}
        onBack={() => undefined}
        onPress={() => undefined}
        onSave={() => undefined}
        onSkip={() => undefined}
      />
    ),
  },
  {
    title: 'Twelve of twelve',
    note: 'The reminder, with the words the lock screen will carry. Remind me waits for a moment and\n      only then asks the phone. Not now and Skip go on and ask nothing.',
    element: (
      <Reminder
        chosen="twoDaysBefore"
        onBack={() => undefined}
        onChoose={() => undefined}
        onNotNow={() => undefined}
        onRemind={() => undefined}
      />
    ),
  },
];

async function drawn(screen: Screen): Promise<DrawnScreen> {
  const view = await render(<OnAPhone>{screen.element}</OnAPhone>);
  const tree: unknown = theScreenIn(view);

  await view.unmount();

  return { title: screen.title, note: screen.note, tree };
}

const drawnScreens: DrawnScreen[] = [];

describe('the first run, drawn for somebody to look at', () => {
  for (const screen of theScreens) {
    it(`renders ${screen.title.toLowerCase()}`, async () => {
      drawnScreens.push(await drawn(screen));
    });
  }

  it('draws them into one picture', () => {
    expect(drawnScreens).toHaveLength(theScreens.length);

    const result = drawOrCheck({
      name: 'onboarding',
      screens: drawnScreens,
      caveat: theCaveat,
      script: 'generate:onboarding-picture',
      size: iPhone16Size,
    });

    expect(result.problems).toEqual([]);
    console.log(result.said);
  });
});
