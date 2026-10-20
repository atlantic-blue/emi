import type { IconName } from '@emi/tokens';
import { MINIMUM_TAP_TARGET, colour, radius, space, textStyle } from '@emi/tokens';
import { Icon } from '@emi/ui';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, TextLink } from '../../components/Button';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import {
  onboardingActionTestID,
  onboardingEmblemTestID,
  onboardingLinesTestID,
  onboardingStepLabelTestID,
  onboardingTitleTestID,
} from './OnboardingScreen';
import { settingsCopy } from '../settings/copy';
import { firstRunCopy, stepLabel } from './copy';

/** Points. The disc the drop stands in, and the drop inside it. */
const EMBLEM_DIAMETER = 88;
const EMBLEM_DROP_SIZE = 40;

/** Points. The tile each line's icon stands in, and the icon inside it. */
const LINE_TILE = 36;
const LINE_ICON_SIZE = 20;

/** The icon beside each line, in the order the lines are read. */
const lineIcons: readonly IconName[] = ['calendar', 'person', 'info'];

export const welcomeWhoCanSeeTestID = 'onboarding-welcome-who-can-see';

/**
 * The first screen she sees. It asks nothing, because the first thing she is owed is what this is:
 * what she can log here, that there is no account, and what Emi is not. The link over the
 * button opens the one page that says who can see her records, in place of a padlock on every
 * question after this one.
 */
export function WhatEmiIs({
  onContinue,
  onWhoCanSee,
}: {
  readonly onContinue: () => void;
  readonly onWhoCanSee: () => void;
}): ReactNode {
  const said = firstRunCopy.welcome;

  return (
    <Screen drawsTheWash testID="onboarding-welcome">
      <ScrollView contentContainerStyle={styles.body} style={styles.scroll}>
        <View style={styles.emblemRow}>
          <View style={styles.emblem} testID={onboardingEmblemTestID}>
            <Icon colour={colour.accent} name="drop" size={EMBLEM_DROP_SIZE} />
          </View>
        </View>

        <View style={styles.heading}>
          <Text style={styles.step} testID={onboardingStepLabelTestID}>
            {stepLabel('welcome')}
          </Text>
          <Text accessibilityRole="header" style={styles.title} testID={onboardingTitleTestID}>
            {said.title}
          </Text>
        </View>

        <Card testID={onboardingLinesTestID}>
          {said.lines.map((line, at) => (
            <View key={line} style={at === 0 ? styles.row : [styles.row, styles.rowAfter]}>
              <View style={styles.tile}>
                <Icon colour={colour.text} name={lineIcons[at] ?? 'info'} size={LINE_ICON_SIZE} />
              </View>
              <Text style={at === said.lines.length - 1 ? styles.aside : styles.line}>{line}</Text>
            </View>
          ))}
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        <TextLink
          label={settingsCopy.whoCanSee.title}
          onPress={onWhoCanSee}
          testID={welcomeWhoCanSeeTestID}
        />
        <PrimaryButton label={said.action} onPress={onContinue} testID={onboardingActionTestID} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  aside: {
    color: colour.secondaryText,
    flex: 1,
    ...textStyle('body-sm'),
  },
  // The heading stays at the top and the card sinks to the button, so the space between them is
  // the space the glass has to spare.
  body: {
    flexGrow: 1,
    gap: space.spaceLg,
    justifyContent: 'space-between',
    paddingHorizontal: space.spaceLg,
    paddingTop: space.spaceXl,
  },
  emblem: {
    alignItems: 'center',
    backgroundColor: colour.washWarm,
    borderRadius: radius.full,
    height: EMBLEM_DIAMETER,
    justifyContent: 'center',
    width: EMBLEM_DIAMETER,
  },
  emblemRow: { alignItems: 'center' },
  footer: { gap: space.spaceSm, padding: space.spaceLg },
  heading: { flexGrow: 1, gap: space.spaceSm },
  line: {
    color: colour.text,
    flex: 1,
    ...textStyle('choice-lg'),
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.spaceMd,
    minHeight: MINIMUM_TAP_TARGET,
  },
  rowAfter: {
    borderTopColor: colour.line,
    borderTopWidth: 1,
    marginTop: space.spaceSm,
    paddingTop: space.spaceSm,
  },
  scroll: { flex: 1 },
  step: {
    color: colour.secondaryText,
    textAlign: 'center',
    ...textStyle('label-md'),
  },
  tile: {
    alignItems: 'center',
    backgroundColor: colour.field,
    borderRadius: radius.md,
    height: LINE_TILE,
    justifyContent: 'center',
    width: LINE_TILE,
  },
  title: {
    color: colour.text,
    textAlign: 'center',
    ...textStyle('headline-lg'),
  },
});
