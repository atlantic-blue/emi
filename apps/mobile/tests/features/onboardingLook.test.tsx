import { CONTRAST_FLOOR, MINIMUM_TAP_TARGET, colour, contrastRatio, typeScale } from '@emi/tokens';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { OnAPhone } from '../fixtures/theSafeArea';
import { StyleSheet } from 'react-native';

import { CycleLength } from '../../src/features/onboarding/CycleLength';
import { HerName } from '../../src/features/onboarding/HerName';
import {
  chosenDayMarkTestID,
  dateDiscTestID,
  dayTestID,
  earlierMonthTestID,
  laterMonthTestID,
  monthTestID,
} from '../../src/features/onboarding/Calendar';
import { Feeling } from '../../src/features/onboarding/Feeling';
import { Focus } from '../../src/features/onboarding/Focus';
import { Goals } from '../../src/features/onboarding/Goals';
import { ThreePeriods } from '../../src/features/onboarding/ThreePeriods';
import { PastPeriodPicker } from '../../src/features/pastPeriods/PastPeriodPicker';
import { PeriodLength } from '../../src/features/onboarding/PeriodLength';
import { Regularity } from '../../src/features/onboarding/Regularity';
import { Today } from '../../src/features/onboarding/Today';
import { progressFillTestID } from '../../src/components/ProgressBar';
import {
  OnboardingScreen,
  onboardingBackTestID,
  onboardingProgressTestID,
  onboardingSkipTestID,
  onboardingWayPastTestID,
} from '../../src/features/onboarding/OnboardingScreen';
import { Reminder } from '../../src/features/onboarding/Reminder';
import { WhatEmiIs } from '../../src/features/onboarding/WhatEmiIs';
import { YearOfBirth } from '../../src/features/onboarding/YearOfBirth';
import {
  type FirstRunScreen,
  firstRunCopy,
  firstRunScreens,
  stepLabel,
} from '../../src/features/onboarding/copy';
import { theScreensWithNoBar } from '../fixtures/theFirstRunLook';
import { sizedTextIn } from '../fixtures/renderedText';
import { controlsTooSmallToPress } from '../fixtures/tapTargets';

/**
 * What the screens of the first run look like. Nothing here presses anything: it reads the shapes,
 * the colours and the marks off a rendered screen, one screen at a time.
 */

/**
 * The questions she may pass by today. The last period is the one answer the first run cannot do
 * without, and the cycle length takes its own way past in a later step of feature 11.
 */
const theQuestionsSheMaySkipToday: readonly FirstRunScreen[] = [
  'name',
  'birthYear',
  'regularity',
  'feeling',
  'goals',
  'focus',
  'today',
  'reminder',
];

/** The questions whose way past the redesign draws over the button rather than in the header. */
const theQuestionsWithTheWayPastOverTheButton: readonly FirstRunScreen[] = ['periodLength'];

/** Midday, and away from any summer time change, so the calendar reads the same in any timezone. */
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');
const today = '2026-05-14';
const threeDaysBack = '2026-05-11';

async function sheIsLookingAt(at: FirstRunScreen): Promise<void> {
  if (at === 'welcome') {
    await render(
      <OnAPhone>
        <WhatEmiIs onContinue={() => undefined} onWhoCanSee={() => undefined} />
      </OnAPhone>,
    );
    return;
  }
  if (at === 'name') {
    await render(
      <OnAPhone>
        <HerName
          onBack={() => undefined}
          onContinue={() => undefined}
          onSkip={() => undefined}
          onType={() => undefined}
          typed=""
        />
      </OnAPhone>,
    );
    return;
  }
  if (at === 'birthYear') {
    await render(
      <OnAPhone>
        <YearOfBirth
          chosen={undefined}
          now={whenSheOpensIt}
          onBack={() => undefined}
          onChoose={() => undefined}
          onContinue={() => undefined}
          onSkip={() => undefined}
        />
      </OnAPhone>,
    );
    return;
  }
  if (at === 'threePeriods') {
    await render(
      <OnAPhone>
        <ThreePeriods
          now={whenSheOpensIt}
          onBack={() => undefined}
          onContinue={() => undefined}
          onGive={() => undefined}
          onRemove={() => undefined}
          onWayPast={() => undefined}
          periods={[{ lengthDays: 5, startedOn: threeDaysBack }]}
        />
      </OnAPhone>,
    );
    return;
  }
  if (at === 'periodLength') {
    await render(
      <OnAPhone>
        <PeriodLength
          chosen={undefined}
          onBack={() => undefined}
          onChoose={() => undefined}
          onDone={() => undefined}
          onNotSure={() => undefined}
        />
      </OnAPhone>,
    );
    return;
  }
  if (at === 'feeling') {
    await render(
      <OnAPhone>
        <Feeling
          chosen={undefined}
          onBack={() => undefined}
          onChoose={() => undefined}
          onContinue={() => undefined}
          onSkip={() => undefined}
        />
      </OnAPhone>,
    );
    return;
  }
  if (at === 'goals') {
    await render(
      <OnAPhone>
        <Goals
          chosen={[]}
          onBack={() => undefined}
          onContinue={() => undefined}
          onPress={() => undefined}
          onSkip={() => undefined}
        />
      </OnAPhone>,
    );
    return;
  }
  if (at === 'focus') {
    await render(
      <OnAPhone>
        <Focus
          chosen={[]}
          onBack={() => undefined}
          onContinue={() => undefined}
          onPress={() => undefined}
          onSkip={() => undefined}
        />
      </OnAPhone>,
    );
    return;
  }
  if (at === 'today') {
    await render(
      <OnAPhone>
        <Today
          chosen={[]}
          onAllSymptoms={() => undefined}
          onBack={() => undefined}
          onPress={() => undefined}
          onSave={() => undefined}
          onSkip={() => undefined}
        />
      </OnAPhone>,
    );
    return;
  }
  if (at === 'reminder') {
    await render(
      <OnAPhone>
        <Reminder
          chosen={undefined}
          onBack={() => undefined}
          onChoose={() => undefined}
          onNotNow={() => undefined}
          onRemind={() => undefined}
        />
      </OnAPhone>,
    );
    return;
  }
  if (at === 'regularity') {
    await render(
      <OnAPhone>
        <Regularity
          chosen={undefined}
          onBack={() => undefined}
          onChoose={() => undefined}
          onContinue={() => undefined}
          onSkip={() => undefined}
        />
      </OnAPhone>,
    );
    return;
  }
  await render(
    <OnAPhone>
      <CycleLength
        chosen={undefined}
        onBack={() => undefined}
        onChoose={() => undefined}
        onDone={() => undefined}
      />
    </OnAPhone>,
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

/** The sheet she picks the start of her newest period on, opened on the day she gave. */
async function sheIsPickingADay(): Promise<void> {
  await render(
    <OnAPhone>
      <PastPeriodPicker
        oldest="2026-02-13"
        onCancel={() => undefined}
        onDone={() => undefined}
        onRemove={() => undefined}
        periods={[{ lengthDays: 5, startedOn: threeDaysBack }]}
        row={0}
        today={today}
      />
    </OnAPhone>,
  );
}

describe('the first run carries the design system', () => {
  describe('how far along she is', () => {
    const theFill = progressFillTestID(onboardingProgressTestID);

    for (const [at, where] of firstRunScreens.entries()) {
      if (theScreensWithNoBar.includes(where)) {
        continue;
      }

      it(`fills ${String(at + 1)} of ${String(firstRunScreens.length)} of the bar on ${where}`, async () => {
        await sheIsLookingAt(where);

        const filled = ((at + 1) / firstRunScreens.length) * 100;

        expect(flattened(theFill).width).toBe(`${String(filled)}%`);
        expect(screen.getByLabelText(stepLabel(where))).toBeTruthy();
      });
    }

    it('draws a bar rather than leaving the words to carry it alone', async () => {
      await sheIsLookingAt('name');

      expect(flattened(onboardingProgressTestID).height).toBeGreaterThan(0);
      expect(flattened(onboardingProgressTestID).backgroundColor).toBe(colour.stepTrack);
      expect(flattened(theFill).backgroundColor).toBe(colour.accent);
    });

    it('takes the room its row leaves, so the Skip beside it stays on the glass', async () => {
      await sheIsLookingAt('name');

      expect(flattened(onboardingProgressTestID).flexGrow).toBe(1);
      expect(flattened(onboardingProgressTestID).width).toBeUndefined();
      expect(screen.getByTestId(onboardingSkipTestID)).toBeTruthy();
    });

    it('leaves the bar off the welcome, which asks her nothing, and off the first run log', async () => {
      await sheIsLookingAt('welcome');

      expect(screen.queryByTestId(onboardingProgressTestID)).toBeNull();

      await sheIsLookingAt('today');

      expect(screen.queryByTestId(onboardingProgressTestID)).toBeNull();
    });

    it('says the whole of it out loud, because a fraction of a line reads as nothing', async () => {
      await sheIsLookingAt('threePeriods');

      const bar = screen.getByTestId(onboardingProgressTestID);

      expect(bar.props['accessibilityValue']).toEqual({
        max: firstRunScreens.length,
        min: 0,
        now: firstRunScreens.indexOf('threePeriods') + 1,
      });
      expect(bar.props['accessibilityLabel']).toBe(stepLabel('threePeriods'));
    });

    for (const where of firstRunScreens) {
      it(`writes the step she is on out on ${where}, so she reads it rather than counting`, async () => {
        await sheIsLookingAt(where);

        const drawn = sizedTextIn(screen.toJSON()).map((run) => run.text);

        expect(drawn.length).toBeGreaterThan(0);

        if (where === 'today') {
          expect(drawn).not.toContain(stepLabel(where));
          expect(drawn).toContain(firstRunCopy.today.header);

          return;
        }

        expect(drawn).toContain(stepLabel(where));
      });
    }
  });

  describe('the way back', () => {
    it('is drawn at the top of a question that has one behind it', async () => {
      await sheIsLookingAt('threePeriods');

      expect(screen.getByTestId(onboardingBackTestID)).toBeTruthy();
      expect(screen.getByTestId(onboardingBackTestID).props.accessibilityLabel).toBe(
        firstRunCopy.back,
      );
    });

    it('is drawn on the cycle length screen too, so every answered question can be undone', async () => {
      await sheIsLookingAt('cycleLength');

      expect(screen.getByTestId(onboardingBackTestID)).toBeTruthy();
    });

    it('takes her back when she presses it', async () => {
      const stepsBack = jest.fn();

      await render(
        <OnAPhone>
          <ThreePeriods
            now={whenSheOpensIt}
            onBack={stepsBack}
            onContinue={() => undefined}
            onGive={() => undefined}
            onRemove={() => undefined}
            onWayPast={() => undefined}
            periods={[]}
          />
        </OnAPhone>,
      );
      await fireEvent.press(screen.getByTestId(onboardingBackTestID));

      expect(stepsBack).toHaveBeenCalledTimes(1);
    });

    it('is left off the welcome screen, because nothing sits behind it', async () => {
      await sheIsLookingAt('welcome');

      expect(screen.queryByTestId(onboardingBackTestID)).toBeNull();
    });
  });

  describe('the way past a question', () => {
    const anAnsweredQuestion = {
      actionLabel: firstRunCopy.cycleLength.action,
      lines: firstRunCopy.cycleLength.lines,
      screen: 'cycleLength',
      title: firstRunCopy.cycleLength.title,
    } as const;

    it('is drawn at the top right where the frame is given one', async () => {
      const skips = jest.fn();

      await render(
        <OnAPhone>
          <OnboardingScreen {...anAnsweredQuestion} onAction={() => undefined} onSkip={skips} />
        </OnAPhone>,
      );
      await fireEvent.press(screen.getByTestId(onboardingSkipTestID));

      expect(screen.getByTestId(onboardingSkipTestID)).toHaveTextContent(firstRunCopy.skip);
      expect(skips).toHaveBeenCalledTimes(1);
    });

    it('is drawn nowhere at all where the frame is given none', async () => {
      await render(
        <OnAPhone>
          <OnboardingScreen {...anAnsweredQuestion} onAction={() => undefined} />
        </OnAPhone>,
      );

      expect(screen.queryByTestId(onboardingSkipTestID)).toBeNull();
    });

    for (const where of firstRunScreens) {
      const offered = theQuestionsSheMaySkipToday.includes(where);

      it(`is ${offered ? 'offered' : 'not offered'} on ${where}`, async () => {
        await sheIsLookingAt(where);

        const skip = screen.queryByTestId(onboardingSkipTestID);

        expect(skip === null).toBe(!offered);
      });
    }

    for (const where of theQuestionsWithTheWayPastOverTheButton) {
      it(`is drawn over the button on ${where}, where the redesign puts it`, async () => {
        await sheIsLookingAt(where);

        expect(screen.getByTestId(onboardingWayPastTestID)).toBeTruthy();
      });
    }
  });

  describe('the question she is being asked', () => {
    for (const where of firstRunScreens) {
      it(`is the largest thing the frame writes on ${where}`, async () => {
        await sheIsLookingAt(where);

        const asked = String(screen.getByRole('header').props.children);
        const runs = sizedTextIn(screen.toJSON());
        const question = runs.find((run) => run.text === asked);
        const beside = runs.filter((run) => run.text !== asked && run.points !== undefined);

        expect(question?.points).toBe(typeScale['headline-lg'].size);
        expect(beside.length).toBeGreaterThan(0);
        expect(beside.filter((run) => Number(run.points) > typeScale['headline-lg'].size)).toEqual(
          [],
        );
      });
    }
  });

  describe('the day she picked', () => {
    it('is marked three ways, so colour is never the only cue', async () => {
      await sheIsPickingADay();

      const square = flattened(dateDiscTestID(threeDaysBack));

      expect(square.backgroundColor).toBe(colour.accent);
      expect(square.borderColor).toBe(colour.accentSoftInk);
      expect(screen.getByTestId(chosenDayMarkTestID)).toBeTruthy();
    });

    it('is the only square marked, so one day is chosen and not two', async () => {
      await sheIsPickingADay();

      const others = [today, '2026-05-12'].map((day) => flattened(dateDiscTestID(day)));

      expect(screen.queryAllByTestId(chosenDayMarkTestID)).toHaveLength(1);
      expect(others.map((each) => each.backgroundColor)).toEqual([undefined, undefined]);
      expect(others.map((each) => each.borderColor)).toEqual([colour.card, colour.card]);
      expect(screen.getByTestId(dayTestID(threeDaysBack))).toBeSelected();
      expect(screen.getByTestId(dayTestID(today))).not.toBeSelected();
    });

    it('keeps a day she may not choose on the screen, drawn back rather than taken away', async () => {
      await sheIsPickingADay();

      const after = flattened(dayTestID('2026-05-20'));

      expect(screen.getByTestId(dayTestID('2026-05-20'))).toBeTruthy();
      expect(after.opacity).toBeLessThan(1);
      expect(after.backgroundColor).not.toBe(colour.field);
    });
  });

  describe('the month she is looking at', () => {
    it('is named above the squares, at the size a heading takes', async () => {
      await sheIsPickingADay();

      const heading = flattened(monthTestID);

      expect(screen.getByTestId(monthTestID)).toHaveTextContent('May 2026');
      expect(heading.color).toBe(colour.text);
      expect(heading.fontSize).toBe(typeScale['headline-sm'].size);
    });

    it('draws the way to another month as a small word, not a pill, and fades a spent one', async () => {
      await sheIsPickingADay();

      const live = flattened(earlierMonthTestID);
      const spent = flattened(laterMonthTestID);

      expect(live.backgroundColor).toBeUndefined();
      expect(spent.backgroundColor).toBeUndefined();
      expect(Number(spent.opacity)).toBeLessThan(Number(live.opacity ?? 1));
    });

    it('says the same thing to a screen reader, on the handle that is spent', async () => {
      await sheIsPickingADay();

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
        [colour.secondaryText, colour.card],
        [colour.text, colour.card],
        [colour.secondaryText, colour.card],
        [colour.text, colour.card],
        [colour.text, colour.accentSoft],
        [colour.accentSoftInk, colour.accentSoft],
        [colour.card, colour.accent],
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
