import { MINIMUM_TAP_TARGET, colour, space, stroke, textStyle } from '@emi/tokens';
import { Icon } from '@emi/ui';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../../components/Button';
import { Card } from '../../components/Card';
import { ProgressBar } from '../../components/ProgressBar';
import { Screen } from '../../components/Screen';
import {
  type FirstRunScreen,
  firstRunCopy,
  firstRunScreenCount,
  firstRunScreens,
  stepLabel,
} from './copy';

interface Props {
  readonly screen: FirstRunScreen;
  readonly title: string;
  readonly lines: readonly string[];
  readonly actionLabel: string;
  readonly actionIsReady?: boolean;
  readonly onAction: () => void;
  /** Left out where nothing sits behind this screen, and then no arrow is drawn. */
  readonly onBack?: () => void;
  /** Left out where the answer is required, and then no way past it is drawn. */
  readonly onSkip?: () => void;
  readonly children?: ReactNode;
}

export const onboardingActionTestID = 'onboarding-action';
export const onboardingProgressTestID = 'onboarding-progress';
export const onboardingBackTestID = 'onboarding-back';
export const onboardingSkipTestID = 'onboarding-skip';

/** Points. The arrow is read at the size the rest of the set is read at. */
const BACK_MARK_SIZE = 22;

/** The set holds one chevron, pointing the way on, so the way back is the same drawing turned. */
const TURNED_AROUND = [{ rotate: '180deg' }] as const;

/**
 * The frame every question of the first run stands in: how far along she is across the top, the
 * way back and the way past on the row under it, what is being asked in the middle, and the one
 * thing she can press held at the bottom where her thumb already is.
 *
 * The bar counts the questions and nothing is written beside it. A counter tells her how much is
 * left to do and reads as a form to fill in, which is the thing this first run is not.
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
  onBack,
  onSkip,
  children,
}: Props): ReactNode {
  const [lead, ...rest] = lines;

  return (
    <Screen testID={`onboarding-${screen}`}>
      <ProgressBar
        label={stepLabel(screen)}
        step={firstRunScreens.indexOf(screen) + 1}
        testID={onboardingProgressTestID}
        total={firstRunScreenCount}
      />

      <View style={styles.header}>
        {onBack === undefined ? (
          <View style={styles.gap} />
        ) : (
          <Pressable
            accessibilityLabel={firstRunCopy.back}
            accessibilityRole="button"
            onPress={onBack}
            style={styles.back}
            testID={onboardingBackTestID}
          >
            <View style={styles.backMark}>
              <Icon colour={colour.onSurface} name="chevron" size={BACK_MARK_SIZE} />
            </View>
          </Pressable>
        )}
        {onSkip === undefined ? null : (
          <Pressable
            accessibilityRole="button"
            onPress={onSkip}
            style={styles.skip}
            testID={onboardingSkipTestID}
          >
            <Text style={styles.skipLabel}>{firstRunCopy.skip}</Text>
          </Pressable>
        )}
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
  back: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
  },
  backMark: { transform: TURNED_AROUND },
  // The middle grows into whatever is left, and what is in it is pushed apart rather than stacked
  // against the top, which is where the empty half of the screen was.
  body: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingBottom: space.spaceLg,
    paddingHorizontal: space.spaceLg,
    paddingTop: space.spaceMd,
  },
  footer: {
    borderTopColor: colour.outlineVariant,
    borderTopWidth: stroke.hairline,
    padding: space.spaceLg,
  },
  // The row keeps its height where she has no way back, so the headline sits at the same place on
  // the first question as on the two after it.
  gap: { height: MINIMUM_TAP_TARGET, width: MINIMUM_TAP_TARGET },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: space.spaceSm,
    paddingTop: space.spaceSm,
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
  // The middle takes whatever the two ends leave, so the button sits on the bottom edge of the
  // glass on a screen with one line and on a screen with ninety days on it alike.
  scroll: { flex: 1 },
  skip: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.spaceSm,
  },
  skipLabel: {
    color: colour.onSurfaceVariant,
    ...textStyle('label-md'),
  },
  title: {
    color: colour.onSurface,
    ...textStyle('headline-lg'),
    marginBottom: space.spaceMd,
  },
});
