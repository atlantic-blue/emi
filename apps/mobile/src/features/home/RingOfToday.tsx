import {
  MINIMUM_TAP_TARGET,
  type RingArc,
  colour,
  phasePalette,
  radius,
  space,
  textStyle,
} from '@emi/tokens';
import { type ReactNode, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { CappedText as Text } from '@emi/ui';

import { CycleRing } from '../../components/CycleRing';
import { words } from '../../language';
import { phaseName } from '../cycle/copy';
import type { RingInput } from '../cycle/ringInput';
import { PhaseGuide } from '../phase/PhaseGuide';
import { nextPeriodWords, ovulationWords } from './copy';
import type { RingCountdown } from './ringCountdown';

export const ringArcPopoverTestID = 'ring-arc-popover';
export const ringArcPopoverNameTestID = 'ring-arc-popover-name';
export const ringArcPopoverDaysTestID = 'ring-arc-popover-days';
export const ringArcPopoverGuideTestID = 'ring-arc-popover-guide';
export const ringArcPopoverOutsideTestID = 'ring-arc-popover-outside';
export const ringOvulationLineTestID = 'ring-ovulation-line';

const POPOVER_WIDTH = 232;

const SHADE = 0.16;

interface Frame {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export function ringArcDaysWords(arc: Pick<RingArc, 'firstDay' | 'days'>): string {
  const from = arc.firstDay;
  const to = arc.firstDay + arc.days - 1;

  return from === to
    ? words('home.ringArc.day', undefined, { from })
    : words('home.ringArc.days', undefined, { from, to });
}

export function RingOfToday({
  ring,
  countdown = {},
}: {
  readonly ring: RingInput;
  readonly countdown?: RingCountdown;
}): ReactNode {
  const holder = useRef<View>(null);
  const [opened, setOpened] = useState<RingArc | undefined>(undefined);
  const [frame, setFrame] = useState<Frame | undefined>(undefined);
  const [guide, setGuide] = useState<RingArc['phase'] | undefined>(undefined);

  const open = (arc: RingArc): void => {
    setOpened(arc);
    holder.current?.measureInWindow((x, y, width, height) =>
      setFrame({ left: x, top: y, width, height }),
    );
  };
  const close = (): void => setOpened(undefined);

  return (
    <>
      <View collapsable={false} ref={holder}>
        <CycleRing
          {...ring}
          look="named"
          onPressArc={open}
          {...(countdown.nextPeriod === undefined
            ? {}
            : { nextPeriod: nextPeriodWords(countdown.nextPeriod) })}
        />
        {opened === undefined ? null : (
          <Modal animationType="fade" onRequestClose={close} transparent visible>
            <Pressable
              accessibilityLabel={words('phase.guide.close')}
              onPress={close}
              style={styles.outside}
              testID={ringArcPopoverOutsideTestID}
            />
            <View
              pointerEvents="box-none"
              style={[styles.over, frame === undefined ? styles.middle : frame]}
            >
              <View accessibilityViewIsModal style={styles.card} testID={ringArcPopoverTestID}>
                <Text
                  accessibilityRole="header"
                  style={[styles.name, { color: colour[phasePalette[opened.phase].ink] }]}
                  testID={ringArcPopoverNameTestID}
                >
                  {phaseName(opened.phase)}
                </Text>
                <Text style={styles.days} testID={ringArcPopoverDaysTestID}>
                  {ringArcDaysWords(opened)}
                </Text>
                <Pressable
                  accessibilityRole="link"
                  onPress={() => {
                    close();
                    setGuide(opened.phase);
                  }}
                  style={styles.guide}
                  testID={ringArcPopoverGuideTestID}
                >
                  <Text style={styles.guideLabel}>{words('phase.guide.open')}</Text>
                </Pressable>
              </View>
            </View>
          </Modal>
        )}
        {guide === undefined ? null : (
          <PhaseGuide isOpen onClose={() => setGuide(undefined)} phase={guide} />
        )}
      </View>
      {countdown.ovulation === undefined ? null : (
        <Text style={styles.ovulation} testID={ringOvulationLineTestID}>
          {ovulationWords(countdown.ovulation)}
        </Text>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colour.card,
    borderRadius: radius.xxl,
    gap: space.spaceXs,
    paddingBottom: space.spaceXs,
    paddingHorizontal: space.spaceLg,
    paddingTop: space.spaceMd,
    width: POPOVER_WIDTH,
  },
  days: { color: colour.secondaryText, ...textStyle('body-sm') },
  guide: { justifyContent: 'center', minHeight: MINIMUM_TAP_TARGET },
  guideLabel: { color: colour.accent, ...textStyle('button-md') },
  middle: { bottom: 0, left: 0, right: 0, top: 0 },
  name: { ...textStyle('headline-md') },
  ovulation: {
    color: colour[phasePalette.ovulation.ink],
    textAlign: 'center',
    ...textStyle('body-sm'),
  },
  outside: { ...StyleSheet.absoluteFill, backgroundColor: colour.text, opacity: SHADE },
  over: { alignItems: 'center', justifyContent: 'center', position: 'absolute' },
});
