import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { type ReactNode, useState } from 'react';

import { NumberWheel, WHEEL_ROW_HEIGHT } from '../../src/components/NumberWheel';
import { YearWheel, yearTestID, yearWheelTestID } from '../../src/components/YearWheel';
import {
  cycleLengthDaysTestID,
  cycleLengthWheelTestID,
} from '../../src/features/onboarding/CycleLength';
import {
  periodLengthDaysTestID,
  periodLengthWheelTestID,
} from '../../src/features/onboarding/PeriodLength';
import {
  birthYearsOffered,
  cycleLengthsOffered,
  defaultCycleLengthDays,
  defaultPeriodLengthDays,
  periodLengthsOffered,
} from '../../src/features/onboarding/firstRun';

const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');

interface AWheel {
  readonly name: string;
  readonly values: readonly number[];
  readonly opensOn: number;
  readonly testIDOf: (value: number) => string;
  readonly testID: string;
  readonly draw: (chosen: number | undefined, onChoose: (value: number) => void) => ReactNode;
}

function aLengthWheel(
  values: readonly number[],
  opensOn: number,
  testIDOf: (value: number) => string,
  testID: string,
): AWheel['draw'] {
  return function drawTheLengthWheel(chosen, onChoose) {
    return (
      <NumberWheel
        chosen={chosen}
        labelOf={(value) => `${String(value)} days`}
        onChoose={onChoose}
        opensOn={opensOn}
        pillTestID={`${testID}-pill`}
        testID={testID}
        testIDOf={testIDOf}
        values={values}
      />
    );
  };
}

const theYears = birthYearsOffered(whenSheOpensIt);
const theYearItOpensOn = 1996;

const theThreeWheels: readonly AWheel[] = [
  {
    name: 'the year of birth',
    values: theYears,
    opensOn: theYearItOpensOn,
    testIDOf: yearTestID,
    testID: yearWheelTestID,
    draw: (chosen, onChoose) => (
      <YearWheel
        chosen={chosen}
        labelOf={(year) => `Born in ${String(year)}`}
        onChoose={onChoose}
        opensOn={theYearItOpensOn}
        years={theYears}
      />
    ),
  },
  {
    name: 'the cycle length',
    values: cycleLengthsOffered,
    opensOn: defaultCycleLengthDays,
    testIDOf: cycleLengthDaysTestID,
    testID: cycleLengthWheelTestID,
    draw: aLengthWheel(
      cycleLengthsOffered,
      defaultCycleLengthDays,
      cycleLengthDaysTestID,
      cycleLengthWheelTestID,
    ),
  },
  {
    name: 'the period length',
    values: periodLengthsOffered,
    opensOn: defaultPeriodLengthDays,
    testIDOf: periodLengthDaysTestID,
    testID: periodLengthWheelTestID,
    draw: aLengthWheel(
      periodLengthsOffered,
      defaultPeriodLengthDays,
      periodLengthDaysTestID,
      periodLengthWheelTestID,
    ),
  },
];

function twoRowsOn(wheel: AWheel, from: number): number {
  const value = wheel.values[wheel.values.indexOf(from) + 2];

  if (value === undefined) {
    throw new Error(`${wheel.name} has no number two rows after ${String(from)}`);
  }

  return value;
}

function theOffsetOf(wheel: AWheel, value: number): { readonly x: number; readonly y: number } {
  return { x: 0, y: wheel.values.indexOf(value) * WHEEL_ROW_HEIGHT };
}

interface Opened {
  readonly saved: number[];
}

async function sheOpensTheWheel(wheel: AWheel): Promise<Opened> {
  const saved: number[] = [];

  function TheScreen(): ReactNode {
    const [chosen, setChosen] = useState<number | undefined>(undefined);

    return wheel.draw(chosen, (value) => {
      saved.push(value);
      setChosen(value);
    });
  }

  await render(<TheScreen />);

  return { saved };
}

async function theWheelReportsItsEndAt(wheel: AWheel, value: number): Promise<void> {
  await act(async () => {
    fireEvent(screen.getByTestId(wheel.testID), 'momentumScrollEnd', {
      nativeEvent: { contentOffset: theOffsetOf(wheel, value) },
    });
  });
}

async function sheTurnsItTo(wheel: AWheel, value: number): Promise<void> {
  await act(async () => {
    fireEvent(screen.getByTestId(wheel.testID), 'scrollBeginDrag', {
      nativeEvent: { contentOffset: theOffsetOf(wheel, wheel.opensOn) },
    });
  });
  await theWheelReportsItsEndAt(wheel, value);
}

describe.each(theThreeWheels)('a tap on $name saves the row she taps', (wheel: AWheel) => {
  it('keeps the tapped row when the wheel reports its end two rows further on', async () => {
    const tapped = twoRowsOn(wheel, wheel.opensOn);
    const { saved } = await sheOpensTheWheel(wheel);

    await fireEvent.press(screen.getByTestId(wheel.testIDOf(tapped)));
    await theWheelReportsItsEndAt(wheel, twoRowsOn(wheel, tapped));

    expect(saved.at(-1)).toBe(tapped);
    expect(screen.getByTestId(wheel.testIDOf(tapped))).toBeSelected();
  });

  it('keeps the tapped row when the scroll end arrives part way through the tap animation', async () => {
    const tapped = twoRowsOn(wheel, wheel.opensOn);
    const partWay = wheel.values[wheel.values.indexOf(wheel.opensOn) + 1] ?? wheel.opensOn;
    const { saved } = await sheOpensTheWheel(wheel);

    await fireEvent.press(screen.getByTestId(wheel.testIDOf(tapped)));
    await theWheelReportsItsEndAt(wheel, partWay);

    expect(saved).toEqual([tapped]);
  });

  it('holds the wheel where it opened, so the tap is the only thing that moves it', async () => {
    const { saved } = await sheOpensTheWheel(wheel);
    const before = screen.getByTestId(wheel.testID).props.contentOffset;

    await fireEvent.press(screen.getByTestId(wheel.testIDOf(twoRowsOn(wheel, wheel.opensOn))));

    expect(saved).toHaveLength(1);
    expect(before).toEqual(theOffsetOf(wheel, wheel.opensOn));
    expect(screen.getByTestId(wheel.testID).props.contentOffset).toEqual(before);
  });

  it('saves nothing when the wheel reports an end she did not turn or tap for', async () => {
    const { saved } = await sheOpensTheWheel(wheel);

    await theWheelReportsItsEndAt(wheel, wheel.opensOn);

    expect(saved).toEqual([]);
    expect(screen.getByTestId(wheel.testIDOf(wheel.opensOn))).not.toBeSelected();
  });

  it('saves the row a turn settles on', async () => {
    const turnedTo = twoRowsOn(wheel, wheel.opensOn);
    const { saved } = await sheOpensTheWheel(wheel);

    await sheTurnsItTo(wheel, turnedTo);

    expect(saved).toEqual([turnedTo]);
    expect(screen.getByTestId(wheel.testIDOf(turnedTo))).toBeSelected();
  });
});
