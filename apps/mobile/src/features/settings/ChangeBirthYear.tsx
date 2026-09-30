import { type ReactNode, useState } from 'react';

import { YearWheel } from '../../components/YearWheel';
import { birthYearLabel, firstRunCopy } from '../onboarding/copy';
import { birthYearsOffered, middleBirthYear } from '../onboarding/firstRun';
import { AnswerScreen } from './AnswerScreen';
import { yourAnswersCopy } from './copy';

interface Props {
  /** The instant the newest year offered is measured from, because that bound moves with the clock. */
  readonly now: Date;
  /** The year she already gave, and nothing where the first run never got one out of her. */
  readonly gave: number | undefined;
  readonly onSave: (year: number) => void;
  readonly onCancel: () => void;
}

/**
 * The year she was born, asked again on the wheel the first run asked it on.
 *
 * The wheel opens on the year she already chose, and on the year in the middle of the six for a
 * woman who chose none, which is where the first run opens it too.
 *
 * Save waits for a year, because nothing is chosen for her and a save of nothing would take the
 * answer off her profile rather than correcting it.
 */
export function ChangeBirthYear({ now, gave, onSave, onCancel }: Props): ReactNode {
  const [chosen, setChosen] = useState(gave);

  return (
    <AnswerScreen
      held={gave === undefined ? undefined : String(gave)}
      lines={firstRunCopy.birthYear.lines}
      onCancel={onCancel}
      onSave={() => {
        if (chosen !== undefined) {
          onSave(chosen);
        }
      }}
      question={firstRunCopy.birthYear.title}
      saveIsReady={chosen !== undefined}
      title={yourAnswersCopy.rows.birthYear}
    >
      <YearWheel
        chosen={chosen}
        labelOf={birthYearLabel}
        onChoose={setChosen}
        opensOn={middleBirthYear(now)}
        years={birthYearsOffered(now)}
      />
    </AnswerScreen>
  );
}
