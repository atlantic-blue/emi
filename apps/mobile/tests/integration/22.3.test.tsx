import {
  WASH_HEIGHT,
  type PhaseName,
  colour,
  phaseNames,
  washFor,
  washOfPhase,
  washStops,
  washes,
} from '@emi/tokens';
import {
  Wash,
  washFieldGradientID,
  washFieldTestID,
  washTestID,
  washTintGradientID,
  washTintTestID,
} from '@emi/ui';
import { render, screen } from '@testing-library/react-native';

import { gradientNamed, paintedWith, stopsOf, washColoursOf } from '../fixtures/theWashOnTheGlass';

/**
 * The wash: the colour at the top of the screen that tells her where she is in her cycle before she
 * reads a word. It carries no text, so it is the one cue a stranger at arm's length cannot read.
 *
 * The four washes are held to the design document by `packages/tokens/tests/designSystem.test.ts`.
 * What is proved here is the drawing: that what reaches the glass is those colours, in that order,
 * and that each layer is actually painted rather than only defined.
 */

/** The colours the wash ran through on the glass, from the top of the wash down to the ground. */
function drawnField(): string[] {
  return washColoursOf(stopsOf(gradientNamed(screen.toJSON(), washFieldGradientID)));
}

function drawnTint(at: 1 | 2): string[] {
  return washColoursOf(stopsOf(gradientNamed(screen.toJSON(), washTintGradientID(at))));
}

/** The four colours of a wash as values, which is what the drawing passes down. */
function valuesOf(phase?: PhaseName): string[] {
  return washStops(washFor(phase)).map((stop) => colour[stop]);
}

describe('the top wash takes the colours of the phase of today', () => {
  describe('the wash she is looking at is the wash of her own phase', () => {
    it.each(phaseNames)(
      'draws the four colours the %s phase names, in that order',
      async (phase) => {
        await render(<Wash phase={phase} />);

        const [firstTint, secondTint, from, to] = valuesOf(phase);

        expect(drawnTint(1)).toEqual([firstTint]);
        expect(drawnTint(2)).toEqual([secondTint]);
        expect(drawnField()).toEqual([from, to]);
      },
    );

    it('ends every phase on the ground the rest of the screen sits on', async () => {
      for (const phase of phaseNames) {
        await render(<Wash phase={phase} />);

        expect(drawnField().at(-1)).toBe(colour.ground);
      }
    });

    it('draws a different wash for the period than for the luteal days', async () => {
      await render(<Wash phase="period" />);
      const bleeding = [drawnTint(1), drawnTint(2), drawnField()].flat();

      await render(<Wash phase="luteal" />);

      expect([drawnTint(1), drawnTint(2), drawnField()].flat()).not.toEqual(bleeding);
    });
  });

  describe('a tint fades to nothing, so no phase leaves an edge across the screen', () => {
    it.each([1, 2] as const)('fades tint %s out rather than into another colour', async (at) => {
      await render(<Wash phase="ovulation" />);

      const stops = stopsOf(gradientNamed(screen.toJSON(), washTintGradientID(at)));
      const last = stops.at(-1);

      expect(stops).toHaveLength(2);
      expect(last?.opacity).toBe(0);
      expect(last?.colour).toBe(stops[0]?.colour);
      expect(last?.at).toBeGreaterThan(0);
      expect(last?.at).toBeLessThan(1);
    });

    it('starts each tint whole, so the corner it reaches in from is its own colour', async () => {
      await render(<Wash phase="ovulation" />);

      for (const at of [1, 2] as const) {
        const first = stopsOf(gradientNamed(screen.toJSON(), washTintGradientID(at)))[0];

        expect(first?.opacity).toBe(1);
        expect(first?.at).toBe(0);
      }
    });
  });

  describe('a screen that knows no phase still has a wash', () => {
    it('draws the soft wash when no phase is given', async () => {
      await render(<Wash />);

      const [firstTint, secondTint, from, to] = valuesOf();

      expect(drawnTint(1)).toEqual([firstTint]);
      expect(drawnTint(2)).toEqual([secondTint]);
      expect(drawnField()).toEqual([from, to]);
    });

    it('draws that same soft wash for the one phase no screen of the prototype shows', async () => {
      await render(<Wash phase="follicular" />);
      const follicular = [drawnTint(1), drawnTint(2), drawnField()].flat();

      await render(<Wash />);

      expect([drawnTint(1), drawnTint(2), drawnField()].flat()).toEqual(follicular);
      expect(washOfPhase.follicular).toBe('soft');
      expect(washFor('follicular')).toBe(washes.soft);
    });
  });

  describe('every layer of the wash is painted, not only defined', () => {
    it('paints the field and both tints with the gradient named for each', async () => {
      await render(<Wash phase="period" />);
      const tree = screen.toJSON();

      expect(paintedWith(tree, washFieldTestID)).toBe(washFieldGradientID);
      expect(paintedWith(tree, washTintTestID(1))).toBe(washTintGradientID(1));
      expect(paintedWith(tree, washTintTestID(2))).toBe(washTintGradientID(2));
    });

    it('draws the topmost tint last, so it is the one she sees over the other', async () => {
      await render(<Wash phase="period" />);

      const painted = JSON.stringify(screen.toJSON());

      expect(painted.indexOf(washTintTestID(2))).toBeLessThan(
        painted.lastIndexOf(washTintTestID(1)),
      );
    });
  });

  describe('the wash is as tall as the screen asks', () => {
    it('falls over the height the prototype paints it at on the home screen', async () => {
      await render(<Wash phase="period" />);

      // The four home screens of the prototype all paint the wash this tall. The rest paint ten
      // other heights between them, so this is the default rather than the one size of a wash.
      expect(WASH_HEIGHT).toBe(460);
      expect(screen.getByTestId(washTestID).props.height).toBe(WASH_HEIGHT);
    });

    it('takes a height from the screen that draws it', async () => {
      await render(<Wash phase="period" height={WASH_HEIGHT + 60} />);

      expect(screen.getByTestId(washTestID).props.height).toBe(WASH_HEIGHT + 60);
    });
  });
});
