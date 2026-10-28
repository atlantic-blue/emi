import { fireEvent, render, screen } from '@testing-library/react-native';
import { type ReactNode, useState } from 'react';

import { ThreePeriods } from '../../../src/features/onboarding/ThreePeriods';
import { pastPeriodPickerTitleTestID } from '../../../src/features/pastPeriods/PastPeriodPicker';
import { pastPeriodRowTestID } from '../../../src/features/pastPeriods/PastPeriodsList';
import { pastPeriodDateSaid } from '../../../src/features/pastPeriods/copy';
import {
  type PastPeriod,
  periodsAfterGiving,
  periodsAfterRemoving,
} from '../../../src/features/pastPeriods/pastPeriods';
import { textIn } from '../../fixtures/renderedText';
import { OnAPhone } from '../../fixtures/theSafeArea';
import { sheGivesAPeriod } from '../../fixtures/thePastPeriods';

const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');
const newest = '2026-05-09';
const theOneBefore = '2026-04-11';
const theOneBeforeThat = '2026-03-14';
const placesInOrder = ['Most recent', 'The one before', 'The one before that'] as const;

function rowText(row: number): string {
  return textIn(screen.getByTestId(pastPeriodRowTestID(row))).join(' | ');
}

function TheStep({
  heldAs,
}: {
  readonly heldAs: (periods: readonly PastPeriod[]) => void;
}): ReactNode {
  const [periods, setPeriods] = useState<readonly PastPeriod[]>([]);
  heldAs(periods);

  return (
    <OnAPhone>
      <ThreePeriods
        now={whenSheOpensIt}
        onBack={() => undefined}
        onContinue={() => undefined}
        onGive={(row, period) => setPeriods((held) => periodsAfterGiving(held, row, period))}
        onRemove={(row) => setPeriods((held) => periodsAfterRemoving(held, row))}
        onWayPast={() => undefined}
        periods={periods}
      />
    </OnAPhone>
  );
}

describe('the rows of her last three periods', () => {
  it('should tell her to start with the most recent period', async () => {
    await render(<TheStep heldAs={() => undefined} />);

    expect(screen.getByText(/Start with the most recent\./)).toBeTruthy();
  });

  it('should name each row by its place, most recent first', async () => {
    await render(<TheStep heldAs={() => undefined} />);

    placesInOrder.forEach((place, row) => {
      expect(rowText(row)).toContain(`${row + 1} | ${place} | Add the start date`);
    });
  });

  it('should name the sheet by the place of the row it opened on', async () => {
    await render(<TheStep heldAs={() => undefined} />);
    await sheGivesAPeriod(0, newest);

    await fireEvent.press(screen.getByTestId(pastPeriodRowTestID(1)));

    expect(screen.getByTestId(pastPeriodPickerTitleTestID)).toHaveTextContent('The one before');
  });

  it('should hold each date she gives as the period its row names', async () => {
    let held: readonly PastPeriod[] = [];
    await render(<TheStep heldAs={(periods) => (held = periods)} />);

    await sheGivesAPeriod(0, newest);
    await sheGivesAPeriod(1, theOneBefore);
    await sheGivesAPeriod(2, theOneBeforeThat);

    expect(held.map((period) => period.startedOn)).toEqual([
      newest,
      theOneBefore,
      theOneBeforeThat,
    ]);
    [newest, theOneBefore, theOneBeforeThat].forEach((startedOn, row) => {
      expect(rowText(row)).toContain(
        `${row + 1} | ${placesInOrder[row]} | ${pastPeriodDateSaid(startedOn)}`,
      );
    });
  });
});
