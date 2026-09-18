import { colour, fonts, radius, space, typeScale } from '@emi/tokens';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { RecoveryScreen } from './RecoveryScreen';
import { groupedRecoveryCode, recoveryCopy } from './copy';

/**
 * Screen two of three, and the only place the code is ever drawn. Nothing reads it back off this
 * screen, so a screenshot of it is the one copy she has besides the paper.
 */
export const recoveryCodeTestID = 'recovery-code-shown';

export function ShowRecoveryCode({
  code,
  onContinue,
}: {
  readonly code: string;
  readonly onContinue: () => void;
}): ReactNode {
  return (
    <RecoveryScreen
      actionLabel={recoveryCopy.code.action}
      lines={recoveryCopy.code.lines}
      onAction={onContinue}
      screen="code"
      title={recoveryCopy.code.title}
    >
      <View style={styles.card}>
        <Text selectable={false} style={styles.code} testID={recoveryCodeTestID}>
          {groupedRecoveryCode(code)}
        </Text>
      </View>
    </RecoveryScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colour.surface,
    borderColor: colour.hairline,
    borderRadius: radius.card,
    borderWidth: 1,
    padding: space.base,
  },
  code: {
    color: colour.ink,
    // The one value in Emi a woman copies character by character, so it is set in the face whose
    // digits and letters cannot be read as each other.
    fontFamily: fonts.numeric.family,
    fontSize: typeScale.body.size,
    letterSpacing: 2,
    lineHeight: typeScale.title.lineHeight,
  },
});
