import {
  FULL_TURN_DEGREES,
  RING_DIAMETER,
  RING_TRACK_WIDTH,
  arcPath,
  colour,
  radius,
  space,
  textStyle,
} from '@emi/tokens';
import { Icon } from '@emi/ui';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Screen } from '../../components/Screen';
import { firstRunCopy } from './copy';

/**
 * Screen 19 of the prototype, and the one moment the first run writes. Every answer she gave is
 * held in memory until she presses and holds this ring.
 *
 * A hold rather than a press, because this is the moment her key is made and her body is written
 * down, and those are not things to do to somebody who brushed the glass with her thumb.
 */

export const holdScreenTestID = 'onboarding-hold';
export const holdRingTestID = 'hold-ring';
export const holdCoreTestID = 'hold-core';
export const holdProgressTestID = 'hold-progress';
export const holdRefusedTestID = 'hold-refused';

/** How long her thumb stays down, in milliseconds. Screen 19 holds for this long. */
export const HOLD_MILLISECONDS = 2500;

/** How often the ring is redrawn while she holds, in milliseconds. */
export const HOLD_TICK_MILLISECONDS = 50;

/** Points. The core is the target her thumb finds, well above the 44 contract SEE-3 fixes. */
const CORE_DIAMETER = 176;

interface Props {
  /**
   * What the whole hold does. It writes, so it can fail, and the screen stays where it is and
   * says so when it does rather than leaving her holding a ring that answers nothing.
   */
  readonly onHeld: () => Promise<void>;
}

export function HoldToBegin({ onHeld }: Props): ReactNode {
  const [heldFor, setHeldFor] = useState(0);
  const [holding, setHolding] = useState(false);
  const [refused, setRefused] = useState(false);
  const motionIsAllowed = useMotionSetting();
  const ticking = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const finishing = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const spent = useRef(false);

  const stopHolding = (): void => {
    if (ticking.current !== undefined) {
      clearInterval(ticking.current);
      ticking.current = undefined;
    }
    if (finishing.current !== undefined) {
      clearTimeout(finishing.current);
      finishing.current = undefined;
    }
  };

  useEffect(() => stopHolding, []);

  const startHolding = (): void => {
    if (spent.current) {
      return;
    }

    setHolding(true);
    setRefused(false);
    finishing.current = setTimeout(() => {
      spent.current = true;
      stopHolding();
      if (motionIsAllowed.current) {
        setHeldFor(HOLD_MILLISECONDS);
      }
      void onHeld().catch(() => {
        // The write refused, so the ring goes back to where it started and her thumb can try it
        // again. Nothing was written, which is the whole reason one transaction carries it all.
        spent.current = false;
        setHolding(false);
        setHeldFor(0);
        setRefused(true);
      });
    }, HOLD_MILLISECONDS);

    // The ring fills as she holds, and a phone that asks for less motion is answered by not
    // starting this at all. Contract SEE-4. The words in the middle say she is holding instead,
    // so the state she is in is still on the screen.
    if (motionIsAllowed.current) {
      ticking.current = setInterval(() => {
        setHeldFor((held) => Math.min(held + HOLD_TICK_MILLISECONDS, HOLD_MILLISECONDS));
      }, HOLD_TICK_MILLISECONDS);
    }
  };

  const letGo = (): void => {
    if (spent.current) {
      return;
    }

    stopHolding();
    setHolding(false);
    // Nothing is written until the hold is whole, so letting go early leaves her where she was
    // rather than part of the way through her own first run.
    setHeldFor(0);
  };

  const centre = { x: RING_DIAMETER / 2, y: RING_DIAMETER / 2 };
  const ringRadius = (RING_DIAMETER - RING_TRACK_WIDTH) / 2;
  const filled = (heldFor / HOLD_MILLISECONDS) * FULL_TURN_DEGREES;

  return (
    <Screen testID={holdScreenTestID}>
      <View style={styles.body}>
        <View style={styles.header}>
          <Icon colour={colour.primary} name="ring" size={MARK_SIZE} />
          <Text accessibilityRole="header" style={styles.title}>
            {firstRunCopy.hold.title}
          </Text>
        </View>

        <View style={styles.middle}>
          <View style={styles.ring} testID={holdRingTestID}>
            <Svg height={RING_DIAMETER} width={RING_DIAMETER}>
              <Circle
                cx={centre.x}
                cy={centre.y}
                fill="none"
                r={ringRadius}
                stroke={colour.surfaceContainerHigh}
                strokeWidth={RING_TRACK_WIDTH}
              />
              {filled > 0 ? (
                <Path
                  d={arcPath(centre, ringRadius, 0, filled)}
                  fill="none"
                  stroke={colour.primary}
                  strokeWidth={RING_TRACK_WIDTH}
                  testID={holdProgressTestID}
                />
              ) : null}
            </Svg>
            <Pressable
              accessibilityRole="button"
              onPressIn={startHolding}
              onPressOut={letGo}
              style={holding ? [styles.core, styles.coreHeld] : styles.core}
              testID={holdCoreTestID}
            >
              <Text style={styles.coreLabel}>
                {holding ? firstRunCopy.hold.held : firstRunCopy.hold.action}
              </Text>
            </Pressable>
          </View>

          <View style={styles.said}>
            <Text style={styles.instruction}>{firstRunCopy.hold.instruction}</Text>
            {refused ? (
              <Text style={styles.refused} testID={holdRefusedTestID}>
                {firstRunCopy.hold.refused}
              </Text>
            ) : null}
            <Text style={styles.sealed}>{firstRunCopy.hold.sealed}</Text>
          </View>
        </View>
      </View>
    </Screen>
  );
}

/**
 * Whether the phone allows motion, kept in a ref rather than in state. Nothing on this screen is
 * drawn differently by the answer: it is read at the moment her thumb goes down, and a phone that
 * will not answer is treated as a phone asking for less motion.
 */
function useMotionSetting(): { current: boolean } {
  const allowed = useRef(false);

  useEffect(() => {
    let watching = true;

    void AccessibilityInfo.isReduceMotionEnabled()
      .then((reduced) => {
        if (watching) {
          allowed.current = !reduced;
        }
      })
      .catch(() => {
        allowed.current = false;
      });

    return () => {
      watching = false;
    };
  }, []);

  return allowed;
}

/** The mark sits at the size the drawings in the set are read at, which is the grid they share. */
const MARK_SIZE = 28;

const styles = StyleSheet.create({
  body: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: space.spaceXl,
    paddingHorizontal: space.spaceLg,
    paddingTop: space.spaceXl,
  },
  core: {
    alignItems: 'center',
    backgroundColor: colour.surfaceContainerHigh,
    borderRadius: radius.full,
    height: CORE_DIAMETER,
    justifyContent: 'center',
    padding: space.spaceMd,
    position: 'absolute',
    width: CORE_DIAMETER,
  },
  // Her thumb is on the glass and the ring behind it may be drawing nothing, on a phone that
  // asks for less motion, so the core answers the press itself.
  coreHeld: { backgroundColor: colour.surfaceContainerHighest },
  coreLabel: {
    color: colour.onSurface,
    textAlign: 'center',
    ...textStyle('label-md'),
  },
  header: { alignItems: 'center', gap: space.spaceMd },
  // The ring and the words about it are one group, and the group is centred in what the header
  // leaves, so the words sit under the ring rather than against the bottom of the glass.
  middle: { flex: 1, gap: space.spaceXl, justifyContent: 'center' },
  instruction: {
    color: colour.onSurface,
    textAlign: 'center',
    ...textStyle('headline-sm'),
  },
  ring: { alignItems: 'center', alignSelf: 'center', justifyContent: 'center' },
  said: { gap: space.spaceSm },
  refused: {
    color: colour.error,
    textAlign: 'center',
    ...textStyle('body-sm'),
  },
  sealed: {
    color: colour.onSurfaceVariant,
    textAlign: 'center',
    ...textStyle('body-sm'),
  },
  title: {
    color: colour.onSurface,
    textAlign: 'center',
    ...textStyle('headline-sm'),
  },
});
