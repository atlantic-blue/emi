import { colour, space, stroke, textStyle } from '@emi/tokens';
import { Icon } from '@emi/ui';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../../components/Button';
import { Card } from '../../components/Card';
import { ProgressBar } from '../../components/ProgressBar';
import { Screen } from '../../components/Screen';
import { type FirstRunScreen, firstRunScreenCount, firstRunScreens, stepLabel } from './copy';

interface Props {
  readonly screen: FirstRunScreen;
  readonly title: string;
  readonly lines: readonly string[];
  readonly actionLabel: string;
  readonly actionIsReady?: boolean;
  readonly onAction: () => void;
  readonly children?: ReactNode;
}

export const onboardingActionTestID = 'onboarding-action';
export const onboardingProgressTestID = 'onboarding-progress';
export const onboardingMarkTestID = 'onboarding-mark';

/** The mark sits at the size the drawings in the set are read at, which is the grid they share. */
const MARK_SIZE = 28;

/**
 * The frame the three screens of the first run share. Every one of them is the same shape: the
 * mark and how far along she is at the top, what is being asked in the middle, and the one thing
 * she can press held at the bottom where her thumb already is.
 *
 * The middle grows and the two ends do not, so a screen with one line and a screen with ninety
 * days on it put their button in the same place.
 */
export function OnboardingScreen({
  screen,
  title,
  lines,
  actionLabel,
  actionIsReady = true,
  onAction,
  children,
}: Props): ReactNode {
  const [lead, ...rest] = lines;

  return (
    <Screen testID={`onboarding-${screen}`}>
      <View style={styles.header}>
        <Icon colour={colour.primary} name="ring" size={MARK_SIZE} testID={onboardingMarkTestID} />
        <Text style={styles.step}>{stepLabel(screen)}</Text>
      </View>
      <View style={styles.progress}>
        <ProgressBar
          label={stepLabel(screen)}
          step={firstRunScreens.indexOf(screen) + 1}
          testID={onboardingProgressTestID}
          total={firstRunScreenCount}
        />
      </View>

      <ScrollView contentContainerStyle={styles.body} style={styles.scroll}>
        <View>
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          {lead === undefined ? null : <Text style={styles.lead}>{lead}</Text>}
        </View>

        <View style={styles.asked}>{children}</View>

        {rest.length === 0 ? null : (
          <Card>
            {rest.map((line, at) => (
              <Text key={line} style={at === 0 ? styles.line : [styles.line, styles.lineAfter]}>
                {line}
              </Text>
            ))}
          </Card>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          isReady={actionIsReady}
          label={actionLabel}
          onPress={onAction}
          testID={onboardingActionTestID}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // What she is asked to do takes the room the words leave, so the control she came here to press
  // sits in the middle of the glass rather than under the last paragraph.
  asked: { flexGrow: 1, justifyContent: 'center', paddingVertical: space.spaceXl },
  // The middle grows into whatever is left, and what is in it is pushed apart rather than stacked
  // against the top, which is where the empty half of the screen was.
  body: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingBottom: space.spaceLg,
    paddingHorizontal: space.spaceLg,
    paddingTop: space.spaceXl,
  },
  footer: {
    borderTopColor: colour.outlineVariant,
    borderTopWidth: stroke.hairline,
    padding: space.spaceLg,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.spaceMd,
    paddingHorizontal: space.spaceLg,
    paddingTop: space.spaceXl,
  },
  // The lead line answers the title, so it carries the strongest text colour. The lines under it
  // keep the same size, because two of them say what Emi is not and nothing there is a footnote.
  lead: {
    color: colour.onSurface,
    ...textStyle('body-lg'),
  },
  line: {
    color: colour.onSurfaceVariant,
    ...textStyle('body-lg'),
  },
  lineAfter: {
    borderTopColor: colour.outlineVariant,
    borderTopWidth: stroke.hairline,
    marginTop: space.spaceMd,
    paddingTop: space.spaceMd,
  },
  progress: { paddingHorizontal: space.spaceLg, paddingTop: space.spaceMd },
  // The middle takes whatever the two ends leave, so the button sits on the bottom edge of the
  // glass on a screen with one line and on a screen with ninety days on it alike.
  scroll: { flex: 1 },
  step: {
    color: colour.onSurfaceVariant,
    ...textStyle('label-sm'),
  },
  title: {
    color: colour.onSurface,
    ...textStyle('headline-lg'),
    marginBottom: space.spaceMd,
  },
});
