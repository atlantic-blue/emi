import {
  CONTRAST_FLOOR,
  MINIMUM_TAP_TARGET,
  colour,
  contrastRatio,
  icons,
  typeScale,
} from '@emi/tokens';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { CycleLength } from '../../src/features/onboarding/CycleLength';
import {
  LastPeriod,
  chosenDayMarkTestID,
  chosenNameMarkTestID,
  dayTestID,
  earlierMonthTestID,
  laterMonthTestID,
  monthTestID,
  namedDayTestID,
} from '../../src/features/onboarding/LastPeriod';
import {
  onboardingMarkTestID,
  onboardingProgressTestID,
  stepTestID,
} from '../../src/features/onboarding/OnboardingScreen';
import { WhatEmiIs } from '../../src/features/onboarding/WhatEmiIs';
import {
  type FirstRunScreen,
  firstRunScreens,
  stepLabel,
} from '../../src/features/onboarding/copy';
import { defaultCycleLengthDays } from '../../src/features/onboarding/firstRun';
import { controlsTooSmallToPress } from '../fixtures/tapTargets';

/**
 * What the three screens of the first run look like. They ask her for the same three answers they
 * always did, so nothing here presses anything: it reads the shapes, the colours and the marks off
 * a rendered screen.
 */

/** Midday, and away from any summer time change, so the calendar reads the same in any timezone. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');
const today = '2026-05-14';
const threeDaysBack = '2026-05-11';

async function sheIsLookingAt(at: FirstRunScreen): Promise<void> {
  if (at === 'welcome') {
    await render(<WhatEmiIs onContinue={() => undefined} />);
    return;
  }
  if (at === 'lastPeriod') {
    await render(
      <LastPeriod
        chosen={threeDaysBack}
        now={whenSheOpensIt}
        onChoose={() => undefined}
        onContinue={() => undefined}
      />,
    );
    return;
  }
  await render(
    <CycleLength
      days={defaultCycleLengthDays}
      onChange={() => undefined}
      onDone={() => undefined}
    />,
  );
}

function flattened(testID: string): Record<string, unknown> {
  return (StyleSheet.flatten(screen.getByTestId(testID).props.style) ?? {}) as Record<
    string,
    unknown
  >;
}

/** Every colour a rendered screen paints, read off the tree rather than off the stylesheet. */
function coloursIn(node: unknown, found: Set<string>): Set<string> {
  if (Array.isArray(node)) {
    node.forEach((each) => coloursIn(each, found));

    return found;
  }
  if (node === null || typeof node !== 'object') {
    return found;
  }
  const element = node as { props?: Record<string, unknown>; children?: unknown };
  const style = (StyleSheet.flatten(element.props?.style) ?? {}) as Record<string, unknown>;
  for (const key of ['color', 'backgroundColor', 'borderColor', 'borderTopColor']) {
    const held = style[key];
    if (typeof held === 'string') {
      found.add(held);
    }
  }

  return coloursIn(element.children ?? [], found);
}

/** A drawing sits on no ground of its own, which react-native-svg says as a colour like any other. */
const NO_GROUND = 'transparent';

const paletteValues = new Set<string>([...Object.values(colour), NO_GROUND]);

describe('the first run carries the design system', () => {
  describe('how far along she is', () => {
    for (const [at, where] of firstRunScreens.entries()) {
      it(`fills ${String(at + 1)} of the 3 segments on ${where}, and says so in words`, async () => {
        await sheIsLookingAt(where);

        const filled = firstRunScreens.filter(
          (each) => flattened(stepTestID(each)).backgroundColor === colour.ember,
        );

        expect(filled).toEqual(firstRunScreens.slice(0, at + 1));
        expect(screen.getByText(stepLabel(where))).toBeTruthy();
      });
    }

    it('draws the segments as a bar rather than leaving the words to carry it alone', async () => {
      await sheIsLookingAt('welcome');

      const bar = screen.getByTestId(onboardingProgressTestID);

      expect(bar.children).toHaveLength(firstRunScreens.length);
      expect(flattened(stepTestID('welcome')).height).toBeGreaterThan(0);
    });

    it('leaves a segment she has not reached in the ground colour', async () => {
      await sheIsLookingAt('welcome');

      expect(flattened(stepTestID('cycleLength')).backgroundColor).toBe(colour.sunk);
    });
  });

  describe('the mark', () => {
    for (const where of firstRunScreens) {
      it(`is drawn on ${where}, in the brand colour and from the set`, async () => {
        await sheIsLookingAt(where);

        const drawn = String(screen.getByTestId(onboardingMarkTestID).props.xml);

        expect(drawn).toContain(icons.ring.body);
        expect(drawn).toContain(colour.ember);
      });
    }
  });

  describe('the day she picked', () => {
    it('is marked three ways, so colour is never the only cue', async () => {
      await sheIsLookingAt('lastPeriod');

      const square = flattened(dayTestID(threeDaysBack));

      expect(square.backgroundColor).toBe(colour.ember);
      expect(square.borderColor).toBe(colour.emberPressed);
      expect(screen.getByTestId(chosenDayMarkTestID)).toBeTruthy();
    });

    it('is the only square marked, so one day is chosen and not two', async () => {
      await sheIsLookingAt('lastPeriod');

      const others = [today, '2026-05-12'].map((day) => flattened(dayTestID(day)));

      expect(screen.queryAllByTestId(chosenDayMarkTestID)).toHaveLength(1);
      expect(others.map((each) => each.backgroundColor)).toEqual([colour.sunk, colour.sunk]);
      expect(others.map((each) => each.borderColor)).toEqual([colour.sunk, colour.sunk]);
      expect(screen.getByTestId(dayTestID(threeDaysBack))).toBeSelected();
      expect(screen.getByTestId(dayTestID(today))).not.toBeSelected();
    });

    it('keeps a day she may not choose on the screen, drawn back rather than taken away', async () => {
      await sheIsLookingAt('lastPeriod');

      const after = flattened(dayTestID('2026-05-20'));

      expect(screen.getByTestId(dayTestID('2026-05-20'))).toBeTruthy();
      expect(after.opacity).toBeLessThan(1);
      expect(after.backgroundColor).not.toBe(colour.sunk);
    });
  });

  describe('the two answers she presses most often', () => {
    it('marks the one she chose by a tick as well as by a ground', async () => {
      await render(
        <LastPeriod
          chosen={today}
          now={whenSheOpensIt}
          onChoose={() => undefined}
          onContinue={() => undefined}
        />,
      );

      const chosen = flattened(namedDayTestID(today));

      expect(chosen.backgroundColor).toBe(colour.ember);
      expect(chosen.borderColor).toBe(colour.emberPressed);
      expect(screen.getByTestId(chosenNameMarkTestID)).toBeTruthy();
    });

    it('leaves the one she did not choose on the quiet ground, with no tick', async () => {
      await render(
        <LastPeriod
          chosen={today}
          now={whenSheOpensIt}
          onChoose={() => undefined}
          onContinue={() => undefined}
        />,
      );

      expect(flattened(namedDayTestID('2026-05-13')).backgroundColor).toBe(colour.surface);
      expect(screen.queryAllByTestId(chosenNameMarkTestID)).toHaveLength(1);
    });
  });

  describe('the month she is looking at', () => {
    it('is named above the squares, at the size a heading takes', async () => {
      await sheIsLookingAt('lastPeriod');

      const heading = flattened(monthTestID);

      expect(screen.getByTestId(monthTestID)).toHaveTextContent('May 2026');
      expect(heading.color).toBe(colour.ink);
      expect(heading.fontSize).toBe(typeScale.heading.size);
    });

    it('draws a handle she can still press as a pill, and a spent one without it', async () => {
      await sheIsLookingAt('lastPeriod');

      const live = flattened(earlierMonthTestID);
      const spent = flattened(laterMonthTestID);

      expect(live.backgroundColor).toBe(colour.emberTint);
      expect(live.borderColor).toBe(colour.ember);
      expect(spent.backgroundColor).not.toBe(live.backgroundColor);
      expect(spent.borderColor).not.toBe(live.borderColor);
      expect(Number(spent.opacity)).toBeLessThan(Number(live.opacity ?? 1));
    });

    it('says the same thing to a screen reader, on the handle that is spent', async () => {
      await sheIsLookingAt('lastPeriod');

      expect(screen.getByTestId(laterMonthTestID).props.accessibilityState).toMatchObject({
        disabled: true,
      });
      expect(screen.getByTestId(earlierMonthTestID).props.accessibilityState).toMatchObject({
        disabled: false,
      });
    });
  });

  describe('every colour on the screen', () => {
    for (const where of firstRunScreens) {
      it(`on ${where} comes from the palette and from nowhere else`, async () => {
        await sheIsLookingAt(where);

        const painted = [...coloursIn(screen.toJSON(), new Set())];

        expect(painted.length).toBeGreaterThan(3);
        expect(painted.filter((each) => !paletteValues.has(each))).toEqual([]);
      });
    }

    it('holds every pair of words and ground above the contrast floor', () => {
      const pairs = [
        [colour.muted, colour.stone],
        [colour.ink, colour.stone],
        [colour.body, colour.surface],
        [colour.ink, colour.surface],
        [colour.ink, colour.emberTint],
        [colour.ember, colour.emberTint],
        [colour.surface, colour.ember],
      ] as const;

      for (const [text, ground] of pairs) {
        expect(contrastRatio(text, ground)).toBeGreaterThanOrEqual(CONTRAST_FLOOR);
      }
    });
  });

  describe('every control she can press', () => {
    for (const where of firstRunScreens) {
      it(`on ${where} is at least ${String(MINIMUM_TAP_TARGET)} points on both axes`, async () => {
        await sheIsLookingAt(where);

        const controls = [...screen.queryAllByRole('button'), ...screen.queryAllByRole('radio')];

        expect(controlsTooSmallToPress(controls)).toEqual([]);
      });
    }
  });
});
