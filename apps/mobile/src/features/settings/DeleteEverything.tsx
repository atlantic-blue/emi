import { MINIMUM_TAP_TARGET, colour, radius, space, stroke, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

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
      <Screen testID={deletedScreenTestID}>
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
          <Pressable
            accessibilityRole="button"
            onPress={onStartAgain}
            style={styles.action}
            testID={startAgainTestID}
          >
            <Text style={styles.actionLabel}>{settingsCopy.deleted.action}</Text>
          </Pressable>
        </ScrollView>
      </Screen>
    );
  }

  const working = stage === 'working';

  return (
    <Screen testID={deleteScreenTestID}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text accessibilityRole="header" style={styles.title}>
          {settingsCopy.delete.title}
        </Text>
        <Text style={styles.line}>{settingsCopy.delete.line}</Text>

        {stage === 'refused' ? (
          <Text style={styles.refused} testID={deleteRefusedTestID}>
            {settingsCopy.delete.refused}
          </Text>
        ) : null}

        <View style={styles.goes}>
          {settingsCopy.delete.goes.map((each, at) => (
            <Text key={each} style={styles.goesLine} testID={goesTestID(at)}>
              {each}
            </Text>
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: working }}
          disabled={working}
          onPress={onDelete}
          style={styles.action}
          testID={deleteActionTestID}
        >
          <Text style={styles.actionLabel}>
            {working ? settingsCopy.delete.working : settingsCopy.delete.action}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={working}
          onPress={onBack}
          style={styles.back}
          testID={deleteBackTestID}
        >
          <Text style={styles.backLabel}>{settingsCopy.delete.back}</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: 'center',
    backgroundColor: colour.ember,
    borderRadius: radius.chip,
    justifyContent: 'center',
    marginTop: space.roomy,
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.base,
  },
  actionLabel: {
    color: colour.surface,
    ...textStyle('body-lg'),
  },
  back: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space.tight,
    minHeight: MINIMUM_TAP_TARGET,
    minWidth: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.base,
  },
  backLabel: {
    color: colour.body,
    ...textStyle('body-lg'),
  },
  body: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: space.base,
    paddingVertical: space.roomy,
  },
  goes: {
    borderTopColor: colour.hairline,
    borderTopWidth: stroke.hairline,
    marginTop: space.base,
    paddingTop: space.snug,
  },
  goesLine: {
    color: colour.body,
    ...textStyle('body-sm'),
    marginTop: space.hair,
  },
  refused: {
    color: colour.ink,
    ...textStyle('body-lg'),
    marginTop: space.snug,
  },
  line: {
    color: colour.body,
    ...textStyle('body-lg'),
    marginTop: space.snug,
  },
  title: {
    color: colour.ink,
    ...textStyle('headline-lg'),
  },
});
