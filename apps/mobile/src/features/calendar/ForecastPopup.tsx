import { MINIMUM_TAP_TARGET, colour, radius, space, textStyle } from '@emi/tokens';
import { type ReactNode, useMemo } from 'react';
import { Modal, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { CappedText as Text } from '@emi/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '../../components/Button';
import { isASwipeDown } from '../ovulation/OvulationPopup';
import { forecastPopupCopy } from './copy';

/**
 * Add your last three periods. A sheet over a month ahead of her when Emi has too little data to
 * forecast it, from the forecastPopup board (issue 271). "Add past periods" opens the list of her
 * last three periods. "Not now", a swipe down and a press above the sheet all close it.
 */

export const forecastPopupTestID = 'forecast-popup';
export const forecastPopupEyebrowTestID = 'forecast-popup-eyebrow';
export const forecastPopupTitleTestID = 'forecast-popup-title';
export const forecastPopupLineTestID = 'forecast-popup-line';
export const forecastPopupActionTestID = 'forecast-popup-action';
export const forecastPopupNotNowTestID = 'forecast-popup-not-now';
export const forecastPopupShadeTestID = 'forecast-popup-shade';

/** Points. The handle at the top of the sheet. */
const HANDLE_WIDTH = 40;
const HANDLE_HEIGHT = 5;

/** The page under the sheet is dimmed with the ink of the text, at this much of its strength. */
const SHADE = 0.42;

interface Props {
  readonly onAddPastPeriods: () => void;
  readonly onNotNow: () => void;
}

export function ForecastPopup({ onAddPastPeriods, onNotNow }: Props): ReactNode {
  const insets = useSafeAreaInsets();
  const swipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, drag) => drag.dy > Math.abs(drag.dx) && drag.dy > 8,
        onPanResponderRelease: (_, drag) => {
          if (isASwipeDown(drag)) {
            onNotNow();
          }
        },
      }),
    [onNotNow],
  );

  return (
    <Modal animationType="slide" onRequestClose={onNotNow} transparent visible>
      <View style={styles.scrim}>
        <View pointerEvents="none" style={styles.shade} />
        <Pressable
          accessibilityLabel={forecastPopupCopy.notNow}
          onPress={onNotNow}
          style={styles.above}
          testID={forecastPopupShadeTestID}
        />
        <View
          {...swipe.panHandlers}
          accessibilityViewIsModal
          style={[styles.sheet, { paddingBottom: insets.bottom + space.spaceLg }]}
          testID={forecastPopupTestID}
        >
          <View style={styles.handle} />
          <Text style={styles.eyebrow} testID={forecastPopupEyebrowTestID}>
            {forecastPopupCopy.eyebrow}
          </Text>
          <Text accessibilityRole="header" style={styles.title} testID={forecastPopupTitleTestID}>
            {forecastPopupCopy.title}
          </Text>
          <Text style={styles.line} testID={forecastPopupLineTestID}>
            {forecastPopupCopy.line}
          </Text>
          <PrimaryButton
            label={forecastPopupCopy.action}
            onPress={onAddPastPeriods}
            testID={forecastPopupActionTestID}
          />
          <Pressable
            accessibilityRole="button"
            onPress={onNotNow}
            style={styles.notNow}
            testID={forecastPopupNotNowTestID}
          >
            <Text style={styles.notNowLabel}>{forecastPopupCopy.notNow}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  above: { flex: 1 },
  eyebrow: {
    color: colour.secondaryText,
    textTransform: 'uppercase',
    ...textStyle('label-md'),
  },
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
});
