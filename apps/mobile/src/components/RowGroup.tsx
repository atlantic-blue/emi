import { colour, radius, space, stroke } from '@emi/tokens';
import { Children, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

/**
 * A column of rows on one card, with a hairline between two of them.
 *
 * The design system puts the rule between a row and the row under it rather than on the row
 * itself, because a row that drew its own would draw one under the last row too. That makes the
 * list the owner of the rule, which is what this is.
 *
 * A row is handed in rather than described, so one list can hold a row that opens something and a
 * row that only reads, and the list stays the thing that decides where the rules go.
 */

/** The hairline above the row in place `at`, named so a test can read the colour it is drawn in. */
export function rowGroupRuleTestID(testID: string, at: number): string {
  return `${testID}-rule-${at}`;
}

interface Props {
  readonly testID: string;
  readonly children: ReactNode;
}

export function RowGroup({ testID, children }: Props): ReactNode {
  const rows = Children.toArray(children);

  return (
    <View style={styles.group} testID={testID}>
      {rows.map((row, at) => (
        <View key={at === 0 ? 'first' : rowGroupRuleTestID(testID, at)}>
          {at === 0 ? null : <View style={styles.rule} testID={rowGroupRuleTestID(testID, at)} />}
          {row}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    backgroundColor: colour.card,
    borderRadius: radius.xl,
    paddingHorizontal: space.spaceLg,
  },
  rule: { backgroundColor: colour.line, height: stroke.hairline },
});
