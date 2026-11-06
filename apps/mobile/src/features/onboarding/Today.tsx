import { type IconName, space } from '@emi/tokens';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { TextLink } from '../../components/Button';
import { FluidGrid } from '../../components/FluidGrid';
import { SelectableTile, tileWordStyle } from '../../components/SelectableTile';
import { OnboardingScreen } from './OnboardingScreen';
import { firstRunCopy, todayChoices, todayLabels } from './copy';
import type { TodaySymptom } from './firstRun';

/** The tile for one feeling, named so a test presses the feeling rather than a place in the grid. */
export function todayTestID(slug: TodaySymptom): string {
  return `today-${slug}`;
}

export const todayGridTestID = 'today-grid';

/** The board draws the feelings three to a row. */
export const TODAY_COLUMNS = 3;

/** The link under the six, which opens every symptom Emi knows. */
export const todayAllSymptomsTestID = 'today-all-symptoms';

/** The place in the grid one tile stands in, named so a test can read how many share a row. */
export function todayCellTestID(slug: TodaySymptom): string {
  return `today-cell-${slug}`;
}

/**
 * The drawing on each tile. The set has no drawing for tiredness, for a low mood or for tender
 * breasts, so tiredness borrows the sleep drawing, a low mood the mood one, and breast tenderness
 * the drawing of its group, pain. A map rather than a list,
 * so a seventh slug arriving in `todaySymptoms` leaves this file failing to compile rather than
 * leaving one tile with no drawing on it.
 */
export const todayIcons: Readonly<Record<TodaySymptom, IconName>> = {
  cramps: 'pain',
  headache: 'headache',
  bloating: 'bloating',
  fatigue: 'sleep',
  'breast-tenderness': 'pain',
  'low-mood': 'mood',
};

interface Props {
  /**
   * What she has chosen so far, in the order she chose it, and empty until she does. It can hold
   * symptoms from all symptoms that have no tile here.
   */
  readonly chosen: readonly string[];
  readonly onPress: (slug: TodaySymptom) => void;
  readonly onSave: () => void;
  /** The link under the six, which opens every symptom. */
  readonly onAllSymptoms: () => void;
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
export function Today({
  chosen,
  onPress,
  onSave,
  onAllSymptoms,
  onBack,
  onSkip,
}: Props): ReactNode {
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
      question={firstRunCopy.today.question}
      screen="today"
      title={firstRunCopy.today.title}
      wayPastLabel={firstRunCopy.today.nothingToAdd}
      wayPastSits="underTheAction"
    >
      <View style={styles.grid}>
        <FluidGrid
          cellAtLeast={0}
          labelStyle={tileWordStyle(space.spaceXs)}
          labels={todayChoices.map((slug) => todayLabels[slug])}
          most={TODAY_COLUMNS}
          rowGap={space.spaceSm}
          testID={todayGridTestID}
        >
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
        </FluidGrid>
      </View>
      <View style={styles.allSymptoms}>
        <TextLink
          label={firstRunCopy.today.allSymptoms}
          onPress={onAllSymptoms}
          testID={todayAllSymptomsTestID}
        />
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  allSymptoms: { alignItems: 'center', paddingTop: space.spaceSm },
  cell: { paddingHorizontal: space.spaceXs },
  grid: { marginHorizontal: -space.spaceXs },
});
