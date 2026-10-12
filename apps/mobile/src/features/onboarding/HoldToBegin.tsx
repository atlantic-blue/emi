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
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';

import { HoldButton } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { firstRunCopy } from './copy';

/**
 * Screen 19 of the prototype, and the one moment the first run writes. Every answer she gave is
 * held in memory until she presses and holds the button at the foot.
 *
 * A hold rather than a press, because this is the moment her key is made and her body is written
 * down, and those are not things to do to somebody who brushed the glass with her thumb. The button
 * is the one control on the screen. The ring above it only shows how far the hold has come, and
 * the filled centre of the ring says what to do.
 */

export const holdScreenTestID = 'onboarding-hold';
export const holdRingTestID = 'hold-ring';
export const holdCoreTestID = 'hold-core';
export const holdButtonTestID = 'hold-button';
export const holdProgressTestID = 'hold-progress';
export const holdRefusedTestID = 'hold-refused';
export const holdTitleTestID = 'hold-title';
export const holdSaidTestID = 'hold-said';

/** How long her thumb stays down, in milliseconds. Screen 19 holds for this long. */
export const HOLD_MILLISECONDS = 2500;

/** How often the ring is redrawn while she holds, in milliseconds. */
export const HOLD_TICK_MILLISECONDS = 50;

/** Points. The filled centre of the ring, which carries the instruction and takes no press. */
const CORE_DIAMETER = 150;

/** Points. How far inside the ring the warm glow behind the centre starts. */
const GLOW_INSET = 18;

const glowGradientID = 'hold-glow-gradient';

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
    // starting this at all. Contract SEE-4. The button says she is holding instead,
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
    <Screen drawsTheWash testID={holdScreenTestID}>
      <View style={styles.body}>
        <Text accessibilityRole="header" style={styles.title} testID={holdTitleTestID}>
          {firstRunCopy.hold.title}
        </Text>

        <View style={styles.ring} testID={holdRingTestID}>
          <Svg height={RING_DIAMETER} width={RING_DIAMETER}>
            <Defs>
              <RadialGradient cx="50%" cy="50%" id={glowGradientID} r="50%">
                <Stop offset="0" stopColor={colour.card} stopOpacity={1} />
                <Stop offset="0.7" stopColor={colour.washWarm} stopOpacity={1} />
                <Stop offset="1" stopColor={colour.washPink} stopOpacity={0} />
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
            {filled > 0 ? (
              <Path
                d={arcPath(centre, ringRadius, 0, filled)}
                fill="none"
                stroke={colour.accent}
                strokeLinecap="round"
                strokeWidth={RING_TRACK_WIDTH}
                testID={holdProgressTestID}
              />
            ) : null}
          </Svg>
          <View style={styles.core} testID={holdCoreTestID}>
            <Text style={styles.coreLabel}>{firstRunCopy.hold.instruction}</Text>
          </View>
        </View>

        <View style={styles.said} testID={holdSaidTestID}>
          <Text style={styles.sealed}>{firstRunCopy.hold.sealed}</Text>
          {refused ? (
            <Text style={styles.refused} testID={holdRefusedTestID}>
              {firstRunCopy.hold.refused}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.footer}>
        <HoldButton
          label={holding ? firstRunCopy.hold.held : firstRunCopy.hold.action}
          onHoldEnd={letGo}
          onHoldStart={startHolding}
          testID={holdButtonTestID}
        />
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

const styles = StyleSheet.create({
  body: {
    flex: 1,
    gap: space.spaceXl,
    paddingHorizontal: space.spaceLg,
    paddingTop: space.spaceXl,
  },
  core: {
    alignItems: 'center',
    backgroundColor: colour.accent,
    borderRadius: radius.full,
    height: CORE_DIAMETER,
    justifyContent: 'center',
    padding: space.spaceLg,
    position: 'absolute',
    width: CORE_DIAMETER,
  },
  coreLabel: {
    color: colour.onAccent,
    textAlign: 'center',
    ...textStyle('choice-lg'),
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
