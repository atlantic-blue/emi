import { colour, radius, space, textStyle } from '@emi/tokens';
import { CappedText as Text, CappedTextInput as TextInput } from '@emi/ui';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { PrimaryButton, TextLink } from '../../components/Button';
import { RoundIconButton } from '../../components/RoundIconButton';
import { Screen } from '../../components/Screen';
import { accountEmailCodeCopy, theCodeWentTo } from './copy';

export const accountEmailCodeScreenTestID = 'account-email-code';
export const accountEmailCodeBackTestID = 'account-email-code-back';
export const accountEmailCodeTitleTestID = 'account-email-code-title';
export const accountEmailCodeFieldTestID = 'account-email-code-field';
export const accountEmailCodeLineTestID = 'account-email-code-line';
export const accountEmailCodeSendANewCodeTestID = 'account-email-code-send-a-new-code';
export const accountEmailCodeUseAnotherAddressTestID = 'account-email-code-use-another-address';
export const accountEmailCodeSignInTestID = 'account-email-code-sign-in';

/** What the one line under the code says: how long the code lasts, a next step, or a problem. */
export interface TheOneLine {
  readonly words: string;
  readonly isAProblem: boolean;
}

/** The set holds one chevron, pointing the way on, so the way back is the same drawing turned. */
const TURNED_AROUND = [{ rotate: '180deg' }] as const;

/** Points. The height of the box she types the code into. */
const CODE_BOX_HEIGHT = 60;

/** Points. The border of that box, which the board draws at twice the hairline. */
const CODE_BOX_BORDER = 2;

/**
 * The box for the code, with the address it went to as the title. The box is as long as the code
 * the service sent, which is not one fixed number, so it arrives as `digits`.
 */
export function AccountEmailCode({
  address,
  code,
  digits,
  line,
  onCode,
  onBack,
  onSendANewCode,
  onUseAnotherAddress,
  onSignIn,
}: {
  readonly address: string;
  readonly code: string;
  readonly digits: number;
  readonly line: TheOneLine;
  readonly onCode: (code: string) => void;
  readonly onBack: () => void;
  readonly onSendANewCode: () => void;
  readonly onUseAnotherAddress: () => void;
  readonly onSignIn: () => void;
}): ReactNode {
  return (
    <Screen drawsTheWash givesWayToTheKeyboard testID={accountEmailCodeScreenTestID}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.backMark}>
            <RoundIconButton
              accessibilityLabel={accountEmailCodeCopy.back}
              icon="chevron"
              onPress={onBack}
              testID={accountEmailCodeBackTestID}
            />
          </View>
        </View>

        <Text accessibilityRole="header" style={styles.title} testID={accountEmailCodeTitleTestID}>
          {theCodeWentTo(address)}
        </Text>

        <View style={styles.field}>
          <Text style={styles.label}>{accountEmailCodeCopy.label}</Text>
          <TextInput
            accessibilityLabel={accountEmailCodeCopy.label}
            autoComplete="one-time-code"
            inputMode="numeric"
            keyboardType="number-pad"
            maxLength={digits}
            onChangeText={(typed) => onCode(typed.replace(/\D/g, '').slice(0, digits))}
            style={styles.code}
            testID={accountEmailCodeFieldTestID}
            textContentType="oneTimeCode"
            value={code}
          />
        </View>

        <Text
          accessibilityRole={line.isAProblem ? 'alert' : undefined}
          style={line.isAProblem ? styles.problem : styles.line}
          testID={accountEmailCodeLineTestID}
        >
          {line.words}
        </Text>

        <View style={styles.links}>
          <TextLink
            label={accountEmailCodeCopy.sendANewCode}
            onPress={onSendANewCode}
            testID={accountEmailCodeSendANewCodeTestID}
          />
          <TextLink
            label={accountEmailCodeCopy.useAnotherAddress}
            onPress={onUseAnotherAddress}
            testID={accountEmailCodeUseAnotherAddressTestID}
          />
        </View>

        <View style={styles.room} />

        <PrimaryButton
          label={accountEmailCodeCopy.signIn}
          onPress={onSignIn}
          testID={accountEmailCodeSignInTestID}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backMark: { transform: TURNED_AROUND },
  body: {
    flexGrow: 1,
    paddingHorizontal: space.margin,
    paddingVertical: space.spaceXl,
    rowGap: space.spaceLg,
  },
  code: {
    backgroundColor: colour.card,
    borderColor: colour.accent,
    borderRadius: radius.md,
    borderWidth: CODE_BOX_BORDER,
    color: colour.text,
    minHeight: CODE_BOX_HEIGHT,
    paddingHorizontal: space.spaceLg,
    ...textStyle('data-lg'),
  },
  field: { rowGap: space.spaceSm },
  header: { alignItems: 'center', flexDirection: 'row' },
  label: { color: colour.secondaryText, ...textStyle('label-md') },
  line: { color: colour.secondaryText, ...textStyle('body-sm') },
  links: { alignItems: 'flex-start' },
  problem: { color: colour.accent, ...textStyle('body-sm') },
  room: { flexGrow: 1 },
  title: {
    color: colour.text,
    paddingTop: space.spaceMd,
    textAlign: 'center',
    ...textStyle('headline-md'),
  },
});
