import { findSymptom, type SymptomGroup } from '@emi/cycle';
import { MINIMUM_TAP_TARGET, type IconName, colour, radius, space, textStyle } from '@emi/tokens';
import { Icon } from '@emi/ui';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ReadPattern } from '../cycle/patternsRead';
import { patternEvidenceSentence } from '../history/copy';
import { patternCardReads } from './copy';

/**
 * One symptom that came back, named on the screen she opens.
 *
 * The evidence is printed under the answer, so the count she is trusting is on the card with it. A
 * card that said a symptom comes back before her period, without saying in how many cycles, would
 * be asking her to take Emi's word for it.
 *
 * No card compares her with another woman, because Emi holds nobody else's log. Every number on a
 * card is a count of her own days, and no word on one calls her normal, abnormal or irregular.
 *
 * The evidence sentence is the one the Insights screen writes for the same two counts, so the card
 * and the list it opens quote one sentence rather than two translations of it.
 */

export const homePatternsTestID = 'home-patterns';

/** Points. The round drawing at the head of a card, and the mark that says the card opens. */
const theDrawingOnTheCard = 40;
const theDrawingInside = 20;
const theMarkOnward = 18;

export function patternCardTestID(slug: string): string {
  return `home-pattern-${slug}`;
}

/** The round drawing at the head of one card, which the redesign gives every card of the set. */
export function patternCardTileTestID(slug: string): string {
  return `home-pattern-tile-${slug}`;
}

/** The lead of one card: the symptom, and where in her cycle it keeps landing. */
export function patternCardWhenTestID(slug: string): string {
  return `home-pattern-when-${slug}`;
}

/** The evidence under it: how many of her cycles carried it, out of how many Emi read. */
export function patternCardEvidenceTestID(slug: string): string {
  return `home-pattern-evidence-${slug}`;
}

/**
 * The drawing each group of the catalogue is shown by.
 *
 * A symptom carries a group and no drawing of its own, so the group answers for it. The set holds
 * no drawing for what a woman reports about her libido, and a card for one takes the mark the log
 * uses for anything she wrote in her own words.
 */
const theDrawingOfAGroup: Readonly<Record<SymptomGroup, IconName>> = {
  digestion: 'digestion',
  energy: 'energy',
  head: 'headache',
  libido: 'note',
  mood: 'mood',
  pain: 'pain',
  skin: 'skin',
  sleep: 'sleep',
};

/** What one card draws, read off the group the catalogue puts that symptom in. */
export function theDrawingOnACardFor(slug: string): IconName {
  const group = findSymptom(slug)?.group;

  return group === undefined ? 'note' : theDrawingOfAGroup[group];
}

function PatternCard({
  pattern,
  onOpenPattern,
}: {
  readonly pattern: ReadPattern;
  readonly onOpenPattern: (slug: string) => void;
}): ReactNode {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onOpenPattern(pattern.slug)}
      style={styles.card}
      testID={patternCardTestID(pattern.slug)}
    >
      <View style={styles.tile} testID={patternCardTileTestID(pattern.slug)}>
        <Icon
          colour={colour.ovulationInk}
          name={theDrawingOnACardFor(pattern.slug)}
          size={theDrawingInside}
        />
      </View>

      <View style={styles.said}>
        <Text style={styles.when} testID={patternCardWhenTestID(pattern.slug)}>
          {patternCardReads(pattern)}
        </Text>
        <Text style={styles.evidence} testID={patternCardEvidenceTestID(pattern.slug)}>
          {patternEvidenceSentence(pattern.cyclesWithIt, pattern.cyclesRead)}
        </Text>
      </View>

      <Icon colour={colour.quietIcon} name="chevron" size={theMarkOnward} />
    </Pressable>
  );
}

export function PatternCards({
  patterns,
  onOpenPattern,
}: {
  readonly patterns: readonly ReadPattern[];
  readonly onOpenPattern: (slug: string) => void;
}): ReactNode {
  return (
    <View style={styles.cards} testID={homePatternsTestID}>
      {patterns.map((pattern) => (
        <PatternCard key={pattern.slug} onOpenPattern={onOpenPattern} pattern={pattern} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // Plain paper with no line drawn around it, which is the card of the redesign.
  card: {
    alignItems: 'center',
    backgroundColor: colour.card,
    borderRadius: radius.xl,
    columnGap: space.spaceMd,
    flexDirection: 'row',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    padding: space.spaceMd,
  },
  cards: { alignSelf: 'stretch', gap: space.spaceSm },
  // The count takes the small label size, because it is the evidence for the line above it and she
  // reads the answer first. Both stay under the size SCREEN-2 holds this screen to.
  evidence: {
    color: colour.secondaryText,
    ...textStyle('label-sm'),
    marginTop: space.spaceXs,
  },
  // The words take whatever width the drawing and the mark leave, so a long symptom wraps inside
  // the card rather than pushing either off it.
  said: { flexGrow: 1, flexShrink: 1 },
  // The warm pair of the palette, painted flat. It is the one the contrast test measures for this
  // ink, and a gradient has no single ratio to measure.
  tile: {
    alignItems: 'center',
    backgroundColor: colour.washWarm,
    borderRadius: radius.full,
    height: theDrawingOnTheCard,
    justifyContent: 'center',
    width: theDrawingOnTheCard,
  },
  when: {
    color: colour.text,
    ...textStyle('body-sm'),
  },
});
