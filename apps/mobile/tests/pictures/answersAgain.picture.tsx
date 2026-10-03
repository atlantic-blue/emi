import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { DrawnScreen } from '../../../../brand/screens/asHtml';
import { drawOrCheck } from '../../../../brand/screens/picture';
import { ChangeBirthYear } from '../../src/features/settings/ChangeBirthYear';
import { ChangeFeeling } from '../../src/features/settings/ChangeFeeling';
import { ChangeFocus } from '../../src/features/settings/ChangeFocus';
import { ChangeGoals } from '../../src/features/settings/ChangeGoals';
import { ChangeName } from '../../src/features/settings/ChangeName';
import { ChangePeriodLength } from '../../src/features/settings/ChangePeriodLength';
import { ChangeRegularity } from '../../src/features/settings/ChangeRegularity';
import { OnAPhone, theScreenIn } from '../fixtures/theSafeArea';

/**
 * The other seven answers, each asked again with the control the first run asked it with, drawn for
 * somebody to look at.
 *
 * What a reader checks with their eyes is whether all seven read as one screen with seven controls
 * in it, rather than as seven screens. The cycle length has a picture of its own, drawn when it
 * became the first answer she could change.
 *
 * It is not part of the suite: the file is named for a picture rather than for a test, and the
 * runner is pointed at it by `npm run generate:answers-again-picture`.
 */

const theCaveat = [
  'Rendered from the trees the screens produced under the test runner, at 390 by 844 points, and',
  'not captured from a phone. The page loads the same font files the application loads, so the',
  'words are drawn in Figtree. The room kept at the top and the bottom is the room an',
  'iPhone with a dynamic island keeps for itself, which is 59 points and 34 points. The answers are',
  'the ones a fixture carries, and not a profile read off a device. A wheel is drawn at its top,',
  'because the markup carries no scroll position, and a screen taller than the glass draws past the',
  'frame for the same reason: on a phone the middle scrolls and Save stays on the bottom edge.',
  'Reproduce with: npm run generate:answers-again-picture.',
].join(' ');

/** The clock the year wheel measures its newest year from, fixed so the picture never moves. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');

const nothing = (): void => undefined;

interface Screen {
  readonly title: string;
  readonly note: string;
  readonly element: ReactNode;
}

const theScreens: readonly Screen[] = [
  {
    title: 'Your name',
    note: 'The field opens on the name she gave, so correcting a letter costs her one press rather than the whole name again.',
    element: <ChangeName gave="Maria" onCancel={nothing} onSave={nothing} />,
  },
  {
    title: 'Year of birth',
    note: 'The wheel opens on the year she chose. Nothing reads this answer, and the line under the question says so.',
    element: (
      <ChangeBirthYear gave={1994} now={whenSheOpensIt} onCancel={nothing} onSave={nothing} />
    ),
  },
  {
    title: 'Period length',
    note: 'The stepper the first run used, opened on the five days she said, with the number she gave written under it.',
    element: <ChangePeriodLength gave={5} onCancel={nothing} onSave={nothing} />,
  },
  {
    title: 'Regular',
    note: 'One of three, and the row she gave opens marked, so she reads her own answer before she changes it.',
    element: <ChangeRegularity gave="moves" onCancel={nothing} onSave={nothing} />,
  },
  {
    title: 'How you feel about it',
    note: 'The answer most likely to have moved, because a woman who found her period hard in January may not in June.',
    element: <ChangeFeeling gave="understand" onCancel={nothing} onSave={nothing} />,
  },
  {
    title: 'What you want Emi for',
    note: 'Any number of the four, each one ticked where she chose it, because pressing a row here drops one goal rather than starting again.',
    element: <ChangeGoals gave={['forecast', 'symptoms']} onCancel={nothing} onSave={nothing} />,
  },
  {
    title: 'What changes with your cycle',
    note: 'The tiles the first run used. The order she presses them in is the answer, because the log sheet reads her groups in it.',
    element: <ChangeFocus gave={['sleep', 'pain']} onCancel={nothing} onSave={nothing} />,
  },
];

const drawn: DrawnScreen[] = [];

describe('the other seven answers, drawn for somebody to look at', () => {
  for (const screen of theScreens) {
    it(`renders ${screen.title.toLowerCase()}`, async () => {
      const view = await render(<OnAPhone>{screen.element}</OnAPhone>);
      // A copy, taken before the screen is torn down, with the harness's own provider left out.
      const tree: unknown = theScreenIn(view);

      await view.unmount();

      drawn.push({ title: screen.title, note: screen.note, tree });
    });
  }

  it('draws them into one picture', () => {
    expect(drawn).toHaveLength(theScreens.length);

    const result = drawOrCheck({
      name: 'answers-again',
      screens: drawn,
      caveat: theCaveat,
      script: 'generate:answers-again-picture',
    });

    expect(result.problems).toEqual([]);
    console.log(result.said);
  });
});
