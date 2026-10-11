import {
  MINIMUM_TAP_TARGET,
  type PhaseName,
  colour,
  phasePalette,
  radius,
  space,
  textStyle,
} from '@emi/tokens';
import { Icon } from '@emi/ui';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../../components/Button';
import { Card } from '../../components/Card';
import { CycleRing } from '../../components/CycleRing';
import { Screen } from '../../components/Screen';
import { phasesOf, shapeFromLength } from '../cycle/ringInput';
import { tourCopy } from './copy';

interface Props {
  readonly onNext: () => void;
  readonly onSkip: () => void;
}

export const tourScreenTestID = 'tour';
export const tourActionTestID = 'tour-action';
export const tourSkipTestID = 'tour-skip';
export const tourTitleTestID = 'tour-title';
export const tourLinesTestID = 'tour-lines';
export const tourLegendTestID = 'tour-legend';
export const tourPriceTestID = 'tour-price';

/** Points. The ring is the subject of the card, so it is drawn larger than on the home screen. */
const RING_DIAMETER_ON_THE_TOUR = 250;

/** Points. A legend dot is read beside the smallest label. */
const LEGEND_DOT = 10;

/** Points. The key beside the price. */
const PRICE_ICON_SIZE = 22;

/**
 * A cycle nobody has lived, drawn so she can see what a ring is before she gives Emi a day. None
 * of the numbers is a fact about her: the first cycle on her own ring is the one her answer draws.
 */
const THE_DRAWN_CYCLE_DAYS = 29;
const THE_DRAWN_PERIOD_DAYS = 5;
const THE_DAY_THE_DRAWN_RING_SHOWS = 12;

const theDrawnRing = {
  cycleLengthDays: THE_DRAWN_CYCLE_DAYS,
  day: THE_DAY_THE_DRAWN_RING_SHOWS,
  phases: phasesOf(shapeFromLength(THE_DRAWN_CYCLE_DAYS, THE_DRAWN_PERIOD_DAYS)),
};

const legendOrder: readonly PhaseName[] = ['period', 'follicular', 'ovulation', 'luteal'];

/**
 * The one card of the tour: the ring and what its parts are, then what Emi costs, and the one
 * thing she presses. The way out sits at the top and reads quieter than the way on.
 */
export function TourScreen({ onNext, onSkip }: Props): ReactNode {
  return (
    <Screen drawsTheWash testID={tourScreenTestID}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          onPress={onSkip}
          style={styles.skip}
          testID={tourSkipTestID}
        >
          <Text style={styles.skipLabel}>{tourCopy.skip}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} style={styles.scroll}>
        <View style={styles.band}>
          <CycleRing
            centreWord="day"
            cycleLengthDays={theDrawnRing.cycleLengthDays}
            day={theDrawnRing.day}
            daysAhead="full"
            diameter={RING_DIAMETER_ON_THE_TOUR}
            phases={theDrawnRing.phases}
          />
        </View>

        <View style={styles.legend} testID={tourLegendTestID}>
          {legendOrder.map((phase) => (
            <View key={phase} style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: colour[phasePalette[phase].fill] }]}
              />
              <Text style={styles.legendLabel}>{tourCopy.legend[phase]}</Text>
            </View>
          ))}
        </View>

        <View style={styles.words}>
          <Text accessibilityRole="header" style={styles.title} testID={tourTitleTestID}>
            {tourCopy.title}
          </Text>
          <View style={styles.words} testID={tourLinesTestID}>
            {tourCopy.lines.map((line) => (
              <Text key={line} style={styles.line}>
                {line}
              </Text>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Card testID={tourPriceTestID}>
          <View style={styles.price}>
            <Icon colour={colour.accent} name="key" size={PRICE_ICON_SIZE} />
            <View style={styles.priceWords}>
              <Text style={styles.priceTitle}>{tourCopy.price.title}</Text>
              <Text style={styles.priceLine}>{tourCopy.price.line}</Text>
            </View>
          </View>
        </Card>
        <PrimaryButton label={tourCopy.action} onPress={onNext} testID={tourActionTestID} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  band: { alignItems: 'center', justifyContent: 'center' },
  body: {
    gap: space.spaceMd,
    paddingBottom: space.spaceLg,
    paddingHorizontal: space.spaceLg,
  },
  footer: {
    gap: space.spaceMd,
    paddingBottom: space.spaceLg,
    paddingHorizontal: space.spaceLg,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: space.spaceLg,
    paddingTop: space.spaceLg,
  },
  legend: {
    columnGap: space.spaceMd,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    rowGap: space.spaceSm,
  },
  legendDot: {
    borderRadius: radius.full,
    height: LEGEND_DOT,
    width: LEGEND_DOT,
  },
  legendItem: { alignItems: 'center', flexDirection: 'row', gap: space.spaceXs },
  legendLabel: {
    color: colour.secondaryText,
    ...textStyle('label-sm'),
  },
  line: {
    color: colour.secondaryText,
    ...textStyle('body-lg'),
    textAlign: 'center',
  },
  price: { alignItems: 'center', flexDirection: 'row', gap: space.spaceMd },
  priceLine: {
    color: colour.secondaryText,
    ...textStyle('body-sm'),
  },
  priceTitle: {
    color: colour.text,
    ...textStyle('button-md'),
  },
  priceWords: { flex: 1 },
  scroll: { flex: 1 },
  skip: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
  },
  skipLabel: {
    color: colour.secondaryText,
    ...textStyle('button-md'),
  },
  title: {
    color: colour.text,
    ...textStyle('headline-lg'),
    textAlign: 'center',
  },
  words: { gap: space.spaceSm },
});
