import { MINIMUM_TAP_TARGET, colour, radius, space, stroke, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../components/Icon';
import { type FirstRunScreen, firstRunScreens, stepLabel } from './copy';

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

/** The progress track, in points. It is a bar rather than a line, so it reads from across a room. */
const PROGRESS_HEIGHT = 6;

export function stepTestID(screen: FirstRunScreen): string {
  return `onboarding-step-${screen}`;
}

/**
 * How far along she is, drawn as one segment per screen. The words beside it say the same thing,
 * because a shape alone cannot be read out and a colour alone is not a cue section 3 of the design
 * accepts.
 */
function Progress({ screen }: { readonly screen: FirstRunScreen }): ReactNode {
  const reached = firstRunScreens.indexOf(screen);

  return (
    <View style={styles.progress} testID={onboardingProgressTestID}>
      {firstRunScreens.map((each, at) => (
        <View
          key={each}
          style={at <= reached ? [styles.segment, styles.segmentReached] : styles.segment}
          testID={stepTestID(each)}
        />
      ))}
    </View>
  );
}

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
    <View style={styles.screen} testID={`onboarding-${screen}`}>
      <View style={styles.header}>
        <Icon colour={colour.ember} name="ring" size={MARK_SIZE} testID={onboardingMarkTestID} />
        <Text style={styles.step}>{stepLabel(screen)}</Text>
      </View>
      <Progress screen={screen} />

      <ScrollView contentContainerStyle={styles.body} style={styles.scroll}>
        <View>
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          {lead === undefined ? null : <Text style={styles.lead}>{lead}</Text>}
        </View>

        <View style={styles.asked}>{children}</View>

        {rest.length === 0 ? null : (
          <View style={styles.card}>
            {rest.map((line, at) => (
              <Text key={line} style={at === 0 ? styles.line : [styles.line, styles.lineAfter]}>
                {line}
              </Text>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !actionIsReady }}
          disabled={!actionIsReady}
          onPress={onAction}
          style={actionIsReady ? styles.action : [styles.action, styles.actionWaiting]}
          testID={onboardingActionTestID}
        >
          <Text style={styles.actionLabel}>{actionLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: 'center',
    backgroundColor: colour.ember,
    borderRadius: radius.chip,
    justifyContent: 'center',
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.base,
    paddingVertical: space.snug,
  },
  actionLabel: {
    color: colour.surface,
    ...textStyle('body-lg'),
  },
  actionWaiting: { opacity: 0.4 },
  // What she is asked to do takes the room the words leave, so the control she came here to press
  // sits in the middle of the glass rather than under the last paragraph.
  asked: { flexGrow: 1, justifyContent: 'center', paddingVertical: space.roomy },
  // The middle grows into whatever is left, and what is in it is pushed apart rather than stacked
  // against the top, which is where the empty half of the screen was.
  body: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingBottom: space.base,
    paddingHorizontal: space.base,
    paddingTop: space.roomy,
  },
  card: {
    backgroundColor: colour.surface,
    borderColor: colour.hairline,
    borderRadius: radius.card,
    borderWidth: stroke.hairline,
    padding: space.base,
  },
  footer: {
    borderTopColor: colour.hairline,
    borderTopWidth: stroke.hairline,
    padding: space.base,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.snug,
    paddingHorizontal: space.base,
    paddingTop: space.roomy,
  },
  // The lead line answers the title, so it carries the strongest text colour. The lines under it
  // keep the same size, because two of them say what Emi is not and nothing there is a footnote.
  lead: {
    color: colour.ink,
    ...textStyle('body-lg'),
  },
  line: {
    color: colour.body,
    ...textStyle('body-lg'),
  },
  lineAfter: {
    borderTopColor: colour.hairline,
    borderTopWidth: stroke.hairline,
    marginTop: space.snug,
    paddingTop: space.snug,
  },
  progress: {
    flexDirection: 'row',
    gap: space.hair,
    paddingHorizontal: space.base,
    paddingTop: space.snug,
  },
  screen: { backgroundColor: colour.stone, flex: 1 },
  // The middle takes whatever the two ends leave, so the button sits on the bottom edge of the
  // glass on a screen with one line and on a screen with ninety days on it alike.
  scroll: { flex: 1 },
  segment: {
    backgroundColor: colour.sunk,
    borderRadius: radius.round,
    flex: 1,
    height: PROGRESS_HEIGHT,
  },
  segmentReached: { backgroundColor: colour.ember },
  step: {
    color: colour.muted,
    ...textStyle('label-sm'),
  },
  title: {
    color: colour.ink,
    ...textStyle('headline-lg'),
    marginBottom: space.snug,
  },
});
