import type { DayRecord } from '@emi/crypto';
import { MINIMUM_TAP_TARGET, colour, phasePalette, radius, space, textStyle } from '@emi/tokens';
import { Icon } from '@emi/ui';
import { type ReactNode, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card } from '../../components/Card';
import { LockLine } from '../../components/LockLine';
import { RoundIconButton } from '../../components/RoundIconButton';
import { Screen } from '../../components/Screen';
import {
  dayOfAbout,
  pastHeading,
  pastSentence,
  phaseLead,
  phasePageCopy,
  phaseTitle,
} from './copy';
import type { DiaryChip } from './diary';
import type { PastPhase } from './pastPhases';
import { PhaseBar } from './PhaseBar';
import { PhaseDiary } from './PhaseDiary';
import { PhaseGuide } from './PhaseGuide';
import type { PhaseNow } from './phaseNow';

/**
 * The Cycle phase page, from the phasePage board (issues 273, 274 and 275): where she is in her
 * cycle, the diary of today, the way to the guidance, and what her past phases hold.
 */

export const phasePageTestID = 'phase-page';
export const phasePageBackTestID = 'phase-page-back';
export const phasePageDayTestID = 'phase-page-day';
export const phasePageTitleTestID = 'phase-page-title';
export const phasePageLeadTestID = 'phase-page-lead';
export const phasePageGuideTestID = 'phase-page-guide';
export const phasePagePastTestID = 'phase-page-past';
export const phasePagePastHeadingTestID = 'phase-page-past-heading';
export const phasePagePastLineTestID = 'phase-page-past-line';
export const phasePageLockTestID = 'phase-page-lock';

/** The set holds one chevron, pointing the way on, so the way back is the same drawing turned. */
const TURNED_AROUND = [{ rotate: '180deg' }] as const;

/** Points. The drawings in the guide row. */
const THE_ICON_IN_THE_TILE = 22;
const THE_CHEVRON = 18;

interface Props {
  readonly now: PhaseNow;
  readonly today: DayRecord | undefined;
  readonly past: PastPhase;
  readonly onBack: () => void;
  readonly onPress: (chip: DiaryChip) => void;
  readonly onNote: (note: string) => void;
  readonly onAllSymptoms: () => void;
}

export function PhasePage(props: Props): ReactNode {
  const { now, past } = props;
  const [isGuideOpen, setGuideOpen] = useState(false);

  return (
    <Screen drawsTheWash testID={phasePageTestID} washPhase={now.phase}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.header}>
          <View style={styles.backMark}>
            <RoundIconButton
              accessibilityLabel={phasePageCopy.back}
              icon="chevron"
              onPress={props.onBack}
              testID={phasePageBackTestID}
            />
          </View>
          <Text accessibilityRole="header" style={styles.headerTitle}>
            {phasePageCopy.title}
          </Text>
          <View style={styles.evenUp} />
        </View>

        <View style={styles.where}>
          <Text
            style={[styles.day, { color: colour[phasePalette[now.phase].ink] }]}
            testID={phasePageDayTestID}
          >
            {dayOfAbout(now)}
          </Text>
          <Text style={styles.title} testID={phasePageTitleTestID}>
            {phaseTitle(now.phase)}
          </Text>
          <Text style={styles.lead} testID={phasePageLeadTestID}>
            {phaseLead(now)}
          </Text>
        </View>

        <PhaseBar phase={now.phase} phaseDays={now.phaseDays} />

        <PhaseDiary
          onAllSymptoms={props.onAllSymptoms}
          onNote={props.onNote}
          onPress={props.onPress}
          today={props.today}
        />

        <Pressable
          accessibilityRole="button"
          onPress={() => setGuideOpen(true)}
          style={styles.guide}
          testID={phasePageGuideTestID}
        >
          <View style={styles.tile}>
            <Icon colour={colour.ovulationInk} name="note" size={THE_ICON_IN_THE_TILE} />
          </View>
          <Text style={styles.guideLabel}>{phasePageCopy.guide.open}</Text>
          <Icon colour={colour.secondaryText} name="chevron" size={THE_CHEVRON} />
        </Pressable>

        <Card testID={phasePagePastTestID}>
          <View style={styles.past}>
            <Text style={styles.pastHeading} testID={phasePagePastHeadingTestID}>
              {pastHeading(now.phase)}
            </Text>
            <Text style={styles.pastLine} testID={phasePagePastLineTestID}>
              {pastSentence(past)}
            </Text>
          </View>
        </Card>

        <LockLine testID={phasePageLockTestID} words={phasePageCopy.lock} />
      </ScrollView>

      <PhaseGuide
        isOpen={isGuideOpen}
        onClose={() => setGuideOpen(false)}
        phase={now.phase}
        phaseDays={now.phaseDays}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  backMark: { transform: TURNED_AROUND },
  body: { gap: space.spaceLg, paddingHorizontal: space.margin, paddingVertical: space.spaceXl },
  day: {
    textTransform: 'uppercase',
    ...textStyle('label-md'),
  },
  evenUp: { width: MINIMUM_TAP_TARGET },
  guide: {
    alignItems: 'center',
    backgroundColor: colour.card,
    borderRadius: radius.xl,
    flexDirection: 'row',
    gap: space.spaceMd,
    minHeight: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.spaceLg,
    paddingVertical: space.spaceMd,
  },
  guideLabel: { color: colour.text, flex: 1, ...textStyle('button-md') },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  headerTitle: { color: colour.text, textAlign: 'center', ...textStyle('headline-sm') },
  lead: { color: colour.secondaryText, ...textStyle('body-lg') },
  past: { gap: space.spaceMd },
  pastHeading: {
    color: colour.secondaryText,
    textTransform: 'uppercase',
    ...textStyle('label-md'),
  },
  pastLine: { color: colour.text, ...textStyle('body-lg') },
  tile: {
    alignItems: 'center',
    backgroundColor: colour.washWarm,
    borderRadius: radius.md,
    height: MINIMUM_TAP_TARGET,
    justifyContent: 'center',
    width: MINIMUM_TAP_TARGET,
  },
  title: { color: colour.text, ...textStyle('headline-lg') },
  where: { gap: space.spaceSm },
});
