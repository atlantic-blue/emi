import { type SymptomGroup, symptomsInGroup, symptoms as theCatalogue } from '@emi/cycle';
import { colour, radius, space, textStyle } from '@emi/tokens';
import { type ReactNode, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../../components/Button';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { words } from '../../language';
import { LogHeader } from './LogHeader';
import { groupsInHerOrder } from './herOrder';
import { sectionsFor } from './search';
import {
  SymptomGroupSection,
  groupHeadings,
  symptomGroupHeadingTestID,
  symptomGroupTestID,
} from './SymptomGroup';
import { SymptomSearchField } from './SymptomSearchField';

/**
 * The log opened on the symptoms, from the logSymptoms board: the search, the groups she opened,
 * each a card of chips, and a bar at the foot that counts what she picked beside Save.
 *
 * A press only changes what the screen holds. Nothing is written until she presses Save or Done,
 * so she can pick and take off a symptom before anything reaches the day. The chips are the whole
 * catalogue of a group, so she reads every mood and every pain Emi knows, not a short sample.
 */

export const logSymptomsTestID = 'log-symptoms';
export const logSymptomsTitleTestID = 'log-symptoms-title';
export const logSymptomsDoneTestID = 'log-symptoms-done';
export const logSymptomsCountTestID = 'log-symptoms-count';
export const logSymptomsSaveTestID = 'log-symptoms-save';
export const logSymptomsNothingFoundTestID = 'no-symptom-found';

/** What a symptoms screen opens with: the groups it was asked for, and whether search comes first. */
export interface SymptomsAsked {
  readonly groups: readonly SymptomGroup[];
  readonly opensOn: 'groups' | 'search';
}

interface Props {
  readonly title: string;
  readonly leave: 'close' | 'back';
  readonly asked: SymptomsAsked;
  /** What the day already holds, which the screen opens on. */
  readonly held: readonly string[];
  /** The groups she named in the first run, which order the groups this screen opens. */
  readonly focus: readonly SymptomGroup[];
  readonly onLeave: () => void;
  readonly onSave: (picked: readonly string[]) => void;
}

/** The group each slug of the catalogue belongs to. */
const groupOf: ReadonlyMap<string, SymptomGroup> = new Map(
  theCatalogue.map((symptom) => [symptom.slug, symptom.group]),
);

/**
 * The groups the screen opens: the ones she asked for and every group that already holds a
 * symptom of that day, in her order, so a symptom she logged is never hidden from her.
 */
export function theGroupsOpened(
  asked: readonly SymptomGroup[],
  held: readonly string[],
  focus: readonly SymptomGroup[] = [],
): readonly SymptomGroup[] {
  const holding = new Set(held.map((slug) => groupOf.get(slug)));

  return groupsInHerOrder(focus).filter((group) => asked.includes(group) || holding.has(group));
}

export function LogSymptoms(props: Props): ReactNode {
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<readonly string[]>(props.held);
  const [opened] = useState(() => theGroupsOpened(props.asked.groups, props.held, props.focus));
  const found = useMemo(() => sectionsFor(query, theCatalogue, props.focus), [props.focus, query]);
  const isSearching = query.trim() !== '';

  function toggle(slug: string): void {
    setPicked((held) =>
      held.includes(slug) ? held.filter((each) => each !== slug) : [...held, slug],
    );
  }

  const theGroups = opened.map((group) => (
    <Card key={group}>
      <SymptomGroupSection
        heading={groupHeadings[group]}
        headingTestID={symptomGroupHeadingTestID(group)}
        onToggle={toggle}
        picked={picked}
        symptoms={symptomsInGroup(group)}
        testID={symptomGroupTestID(group)}
      />
    </Card>
  ));

  const theFound =
    found.length === 0 ? (
      <Text style={styles.nothing} testID={logSymptomsNothingFoundTestID}>
        {words('log.sheet.noMatch', undefined, { query: query.trim() })}
      </Text>
    ) : (
      found.map((section) => (
        <Card key={section.group ?? 'found'}>
          <SymptomGroupSection
            heading={words('log.sheet.found', section.symptoms.length)}
            headingTestID={symptomGroupHeadingTestID('found')}
            onToggle={toggle}
            picked={picked}
            symptoms={section.symptoms}
            testID={symptomGroupTestID('found')}
          />
        </Card>
      ))
    );

  return (
    <Screen drawsTheWash testID={logSymptomsTestID}>
      <View style={styles.top}>
        <LogHeader
          doneLabel={words('log.flow.done')}
          doneTestID={logSymptomsDoneTestID}
          leave={props.leave}
          leaveLabel={props.leave === 'back' ? words('log.day.back') : words('log.flow.close')}
          onDone={() => props.onSave(picked)}
          onLeave={props.onLeave}
          title={props.title}
          titleTestID={logSymptomsTitleTestID}
        />
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <SymptomSearchField onType={setQuery} query={query} />
        {isSearching ? theFound : theGroups}
      </ScrollView>
      <View style={styles.foot}>
        <View style={styles.bar}>
          <Text style={styles.count} testID={logSymptomsCountTestID}>
            {words('log.sheet.picked', picked.length)}
          </Text>
          <PrimaryButton
            label={words('log.sheet.save')}
            onPress={() => props.onSave(picked)}
            testID={logSymptomsSaveTestID}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: 'center',
    backgroundColor: colour.card,
    borderRadius: radius.full,
    flexDirection: 'row',
    gap: space.spaceMd,
    justifyContent: 'space-between',
    paddingLeft: space.margin,
    paddingRight: space.spaceXs,
    paddingVertical: space.spaceXs,
  },
  body: { gap: space.spaceMd, padding: space.margin },
  count: { color: colour.text, ...textStyle('button-md') },
  foot: { paddingBottom: space.spaceMd, paddingHorizontal: space.margin },
  nothing: { color: colour.secondaryText, ...textStyle('body-lg') },
  top: { paddingHorizontal: space.margin, paddingTop: space.spaceMd },
});
