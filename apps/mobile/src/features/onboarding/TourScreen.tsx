import { ICON_SIZE, colour, radius, space, stroke, textStyle } from '@emi/tokens';
import { Icon } from '@emi/ui';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, TextLink } from '../../components/Button';
import { Card } from '../../components/Card';
import { CycleRing } from '../../components/CycleRing';
import { Screen } from '../../components/Screen';
import { phasesOf, shapeFromLength } from '../cycle/ringInput';
import { type TourCard, tourCards, tourCopy, tourCountLabel } from './copy';
import { defaultCycleLengthDays } from './firstRun';

interface Props {
  readonly card: TourCard;
  readonly onNext: () => void;
  readonly onBack: () => void;
  readonly onSkip: () => void;
}

export const tourActionTestID = 'tour-action';
export const tourSkipTestID = 'tour-skip';
export const tourBackTestID = 'tour-back';
export const tourCountTestID = 'tour-count';
export const tourMarkTestID = 'tour-mark';
export const tourEmblemTestID = 'tour-emblem';

export function tourScreenTestID(card: TourCard): string {
  return `tour-${card}`;
}

/** The mark sits at the size the drawings in the set are read at, which is the grid they share. */
const MARK_SIZE = 28;

/** Points. The ring stands in the band above the words, so it reads as the subject of the card. */
const RING_DIAMETER_ON_A_CARD = 196;

/** Points. The disc the emblem of the last card stands in, and the drawing inside it. */
const EMBLEM_DIAMETER = 96;
const EMBLEM_ICON_SIZE = ICON_SIZE * 2;

/**
 * A cycle nobody has lived, drawn so she can see what a ring is before she gives Emi a day. The
 * numbers are the ordinary ones the first run starts from, and none of them is a fact about her:
 * the first cycle on her own ring is the one her answer draws.
 */
const A_TYPICAL_PERIOD_DAYS = 5;
const THE_DAY_THE_DRAWN_RING_SHOWS = 9;

const theDrawnRing = {
  cycleLengthDays: defaultCycleLengthDays,
  day: THE_DAY_THE_DRAWN_RING_SHOWS,
  phases: phasesOf(shapeFromLength(defaultCycleLengthDays, A_TYPICAL_PERIOD_DAYS)),
};

/**
 * The frame the four cards of the tour share. The mark and the count at the top with the way out
 * beside them, the picture, the words, and the one thing she presses held at the bottom.
 *
 * The count says how far through she is and no bar is drawn, because a bar answers a screen that
 * asks her for something and a card asks her for nothing.
 */
export function TourScreen({ card, onNext, onBack, onSkip }: Props): ReactNode {
  const said = tourCopy[card];
  const at = tourCards.indexOf(card);

  return (
    <Screen testID={tourScreenTestID(card)}>
      <View style={styles.header}>
        <Icon colour={colour.primary} name="ring" size={MARK_SIZE} testID={tourMarkTestID} />
        <View style={styles.headerEnd}>
          <Text style={styles.count} testID={tourCountTestID}>
            {tourCountLabel(card)}
          </Text>
          <TextLink label={tourCopy.skip} onPress={onSkip} testID={tourSkipTestID} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} style={styles.scroll}>
        <View style={styles.band}>{pictureOf(card)}</View>

        <Text accessibilityRole="header" style={styles.title}>
          {said.title}
        </Text>

        <Card>
          {said.lines.map((line, index) => (
            <Text key={line} style={index === 0 ? styles.line : [styles.line, styles.lineAfter]}>
              {line}
            </Text>
          ))}
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton label={said.action} onPress={onNext} testID={tourActionTestID} />
        {at === 0 ? null : (
          <View style={styles.back}>
            <TextLink label={tourCopy.back} onPress={onBack} testID={tourBackTestID} />
          </View>
        )}
      </View>
    </Screen>
  );
}

/**
 * The two cards the export draws a picture for. The other two carry none, so the band collapses
 * and the words start where the picture would have ended.
 */
function pictureOf(card: TourCard): ReactNode {
  if (card === 'ring') {
    return (
      <CycleRing
        cycleLengthDays={theDrawnRing.cycleLengthDays}
        day={theDrawnRing.day}
        diameter={RING_DIAMETER_ON_A_CARD}
        phases={theDrawnRing.phases}
      />
    );
  }

  if (card === 'yours') {
    return (
      <View style={styles.emblem} testID={tourEmblemTestID}>
        <Icon colour={colour.primaryContainer} name="lock" size={EMBLEM_ICON_SIZE} />
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  back: { alignItems: 'center', paddingTop: space.spaceMd },
  band: { alignItems: 'center', justifyContent: 'center' },
  body: {
    gap: space.spaceMd,
    paddingBottom: space.spaceLg,
    paddingHorizontal: space.spaceLg,
    paddingTop: space.spaceLg,
  },
  count: {
    color: colour.onSurfaceVariant,
    ...textStyle('data-sm'),
  },
  emblem: {
    alignItems: 'center',
    backgroundColor: colour.secondaryContainer,
    borderRadius: radius.full,
    height: EMBLEM_DIAMETER,
    justifyContent: 'center',
    width: EMBLEM_DIAMETER,
  },
  footer: {
    borderTopColor: colour.outlineVariant,
    borderTopWidth: stroke.hairline,
    padding: space.spaceLg,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: space.spaceLg,
    paddingTop: space.spaceLg,
  },
  headerEnd: { alignItems: 'center', flexDirection: 'row', gap: space.spaceMd },
  line: {
    color: colour.onSurfaceVariant,
    ...textStyle('body-sm'),
  },
  lineAfter: {
    borderTopColor: colour.outlineVariant,
    borderTopWidth: stroke.hairline,
    marginTop: space.spaceSm,
    paddingTop: space.spaceSm,
  },
  scroll: { flex: 1 },
  title: {
    color: colour.onSurface,
    ...textStyle('headline-lg'),
    textAlign: 'center',
  },
});
