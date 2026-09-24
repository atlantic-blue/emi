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
  readonly onSkip: () => void;
}

/**
 * The last question of the first run, and the only one whose answer is a day rather than a fact
 * about her. What she presses here becomes today's own row, so her history opens with a day she
 * lived rather than with a day Emi worked out.
 *
 * A woman who presses nothing gets no row for today at all, so the way past this question and the
 * way on with nothing pressed say the same thing, and only the way past is drawn.
 */
export function Today({ chosen, onPress, onSave, onBack, onSkip }: Props): ReactNode {
  return (
    <OnboardingScreen
      actionIsReady={chosen.length > 0}
      actionLabel={firstRunCopy.today.action}
      lines={firstRunCopy.today.lines}
      onAction={onSave}
      onBack={onBack}
      onSkip={onSkip}
      screen="today"
      skipLabel={firstRunCopy.today.skip}
      title={firstRunCopy.today.title}
    >
      <View style={styles.grid}>
        {todayChoices.map((slug) => (
          <View key={slug} style={styles.cell}>
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
  // Two to a row, each one taking what is left of the row after the gap, so a long word widens
  // its tile rather than being cut.
  cell: { flexBasis: '45%', flexGrow: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.spaceSm },
});
