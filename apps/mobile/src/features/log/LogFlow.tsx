import { type Flow, type SymptomGroup, findSymptom, isBleeding } from '@emi/cycle';
import {
  MINIMUM_TAP_TARGET,
  colour,
  phasePalette,
  ringGeometry,
  space,
  textStyle,
} from '@emi/tokens';
import { Icon } from '@emi/ui';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../../components/Button';
import { Card } from '../../components/Card';
import { CycleRing } from '../../components/CycleRing';
import { LockLine } from '../../components/LockLine';
import { RowGroup } from '../../components/RowGroup';
import { Screen } from '../../components/Screen';
import { SettingsRow } from '../../components/SettingsRow';
import { words } from '../../language';
import { cycleCopy, phaseName, ringCycleLengthWords, ringDayNumberWords } from '../cycle/copy';
import type { RingInput } from '../cycle/ringInput';
import { FlowPicker } from './FlowPicker';
import { GroupTiles } from './GroupTiles';
import { LogHeader } from './LogHeader';
import { SymptomChip } from './SymptomGroup';
import { UnexpectedBleeding } from './UnexpectedBleeding';

/**
 * The log of one day, from the log board and the day board: the header, the small ring of today
 * with the day of her cycle and its phase, her flow as five round buttons, her symptoms as the
 * eight group tiles, and the line that says where the day is kept.
 *
 * The flow is written on the press, as it always was. A tile opens the symptoms of its group, so
 * the screen never lists every symptom at once.
 */
export const logFlowCopy = {
  title: words('log.flow.title'),
  spottingLabel: words('log.flow.spottingLabel', undefined, {
    spotting: words('log.flow.spotting'),
  }),
  spottingHint: words('log.flow.spottingHint'),
  otherDischarge: words('log.flow.otherDischarge'),
  saved: words('log.flow.saved'),
  noRing: cycleCopy.noRing,
  done: words('log.flow.done'),
  close: words('log.flow.close'),
  back: words('log.day.back'),
  symptoms: words('log.symptoms.title'),
  search: words('log.symptoms.search'),
  sex: words('sex.title'),
  period: words('period.title'),
} as const;

export const logFlowTestID = 'log-flow';
export const logFlowDoneTestID = 'log-flow-done';
export const logFlowFootDoneTestID = 'log-flow-foot-done';
export const logFlowNoRingTestID = 'log-flow-no-ring';
export const logFlowSavedTestID = 'log-flow-saved';

/** The day she is writing, which the header names: Today, or the date of a day she lived. */
export const logFlowWhenTestID = 'log-flow-when';

/** The day of her cycle and its phase, beside the small ring. */
export const logFlowDayTestID = 'log-flow-day';
export const logFlowPhaseTestID = 'log-flow-phase';

/** The heading over the flow picker. */
export const logFlowTitleTestID = 'log-flow-title';

/** The line under the flow that says what spotting means. */
export const logFlowSpottingHintTestID = 'log-flow-spotting-hint';

/** The link beside the Period heading that opens the discharge on the Period page. */
export const logFlowOtherDischargeTestID = 'log-flow-other-discharge';

/** The card the flow she picks stands in. */
export const logFlowFlowCardTestID = 'log-flow-flow-card';

/** The card her symptoms stand in, under the flow. */
export const logFlowSymptomsCardTestID = 'log-flow-symptoms-card';

/** The link that opens the search over every symptom. */
export const logFlowSearchTestID = 'log-flow-search';

/** The symptoms the day already holds, drawn as chips over the tiles. */
export const logFlowHeldTestID = 'log-flow-held';

/** The two rows of a day she lived that open the Sex and the Period page of that day. */
export const logFlowDayPagesTestID = 'log-flow-day-pages';
export const logFlowSexRowTestID = 'log-flow-sex-row';
export const logFlowPeriodRowTestID = 'log-flow-period-row';

/** Points. The chevron drawn after the word Search, as the board draws it. */
const SEARCH_CHEVRON = 16;

/** The pages of one day she lived, which the log of today does not need: Today has the actions. */
export interface DayPages {
  readonly onSex: () => void;
  readonly onPeriod: () => void;
}

interface Props {
  readonly day: string;
  /** What the header says: Today on the log tab, the date of a day she opened. */
  readonly title: string;
  readonly leave: 'close' | 'back';
  /** The day board draws Done at the top and again at the foot, the log board at the top only. */
  readonly dones: 'top' | 'top-and-foot';
  readonly ring: RingInput | undefined;
  readonly chosen?: Flow;
  readonly marked: boolean;
  /** The groups as tiles, in the order she reads them. */
  readonly groups: readonly SymptomGroup[];
  /** What the day already carries. Empty where it carries nothing. */
  readonly symptoms: readonly string[];
  readonly dayPages?: DayPages;
  readonly onPick: (flow: Flow) => void;
  readonly onMark: (marked: boolean) => void;
  readonly onOpenGroup: (group: SymptomGroup) => void;
  readonly onSearch: () => void;
  /** Opens the Period page of the day, where she logs discharge that is not her period. */
  readonly onOtherDischarge: () => void;
  /** A press on a chip of the day takes that symptom off the day. */
  readonly onToggleSymptom: (slug: string) => void;
  readonly onLeave: () => void;
  readonly onDone: () => void;
}

export function LogFlow(props: Props): ReactNode {
  // The mark answers a question about bleeding, so it is offered on the days that carry some. The
  // test is the arithmetic's own, which is why a spot can be marked and a day of nothing cannot.
  const sheBled = props.chosen !== undefined && isBleeding({ day: props.day, flow: props.chosen });

  return (
    <Screen
      drawsTheWash
      testID={logFlowTestID}
      washPhase={props.ring === undefined ? undefined : ringGeometry(props.ring).phase}
    >
      <ScrollView contentContainerStyle={styles.body}>
        <LogHeader
          doneLabel={logFlowCopy.done}
          doneTestID={logFlowDoneTestID}
          leave={props.leave}
          leaveLabel={props.leave === 'back' ? logFlowCopy.back : logFlowCopy.close}
          onDone={props.onDone}
          onLeave={props.onLeave}
          title={props.title}
          titleTestID={logFlowWhenTestID}
        />

        <TheRingOfToday ring={props.ring} />

        <Card testID={logFlowFlowCardTestID}>
          <View style={styles.inside}>
            <View style={styles.cardTop}>
              <Text accessibilityRole="header" style={styles.title} testID={logFlowTitleTestID}>
                {logFlowCopy.title}
              </Text>
              <Pressable
                accessibilityRole="link"
                onPress={props.onOtherDischarge}
                style={styles.search}
                testID={logFlowOtherDischargeTestID}
              >
                <Text style={styles.searchLabel}>{logFlowCopy.otherDischarge}</Text>
                <Icon colour={colour.secondaryText} name="chevron" size={SEARCH_CHEVRON} />
              </Pressable>
            </View>
            <FlowPicker chosen={props.chosen} onPick={props.onPick} />
            <Text style={styles.hint} testID={logFlowSpottingHintTestID}>
              <Text style={styles.hintLabel}>{logFlowCopy.spottingLabel}</Text>{' '}
              {logFlowCopy.spottingHint}
            </Text>
            {sheBled && <UnexpectedBleeding marked={props.marked} onMark={props.onMark} />}
          </View>
        </Card>

        <Card testID={logFlowSymptomsCardTestID}>
          <View style={styles.inside}>
            <View style={styles.cardTop}>
              <Text accessibilityRole="header" style={styles.title}>
                {logFlowCopy.symptoms}
              </Text>
              <Pressable
                accessibilityRole="link"
                onPress={props.onSearch}
                style={styles.search}
                testID={logFlowSearchTestID}
              >
                <Text style={styles.searchLabel}>{logFlowCopy.search}</Text>
                <Icon colour={colour.secondaryText} name="chevron" size={SEARCH_CHEVRON} />
              </Pressable>
            </View>
            <TheSymptomsOfTheDay held={props.symptoms} onToggle={props.onToggleSymptom} />
            <GroupTiles groups={props.groups} onOpen={props.onOpenGroup} />
          </View>
        </Card>

        {props.dayPages === undefined ? null : (
          <Card testID={logFlowDayPagesTestID}>
            <RowGroup testID={`${logFlowDayPagesTestID}-rows`}>
              <SettingsRow
                icon="heart"
                label={logFlowCopy.sex}
                onPress={props.dayPages.onSex}
                testID={logFlowSexRowTestID}
              />
              <SettingsRow
                icon="drop"
                label={logFlowCopy.period}
                onPress={props.dayPages.onPeriod}
                testID={logFlowPeriodRowTestID}
              />
            </RowGroup>
          </Card>
        )}

        {/* The line says the day is saved, so it waits until the day holds something to save. */}
        {props.chosen === undefined && props.symptoms.length === 0 ? null : (
          <View style={styles.saved}>
            <LockLine testID={logFlowSavedTestID} words={logFlowCopy.saved} />
          </View>
        )}
      </ScrollView>

      {props.dones === 'top-and-foot' ? (
        <View style={styles.foot}>
          <PrimaryButton
            label={logFlowCopy.done}
            onPress={props.onDone}
            testID={logFlowFootDoneTestID}
          />
        </View>
      ) : null}
    </Screen>
  );
}

/** The small ring of today, with the day of her cycle and its phase beside it. */
function TheRingOfToday({ ring }: { readonly ring: RingInput | undefined }): ReactNode {
  if (ring === undefined) {
    return (
      <View testID={logFlowNoRingTestID}>
        <Text accessibilityRole="header" style={styles.noRingTitle}>
          {logFlowCopy.noRing.title}
        </Text>
        <Text style={styles.line}>{logFlowCopy.noRing.line}</Text>
      </View>
    );
  }

  const phase = ringGeometry(ring).phase;

  return (
    <View style={styles.ringRow}>
      <CycleRing {...ring} look="small" />
      <View>
        <Text style={styles.day} testID={logFlowDayTestID}>
          {ringDayNumberWords(ring.day)}{' '}
          <Text style={styles.ofLength}>{ringCycleLengthWords(ring.cycleLengthDays)}</Text>
        </Text>
        <Text
          style={[styles.phase, { color: colour[phasePalette[phase].ink] }]}
          testID={logFlowPhaseTestID}
        >
          {phaseName(phase)}
        </Text>
      </View>
    </View>
  );
}

/** What the day already holds, as chips she can take off. Nothing where it holds nothing. */
function TheSymptomsOfTheDay({
  held,
  onToggle,
}: {
  readonly held: readonly string[];
  readonly onToggle: (slug: string) => void;
}): ReactNode {
  const named = held.flatMap((slug) => {
    const symptom = findSymptom(slug);

    return symptom === undefined ? [] : [symptom];
  });

  if (named.length === 0) {
    return null;
  }

  return (
    <View style={styles.held} testID={logFlowHeldTestID}>
      {named.map((symptom) => (
        <SymptomChip isPicked key={symptom.slug} onToggle={onToggle} symptom={symptom} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: space.spaceMd,
    paddingBottom: space.spaceXl,
    paddingHorizontal: space.margin,
    paddingTop: space.spaceMd,
  },
  cardTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  day: { color: colour.text, ...textStyle('headline-sm') },
  foot: { padding: space.margin },
  hint: { color: colour.secondaryText, ...textStyle('body-sm') },
  hintLabel: { color: colour.text, ...textStyle('choice-sm') },
  held: { flexDirection: 'row', flexWrap: 'wrap', gap: space.spaceSm },
  inside: { gap: space.spaceMd },
  line: { color: colour.secondaryText, ...textStyle('body-lg') },
  noRingTitle: {
    color: colour.text,
    ...textStyle('headline-md'),
    marginBottom: space.spaceSm,
  },
  ofLength: { color: colour.secondaryText, ...textStyle('choice-lg') },
  phase: { ...textStyle('choice-sm') },
  ringRow: { alignItems: 'center', flexDirection: 'row', gap: space.spaceMd },
  saved: { alignItems: 'center' },
  search: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.spaceXs,
    minHeight: MINIMUM_TAP_TARGET,
  },
  searchLabel: { color: colour.secondaryText, ...textStyle('body-sm') },
  title: { color: colour.text, ...textStyle('headline-sm') },
});
