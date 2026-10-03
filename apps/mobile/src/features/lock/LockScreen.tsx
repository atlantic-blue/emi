import { MINIMUM_TAP_TARGET, colour, radius, space, textStyle } from '@emi/tokens';
import { Icon, floatingShadow } from '@emi/ui';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../components/Screen';
import { lockCopy } from './copy';

export const lockScreenTestID = 'lock-screen';
export const lockWordmarkTestID = 'lock-wordmark';
export const lockTitleTestID = 'lock-title';
export const lockLineTestID = 'lock-line';

/** The white disc the lock drawing stands on, which is the one shape above the words. */
export const lockDiscTestID = 'lock-disc';

export const unlockTestID = 'lock-unlock';

/** Points. The disc, and the drawing inside it, as the prototype draws them. */
const theDiscIsThisWide = 96;
const theDrawingInTheDisc = 46;

/** Points. How far down the glass the wordmark starts, so the block sits above the middle. */
const theBlockStartsThisFarDown = 120;

interface Props {
  /** Shown once she has refused or cancelled the platform prompt, and not before. */
  readonly wasRefused: boolean;
  readonly onUnlock: () => void;
}

/**
 * What she sees on her way back in. It carries the wordmark, the lock on its disc, one line of what
 * to do, and the button that asks the platform again, because a prompt she cancelled leaves a
 * screen that can do nothing at all unless something on it asks a second time.
 *
 * The button sits at the foot of the glass rather than under the words. This is the one screen she
 * reaches with the phone already in her hand and nothing to read, so the one thing to press is
 * where her thumb already is.
 */
export function LockScreen({ wasRefused, onUnlock }: Props): ReactNode {
  return (
    <Screen drawsTheWash testID={lockScreenTestID}>
      <View style={styles.body}>
        <View style={styles.said}>
          <Text style={styles.wordmark} testID={lockWordmarkTestID}>
            {lockCopy.locked.wordmark}
          </Text>

          <View style={styles.disc} testID={lockDiscTestID}>
            <Icon colour={colour.accent} name="lock" size={theDrawingInTheDisc} />
          </View>

          <Text accessibilityRole="header" style={styles.title} testID={lockTitleTestID}>
            {lockCopy.locked.title}
          </Text>
          <Text style={styles.line} testID={lockLineTestID}>
            {wasRefused ? lockCopy.locked.refused : lockCopy.locked.line}
          </Text>
        </View>

        <View style={styles.room} />

        <Pressable
          accessibilityRole="button"
          onPress={onUnlock}
          style={styles.action}
          testID={unlockTestID}
        >
          <Text style={styles.actionLabel}>{lockCopy.locked.action}</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // The capsule every affirmative button of the redesign is drawn as, reaching both margins.
  action: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: colour.accent,
    borderRadius: radius.full,
    justifyContent: 'center',
    minHeight: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.spaceLg,
  },
  actionLabel: {
    color: colour.onAccent,
    ...textStyle('button-lg'),
  },
  body: {
    alignItems: 'center',
    flex: 1,
    padding: space.margin,
  },
  // The disc lifts the lock off the wash by the one shadow the design document allows.
  disc: {
    alignItems: 'center',
    backgroundColor: colour.card,
    borderRadius: radius.full,
    boxShadow: floatingShadow,
    height: theDiscIsThisWide,
    justifyContent: 'center',
    marginVertical: space.spaceLg,
    width: theDiscIsThisWide,
  },
  line: {
    color: colour.secondaryText,
    ...textStyle('body-lg'),
    textAlign: 'center',
  },
  // The spare room falls between the words and the button, so the button stays at the foot
  // whatever the words above it run to.
  room: { flexGrow: 1 },
  said: { alignItems: 'center', paddingTop: theBlockStartsThisFarDown },
  title: {
    color: colour.text,
    ...textStyle('headline-lg'),
    marginBottom: space.spaceMd,
    textAlign: 'center',
  },
  wordmark: {
    color: colour.accent,
    ...textStyle('display-lg-mobile'),
  },
});
