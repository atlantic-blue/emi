import { fireEvent, render, screen } from '@testing-library/react-native';

import { CycleLength, cycleLengthDaysTestID } from '../../../src/features/onboarding/CycleLength';
import {
  onboardingActionTestID,
  onboardingQuestionTestID,
} from '../../../src/features/onboarding/OnboardingScreen';
import {
  PeriodLength,
  periodLengthDaysTestID,
} from '../../../src/features/onboarding/PeriodLength';
import { OnAPhone } from '../../fixtures/theSafeArea';

/**
 * The two length questions after she gave her periods. With a length worked out from her dates the
 * wheel opens on it and Done is ready. Without one, nothing is chosen until she turns the wheel.
 */

interface Pressed {
  readonly chosen: number[];
  readonly done: number;
}

async function sheReadsTheCycleQuestion(fromHerDates: number | undefined): Promise<Pressed> {
  const pressed = { chosen: [] as number[], done: 0 };
  await render(
    <OnAPhone>
      <CycleLength
        chosen={undefined}
        fromHerDates={fromHerDates}
        onBack={() => undefined}
        onChoose={(days) => pressed.chosen.push(days)}
        onDone={() => {
          pressed.done += 1;
        }}
      />
    </OnAPhone>,
  );
  return pressed;
}

async function sheReadsThePeriodQuestion(fromHerDates: number | undefined): Promise<Pressed> {
  const pressed = { chosen: [] as number[], done: 0 };
  await render(
    <OnAPhone>
      <PeriodLength
        chosen={undefined}
        fromHerDates={fromHerDates}
        onBack={() => undefined}
        onChoose={(days) => pressed.chosen.push(days)}
        onDone={() => {
          pressed.done += 1;
        }}
        onNotSure={() => undefined}
      />
    </OnAPhone>,
  );
  return pressed;
}

describe('the cycle length question', () => {
  it('opens on the length from her dates, says where it came from, and Done is ready', async () => {
    const pressed = await sheReadsTheCycleQuestion(27);

    expect(screen.getByTestId(onboardingQuestionTestID)).toHaveTextContent(
      'Based on your records, your cycle averages 27 days. Does that look right?',
    );
    expect(screen.getByTestId(cycleLengthDaysTestID(27))).toBeSelected();
    expect(screen.getByTestId(onboardingActionTestID)).toBeEnabled();

    await fireEvent.press(screen.getByTestId(onboardingActionTestID));

    expect(pressed).toEqual({ chosen: [27], done: 1 });
  });

  it('keeps nothing and waits for her where her dates give no length', async () => {
    const pressed = await sheReadsTheCycleQuestion(undefined);

    expect(screen.queryByTestId(onboardingQuestionTestID)).toBeNull();
    expect(screen.getByTestId(cycleLengthDaysTestID(28))).not.toBeSelected();
    expect(screen.getByTestId(onboardingActionTestID)).toBeDisabled();

    await fireEvent.press(screen.getByTestId(onboardingActionTestID));

    expect(pressed).toEqual({ chosen: [], done: 0 });
  });
});

describe('the period length question', () => {
  it('opens on the length from her dates, says where it came from, and Done is ready', async () => {
    const pressed = await sheReadsThePeriodQuestion(6);

    expect(screen.getByTestId(onboardingQuestionTestID)).toHaveTextContent(
      'Based on your records, your period averages 6 days. Does that look right?',
    );
    expect(screen.getByTestId(periodLengthDaysTestID(6))).toBeSelected();

    await fireEvent.press(screen.getByTestId(onboardingActionTestID));

    expect(pressed).toEqual({ chosen: [6], done: 1 });
  });

  it('keeps nothing and waits for her where her dates give no length', async () => {
    await sheReadsThePeriodQuestion(undefined);

    expect(screen.queryByTestId(onboardingQuestionTestID)).toBeNull();
    expect(screen.getByTestId(onboardingActionTestID)).toBeDisabled();
  });
});
