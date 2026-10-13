import { MINIMUM_TAP_TARGET, colour, space, textStyle } from '@emi/tokens';
import { type ReactNode, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../../components/Button';
import { Card } from '../../components/Card';
import { Chip } from '../../components/Chip';
import { LockLine } from '../../components/LockLine';
import { RoundIconButton } from '../../components/RoundIconButton';
import { Screen } from '../../components/Screen';
import { HighlightRow } from '../highlight/HighlightRow';
import { type HighlightSlug, periodHighlights } from '../highlight/highlights';
import type { PeriodAnswers } from '../log/logDay';
import {
  type PeriodGroup,
  isPicked,
  periodAnswersAfterPress,
  periodGroupOrder,
  periodOptions,
} from './answers';
import { periodPageCopy } from './copy';

/**
 * The Period page, from the periodPage board (issue 275): the two highlights, the day and its
 * title, Flow, Discharge and What you used, the line about privacy, and Save.
 *
 * A press only changes what the page holds. Nothing is written until she presses Save, so she can
 * pick, change and take off an answer before anything reaches the day.
 */

export const periodPageTestID = 'period-page';
export const periodPageBackTestID = 'period-page-back';
export const periodPageHighlightsTestID = 'period-page-highlights';
export const periodPageDayTestID = 'period-page-day';
export const periodPageHeadingTestID = 'period-page-heading';
export const periodPageLockTestID = 'period-page-lock';
export const periodPageSaveTestID = 'period-page-save';

export function periodChipTestID(group: PeriodGroup, value: string): string {
  return `period-page-${group}-${value}`;
}

/** The set holds one chevron, pointing the way on, so the way back is the same drawing turned. */
const TURNED_AROUND = [{ rotate: '180deg' }] as const;

interface Props {
  /** The date above the title. */
  readonly day: string;
  /** What the day already holds, which the page opens on. */
  readonly held: PeriodAnswers;
  readonly onBack: () => void;
  readonly onSave: (answers: PeriodAnswers) => void;
  readonly onHighlight: (slug: HighlightSlug) => void;
}

export function PeriodPage(props: Props): ReactNode {
  const [answers, setAnswers] = useState<PeriodAnswers>(props.held);

  return (
    <Screen drawsTheWash testID={periodPageTestID}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.header}>
          <View style={styles.backMark}>
            <RoundIconButton
              accessibilityLabel={periodPageCopy.back}
              icon="chevron"
              onPress={props.onBack}
              testID={periodPageBackTestID}
            />
          </View>
          <Text accessibilityRole="header" style={styles.headerTitle}>
            {periodPageCopy.title}
          </Text>
          <View style={styles.evenUp} />
        </View>

        <HighlightRow
          onOpen={props.onHighlight}
          slugs={periodHighlights}
          testID={periodPageHighlightsTestID}
        />

        <View style={styles.where}>
          <Text style={styles.day} testID={periodPageDayTestID}>
            {props.day}
          </Text>
          <Text style={styles.heading} testID={periodPageHeadingTestID}>
            {periodPageCopy.heading}
          </Text>
        </View>

        <Card>
          <View style={styles.groups}>
            {periodGroupOrder.map((group) => (
              <View key={group} style={styles.group}>
                <Text style={styles.groupName}>{periodPageCopy.groups[group]}</Text>
                <View style={styles.chips}>
                  {periodOptions[group].map((option) => (
                    <Chip
                      isChosen={isPicked(answers, group, option.value)}
                      key={option.value}
                      label={option.label}
                      onPress={() =>
                        setAnswers((now) =>
                          periodAnswersAfterPress(now, { group, value: option.value }),
                        )
                      }
                      testID={periodChipTestID(group, option.value)}
                    />
                  ))}
                </View>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>

      <View style={styles.foot}>
        <LockLine testID={periodPageLockTestID} words={periodPageCopy.lock} />
        <PrimaryButton
          label={periodPageCopy.save}
          onPress={() => props.onSave(answers)}
          testID={periodPageSaveTestID}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backMark: { transform: TURNED_AROUND },
  body: { gap: space.spaceLg, paddingHorizontal: space.margin, paddingVertical: space.spaceXl },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.spaceSm },
  day: {
    color: colour.secondaryText,
    textTransform: 'uppercase',
    ...textStyle('label-md'),
  },
  evenUp: { width: MINIMUM_TAP_TARGET },
  foot: { gap: space.spaceLg, paddingBottom: space.spaceXl, paddingHorizontal: space.margin },
  group: { gap: space.spaceSm },
  groupName: { color: colour.text, ...textStyle('button-md') },
  groups: { gap: space.spaceMd },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  headerTitle: { color: colour.text, textAlign: 'center', ...textStyle('headline-sm') },
  heading: { color: colour.text, ...textStyle('headline-md') },
  where: { gap: space.spaceSm },
});
