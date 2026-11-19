import { MINIMUM_TAP_TARGET, colour, radius, space, stroke, textStyle } from '@emi/tokens';
import { Icon, CappedText as Text, CappedTextInput as TextInput } from '@emi/ui';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Screen } from '../../components/Screen';
import { accountGateCopy } from './copy';

export const accountGateScreenTestID = 'account-gate';
export const accountGateTitleTestID = 'account-gate-title';
export const accountGateAppleTestID = 'account-gate-apple';
export const accountGateGoogleTestID = 'account-gate-google';
export const accountGateTelegramTestID = 'account-gate-telegram';
export const accountGateEmailTestID = 'account-gate-email';
export const accountGateSendCodeTestID = 'account-gate-send-code';
export const accountGateLineTestID = 'account-gate-line';

/** Points. The disc the drop stands in, over the title. */
const MARK_DIAMETER = 72;

/** Points. The drop inside that disc. */
const MARK_DROP = 32;

/** Points. The height of each way in. */
const WAY_IN_HEIGHT = 52;

function AWayIn({
  label,
  isDark,
  testID,
  onPress,
}: {
  readonly label: string;
  readonly isDark: boolean;
  readonly testID: string;
  /** Absent for a way in that is not built, which is drawn and takes no press. */
  readonly onPress?: () => void;
}): ReactNode {
  const isBuilt = onPress !== undefined;

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled: !isBuilt }}
      disabled={!isBuilt}
      onPress={onPress}
      style={[styles.wayIn, isDark ? styles.wayInDark : styles.wayInLight]}
      testID={testID}
    >
      <Text style={isDark ? styles.wayInDarkLabel : styles.wayInLightLabel}>{label}</Text>
    </Pressable>
  );
}

/**
 * The way into the account. Apple and Google are drawn as the board draws them and take no press,
 * because they are not built. The one line under the address is empty until something goes wrong,
 * and then it says what.
 */
export function AccountGate({
  address,
  problem,
  onAddress,
  onSendCode,
  onTelegram,
}: {
  readonly address: string;
  /** The one line under the address, or null where there is nothing to say. */
  readonly problem: string | null;
  readonly onAddress: (address: string) => void;
  readonly onSendCode: () => void;
  readonly onTelegram: () => void;
}): ReactNode {
  return (
    <Screen drawsTheWash givesWayToTheKeyboard testID={accountGateScreenTestID}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.room} />
        <View style={styles.markRow}>
          <View style={styles.mark}>
            <Icon colour={colour.accent} name="drop" size={MARK_DROP} />
          </View>
        </View>
        <Text accessibilityRole="header" style={styles.title} testID={accountGateTitleTestID}>
          {accountGateCopy.title}
        </Text>

        <AWayIn isDark label={accountGateCopy.apple} testID={accountGateAppleTestID} />
        <AWayIn isDark={false} label={accountGateCopy.google} testID={accountGateGoogleTestID} />
        <AWayIn
          isDark={false}
          label={accountGateCopy.telegram}
          onPress={onTelegram}
          testID={accountGateTelegramTestID}
        />

        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.or}
        >
          <View style={styles.orRule} />
          <Text style={styles.orWord}>{accountGateCopy.or}</Text>
          <View style={styles.orRule} />
        </View>

        <View style={styles.addressRow}>
          <TextInput
            accessibilityLabel={accountGateCopy.email}
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            inputMode="email"
            keyboardType="email-address"
            onChangeText={onAddress}
            onSubmitEditing={onSendCode}
            placeholder={accountGateCopy.email}
            placeholderTextColor={colour.secondaryText}
            returnKeyType="send"
            style={styles.address}
            testID={accountGateEmailTestID}
            textContentType="emailAddress"
            value={address}
          />
          <Pressable
            accessibilityRole="button"
            onPress={onSendCode}
            style={styles.send}
            testID={accountGateSendCodeTestID}
          >
            <Text style={styles.sendLabel}>{accountGateCopy.sendCode}</Text>
          </Pressable>
        </View>

        {problem === null ? null : (
          <Text accessibilityRole="alert" style={styles.problem} testID={accountGateLineTestID}>
            {problem}
          </Text>
        )}
        <View style={styles.room} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  address: {
    color: colour.text,
    flexGrow: 1,
    flexShrink: 1,
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: 0,
    ...textStyle('body-lg'),
  },
  // The send press sits inside the box and keeps the tap floor, so the box is that floor plus a
  // ring of padding.
  addressRow: {
    alignItems: 'center',
    backgroundColor: colour.card,
    borderColor: colour.platformLine,
    borderRadius: radius.full,
    borderWidth: stroke.hairline,
    columnGap: space.spaceSm,
    flexDirection: 'row',
    minHeight: WAY_IN_HEIGHT,
    paddingLeft: space.margin,
    paddingRight: space.spaceXs,
  },
  body: {
    flexGrow: 1,
    paddingHorizontal: space.margin,
    paddingVertical: space.spaceXl,
    rowGap: space.spaceMd,
  },
  mark: {
    alignItems: 'center',
    backgroundColor: colour.washWarm,
    borderRadius: radius.full,
    height: MARK_DIAMETER,
    justifyContent: 'center',
    width: MARK_DIAMETER,
  },
  markRow: { alignItems: 'center' },
  or: {
    alignItems: 'center',
    columnGap: space.spaceMd,
    flexDirection: 'row',
    paddingVertical: space.spaceXs,
  },
  orRule: { backgroundColor: colour.platformLine, flexGrow: 1, height: stroke.hairline },
  orWord: { color: colour.secondaryText, ...textStyle('body-sm') },
  problem: { color: colour.accent, ...textStyle('body-sm') },
  room: { flexGrow: 1 },
  send: {
    alignItems: 'center',
    backgroundColor: colour.accent,
    borderRadius: radius.full,
    flexShrink: 0,
    justifyContent: 'center',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.spaceLg,
  },
  sendLabel: { color: colour.onAccent, ...textStyle('choice-sm') },
  title: {
    color: colour.text,
    marginBottom: space.spaceSm,
    textAlign: 'center',
    ...textStyle('headline-lg'),
  },
  wayIn: {
    alignItems: 'center',
    borderRadius: radius.full,
    justifyContent: 'center',
    minHeight: WAY_IN_HEIGHT,
    paddingHorizontal: space.spaceLg,
  },
  wayInDark: { backgroundColor: colour.darkCard },
  wayInDarkLabel: { color: colour.onAccent, ...textStyle('button-lg') },
  wayInLight: {
    backgroundColor: colour.card,
    borderColor: colour.platformLine,
    borderWidth: stroke.hairline,
  },
  wayInLightLabel: { color: colour.text, ...textStyle('button-lg') },
});
