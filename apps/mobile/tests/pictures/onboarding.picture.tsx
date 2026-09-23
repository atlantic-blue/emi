import { OnAPhone, theScreenIn } from '../fixtures/theSafeArea';

import { render } from '@testing-library/react-native';

import { CycleLength } from '../../src/features/onboarding/CycleLength';
import { HerName } from '../../src/features/onboarding/HerName';
import { LastPeriod } from '../../src/features/onboarding/LastPeriod';
import { PeriodBefore } from '../../src/features/onboarding/PeriodBefore';
import { PeriodLength } from '../../src/features/onboarding/PeriodLength';
import { Regularity } from '../../src/features/onboarding/Regularity';
import { WhatEmiIs } from '../../src/features/onboarding/WhatEmiIs';
import { YearOfBirth } from '../../src/features/onboarding/YearOfBirth';
import {
  defaultCycleLengthDays,
  defaultPeriodLengthDays,
} from '../../src/features/onboarding/firstRun';
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
  'Rendered from the trees the eight first run screens produced under the test runner, at 393 by',
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
    title: 'One of eight',
    note: 'What Emi is, and what it will not do. She is asked for nothing here.',
    element: <WhatEmiIs onContinue={() => undefined} />,
  },
  {
    title: 'Two of eight',
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
    title: 'Three of eight',
    note: 'The year she was born, with nothing picked for her. The wheel opens on 1996, thirty\n      years back, which the drawing cannot show: it draws every list from the top.',
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
    title: 'Four of eight',
    note: 'She picks the day her last period started from the month she is in. The eleventh is\n      chosen, and the days after today take no press.',
    element: (
      <LastPeriod
        chosen="2026-05-11"
        now={whenSheOpensIt}
        onBack={() => undefined}
        onChoose={() => undefined}
        onContinue={() => undefined}
      />
    ),
  },
  {
    title: 'Five of eight',
    note: 'The period before that one, picked twenty eight days back, with the cycle it makes said\n      under the month. She may leave this one unanswered.',
    element: (
      <PeriodBefore
        chosen="2026-04-13"
        lastPeriodStartedOn="2026-05-11"
        now={whenSheOpensIt}
        onAdd={() => undefined}
        onBack={() => undefined}
        onChoose={() => undefined}
        onSkip={() => undefined}
      />
    ),
  },
  {
    title: 'Six of eight',
    note: 'The answer the first forecast is made from.',
    element: (
      <CycleLength
        days={defaultCycleLengthDays}
        onBack={() => undefined}
        onChange={() => undefined}
        onDone={() => undefined}
      />
    ),
  },
  {
    title: 'Seven of eight',
    note: 'It is what the period arc is drawn at until she logs a period end of her own, and she\n      may answer that she is not sure.',
    element: (
      <PeriodLength
        days={defaultPeriodLengthDays}
        onBack={() => undefined}
        onChange={() => undefined}
        onDone={() => undefined}
        onNotSure={() => undefined}
      />
    ),
  },
  {
    title: 'Eight of eight',
    note: 'The last answer she gives, as she finds it: three rows and none of them chosen for her,\n      so the way on waits. It moves one sentence under the forecast and never the range.',
    element: (
      <Regularity
        chosen={undefined}
        onBack={() => undefined}
        onChoose={() => undefined}
        onContinue={() => undefined}
        onSkip={() => undefined}
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
