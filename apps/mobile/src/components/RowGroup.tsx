/**
 * A column of rows on one card, with a hairline between two of them.
 *
 * The design system puts the rule between a row and the row under it rather than on the row
 * itself, because a row that drew its own would draw one under the last row too. That makes the
 * list the owner of the rule, which is what this is.
 */

/** The hairline above the row in place `at`, named so a test can read the colour it is drawn in. */
export function rowGroupRuleTestID(testID: string, at: number): string {
  return `${testID}-rule-${at}`;
}
