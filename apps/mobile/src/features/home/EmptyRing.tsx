import { colour } from '@emi/tokens';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

/**
 * The ring on a phone that holds no day yet: a broken outline with the words inside it.
 *
 * The shape is the answer to the question the screen is asking. She knows what the ring is, the
 * tour told her, so an outline where the ring will be says one period is all it needs, and the
 * line under it says so in words. A screen with nothing drawn where the ring belongs says instead
 * that Emi has nothing to offer her.
 *
 * The outline is broken rather than faint, because a faint ring is a ring with no days in it and
 * this one has no days at all.
 */

export const emptyRingTestID = 'home-empty-ring';

/** Points. The outline is drawn a little narrower than the ring it stands in for. */
const THE_RING_IS_THIS_WIDE = 220;

/** Points. The width of the broken line, and the dash and the gap it is broken into. */
const THE_LINE_IS_THIS_THICK = 12;
const THE_DASH = 3;
const THE_GAP = 9;

interface Props {
  readonly children: ReactNode;
}

export function EmptyRing({ children }: Props): ReactNode {
  const middle = THE_RING_IS_THIS_WIDE / 2;
  const radius = middle - THE_LINE_IS_THIS_THICK;

  return (
    <View style={styles.ring} testID={emptyRingTestID}>
      <Svg height={THE_RING_IS_THIS_WIDE} width={THE_RING_IS_THIS_WIDE}>
        <Circle
          cx={middle}
          cy={middle}
          fill="none"
          r={radius}
          stroke={colour.emptyRing}
          strokeDasharray={`${String(THE_DASH)} ${String(THE_GAP)}`}
          strokeLinecap="round"
          strokeWidth={THE_LINE_IS_THIS_THICK}
        />
      </Svg>
      <View style={styles.said}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { height: THE_RING_IS_THIS_WIDE, width: THE_RING_IS_THIS_WIDE },
  // The words are laid over the outline rather than inside a box of their own, so the ring keeps
  // its width whatever the words run to.
  said: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
});
