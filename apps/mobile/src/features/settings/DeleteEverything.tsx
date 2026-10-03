import { colour, radius, space, textStyle } from '@emi/tokens';
import { Icon } from '@emi/ui';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, TextLink } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { settingsCopy } from './copy';

export const deleteScreenTestID = 'delete-screen';
export const deleteActionTestID = 'delete-everything';
export const deleteBackTestID = 'delete-back';
export const deletedScreenTestID = 'delete-done';
export const startAgainTestID = 'delete-start-again';
export const goesTestID = (at: number): string => `delete-goes-${at}`;
export const deleteRefusedTestID = 'delete-refused';
export const serverNotReachedTestID = 'delete-server-not-reached';

/** The heading of the screen. */
export const deleteTitleTestID = 'delete-title';

/** The sentence under it, which says the press cannot be undone. */
export const deleteLineTestID = 'delete-line';

/** The white square the drawing stands in, over the heading. */
export const deleteEmblemTestID = 'delete-emblem';

/** The one card the five things that go stand on. */
export const deleteGoesTestID = 'delete-goes-card';

/** The mark beside one of those five lines, named so a test can read that it is drawn. */
export const goesMarkTestID = (at: number): string => `delete-goes-${at}-mark`;

/** Points. The square the drawing stands in over the heading, which holds one drawing and no word. */
const EMBLEM_SIZE = 80;

/** Points. The bin inside that square. */
const EMBLEM_ICON = 38;

/** Points. The mark beside one line of the card, read at the size of the words beside it. */
const GOES_MARK = 18;

/**
 * Where she is: reading it, waiting on it, looking at a phone that holds nothing, looking at a
 * phone that holds nothing while the server was never told, or looking at the one case where the
 * platform kept something and she is owed the truth about it.
 */
export type DeleteStage =
  'ready' | 'working' | 'deleted' | 'deleted-without-the-server' | 'refused';

interface Props {
  readonly stage: DeleteStage;
  readonly onDelete: () => void;
  readonly onBack: () => void;
  /** Taken once it is gone, and what puts her back at an Emi she can use. */
  readonly onStartAgain: () => void;
}

/**
 * The screen the whole privacy claim rests on. It lists what goes before she presses, because a
 * list she reads first is what makes one press reasonable, and it takes the press immediately.
 *
 * The button carries the phase colour rather than a warning red of its own, and the way back is an
 * ordinary button beside it rather than the larger of the two. A screen that made leaving easier
 * than staying would be arguing with her, and this screen does not argue.
 */
export function DeleteEverything({ stage, onDelete, onBack, onStartAgain }: Props): ReactNode {
  if (stage === 'deleted' || stage === 'deleted-without-the-server') {
    return (
      <Screen drawsTheWash testID={deletedScreenTestID}>
        <ScrollView contentContainerStyle={styles.body}>
          <Text accessibilityRole="header" style={styles.title}>
            {settingsCopy.deleted.title}
          </Text>
          <Text style={styles.line}>{settingsCopy.deleted.line}</Text>
          {stage === 'deleted-without-the-server' ? (
            <Text style={styles.line} testID={serverNotReachedTestID}>
              {settingsCopy.deleted.withoutTheServer}
            </Text>
          ) : null}
          <View style={styles.foot}>
            <PrimaryButton
              label={settingsCopy.deleted.action}
              onPress={onStartAgain}
              testID={startAgainTestID}
            />
          </View>
        </ScrollView>
      </Screen>
    );
  }

  const working = stage === 'working';

  return (
    <Screen drawsTheWash testID={deleteScreenTestID}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.emblem} testID={deleteEmblemTestID}>
          <Icon colour={colour.accent} name="delete" size={EMBLEM_ICON} />
        </View>

        <Text accessibilityRole="header" style={styles.title} testID={deleteTitleTestID}>
          {settingsCopy.delete.title}
        </Text>
        <Text style={styles.line} testID={deleteLineTestID}>
          {settingsCopy.delete.line}
        </Text>

        {stage === 'refused' ? (
          <Text style={styles.refused} testID={deleteRefusedTestID}>
            {settingsCopy.delete.refused}
          </Text>
        ) : null}

        <View style={styles.goes} testID={deleteGoesTestID}>
          {settingsCopy.delete.goes.map((each, at) => (
            <View key={each} style={styles.goesRow}>
              <Icon
                colour={colour.accent}
                name="close"
                size={GOES_MARK}
                testID={goesMarkTestID(at)}
              />
              <Text style={styles.goesLine} testID={goesTestID(at)}>
                {each}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.foot}>
          <PrimaryButton
            isReady={!working}
            label={working ? settingsCopy.delete.working : settingsCopy.delete.action}
            onPress={onDelete}
            testID={deleteActionTestID}
          />
          <TextLink
            isReady={!working}
            label={settingsCopy.delete.back}
            onPress={onBack}
            testID={deleteBackTestID}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    flexGrow: 1,
    paddingHorizontal: space.margin,
    paddingVertical: space.spaceXl,
  },
  emblem: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colour.card,
    borderRadius: radius.xxl,
    height: EMBLEM_SIZE,
    justifyContent: 'center',
    marginBottom: space.spaceMd,
    width: EMBLEM_SIZE,
  },
  // The one thing at the foot of the screen, held down by the room the card above it leaves.
  foot: { marginTop: 'auto', rowGap: space.spaceMd },
  goes: {
    backgroundColor: colour.card,
    borderRadius: radius.xl,
    marginTop: space.spaceLg,
    padding: space.spaceLg,
    rowGap: space.spaceMd,
  },
  goesLine: {
    color: colour.text,
    flexShrink: 1,
    ...textStyle('choice-lg'),
  },
  goesRow: { alignItems: 'center', flexDirection: 'row', gap: space.spaceMd },
  refused: {
    color: colour.text,
    ...textStyle('body-lg'),
    marginTop: space.spaceMd,
  },
  line: {
    color: colour.secondaryText,
    textAlign: 'center',
    ...textStyle('body-lg'),
    marginTop: space.spaceMd,
  },
  title: {
    color: colour.text,
    textAlign: 'center',
    ...textStyle('headline-lg'),
  },
});
