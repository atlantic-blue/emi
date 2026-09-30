import { PHASE_NAME_ROLE, colour, phasePalette, ringGeometry, space, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { phaseLineWords } from '../cycle/copy';
import type { RingInput } from '../cycle/ringInput';

/**
 * The line under her week. The day of her cycle in large type, and the phase beside it in words.
 *
 * The ring holds the same day inside a drawing of 240 points, which she has to pick the phone up to
 * read. This line answers the same question from across the room, and contract SCREEN-2 decides how
 * it is allowed to: the four words a stranger would recognise stay small, so the size goes to the
 * number and the phase word keeps the size the ring writes it at, whichever phase she is in.
 *
 * The phase is read out of the geometry the ring is drawn from, so the line and the ring cannot
 * name two different phases or two different days.
 */

export const phaseLineTestID = 'home-phase-line';
export const phaseLineDayTestID = 'home-phase-line-day';
export const phaseLinePhaseTestID = 'home-phase-line-phase';

interface Props {
  /** The cycle she is in, the same one the ring is handed. */
  readonly ring: RingInput;
}

export function PhaseLine({ ring }: Props): ReactNode {
  const geometry = ringGeometry(ring);
  const said = phaseLineWords(geometry);

  return (
    <View style={styles.line} testID={phaseLineTestID}>
      <Text style={styles.day} testID={phaseLineDayTestID}>
        {said.day}
      </Text>
      <Text
        style={[styles.phase, { color: colour[phasePalette[geometry.phase].ink] }]}
        testID={phaseLinePhaseTestID}
      >
        {said.phase}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // The number carries the display role rather than the figure role the ring uses, because this is
  // the one thing on the screen meant to be read from the other side of a room.
  day: {
    color: colour.onSurface,
    ...textStyle('display-lg-mobile'),
  },
  // The words sit on the number's baseline, so the small phase reads as part of the same line
  // rather than as a caption under it.
  line: {
    alignItems: 'baseline',
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: space.spaceSm,
    paddingHorizontal: space.margin,
  },
  // The phase takes the ink partner of its own phase, never the fill, which is SEE-2. The role is
  // the one the ring writes the phase name at, so one word is one size wherever she reads it.
  phase: textStyle(PHASE_NAME_ROLE),
});
