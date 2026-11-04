import { colour, radius, space, textStyle } from '@emi/tokens';
import { CappedText as Text } from '@emi/ui';
import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton, SecondaryButton } from '../../components/Button';
import { editPeriodCopy } from './copy';

export const deletePeriodSheetTestID = 'delete-period-sheet';
export const deletePeriodTitleTestID = 'delete-period-title';
export const deletePeriodLineTestID = 'delete-period-line';
export const deletePeriodConfirmTestID = 'delete-period-confirm';
export const deletePeriodKeepTestID = 'delete-period-keep';
export const deletePeriodShadeTestID = 'delete-period-shade';

const HANDLE_WIDTH = 40;
const HANDLE_HEIGHT = 5;

/** The page under the sheet is dimmed with the ink of the text, at this much of its strength. */
const SHADE = 0.42;

interface Props {
  readonly onDelete: () => void;
  readonly onKeep: () => void;
}

/**
 * The question before a whole period goes. It is the sheet of the forecast popup with the two
 * buttons of the account delete: the delete is the primary action, and keeping it is the button
 * beside it. A press above the sheet keeps the period too.
 */
export function DeletePeriodSheet({ onDelete, onKeep }: Props): ReactNode {
  const insets = useSafeAreaInsets();

  return (
    <Modal animationType="slide" onRequestClose={onKeep} transparent visible>
      <View style={styles.scrim}>
        <View pointerEvents="none" style={styles.shade} />
        <Pressable
          accessibilityLabel={editPeriodCopy.deleteKeep}
          onPress={onKeep}
          style={styles.above}
          testID={deletePeriodShadeTestID}
        />
        <View
          accessibilityViewIsModal
          style={[styles.sheet, { paddingBottom: insets.bottom + space.spaceLg }]}
          testID={deletePeriodSheetTestID}
        >
          <View style={styles.handle} />
          <Text accessibilityRole="header" style={styles.title} testID={deletePeriodTitleTestID}>
            {editPeriodCopy.deleteTitle}
          </Text>
          <Text style={styles.line} testID={deletePeriodLineTestID}>
            {editPeriodCopy.deleteLine}
          </Text>
          <PrimaryButton
            label={editPeriodCopy.deleteConfirm}
            onPress={onDelete}
            testID={deletePeriodConfirmTestID}
          />
          <SecondaryButton
            label={editPeriodCopy.deleteKeep}
            onPress={onKeep}
            testID={deletePeriodKeepTestID}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  above: { flex: 1 },
  handle: {
    alignSelf: 'center',
    backgroundColor: colour.line,
    borderRadius: radius.full,
    height: HANDLE_HEIGHT,
    width: HANDLE_WIDTH,
  },
  line: { color: colour.secondaryText, ...textStyle('body-sm') },
  scrim: { flex: 1 },
  shade: { ...StyleSheet.absoluteFill, backgroundColor: colour.text, opacity: SHADE },
  sheet: {
    backgroundColor: colour.card,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    gap: space.spaceMd,
    paddingHorizontal: space.margin,
    paddingTop: space.spaceMd,
  },
  title: { color: colour.text, ...textStyle('headline-md') },
});
