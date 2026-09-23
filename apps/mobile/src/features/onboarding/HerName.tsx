import { longestName } from '@emi/crypto';
import { colour, space, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { StyleSheet, Text } from 'react-native';

import { TextField } from '../../components/TextField';
import { OnboardingScreen } from './OnboardingScreen';
import { firstRunCopy, nameTooLongLine } from './copy';
import { nameIsInRange } from './firstRun';

export const nameFieldTestID = 'her-name';
export const nameTooLongTestID = 'her-name-too-long';

interface Props {
  readonly typed: string;
  readonly onType: (typed: string) => void;
  readonly onContinue: () => void;
  readonly onSkip: () => void;
  readonly onBack: () => void;
}

/**
 * The only question of the first run she types an answer to, and the only field in Emi at all.
 *
 * An empty field is the same answer as the Skip above it, so Continue stays available and writes
 * no name. A name over the bound is the one state the screen holds her on, because the profile
 * refuses it at the hold, and a refusal at the end of the first run is one she cannot act on.
 */
export function HerName({ typed, onType, onContinue, onSkip, onBack }: Props): ReactNode {
  const tooLong = !nameIsInRange(typed);

  return (
    <OnboardingScreen
      actionIsReady={!tooLong}
      actionLabel={firstRunCopy.name.action}
      lines={firstRunCopy.name.lines}
      onAction={onContinue}
      onBack={onBack}
      onSkip={onSkip}
      screen="name"
      title={firstRunCopy.name.title}
    >
      <TextField
        hint={firstRunCopy.name.hint}
        label={firstRunCopy.name.label}
        onChange={onType}
        testID={nameFieldTestID}
        value={typed}
      />
      {tooLong ? (
        <Text style={styles.refused} testID={nameTooLongTestID}>
          {nameTooLongLine(longestName)}
        </Text>
      ) : null}
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  refused: {
    color: colour.error,
    ...textStyle('body-sm'),
    marginTop: space.spaceSm,
  },
});
