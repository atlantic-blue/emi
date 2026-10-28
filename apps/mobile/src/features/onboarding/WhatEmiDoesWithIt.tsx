import type { Focus } from '@emi/crypto';
import { type ColourName, colour, radius, space, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { CappedText as Text } from '@emi/ui';

import { PrimaryButton } from '../../components/Button';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { StatusPill } from '../../components/StatusPill';
import { theGroupsSheSeesFirst } from '../log/herOrder';
import { groupHeadings } from '../log/SymptomGroup';
import {
  type WhatEmiDoesCard,
  whatComesFirstWhenSheLogs,
  whatEmiDoesCards,
  whatEmiDoesCopy,
} from './copy';

/**
 * The last screen before the hold: three labelled sections, each with a picture of what it means.
 *
 * The log section is the one that reads her: its chips are the groups she pressed on the focus
 * screen, in the order she pressed them, because that is the order her log opens in. A woman who
 * pressed none sees the groups the log opens with for everybody, so the section never stands empty.
 */

export const whatEmiDoesTestID = 'onboarding-what-emi-does';
export const whatEmiDoesTitleTestID = 'what-emi-does-title';
export const whatEmiDoesActionTestID = 'what-emi-does-action';
export const whatEmiDoesRangeTestID = 'what-emi-does-range';
export const whatEmiDoesChipsTestID = 'what-emi-does-chips';
export const whatEmiDoesLogLineTestID = 'what-emi-does-log-line';

export function whatEmiDoesCardTestID(card: WhatEmiDoesCard): string {
  return `what-emi-does-${card}`;
}

export function whatEmiDoesChipTestID(group: string): string {
  return `what-emi-does-chip-${group}`;
}

/**
 * The ink each section's label is written in. A record rather than a list, so a fourth section
 * arriving in `whatEmiDoesCards` leaves this file failing to compile rather than unlabelled.
 */
export const whatEmiDoesLabelInks: Readonly<Record<WhatEmiDoesCard, ColourName>> = {
  forecast: 'accent',
  log: 'ovulationInk',
  privacy: 'lutealInk',
};

/**
 * The five steps of the range picture: the middle three filled, the two ends soft. It stands for
 * a forecast that is a range of days rather than one day, and it carries no number of its own.
 */
export const rangeSteps: readonly boolean[] = [false, true, true, true, false];

/** Points. The height of each step of the range picture. */
const RANGE_STEP_HEIGHT = 10;

interface Props {
  /** The groups she pressed, in the order she pressed them, and empty where she pressed none. */
  readonly focus: readonly Focus[];
  readonly onContinue: () => void;
}

function Section({
  card,
  children,
}: {
  readonly card: WhatEmiDoesCard;
  readonly children?: ReactNode;
}): ReactNode {
  return (
    <Card testID={whatEmiDoesCardTestID(card)}>
      <View style={styles.section}>
        <Text style={[styles.label, { color: colour[whatEmiDoesLabelInks[card]] }]}>
          {whatEmiDoesCopy[card].title}
        </Text>
        <Text style={styles.heading}>{whatEmiDoesCopy[card].line}</Text>
        {children}
      </View>
    </Card>
  );
}

function TheRange(): ReactNode {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.range}
      testID={whatEmiDoesRangeTestID}
    >
      {rangeSteps.map((isFilled, at) => (
        <View key={at} style={[styles.rangeStep, isFilled ? styles.filled : styles.soft]} />
      ))}
    </View>
  );
}

export function WhatEmiDoesWithIt({ focus, onContinue }: Props): ReactNode {
  const shown = theGroupsSheSeesFirst(focus);

  return (
    <Screen drawsTheWash testID={whatEmiDoesTestID}>
      <ScrollView contentContainerStyle={styles.body} style={styles.scroll}>
        <Text accessibilityRole="header" style={styles.title} testID={whatEmiDoesTitleTestID}>
          {whatEmiDoesCopy.title}
        </Text>

        <View style={styles.cards}>
          {whatEmiDoesCards.map((card) => (
            <Section card={card} key={card}>
              {card === 'forecast' ? <TheRange /> : null}
              {card === 'log' ? (
                <>
                  <View style={styles.chips} testID={whatEmiDoesChipsTestID}>
                    {shown.map((group) => (
                      <StatusPill
                        key={group}
                        label={groupHeadings[group]}
                        testID={whatEmiDoesChipTestID(group)}
                        tone="accent"
                      />
                    ))}
                  </View>
                  <Text style={styles.line} testID={whatEmiDoesLogLineTestID}>
                    {whatComesFirstWhenSheLogs(focus)}
                  </Text>
                </>
              ) : null}
            </Section>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label={whatEmiDoesCopy.action}
          onPress={onContinue}
          testID={whatEmiDoesActionTestID}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingBottom: space.spaceLg,
    paddingHorizontal: space.spaceLg,
    paddingTop: space.spaceXl,
  },
  cards: { gap: space.spaceLg, marginTop: space.spaceLg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.spaceSm },
  filled: { backgroundColor: colour.accent },
  footer: { padding: space.spaceLg },
  heading: {
    color: colour.text,
    ...textStyle('choice-lg'),
  },
  label: {
    textTransform: 'uppercase',
    ...textStyle('label-md'),
  },
  line: {
    color: colour.secondaryText,
    ...textStyle('body-sm'),
  },
  range: { flexDirection: 'row', gap: space.spaceSm },
  rangeStep: { borderRadius: radius.full, flex: 1, height: RANGE_STEP_HEIGHT },
  scroll: { flex: 1 },
  section: { gap: space.spaceSm },
  soft: { backgroundColor: colour.accentSoft },
  title: {
    color: colour.text,
    textAlign: 'center',
    ...textStyle('headline-lg'),
  },
});
