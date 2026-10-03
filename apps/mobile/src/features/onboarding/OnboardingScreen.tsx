import { ICON_SIZE, MINIMUM_TAP_TARGET, colour, radius, space, textStyle } from '@emi/tokens';
import { Icon } from '@emi/ui';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, TextLink } from '../../components/Button';
import { Card } from '../../components/Card';
import { LockLine } from '../../components/LockLine';
import { ProgressBar } from '../../components/ProgressBar';
import { Screen } from '../../components/Screen';
import {
  type FirstRunScreen,
  firstRunCopy,
  firstRunScreenCount,
  firstRunScreens,
  stepLabel,
} from './copy';

/**
 * What the top of the screen carries, which the prototype draws three ways.
 *
 * `bar` is the ten questions: the way back, the bar and the way past on one row, the step written
 * out under it, the emblem, and the white sheet the question stands in. `label` is the welcome,
 * which asks nothing, so it carries the step and no bar. `word` is the first run log, which names
 * the day in the middle of its row and carries neither.
 */
export type OnboardingHeader = 'bar' | 'label' | 'word';

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
  /** Left out where the way past is the plain one, and then the frame writes its own word. */
  readonly skipLabel?: string;
  /**
   * Left out where the answer is required, and then no way past is drawn under the body. The Skip
   * above sits over the question; this one sits under it, where a woman who has read the question
   * and cannot answer it is looking.
   */
  readonly onWayPast?: () => void;
  /** Left out where the way past is the plain one, and then the frame writes its own word. */
  readonly wayPastLabel?: string;
  /**
   * The lines stand above what she is asked rather than under it. A screen whose question is tall
   * enough to fill the glass puts the lines under it out of sight, and a line she has to scroll to
   * reach is a line she reads after she has answered, which is too late for a line about what Emi
   * does with the answer.
   */
  readonly linesComeFirst?: boolean;
  /** The three shapes above. The ten questions take the bar, which is why it is the default. */
  readonly header?: OnboardingHeader;
  /** The word the row carries in place of the bar. Only the first run log names one. */
  readonly headerWord?: string;
  readonly children?: ReactNode;
}

export const onboardingActionTestID = 'onboarding-action';
export const onboardingProgressTestID = 'onboarding-progress';
export const onboardingBackTestID = 'onboarding-back';
export const onboardingSkipTestID = 'onboarding-skip';
export const onboardingTitleTestID = 'onboarding-title';
export const onboardingLinesTestID = 'onboarding-lines';
export const onboardingWayPastTestID = 'onboarding-way-past';
export const onboardingStepLabelTestID = 'onboarding-step-label';
export const onboardingEmblemTestID = 'onboarding-emblem';
export const onboardingSheetTestID = 'onboarding-sheet';
export const onboardingHeaderWordTestID = 'onboarding-header-word';
export const onboardingLockTestID = 'onboarding-lock';

/** Points. The arrow is read at the size the rest of the set is read at. */
const BACK_MARK_SIZE = 22;

/** Points. The disc the drop stands in, and the drop inside it. */
const EMBLEM_DIAMETER = 88;
const EMBLEM_DROP_SIZE = ICON_SIZE * 2;

/** The set holds one chevron, pointing the way on, so the way back is the same drawing turned. */
const TURNED_AROUND = [{ rotate: '180deg' }] as const;

/**
 * The frame every question of the first run stands in: the wash and how far along she is across
 * the top, the emblem under them, and one white sheet carrying what is being asked, what she
 * answers with, and the one thing she presses.
 *
 * The sheet reaches both edges of the glass and takes a corner at each of its top ones only,
 * because its foot is the foot of the screen. The middle of it grows and the two ends do not, so a
 * screen with one line and a screen with ninety days on it put their button in the same place.
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
  skipLabel,
  onWayPast,
  wayPastLabel,
  linesComeFirst = false,
  header = 'bar',
  headerWord,
  children,
}: Props): ReactNode {
  const onTheSheet = header === 'bar';
  const said = <TheLinesSheReads onTheSheet={onTheSheet} lines={lines} />;

  const asked = (
    <>
      <Text accessibilityRole="header" style={styles.title} testID={onboardingTitleTestID}>
        {title}
      </Text>

      {linesComeFirst ? said : null}

      <View style={styles.asked}>{children}</View>

      {linesComeFirst ? null : said}
    </>
  );

  const wayPast =
    onWayPast === undefined ? null : (
      <View style={styles.wayPast}>
        <TextLink
          label={wayPastLabel ?? firstRunCopy.skip}
          onPress={onWayPast}
          testID={onboardingWayPastTestID}
        />
      </View>
    );

  const action = (
    <PrimaryButton
      isReady={actionIsReady}
      label={actionLabel}
      onPress={onAction}
      testID={onboardingActionTestID}
    />
  );

  return (
    <Screen drawsTheWash testID={`onboarding-${screen}`}>
      <View style={styles.head}>
        <View style={styles.row}>
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
                <Icon colour={colour.text} name="chevron" size={BACK_MARK_SIZE} />
              </View>
            </Pressable>
          )}

          {header === 'bar' ? (
            <ProgressBar
              label={stepLabel(screen)}
              step={firstRunScreens.indexOf(screen) + 1}
              testID={onboardingProgressTestID}
              total={firstRunScreenCount}
            />
          ) : null}

          {header === 'word' && headerWord !== undefined ? (
            <Text style={styles.headerWord} testID={onboardingHeaderWordTestID}>
              {headerWord}
            </Text>
          ) : null}

          {onSkip === undefined ? (
            <View style={styles.gap} />
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={onSkip}
              style={styles.skip}
              testID={onboardingSkipTestID}
            >
              <Text style={styles.skipLabel}>{skipLabel ?? firstRunCopy.skip}</Text>
            </Pressable>
          )}
        </View>

        {header === 'word' ? null : (
          <Text style={styles.step} testID={onboardingStepLabelTestID}>
            {stepLabel(screen)}
          </Text>
        )}
      </View>

      {header === 'word' ? null : (
        <View style={styles.emblemRow}>
          <View style={styles.emblem} testID={onboardingEmblemTestID}>
            <Icon colour={colour.accent} name="drop" size={EMBLEM_DROP_SIZE} />
          </View>
        </View>
      )}

      {onTheSheet ? (
        <View style={styles.sheet} testID={onboardingSheetTestID}>
          <ScrollView contentContainerStyle={styles.sheetBody} style={styles.scroll}>
            {asked}
          </ScrollView>
          {wayPast}
          <View style={styles.sheetFoot}>{action}</View>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.body} style={styles.scroll}>
            {asked}
          </ScrollView>
          {wayPast}
          <View style={styles.footer}>{action}</View>
        </>
      )}
    </Screen>
  );
}

/**
 * The lines under the question. The promise that only she can read the answer takes the lock
 * beside it, because it is the one line on a question screen that is about her privacy and not
 * about the question, and the prototype draws it apart from the rest at the foot of the sheet.
 *
 * On the ground, where there is no sheet, the rest of the lines are raised onto a card. Inside the
 * sheet they are not: a white card on a white sheet is a card nobody can see.
 */
function TheLinesSheReads({
  lines,
  onTheSheet,
}: {
  readonly lines: readonly string[];
  readonly onTheSheet: boolean;
}): ReactNode {
  const said = lines.filter((line) => line !== firstRunCopy.onlyYou);
  const promise = lines.includes(firstRunCopy.onlyYou);

  if (said.length === 0 && !promise) {
    return null;
  }

  const read =
    said.length === 0 ? null : onTheSheet ? (
      <View style={styles.lines} testID={onboardingLinesTestID}>
        {said.map((line) => (
          <Text key={line} style={styles.line}>
            {line}
          </Text>
        ))}
      </View>
    ) : (
      <Card testID={onboardingLinesTestID}>
        {said.map((line, at) => (
          <Text key={line} style={at === 0 ? styles.line : [styles.line, styles.lineAfter]}>
            {line}
          </Text>
        ))}
      </Card>
    );

  return (
    <>
      {read}
      {promise ? (
        <View style={styles.lock}>
          <LockLine testID={onboardingLockTestID} words={firstRunCopy.onlyYou} />
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  // What she is asked to do takes the room the words leave, so the control she came here to press
  // sits in the middle of the glass rather than under the last paragraph.
  asked: { flexGrow: 1, justifyContent: 'center', paddingVertical: space.spaceLg },
  back: {
    alignItems: 'center',
    backgroundColor: colour.card,
    borderRadius: radius.full,
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
  emblem: {
    alignItems: 'center',
    backgroundColor: colour.washWarm,
    borderRadius: radius.full,
    height: EMBLEM_DIAMETER,
    justifyContent: 'center',
    width: EMBLEM_DIAMETER,
  },
  emblemRow: { alignItems: 'center', paddingVertical: space.spaceSm },
  footer: { padding: space.spaceLg },
  // The row keeps its height where she has no way back or no way past, so the question sits at the
  // same place on every screen of the run.
  gap: { height: MINIMUM_TAP_TARGET, width: MINIMUM_TAP_TARGET },
  head: { paddingHorizontal: space.spaceLg, paddingTop: space.spaceSm },
  headerWord: {
    color: colour.text,
    flexGrow: 1,
    textAlign: 'center',
    ...textStyle('label-md'),
  },
  line: {
    color: colour.secondaryText,
    ...textStyle('body-lg'),
  },
  lineAfter: {
    borderTopColor: colour.line,
    borderTopWidth: 1,
    marginTop: space.spaceMd,
    paddingTop: space.spaceMd,
  },
  lines: { gap: space.spaceSm },
  // The promise sits at the foot of the words, centred under them, and apart from the line that
  // answers the question.
  lock: { alignItems: 'center', paddingTop: space.spaceMd },
  row: { alignItems: 'center', flexDirection: 'row', gap: space.spaceMd },
  // The middle takes whatever the two ends leave, so the button sits on the bottom edge of the
  // glass on a screen with one line and on a screen with ninety days on it alike.
  scroll: { flex: 1 },
  // The sheet reaches past the margin the head keeps, which is how it meets both edges of the
  // glass, and it takes a corner at its top two only, because its foot is the foot of the screen.
  // The sheet is allowed to be shorter than what is inside it, because what is inside it
  // scrolls. Without that, a question as tall as a month pushes its own button off the glass.
  sheet: {
    backgroundColor: colour.card,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 0,
    paddingTop: space.spaceXl,
  },
  sheetBody: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: space.spaceLg,
  },
  sheetFoot: { paddingBottom: space.spaceLg, paddingHorizontal: space.spaceLg },
  skip: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.spaceSm,
  },
  skipLabel: {
    color: colour.secondaryText,
    ...textStyle('label-md'),
  },
  step: {
    color: colour.secondaryText,
    textAlign: 'center',
    ...textStyle('label-sm'),
  },
  title: {
    color: colour.text,
    textAlign: 'center',
    ...textStyle('headline-lg'),
    marginBottom: space.spaceMd,
  },
  // The way past stands outside the scrolling middle, under what she was asked and over the one
  // thing she can press. A question as tall as a month would otherwise put it below the fold,
  // which is where a woman who has just found she cannot answer is least likely to look.
  wayPast: { alignItems: 'center', paddingTop: space.spaceMd },
});
