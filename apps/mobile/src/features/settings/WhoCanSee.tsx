import { colour, radius, space, textStyle } from '@emi/tokens';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { CappedText as Text } from '@emi/ui';

import { RoundIconButton } from '../../components/RoundIconButton';
import { Screen } from '../../components/Screen';
import { settingsCopy } from './copy';

export const whoCanSeeScreenTestID = 'who-can-see-screen';
export const whoCanSeeBackTestID = 'who-can-see-back';
export const whoCanSeeTitleTestID = 'who-can-see-title';
export const whoCanSeeExampleTestID = 'who-can-see-example';

export function whoCanSeePartTestID(at: number): string {
  return `who-can-see-part-${at}`;
}

/** The set holds one chevron, pointing the way on, so the way back is the same drawing turned. */
const TURNED_AROUND = [{ rotate: '180deg' }] as const;

/** Points. The room the way back takes, kept on the other side so the title stays in the middle. */
const THE_ROOM_A_WAY_BACK_TAKES = 44;

/**
 * One page that answers who can see her records, in place of a note on every screen: where they
 * are kept, who can read them, what happens to a file she sends, and one example of why it matters.
 *
 * Every sentence holds in the code. No build sets a server address and nothing uploads a day, each
 * day goes through `vault.seal` before it is written, and an export leaves the phone only through
 * the share sheet she opens.
 */
export function WhoCanSee({ onBack }: { readonly onBack: () => void }): ReactNode {
  return (
    <Screen drawsTheWash testID={whoCanSeeScreenTestID}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.header}>
          <View style={styles.backMark}>
            <RoundIconButton
              accessibilityLabel={settingsCopy.settings.back}
              icon="chevron"
              onPress={onBack}
              testID={whoCanSeeBackTestID}
            />
          </View>
          <Text style={styles.headerTitle}>{settingsCopy.settings.title}</Text>
          <View style={styles.evenUp} />
        </View>

        <Text accessibilityRole="header" style={styles.title} testID={whoCanSeeTitleTestID}>
          {settingsCopy.whoCanSee.title}
        </Text>

        {settingsCopy.whoCanSee.parts.map((part, at) => (
          <View key={part.lead} style={styles.part} testID={whoCanSeePartTestID(at)}>
            <Text style={styles.lead}>{part.lead}</Text>
            <Text style={styles.line}>{part.line}</Text>
          </View>
        ))}

        <View style={styles.example} testID={whoCanSeeExampleTestID}>
          <Text style={styles.exampleWords}>{settingsCopy.whoCanSee.example}</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backMark: { transform: TURNED_AROUND },
  body: { flexGrow: 1, paddingHorizontal: space.margin, paddingVertical: space.spaceXl },
  evenUp: { width: THE_ROOM_A_WAY_BACK_TAKES },
  example: {
    backgroundColor: colour.field,
    borderRadius: radius.xl,
    padding: space.spaceLg,
  },
  exampleWords: { color: colour.text, ...textStyle('choice-lg') },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: space.spaceLg,
  },
  headerTitle: { color: colour.text, textAlign: 'center', ...textStyle('headline-sm') },
  lead: { color: colour.text, ...textStyle('choice-lg') },
  line: { color: colour.secondaryText, ...textStyle('body-sm') },
  part: {
    backgroundColor: colour.card,
    borderRadius: radius.xl,
    marginBottom: space.spaceMd,
    padding: space.spaceLg,
    rowGap: space.spaceXs,
  },
  title: { color: colour.text, marginBottom: space.spaceLg, ...textStyle('headline-lg') },
});
