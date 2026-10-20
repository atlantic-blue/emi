import { RING_DIAMETER, RING_TRACK_WIDTH, colour, radius, space, textStyle } from '@emi/tokens';
import { Icon } from '@emi/ui';
import { type ReactNode, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { PrimaryButton } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { firstRunCopy } from './copy';

/**
 * Screen 19 of the prototype, and the one moment the first run writes. Every answer she gave is
 * held in memory until she taps the button at the foot.
 *
 * A tap rather than a hold, because a hold also shuts out somebody who uses a screen reader, and a
 * start that "Delete everything" can undo needs no more than a tap. The button is the one control
 * on the screen, and the ring above it is a drawing that takes no press.
 */

export const saveScreenTestID = 'onboarding-save';
export const saveRingTestID = 'save-ring';
export const saveCoreTestID = 'save-core';
export const saveButtonTestID = 'save-button';
export const saveRefusedTestID = 'save-refused';
export const saveTitleTestID = 'save-title';
export const saveSaidTestID = 'save-said';

/** Points. The filled centre of the ring, which carries the drop and takes no press. */
const CORE_DIAMETER = 150;

/** Points. The drop in the centre of the ring. */
const DROP_SIZE = 56;

/** Points. How far inside the ring the warm glow behind the centre starts. */
const GLOW_INSET = 18;

const glowGradientID = 'save-glow-gradient';
const coreGradientID = 'save-core-gradient';

interface Props {
  /**
   * What the tap does. It writes, so it can fail, and the screen stays where it is and says so
   * when it does, with the button ready for another tap.
   */
  readonly onSave: () => Promise<void>;
}

export function SaveAndStart({ onSave }: Props): ReactNode {
  const [saving, setSaving] = useState(false);
  const [refused, setRefused] = useState(false);
  // A ref as well as the state, because a second tap can arrive before the state of the first one
  // has drawn, and the second tap must find the save already under way.
  const underWay = useRef(false);

  const save = (): void => {
    if (underWay.current) {
      return;
    }

    underWay.current = true;
    setSaving(true);
    setRefused(false);
    void onSave().catch(() => {
      // Nothing was written, because one transaction carries it all, so the button is given back.
      underWay.current = false;
      setSaving(false);
      setRefused(true);
    });
  };

  const centre = { x: RING_DIAMETER / 2, y: RING_DIAMETER / 2 };
  const ringRadius = (RING_DIAMETER - RING_TRACK_WIDTH) / 2;

  return (
    <Screen drawsTheWash testID={saveScreenTestID}>
      <View style={styles.body}>
        <Text accessibilityRole="header" style={styles.title} testID={saveTitleTestID}>
          {firstRunCopy.start.title}
        </Text>

        <View style={styles.ring} testID={saveRingTestID}>
          <Svg height={RING_DIAMETER} width={RING_DIAMETER}>
            <Defs>
              <RadialGradient cx="50%" cy="50%" id={glowGradientID} r="50%">
                <Stop offset="0" stopColor={colour.card} stopOpacity={1} />
                <Stop offset="0.7" stopColor={colour.washWarm} stopOpacity={1} />
                <Stop offset="1" stopColor={colour.washPink} stopOpacity={0} />
              </RadialGradient>
              <RadialGradient cx="35%" cy="30%" id={coreGradientID} r="75%">
                <Stop offset="0" stopColor={colour.card} stopOpacity={1} />
                <Stop offset="1" stopColor={colour.washWarm} stopOpacity={1} />
              </RadialGradient>
            </Defs>
            <Circle
              cx={centre.x}
              cy={centre.y}
              fill={`url(#${glowGradientID})`}
              r={RING_DIAMETER / 2 - GLOW_INSET}
            />
            <Circle
              cx={centre.x}
              cy={centre.y}
              fill="none"
              r={ringRadius}
              stroke={colour.stepTrack}
              strokeWidth={RING_TRACK_WIDTH}
            />
            <Circle
              cx={centre.x}
              cy={centre.y}
              fill={`url(#${coreGradientID})`}
              r={CORE_DIAMETER / 2}
            />
          </Svg>
          <View style={styles.core} testID={saveCoreTestID}>
            <Icon colour={colour.accent} name="drop" size={DROP_SIZE} />
          </View>
        </View>

        <View style={styles.said} testID={saveSaidTestID}>
          <Text accessibilityRole="header" style={styles.allSet}>
            {firstRunCopy.start.allSet}
          </Text>
          <Text style={styles.sealed}>{firstRunCopy.start.sealed}</Text>
          {refused ? (
            <Text style={styles.refused} testID={saveRefusedTestID}>
              {firstRunCopy.start.refused}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.footer}>
        <PrimaryButton
          isReady={!saving}
          label={firstRunCopy.start.action}
          onPress={save}
          testID={saveButtonTestID}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  allSet: {
    color: colour.text,
    textAlign: 'center',
    ...textStyle('headline-md'),
  },
  body: {
    flex: 1,
    gap: space.spaceXl,
    paddingHorizontal: space.spaceLg,
    paddingTop: space.spaceXl,
  },
  core: {
    alignItems: 'center',
    borderRadius: radius.full,
    height: CORE_DIAMETER,
    justifyContent: 'center',
    position: 'absolute',
    width: CORE_DIAMETER,
  },
  footer: { padding: space.spaceLg },
  ring: { alignItems: 'center', alignSelf: 'center', justifyContent: 'center' },
  refused: {
    color: colour.accent,
    textAlign: 'center',
    ...textStyle('body-sm'),
  },
  said: { gap: space.spaceSm },
  sealed: {
    color: colour.secondaryText,
    textAlign: 'center',
    ...textStyle('body-lg'),
  },
  // Held in from the sides so the three short phrases break as two balanced lines, the way the
  // redesign sets them, rather than leaving one word alone on the second line.
  title: {
    color: colour.text,
    paddingHorizontal: space.spaceXl,
    textAlign: 'center',
    ...textStyle('headline-lg'),
  },
});
