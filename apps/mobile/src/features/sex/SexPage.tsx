import { MINIMUM_TAP_TARGET, colour, radius, space, textStyle } from '@emi/tokens';
import { type ReactNode, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../../components/Button';
import { Card } from '../../components/Card';
import { Chip } from '../../components/Chip';
import { LockLine } from '../../components/LockLine';
import { RoundIconButton } from '../../components/RoundIconButton';
import { Screen } from '../../components/Screen';
import { HighlightRow } from '../highlight/HighlightRow';
import { type HighlightSlug, sexHighlights } from '../highlight/highlights';
import type { SexAnswers } from '../log/logDay';
import { type SexGroup, answersAfterPress, sexGroupOrder, sexOptions } from './answers';
import { sexPageCopy } from './copy';

/**
 * The Sex page, from the sexPage board (issues 272 and 275): the two highlights, the day and its
 * question, the three answers, the note in the fertile window, and Save.
 *
 * A press only changes what the page holds. Nothing is written until she presses Save, so she can
 * pick, change and take off an answer before anything reaches the day.
 */

export const sexPageTestID = 'sex-page';
export const sexPageBackTestID = 'sex-page-back';
export const sexPageHighlightsTestID = 'sex-page-highlights';
export const sexPageDayTestID = 'sex-page-day';
export const sexPageQuestionTestID = 'sex-page-question';
export const sexPageFertileTestID = 'sex-page-fertile';
export const sexPageLockTestID = 'sex-page-lock';
export const sexPageSaveTestID = 'sex-page-save';

export function sexChipTestID(group: SexGroup, value: string): string {
  return `sex-page-${group}-${value}`;
}

/** The set holds one chevron, pointing the way on, so the way back is the same drawing turned. */
const TURNED_AROUND = [{ rotate: '180deg' }] as const;

interface Props {
  /** The date above the question. */
  readonly heading: string;
  readonly question: string;
  /** What the day already holds, which the page opens on. */
  readonly held: SexAnswers;
  /** The note inside the fertile window, and nothing outside it. */
  readonly fertileNote?: string;
  readonly onBack: () => void;
  readonly onSave: (answers: SexAnswers) => void;
  readonly onHighlight: (slug: HighlightSlug) => void;
}

export function SexPage(props: Props): ReactNode {
  const [answers, setAnswers] = useState<SexAnswers>(props.held);

  return (
    <Screen drawsTheWash testID={sexPageTestID}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.header}>
          <View style={styles.backMark}>
            <RoundIconButton
              accessibilityLabel={sexPageCopy.back}
              icon="chevron"
              onPress={props.onBack}
              testID={sexPageBackTestID}
            />
          </View>
          <Text accessibilityRole="header" style={styles.headerTitle}>
            {sexPageCopy.title}
          </Text>
          <View style={styles.evenUp} />
        </View>

        <HighlightRow
          onOpen={props.onHighlight}
          slugs={sexHighlights}
          testID={sexPageHighlightsTestID}
        />

        <View style={styles.where}>
          <Text style={styles.day} testID={sexPageDayTestID}>
            {props.heading}
          </Text>
          <Text style={styles.question} testID={sexPageQuestionTestID}>
            {props.question}
          </Text>
        </View>

        <Card>
          <View style={styles.groups}>
            {sexGroupOrder.map((group) => (
              <View key={group} style={styles.group}>
                <Text style={styles.groupName}>{sexPageCopy.groups[group]}</Text>
                <View style={styles.chips}>
                  {sexOptions[group].map((option) => (
                    <Chip
                      isChosen={answers[group] === option.value}
                      key={option.value}
                      label={option.label}
                      onPress={() =>
                        setAnswers((now) => answersAfterPress(now, { group, value: option.value }))
                      }
                      testID={sexChipTestID(group, option.value)}
                    />
                  ))}
                </View>
              </View>
            ))}
          </View>
        </Card>

        {props.fertileNote === undefined ? null : (
          <View style={styles.fertile} testID={sexPageFertileTestID}>
            <Text style={styles.fertileWords}>{props.fertileNote}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.foot}>
        <LockLine testID={sexPageLockTestID} words={sexPageCopy.lock} />
        <PrimaryButton
          label={sexPageCopy.save}
          onPress={() => props.onSave(answers)}
          testID={sexPageSaveTestID}
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
  fertile: {
    backgroundColor: colour.washWarm,
    borderRadius: radius.xl,
    padding: space.spaceLg,
  },
  fertileWords: { color: colour.ovulationInk, ...textStyle('body-sm') },
  foot: { gap: space.spaceLg, paddingBottom: space.spaceXl, paddingHorizontal: space.margin },
  group: { gap: space.spaceSm },
  groupName: { color: colour.text, ...textStyle('button-md') },
  groups: { gap: space.spaceMd },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  headerTitle: { color: colour.text, textAlign: 'center', ...textStyle('headline-sm') },
  question: { color: colour.text, ...textStyle('headline-md') },
  where: { gap: space.spaceSm },
});
