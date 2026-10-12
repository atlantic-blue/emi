import { type IconName, space } from '@emi/tokens';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { SelectableTile } from '../../components/SelectableTile';
import { OnboardingScreen } from './OnboardingScreen';
import { firstRunCopy, todayChoices, todayLabels } from './copy';
import type { TodaySymptom } from './firstRun';

/** The tile for one feeling, named so a test presses the feeling rather than a place in the grid. */
export function todayTestID(slug: TodaySymptom): string {
  return `today-${slug}`;
}

/** The place in the grid one tile stands in, named so a test can read how many share a row. */
export function todayCellTestID(slug: TodaySymptom): string {
  return `today-cell-${slug}`;
}

/**
 * The drawing on each tile. The set has no drawing for tiredness or for a mood of its own, so
 * tiredness borrows the sleep drawing and both moods share the mood one. A map rather than a list,
 * so a seventh slug arriving in `todaySymptoms` leaves this file failing to compile rather than
 * leaving one tile with no drawing on it.
 */
export const todayIcons: Readonly<Record<TodaySymptom, IconName>> = {
  cramps: 'pain',
  headache: 'headache',
  bloating: 'bloating',
  fatigue: 'sleep',
  calm: 'mood',
  'low-mood': 'mood',
};

interface Props {
  /** The feelings she has pressed so far, in the order she pressed them, and empty until she does. */
  readonly chosen: readonly TodaySymptom[];
  readonly onPress: (slug: TodaySymptom) => void;
  readonly onSave: () => void;
  readonly onBack: () => void;
  /** Skip at the top and "Nothing to add" under the button. Both go on and write no day. */
  readonly onSkip: () => void;
}

/**
 * The last question of the first run, and the only one whose answer is a day rather than a fact
 * about her. What she presses here becomes today's own row, so her history opens with a day she
 * lived rather than with a day Emi worked out.
 *
 * The button waits for a tile, so Emi never saves a day she did not choose. Skip and "Nothing to
 * add" are two ways past one question: both go on and write no row for today.
 */
export function Today({ chosen, onPress, onSave, onBack, onSkip }: Props): ReactNode {
  return (
    <OnboardingScreen
      actionIsReady={chosen.length > 0}
      actionLabel={firstRunCopy.today.action}
      header="word"
      headerWord={firstRunCopy.today.header}
      lines={firstRunCopy.today.lines}
      onAction={onSave}
      onBack={onBack}
      onSkip={onSkip}
      onWayPast={onSkip}
      promiseSits="underTheAnswer"
      question={firstRunCopy.today.question}
      screen="today"
      title={firstRunCopy.today.title}
      wayPastLabel={firstRunCopy.today.nothingToAdd}
      wayPastSits="underTheAction"
    >
      <View style={styles.grid}>
        {todayChoices.map((slug) => (
          <View key={slug} style={styles.cell} testID={todayCellTestID(slug)}>
            <SelectableTile
              icon={todayIcons[slug]}
              isChosen={chosen.includes(slug)}
              onPress={() => {
                onPress(slug);
              }}
              testID={todayTestID(slug)}
              title={todayLabels[slug]}
            />
          </View>
        ))}
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  // Three to a row, as the redesign draws them, each one taking what is left of the row after the
  // two gaps, so the six feelings stand in two rows of three.
  cell: { flexBasis: '30%', flexGrow: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.spaceSm },
});
