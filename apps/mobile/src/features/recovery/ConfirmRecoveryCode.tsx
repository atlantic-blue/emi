import { readRecoveryCode } from '@emi/crypto';
import { colour, radius, space, textStyle, typeScale } from '@emi/tokens';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';

import { RecoveryScreen } from './RecoveryScreen';
import { recoveryCopy } from './copy';

/**
 * Screen three of three. It refuses to continue until what she typed opens the wrapped vault key,
 * because the thing worth proving is not that she can copy 26 characters. It is that the paper in
 * her hand is the paper that gets her back in.
 *
 * It asks by opening the key rather than by comparing two strings, so the check here is the same
 * check a second phone runs when she has lost this one.
 */
export const recoveryEntryTestID = 'recovery-entry';
export const recoveryWrongTestID = 'recovery-wrong';

interface Props {
  /** Answers whether the code she typed opens this phone's vault. */
  readonly opensTheVault: (typed: string) => boolean;
  readonly onConfirmed: () => void;
}

/**
 * Whether there is a whole code in the field yet. This is the format and nothing more, so it costs
 * nothing and can be asked on every keystroke. Whether the code is hers costs a tenth of a second
 * of Argon2id, so that is asked once, when she presses.
 */
function looksLikeAWholeCode(typed: string): boolean {
  try {
    readRecoveryCode(typed);

    return true;
  } catch {
    return false;
  }
}

export function ConfirmRecoveryCode({ opensTheVault, onConfirmed }: Props): ReactNode {
  const [typed, setTyped] = useState('');
  const [wasWrong, setWasWrong] = useState(false);

  // Derived while rendering rather than kept in state, so what the button offers and what the
  // field holds can never disagree.
  const isWhole = looksLikeAWholeCode(typed);

  return (
    <RecoveryScreen
      actionIsReady={isWhole}
      actionLabel={recoveryCopy.confirm.action}
      lines={recoveryCopy.confirm.lines}
      onAction={() => {
        if (!opensTheVault(typed)) {
          setWasWrong(true);

          return;
        }

        onConfirmed();
      }}
      screen="confirm"
      title={recoveryCopy.confirm.title}
    >
      <TextInput
        accessibilityLabel={recoveryCopy.confirm.label}
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect={false}
        onChangeText={(entered) => {
          setWasWrong(false);
          setTyped(entered);
        }}
        style={styles.entry}
        testID={recoveryEntryTestID}
        value={typed}
      />
      {wasWrong ? (
        <Text style={styles.wrong} testID={recoveryWrongTestID}>
          {recoveryCopy.confirm.wrong}
        </Text>
      ) : null}
    </RecoveryScreen>
  );
}

const styles = StyleSheet.create({
  entry: {
    backgroundColor: colour.surfaceContainerLowest,
    borderColor: colour.outlineVariant,
    borderRadius: radius.lg,
    borderWidth: 1,
    color: colour.onSurface,
    ...textStyle('body-lg'),
    letterSpacing: 2,
    lineHeight: typeScale['headline-lg'].lineHeight,
    padding: space.spaceMd,
  },
  wrong: {
    color: colour.primary,
    ...textStyle('body-lg'),
    marginTop: space.spaceMd,
  },
});
