import { render } from '@testing-library/react-native';

import { aProfileRecord } from '../fixtures/profileRecord';
import { YourAnswers } from '../../src/features/settings/YourAnswers';
import type { DrawnScreen } from '../../../../brand/screens/asHtml';
import { drawOrCheck } from '../../../../brand/screens/picture';
import { OnAPhone, theScreenIn } from '../fixtures/theSafeArea';

/**
 * Her first run, read back to her, drawn for somebody to look at. Two shapes of row are the
 * subject of the picture: a short answer sits on the question's own line and a sentence sits under
 * it, and whether that reads as one list is a thing a reader checks with their eyes.
 *
 * The second screen is the same woman with three questions skipped, because a row with nothing
 * under it is the part of this screen that is easiest to get wrong.
 *
 * Every row carries the mark that says it opens something, because every one of them now does.
 *
 * It is not part of the suite: the file is named for a picture rather than for a test, and the
 * runner is pointed at it by `npm run generate:your-answers-picture`.
 */

const theCaveat = [
  'Rendered from the trees the screens produced under the test runner, at 390 by 844 points, and',
  'not captured from a phone. The page loads the same font files the application loads, so the',
  'words are drawn in Figtree. The room kept at the top and the bottom is the room an',
  'iPhone with a dynamic island keeps for itself, which is 59 points and 34 points. The answers are',
  'the ones the drawing of this screen carries, and not a profile read off a device.',
  'Reproduce with: npm run generate:your-answers-picture.',
].join(' ');

const sheAnsweredEverything = aProfileRecord({
  name: 'Maria',
  birthYear: 1990,
  cycleLengthDays: 28,
  periodLengthDays: 5,
  regularity: 'moves',
  feeling: 'understand',
  goals: ['forecast', 'symptoms', 'doctorRecord'],
  focus: ['sleep', 'mood', 'pain'],
});

const sheSkippedThree = aProfileRecord({
  name: 'Maria',
  birthYear: undefined,
  periodLengthDays: undefined,
  focus: undefined,
});

const drawn: DrawnScreen[] = [];

async function draw(title: string, note: string, answers = sheAnsweredEverything): Promise<void> {
  const view = await render(
    <OnAPhone>
      <YourAnswers answers={answers} onBack={() => undefined} onOpen={() => undefined} />
    </OnAPhone>,
  );
  // A copy, taken before the screen is torn down, with the harness's own provider left out.
  const tree: unknown = theScreenIn(view);

  view.unmount();

  drawn.push({ title, note, tree });
}

describe('her first run read back to her, drawn for somebody to look at', () => {
  it('renders it for a woman who answered every question', async () => {
    await draw(
      'Your answers',
      'Eight rows on one card, which is exactly the eight the hold sealed. Each one reads her own answer at the end of its row.',
    );
  });

  it('renders it for a woman who skipped three of them', async () => {
    await draw(
      'Three questions skipped',
      'The year of birth, the period length and what changes with her cycle carry nothing under them, because nothing is what she said.',
      sheSkippedThree,
    );
  });

  it('draws them into one picture', () => {
    expect(drawn).toHaveLength(2);

    const result = drawOrCheck({
      name: 'your-answers',
      screens: drawn,
      caveat: theCaveat,
      script: 'generate:your-answers-picture',
    });

    expect(result.problems).toEqual([]);
    console.log(result.said);
  });
});
