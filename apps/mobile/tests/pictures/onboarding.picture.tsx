import { OnAPhone, theScreenIn } from '../fixtures/theSafeArea';

import { render } from '@testing-library/react-native';

import { CycleLength } from '../../src/features/onboarding/CycleLength';
import { HerName } from '../../src/features/onboarding/HerName';
import { LastPeriod } from '../../src/features/onboarding/LastPeriod';
import { PeriodBefore } from '../../src/features/onboarding/PeriodBefore';
import { PeriodLength } from '../../src/features/onboarding/PeriodLength';
import { WhatEmiIs } from '../../src/features/onboarding/WhatEmiIs';
import { YearOfBirth } from '../../src/features/onboarding/YearOfBirth';
import {
  defaultCycleLengthDays,
  defaultPeriodLengthDays,
} from '../../src/features/onboarding/firstRun';
import type { DrawnScreen } from '../../../../brand/screens/asHtml';
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
  'Rendered from the trees the seven first run screens produced under the test runner, at 390 by',
  '844 points, and not captured from a phone. The number names the monospaced',
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
    title: 'One of seven',
    note: 'What Emi is, and what it will not do. She is asked for nothing here.',
    element: <WhatEmiIs onContinue={() => undefined} />,
  },
  {
    title: 'Two of seven',
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
    title: 'Three of seven',
    note: 'The year she was born, as she finds the wheel: newest year first, nothing picked yet.\n      Nothing in Emi reads this answer, and the screen says so.',
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
    title: 'Four of seven',
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
    title: 'Five of seven',
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
    title: 'Six of seven',
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
    title: 'Seven of seven',
    note: 'The last answer she gives. It is what the period arc is drawn at until she logs a\n      period end of her own, and she may answer that she is not sure.',
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
    });

    expect(result.problems).toEqual([]);
    console.log(result.said);
  });
});
