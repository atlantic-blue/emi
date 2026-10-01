import { MINIMUM_TAP_TARGET, colour, radius, space, textStyle } from '@emi/tokens';
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

export function patternCardTestID(slug: string): string {
  return `home-pattern-${slug}`;
}

/** The lead of one card: the symptom, and where in her cycle it keeps landing. */
export function patternCardWhenTestID(slug: string): string {
  return `home-pattern-when-${slug}`;
}

/** The evidence under it: how many of her cycles carried it, out of how many Emi read. */
export function patternCardEvidenceTestID(slug: string): string {
  return `home-pattern-evidence-${slug}`;
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
      <Text style={styles.when} testID={patternCardWhenTestID(pattern.slug)}>
        {patternCardReads(pattern)}
      </Text>
      <Text style={styles.evidence} testID={patternCardEvidenceTestID(pattern.slug)}>
        {patternEvidenceSentence(pattern.cyclesWithIt, pattern.cyclesRead)}
      </Text>
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
  card: {
    backgroundColor: colour.card,
    borderColor: colour.line,
    borderRadius: radius.lg,
    borderWidth: 1,
    justifyContent: 'center',
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
  when: {
    color: colour.text,
    ...textStyle('body-sm'),
  },
});
