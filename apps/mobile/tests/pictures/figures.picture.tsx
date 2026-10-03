import { type PublishedFigure, publishedFigures } from '@emi/cycle';
import { render } from '@testing-library/react-native';

import { FiguresScreen } from '../../src/features/cycle/CitationRow';
import type { DrawnScreen } from '../../../../brand/screens/asHtml';
import { drawOrCheck } from '../../../../brand/screens/picture';
import { OnAPhone, theScreenIn } from '../fixtures/theSafeArea';

/**
 * The page that says where each published figure comes from, drawn for somebody to look at.
 *
 * Three papers, two of them the same paper, and the longest title in the product. Whether three
 * rows of a quoted journal title read as a list a woman can scan, or as a wall, is the thing a
 * reader checks with their eyes and no assertion can.
 *
 * The second frame is the page after a figure changed in the arithmetic, which is how the page is
 * shown to quote the package rather than keep a copy of it.
 *
 * It is not part of the suite: the file is named for a picture rather than for a test, and the
 * runner is pointed at it by `npm run generate:figures-picture`.
 */

const theCaveat = [
  'Rendered from the tree the page produced under the test runner, at 390 by 844 points, and not',
  'captured from a phone. The page loads the same font files the application loads, so the words',
  'are drawn in Figtree. The room kept at the top and the bottom is the room an iPhone',
  'with a dynamic island keeps for itself, which is 59 points and 34 points. The figures and the',
  'papers are the ones packages/cycle holds, read at render and not typed into this file.',
  'Reproduce with: npm run generate:figures-picture.',
].join(' ');

/** The same measurement, reported by another paper, which is what the second frame draws. */
const anotherPaperReportsTheCycleLength: PublishedFigure = {
  measures: 'cycle-length',
  value: { kind: 'range', low: 20, high: 41 },
  unit: 'days',
  citation: {
    source: 'A later cohort, reported somewhere else',
    doi: '10.0000/another.paper',
    figure: 'menstrual cycle frequency, reported as 20 to 41 days',
  },
};

const drawn: DrawnScreen[] = [];

async function draw(
  title: string,
  note: string,
  figures: readonly PublishedFigure[] = publishedFigures,
): Promise<void> {
  const view = await render(
    <OnAPhone>
      <FiguresScreen figures={figures} onBack={() => undefined} />
    </OnAPhone>,
  );
  // A copy, taken before the screen is torn down, with the harness's own provider left out.
  const tree: unknown = theScreenIn(view);

  view.unmount();

  drawn.push({ title, note, tree });
}

describe('where each published figure comes from, drawn for somebody to look at', () => {
  it('renders the three figures the arithmetic ships', async () => {
    await draw(
      'Where these figures come from',
      'Three rows, in the order packages/cycle holds them. Two of them cite the same paper, so the identifier sits on the row rather than in a list at the foot.',
    );
  });

  it('renders the page after a figure changed in the arithmetic', async () => {
    await draw(
      'One figure changed in the arithmetic',
      'The cycle length now cites another paper reporting 20 to 41 days. Nothing on the page was edited to say so.',
      [anotherPaperReportsTheCycleLength, ...publishedFigures.slice(1)],
    );
  });

  it('draws them into one picture', () => {
    expect(drawn).toHaveLength(2);

    const result = drawOrCheck({
      name: 'figures',
      screens: drawn,
      caveat: theCaveat,
      script: 'generate:figures-picture',
    });

    expect(result.problems).toEqual([]);
    console.log(result.said);
  });
});
