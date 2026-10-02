import { colour, space, textStyle, typeScale } from '@emi/tokens';
import { Icon } from '@emi/ui';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { greeting, homeCopy } from './copy';

/**
 * The header of the screen she opens: the mark, the word Emi and the greeting.
 *
 * Nothing else. There is no account and nothing to count, so the row carries no picture of her and
 * no badge. The mark is the ring of the set rather than the brand file, because the set is what the
 * application already draws every icon from.
 */

export const homeHeaderTestID = 'home-header';
export const homeHeaderMarkTestID = 'home-header-mark';
export const homeHeaderWordTestID = 'home-header-word';
export const homeGreetingTestID = 'home-greeting';

/** The mark is drawn as tall as the word, so the two read as one mark rather than as two things. */
const theMarkIsAsTallAsTheWord = typeScale['headline-lg'].size;

interface Props {
  /**
   * The name in her profile, and nothing at all where she skipped the question or gave none. The
   * greeting is drawn either way: without a name it is hi on its own, which is a sentence, so a
   * woman who kept her name is greeted rather than read a line with a hole in it.
   */
  readonly name?: string;
}

export function HomeHeader({ name }: Props): ReactNode {
  return (
    <View style={styles.header} testID={homeHeaderTestID}>
      <View style={styles.mark}>
        <Icon
          colour={colour.accent}
          name="ring"
          size={theMarkIsAsTallAsTheWord}
          testID={homeHeaderMarkTestID}
        />
        <Text accessibilityRole="header" style={styles.word} testID={homeHeaderWordTestID}>
          {homeCopy.wordmark}
        </Text>
      </View>

      <Text style={styles.greeting} testID={homeGreetingTestID}>
        {greeting(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Her name is the one word on this screen that is hers, so it stays at the small size, which is
  // what SCREEN-2 holds the whole screen to.
  greeting: {
    color: colour.secondaryText,
    ...textStyle('body-sm'),
  },
  // The mark and the word sit at one end and the greeting at the other. The row is stretched
  // because the body it sits in centres what it holds, and a header narrower than the glass would
  // take the greeting away from the edge it belongs on.
  header: {
    alignItems: 'center',
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: space.spaceLg,
    paddingHorizontal: space.margin,
  },
  mark: { alignItems: 'center', flexDirection: 'row', gap: space.spaceSm },
  word: {
    color: colour.text,
    ...textStyle('headline-lg'),
  },
});
