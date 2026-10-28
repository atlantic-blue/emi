import { MINIMUM_TAP_TARGET, colour, space, textStyle } from '@emi/tokens';
import { type ReactNode, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { CappedText as Text } from '@emi/ui';

import { PrimaryButton } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { PastPeriodPicker } from './PastPeriodPicker';
import { PastPeriodsList } from './PastPeriodsList';
import { pastPeriodsCopy } from './copy';
import type { PastPeriod } from './pastPeriods';

export const pastPeriodsScreenTestID = 'past-periods-screen';
export const pastPeriodsTitleTestID = 'past-periods-title';
export const pastPeriodsSaveTestID = 'past-periods-save';
export const pastPeriodsCancelTestID = 'past-periods-cancel';

interface Props {
  readonly today: string;
  /** The oldest start the newest row takes. */
  readonly oldest: string;
  readonly periods: readonly PastPeriod[];
  readonly canSave: boolean;
  readonly onGive: (row: number, period: PastPeriod) => void;
  readonly onRemove: (row: number) => void;
  readonly onSave: () => void;
  readonly onCancel: () => void;
}

/**
 * Her last three periods on a screen of their own, which the forecast popup opens. It is the list
 * the first run asks with, so a row is given and changed the same way in both places.
 */
export function PastPeriodsScreen({
  today,
  oldest,
  periods,
  canSave,
  onGive,
  onRemove,
  onSave,
  onCancel,
}: Props): ReactNode {
  const [open, setOpen] = useState<number | undefined>(undefined);

  return (
    <Screen drawsTheWash testID={pastPeriodsScreenTestID}>
      <View style={styles.head}>
        <Pressable
          accessibilityRole="button"
          onPress={onCancel}
          style={styles.cancel}
          testID={pastPeriodsCancelTestID}
        >
          <Text style={styles.cancelLabel}>{pastPeriodsCopy.cancel}</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Text accessibilityRole="header" style={styles.title} testID={pastPeriodsTitleTestID}>
          {pastPeriodsCopy.title}
        </Text>
        <Text style={styles.line}>
          {`${pastPeriodsCopy.forecastLine} ${pastPeriodsCopy.estimateLine} ${pastPeriodsCopy.mostRecentFirstLine}`}
        </Text>
        <PastPeriodsList onOpen={setOpen} periods={periods} />
      </ScrollView>
      <View style={styles.foot}>
        <PrimaryButton
          isReady={canSave}
          label={pastPeriodsCopy.save}
          onPress={onSave}
          testID={pastPeriodsSaveTestID}
        />
      </View>

      {open === undefined ? null : (
        <PastPeriodPicker
          key={open}
          oldest={oldest}
          onCancel={() => setOpen(undefined)}
          onDone={(period) => {
            onGive(open, period);
            setOpen(undefined);
          }}
          onRemove={() => {
            onRemove(open);
            setOpen(undefined);
          }}
          periods={periods}
          row={open}
          today={today}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.spaceMd, paddingHorizontal: space.margin, paddingTop: space.spaceSm },
  cancel: {
    justifyContent: 'center',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
  },
  cancelLabel: { color: colour.accent, ...textStyle('button-md') },
  foot: { paddingHorizontal: space.margin, paddingVertical: space.spaceLg },
  head: { flexDirection: 'row', paddingHorizontal: space.margin },
  line: { color: colour.secondaryText, ...textStyle('body-sm') },
  title: { color: colour.text, ...textStyle('headline-lg') },
});
