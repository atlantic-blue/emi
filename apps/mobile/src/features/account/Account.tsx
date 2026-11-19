import { colour, space, textStyle } from '@emi/tokens';
import { CappedText as Text } from '@emi/ui';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { RoundIconButton } from '../../components/RoundIconButton';
import { RowGroup } from '../../components/RowGroup';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import type { HerSignIn } from '../../services/signIn/herSignIn';
import { accountCopy, theDaySheSignedInSaid, theWaySheSignedInSaid } from './copy';

export const accountScreenTestID = 'account';
export const accountHeaderTestID = 'account-header';
export const accountTitleTestID = 'account-title';
export const accountBackTestID = 'account-back';
export const accountRowsTestID = 'account-rows';
export const accountWayTestID = 'account-way';
export const accountEmailTestID = 'account-email';
export const accountSinceTestID = 'account-since';

/** The set holds one chevron, pointing the way on, so the way back is the same drawing turned. */
const TURNED_AROUND = [{ rotate: '180deg' }] as const;

/** Points. The height of one row of the card. */
const ROW_HEIGHT = 48;

function AReading({
  label,
  value,
  testID,
}: {
  readonly label: string;
  readonly value: string;
  readonly testID: string;
}): ReactNode {
  return (
    <View style={styles.row} testID={testID}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

/** How she is signed in on this phone, and nothing she can change from here. */
export function Account({
  signIn,
  onBack,
}: {
  readonly signIn: HerSignIn;
  readonly onBack: () => void;
}): ReactNode {
  return (
    <Screen drawsTheWash testID={accountScreenTestID}>
      <ScrollView contentContainerStyle={styles.body}>
        <ScreenHeader
          start={
            <View style={styles.backMark}>
              <RoundIconButton
                accessibilityLabel={accountCopy.back}
                icon="chevron"
                onPress={onBack}
                testID={accountBackTestID}
              />
            </View>
          }
          testID={accountHeaderTestID}
          title={accountCopy.title}
          titleTestID={accountTitleTestID}
        />

        <RowGroup testID={accountRowsTestID}>
          <AReading
            label={accountCopy.signedInWith}
            testID={accountWayTestID}
            value={theWaySheSignedInSaid(signIn.way)}
          />
          {signIn.way !== 'telegram' ? (
            <AReading
              label={accountCopy.email}
              testID={accountEmailTestID}
              value={signIn.address}
            />
          ) : null}
          <AReading
            label={accountCopy.since}
            testID={accountSinceTestID}
            value={theDaySheSignedInSaid(signIn.since)}
          />
        </RowGroup>
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
  label: { color: colour.secondaryText, flexShrink: 0, ...textStyle('body-sm') },
  row: {
    alignItems: 'center',
    columnGap: space.spaceMd,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: ROW_HEIGHT,
    paddingVertical: space.spaceSm,
  },
  value: { color: colour.text, flexShrink: 1, textAlign: 'right', ...textStyle('choice-sm') },
});
