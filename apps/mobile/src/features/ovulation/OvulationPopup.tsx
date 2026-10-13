import type { OvulationSign } from '@emi/crypto';
import { MINIMUM_TAP_TARGET, colour, radius, space, textStyle } from '@emi/tokens';
import { type ReactNode, useMemo, useState } from 'react';
import { Modal, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { ovulationPopupCopy } from './copy';
import { signOptions, signsAfterPress } from './signs';

/**
 * Did you notice any signs of ovulation? A sheet over Today, from the ovulationPopup board (issue
 * 272). Save waits until she picks a chip, because Emi never saves an answer she did not pick.
 * "Not now", a swipe down and a press above the sheet all close it, and each of them counts as her
 * closing it for the day.
 */

export const ovulationPopupTestID = 'ovulation-popup';
export const ovulationPopupWindowTestID = 'ovulation-popup-window';
export const ovulationPopupTitleTestID = 'ovulation-popup-title';
export const ovulationPopupLineTestID = 'ovulation-popup-line';
export const ovulationPopupSaveTestID = 'ovulation-popup-save';
export const ovulationPopupNotNowTestID = 'ovulation-popup-not-now';
export const ovulationPopupShadeTestID = 'ovulation-popup-shade';

export function ovulationSignTestID(sign: OvulationSign): string {
  return `ovulation-popup-${sign}`;
}

/** Points. The handle at the top of the sheet. */
const HANDLE_WIDTH = 40;
const HANDLE_HEIGHT = 5;

/** The page under the sheet is dimmed with the ink of the text, at this much of its strength. */
const SHADE = 0.42;

/** Points, and points a millisecond. A drag down past either one closes the sheet. */
const SWIPE_DISTANCE = 80;
const SWIPE_SPEED = 0.6;

/** Whether a drag that ended here was a swipe down, which closes the sheet. */
export function isASwipeDown(drag: { readonly dy: number; readonly vy: number }): boolean {
  return drag.dy > SWIPE_DISTANCE || (drag.dy > 0 && drag.vy > SWIPE_SPEED);
}

interface Props {
  /** "Fertile window, 7 to 13 November". */
  readonly windowLabel: string;
  readonly onSave: (signs: readonly OvulationSign[]) => void;
  readonly onDismiss: () => void;
}

export function OvulationPopup({ windowLabel, onSave, onDismiss }: Props): ReactNode {
  const insets = useSafeAreaInsets();
  const [chosen, setChosen] = useState<readonly OvulationSign[]>([]);
  const swipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, drag) => drag.dy > Math.abs(drag.dx) && drag.dy > 8,
        onPanResponderRelease: (_, drag) => {
          if (isASwipeDown(drag)) {
            onDismiss();
          }
        },
      }),
    [onDismiss],
  );

  return (
    <Modal animationType="slide" onRequestClose={onDismiss} transparent visible>
      <View style={styles.scrim}>
        <View pointerEvents="none" style={styles.shade} />
        <Pressable
          accessibilityLabel={ovulationPopupCopy.notNow}
          onPress={onDismiss}
          style={styles.above}
          testID={ovulationPopupShadeTestID}
        />
        <View
          {...swipe.panHandlers}
          accessibilityViewIsModal
          style={[styles.sheet, { paddingBottom: insets.bottom + space.spaceLg }]}
          testID={ovulationPopupTestID}
        >
          <View style={styles.handle} />
          <Text style={styles.window} testID={ovulationPopupWindowTestID}>
            {windowLabel}
          </Text>
          <Text accessibilityRole="header" style={styles.title} testID={ovulationPopupTitleTestID}>
            {ovulationPopupCopy.title}
          </Text>
          <Text style={styles.line} testID={ovulationPopupLineTestID}>
            {ovulationPopupCopy.line}
          </Text>
          <View style={styles.chips}>
            {signOptions.map((option) => (
              <Chip
                isChosen={chosen.includes(option.value)}
                key={option.value}
                label={option.label}
                onPress={() => setChosen((held) => signsAfterPress(held, option.value))}
                testID={ovulationSignTestID(option.value)}
              />
            ))}
          </View>
          <PrimaryButton
            isReady={chosen.length > 0}
            label={ovulationPopupCopy.save}
            onPress={() => onSave(chosen)}
            testID={ovulationPopupSaveTestID}
          />
          <Pressable
            accessibilityRole="button"
            onPress={onDismiss}
            style={styles.notNow}
            testID={ovulationPopupNotNowTestID}
          >
            <Text style={styles.notNowLabel}>{ovulationPopupCopy.notNow}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  above: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.spaceSm },
  handle: {
    alignSelf: 'center',
    backgroundColor: colour.line,
    borderRadius: radius.full,
    height: HANDLE_HEIGHT,
    width: HANDLE_WIDTH,
  },
  line: { color: colour.secondaryText, ...textStyle('body-sm') },
  notNow: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MINIMUM_TAP_TARGET,
  },
  notNowLabel: { color: colour.secondaryText, ...textStyle('button-md') },
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
  window: {
    color: colour.ovulationInk,
    textTransform: 'uppercase',
    ...textStyle('label-md'),
  },
});
