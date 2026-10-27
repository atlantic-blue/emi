import { colour, space, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { CappedText as Text } from '@emi/ui';

import { PrimaryButton } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { lostKeyCopy } from './copy';

export const lostKeyScreenTestID = 'lost-key-screen';
export const lostKeyActionTestID = 'lost-key-start-again';
export const lostKeyRefusedTestID = 'lost-key-refused';

export type LostKeyStage = 'ready' | 'working' | 'refused';

interface Props {
  readonly stage: LostKeyStage;
  readonly onStartAgain: () => void;
}

/**
 * Her days are on the phone and the key that opens them is not. Nothing is deleted until she
 * presses, and nothing is made in the meantime: a new key would seal everything after it under a
 * key that opens nothing before it.
 */
export function LostKey({ stage, onStartAgain }: Props): ReactNode {
  const working = stage === 'working';

  return (
    <Screen drawsTheWash testID={lostKeyScreenTestID}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text accessibilityRole="header" style={styles.title}>
          {lostKeyCopy.title}
        </Text>
        {lostKeyCopy.lines.map((line) => (
          <Text key={line} style={styles.line}>
            {line}
          </Text>
        ))}
        {stage === 'refused' ? (
          <Text style={styles.refused} testID={lostKeyRefusedTestID}>
            {lostKeyCopy.refused}
          </Text>
        ) : null}
        <View style={styles.foot}>
          <PrimaryButton
            isReady={!working}
            label={working ? lostKeyCopy.working : lostKeyCopy.action}
            onPress={onStartAgain}
            testID={lostKeyActionTestID}
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
  foot: { marginTop: 'auto' },
  line: {
    color: colour.secondaryText,
    textAlign: 'center',
    ...textStyle('body-lg'),
    marginTop: space.spaceMd,
  },
  refused: {
    color: colour.text,
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
