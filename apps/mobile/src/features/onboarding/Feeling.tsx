import type { Feeling as HowSheFeelsAboutIt } from '@emi/crypto';
import { colour, space, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SingleChoiceRow } from '../../components/ChoiceRow';
import { OnboardingScreen } from './OnboardingScreen';
import { feelingChoices, feelingLabels, feelingReplies, firstRunCopy } from './copy';

/** The row for one answer, named so a test presses the answer rather than a position in a list. */
export function feelingTestID(answer: HowSheFeelsAboutIt): string {
  return `feeling-${answer}`;
}

/** The line her answer is answered on, named so a test reads the reply and not a position. */
export const feelingReplyTestID = 'feeling-reply';

interface Props {
  /** Nothing at all until she picks, because the screen opens on no answer of its own. */
  readonly chosen: HowSheFeelsAboutIt | undefined;
  readonly onChoose: (answer: HowSheFeelsAboutIt) => void;
  readonly onContinue: () => void;
  readonly onBack: () => void;
  readonly onSkip: () => void;
}

/**
 * How she feels about her own cycle. The answer changes what Emi offers her and never what the
 * arithmetic says, so the screen promises one thing: a difference in the words.
 *
 * No answer is chosen for her, for the same reason the regularity screen chooses none: a row
 * filled in before she touches it puts a statement about her in her profile that she never made.
 */
export function Feeling({ chosen, onChoose, onContinue, onBack, onSkip }: Props): ReactNode {
  return (
    <OnboardingScreen
      actionIsReady={chosen !== undefined}
      actionLabel={firstRunCopy.feeling.action}
      lines={firstRunCopy.feeling.lines}
      onAction={onContinue}
      onBack={onBack}
      onSkip={onSkip}
      screen="feeling"
      title={firstRunCopy.feeling.title}
    >
      <View style={styles.rows}>
        {feelingChoices.map((answer) => (
          <SingleChoiceRow
            isChosen={answer === chosen}
            key={answer}
            label={feelingLabels[answer]}
            onPress={() => {
              onChoose(answer);
            }}
            testID={feelingTestID(answer)}
          />
        ))}
        {chosen === undefined ? null : (
          <Text style={styles.reply} testID={feelingReplyTestID}>
            {feelingReplies[chosen]}
          </Text>
        )}
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  reply: {
    color: colour.secondaryText,
    ...textStyle('body-sm'),
    paddingHorizontal: space.spaceXs,
  },
  rows: { gap: space.spaceSm },
});
