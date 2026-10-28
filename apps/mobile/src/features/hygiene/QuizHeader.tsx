import { MINIMUM_TAP_TARGET, colour, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { CappedText as Text } from '@emi/ui';

import { RoundIconButton } from '../../components/RoundIconButton';
import { words } from '../../language';

export const quizCloseTestID = 'hygiene-quiz-close';

/** The head of the quiz and of its result, as both boards draw it: the way out, and the title. */
export function QuizHeader({ onClose }: { readonly onClose: () => void }): ReactNode {
  return (
    <View style={styles.header}>
      <RoundIconButton
        accessibilityLabel={words('hygiene.quiz.close')}
        icon="close"
        onPress={onClose}
        testID={quizCloseTestID}
      />
      <Text style={styles.title}>{words('hygiene.quiz.title')}</Text>
      <View style={styles.evenUp} />
    </View>
  );
}

const styles = StyleSheet.create({
  evenUp: { width: MINIMUM_TAP_TARGET },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  title: { color: colour.text, textAlign: 'center', ...textStyle('headline-sm') },
});
