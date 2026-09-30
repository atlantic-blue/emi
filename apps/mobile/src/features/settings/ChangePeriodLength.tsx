import { type ReactNode, useState } from 'react';

import {
  Stepper,
  stepperDownTestID,
  stepperReadingTestID,
  stepperUpTestID,
} from '../../components/Stepper';
import { firstRunCopy, periodLengthDaysLabel } from '../onboarding/copy';
import {
  defaultPeriodLengthDays,
  maximumPeriodLengthDays,
  minimumPeriodLengthDays,
} from '../onboarding/firstRun';
import { AnswerScreen } from './AnswerScreen';
import { yourAnswersCopy } from './copy';

export const changePeriodLengthStepperTestID = 'answer-period-length';
export const answerFewerDaysTestID = stepperDownTestID(changePeriodLengthStepperTestID);
export const answerMoreDaysTestID = stepperUpTestID(changePeriodLengthStepperTestID);
export const answerPeriodLengthReadingTestID = stepperReadingTestID(
  changePeriodLengthStepperTestID,
);

interface Props {
  /** The length she already gave, and nothing where the first run never got an answer out of her. */
  readonly gave: number | undefined;
  readonly onSave: (days: number) => void;
  readonly onCancel: () => void;
}

/**
 * How long her period runs, asked again with the stepper the first run asked it with.
 *
 * The stepper opens on what she already said, so the first thing she reads is her own answer. A
 * woman who said she was not sure opens on the number the first run opens on, because a stepper has
 * to start somewhere.
 */
export function ChangePeriodLength({ gave, onSave, onCancel }: Props): ReactNode {
  const [days, setDays] = useState(gave ?? defaultPeriodLengthDays);

  return (
    <AnswerScreen
      held={gave === undefined ? undefined : periodLengthDaysLabel(gave)}
      lines={firstRunCopy.periodLength.lines}
      onCancel={onCancel}
      onSave={() => {
        onSave(days);
      }}
      question={firstRunCopy.periodLength.title}
      title={yourAnswersCopy.rows.periodLength}
    >
      <Stepper
        canGoDown={days > minimumPeriodLengthDays}
        canGoUp={days < maximumPeriodLengthDays}
        downLabel={firstRunCopy.fewerDays}
        onDown={() => {
          setDays(days - 1);
        }}
        onUp={() => {
          setDays(days + 1);
        }}
        reading={periodLengthDaysLabel(days)}
        testID={changePeriodLengthStepperTestID}
        upLabel={firstRunCopy.moreDays}
      />
    </AnswerScreen>
  );
}
