import { type ReactNode, useState } from 'react';

import {
  Stepper,
  stepperDownTestID,
  stepperReadingTestID,
  stepperUpTestID,
} from '../../components/Stepper';
import { cycleLengthDaysLabel, firstRunCopy } from '../onboarding/copy';
import {
  defaultCycleLengthDays,
  maximumCycleLengthDays,
  minimumCycleLengthDays,
} from '../onboarding/firstRun';
import { AnswerScreen } from './AnswerScreen';
import { yourAnswersCopy } from './copy';

export const changeCycleLengthStepperTestID = 'answer-cycle-length';
export const answerShorterTestID = stepperDownTestID(changeCycleLengthStepperTestID);
export const answerLongerTestID = stepperUpTestID(changeCycleLengthStepperTestID);
export const answerCycleLengthReadingTestID = stepperReadingTestID(changeCycleLengthStepperTestID);

interface Props {
  /** The length she already gave, and nothing where the first run never got an answer out of her. */
  readonly gave: number | undefined;
  readonly onSave: (days: number) => void;
  readonly onCancel: () => void;
}

/**
 * Her cycle length, asked again with the stepper the first run asked it with.
 *
 * The stepper opens on what she already said, so the first thing she reads is her own answer and
 * one press moves it by a day. A woman who never gave a number opens on the number the first run
 * opens on, because the stepper has to start somewhere and that is where it starts for everybody.
 *
 * The number she is moving is held here and written nowhere until she saves, so leaving by either
 * way out of the header leaves the answer she gave exactly as it was.
 */
export function ChangeCycleLength({ gave, onSave, onCancel }: Props): ReactNode {
  const [days, setDays] = useState(gave ?? defaultCycleLengthDays);

  return (
    <AnswerScreen
      held={gave === undefined ? undefined : cycleLengthDaysLabel(gave)}
      lines={firstRunCopy.cycleLength.lines}
      onCancel={onCancel}
      onSave={() => {
        onSave(days);
      }}
      question={firstRunCopy.cycleLength.title}
      title={yourAnswersCopy.rows.cycleLength}
    >
      <Stepper
        canGoDown={days > minimumCycleLengthDays}
        canGoUp={days < maximumCycleLengthDays}
        downLabel={firstRunCopy.shorter}
        onDown={() => {
          setDays(days - 1);
        }}
        onUp={() => {
          setDays(days + 1);
        }}
        reading={cycleLengthDaysLabel(days)}
        testID={changeCycleLengthStepperTestID}
        upLabel={firstRunCopy.longer}
      />
    </AnswerScreen>
  );
}
