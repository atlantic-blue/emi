import type { Regularity as HowSteadyItIs } from '@emi/crypto';
import { space } from '@emi/tokens';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { SingleChoiceRow } from '../../components/ChoiceRow';
import { OnboardingScreen } from './OnboardingScreen';
import { firstRunCopy, regularityChoices, regularityLabels } from './copy';

/** The row for one answer, named so a test presses the answer rather than a position in a list. */
export function regularityTestID(answer: HowSteadyItIs): string {
  return `regularity-${answer}`;
}

interface Props {
  /** Nothing at all until she picks, because the screen opens on no answer of its own. */
  readonly chosen: HowSteadyItIs | undefined;
  readonly onChoose: (answer: HowSteadyItIs) => void;
  readonly onContinue: () => void;
  readonly onBack: () => void;
  readonly onSkip: () => void;
}

/**
 * How steady she says her cycle is. The answer changes one sentence under the forecast and nothing
 * else: the range is arithmetic over the days she logged, so an answer she gives here cannot widen
 * it, and the screen promises nothing it would then have to keep.
 *
 * No answer is chosen for her. A row filled in before she touches it would put a statement about
 * her body in her profile that she never made.
 */
export function Regularity({ chosen, onChoose, onContinue, onBack, onSkip }: Props): ReactNode {
  return (
    <OnboardingScreen
      actionIsReady={chosen !== undefined}
      actionLabel={firstRunCopy.regularity.action}
      lines={firstRunCopy.regularity.lines}
      onAction={onContinue}
      onBack={onBack}
      onSkip={onSkip}
      screen="regularity"
      title={firstRunCopy.regularity.title}
    >
      <View style={styles.rows}>
        {regularityChoices.map((answer) => (
          <SingleChoiceRow
            isChosen={answer === chosen}
            key={answer}
            label={regularityLabels[answer]}
            onPress={() => {
              onChoose(answer);
            }}
            testID={regularityTestID(answer)}
          />
        ))}
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  rows: { gap: space.spaceSm },
});
