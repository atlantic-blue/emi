import type { CyclePhaseName } from '@emi/cycle';
import { colour, radius, space, stroke, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { CappedText as Text } from '@emi/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '../../components/Button';
import { guideAreas, guidanceFor, guideTitle, phasePageCopy, phaseTitle } from './copy';

/**
 * What may help in this phase (issues 274 and 323): a sheet over the page with Mood, Appetite,
 * Body and Movement for the phase she is in, each a short tip, and one line that says everyone is
 * different.
 */

export const phaseGuideTestID = 'phase-guide';
export const phaseGuidePhaseTestID = 'phase-guide-phase';
export const phaseGuideCloseTestID = 'phase-guide-close';
export const phaseGuideTitleTestID = 'phase-guide-title';
export const phaseGuideEveryoneTestID = 'phase-guide-everyone';

export function phaseGuideAreaTestID(area: string): string {
  return `phase-guide-${area}`;
}

/** Points. The handle at the top of the sheet. */
const HANDLE_WIDTH = 36;
const HANDLE_HEIGHT = 5;

/** The page under the sheet is dimmed with the ink of the text, at this much of its strength. */
const SHADE = 0.4;

interface Props {
  readonly isOpen: boolean;
  readonly phase: CyclePhaseName;
  readonly onClose: () => void;
}

export function PhaseGuide({ isOpen, phase, onClose }: Props): ReactNode {
  const insets = useSafeAreaInsets();

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={isOpen}>
      <View style={styles.scrim}>
        <View pointerEvents="none" style={styles.shade} />
        <Pressable
          accessibilityLabel={phasePageCopy.guide.close}
          onPress={onClose}
          style={styles.above}
        />
        <View
          style={[styles.sheet, { paddingBottom: insets.bottom + space.spaceLg }]}
          testID={phaseGuideTestID}
        >
          <View style={styles.handle} />
          <ScrollView contentContainerStyle={styles.body}>
            <Text style={styles.phase} testID={phaseGuidePhaseTestID}>
              {phaseTitle(phase)}
            </Text>
            <Text accessibilityRole="header" style={styles.title} testID={phaseGuideTitleTestID}>
              {guideTitle(phase)}
            </Text>
            {guideAreas.map((area) => (
              <View key={area} style={styles.area} testID={phaseGuideAreaTestID(area)}>
                <Text style={styles.areaName}>{phasePageCopy.guide.areas[area]}</Text>
                <Text style={styles.areaWords}>{guidanceFor(phase, area)}</Text>
              </View>
            ))}
            <Text style={styles.everyone} testID={phaseGuideEveryoneTestID}>
              {phasePageCopy.guide.everyone}
            </Text>
          </ScrollView>
          <PrimaryButton
            label={phasePageCopy.guide.close}
            onPress={onClose}
            testID={phaseGuideCloseTestID}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  above: { flex: 1 },
  area: {
    borderTopColor: colour.line,
    borderTopWidth: stroke.hairline,
    gap: space.spaceXs,
    paddingTop: space.spaceMd,
  },
  areaName: { color: colour.text, ...textStyle('button-md') },
  areaWords: { color: colour.text, ...textStyle('body-sm') },
  body: { gap: space.spaceMd, paddingBottom: space.spaceLg },
  everyone: {
    borderTopColor: colour.line,
    borderTopWidth: stroke.hairline,
    color: colour.secondaryText,
    paddingTop: space.spaceMd,
    ...textStyle('body-sm'),
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: colour.line,
    borderRadius: radius.full,
    height: HANDLE_HEIGHT,
    width: HANDLE_WIDTH,
  },
  phase: {
    color: colour.ovulationInk,
    textTransform: 'uppercase',
    ...textStyle('label-md'),
  },
  scrim: { flex: 1 },
  shade: { ...StyleSheet.absoluteFill, backgroundColor: colour.text, opacity: SHADE },
  sheet: {
    backgroundColor: colour.card,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    gap: space.spaceMd,
    maxHeight: '85%',
    paddingHorizontal: space.margin,
    paddingTop: space.spaceSm,
  },
  title: { color: colour.text, ...textStyle('headline-md') },
});
