import { MINIMUM_TAP_TARGET, colour, radius, space, textStyle } from '@emi/tokens';
import { Icon } from '@emi/ui';
import type { ReactNode } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { words } from '../../language';

/**
 * The field she types a symptom into. The log opened on the symptoms and the log sheet both search
 * the same catalogue with `search.ts`, so they draw the same field.
 */

export const symptomSearchTestID = 'symptom-search';

export const symptomSearchLabel = words('log.sheet.search');

/** Points. The magnifier, as the board draws it beside the words. */
const SEARCH_ICON = 20;

interface Props {
  readonly query: string;
  readonly onType: (typed: string) => void;
}

export function SymptomSearchField({ query, onType }: Props): ReactNode {
  return (
    <View style={styles.field}>
      <Icon colour={colour.secondaryText} name="search" size={SEARCH_ICON} />
      <TextInput
        accessibilityLabel={symptomSearchLabel}
        autoCorrect={false}
        onChangeText={onType}
        placeholder={symptomSearchLabel}
        placeholderTextColor={colour.secondaryText}
        style={styles.input}
        testID={symptomSearchTestID}
        value={query}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    alignItems: 'center',
    backgroundColor: colour.card,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: space.spaceSm,
    minHeight: MINIMUM_TAP_TARGET,
    paddingHorizontal: space.spaceMd,
  },
  input: {
    color: colour.text,
    flexGrow: 1,
    minHeight: MINIMUM_TAP_TARGET,
    ...textStyle('body-lg'),
  },
});
