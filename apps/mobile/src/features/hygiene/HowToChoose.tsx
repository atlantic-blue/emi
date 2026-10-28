import { colour, space, stroke, textStyle } from '@emi/tokens';
import { Fragment, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { CappedText as Text } from '@emi/ui';

import { Card } from '../../components/Card';
import { words } from '../../language';
import type { WordKey } from '../../language/words';

/**
 * The "How to choose" card of the hygieneProducts board (issue 305): six factors under the product
 * grid, each a title and one or two sentences, with a hairline between two factors. The health
 * factor only sends her to a doctor; it gives no advice of its own.
 */

export const howToChooseTestID = 'hygiene-how-to-choose';
export const howToChooseHeadingTestID = 'hygiene-how-to-choose-heading';

export const chooseFactors = ['flow', 'lifestyle', 'comfort', 'waste', 'cost', 'health'] as const;

export type ChooseFactor = (typeof chooseFactors)[number];

const factorWords: Readonly<Record<ChooseFactor, { title: WordKey; text: WordKey }>> = {
  flow: { title: 'hygiene.choose.flow.title', text: 'hygiene.choose.flow.text' },
  lifestyle: { title: 'hygiene.choose.lifestyle.title', text: 'hygiene.choose.lifestyle.text' },
  comfort: { title: 'hygiene.choose.comfort.title', text: 'hygiene.choose.comfort.text' },
  waste: { title: 'hygiene.choose.waste.title', text: 'hygiene.choose.waste.text' },
  cost: { title: 'hygiene.choose.cost.title', text: 'hygiene.choose.cost.text' },
  health: { title: 'hygiene.choose.health.title', text: 'hygiene.choose.health.text' },
};

export function chooseFactorTestID(factor: ChooseFactor): string {
  return `hygiene-how-to-choose-${factor}`;
}

export function HowToChoose(): ReactNode {
  return (
    <Card testID={howToChooseTestID}>
      <View style={styles.column}>
        <Text style={styles.heading} testID={howToChooseHeadingTestID}>
          {words('hygiene.choose.heading')}
        </Text>
        {chooseFactors.map((factor, index) => (
          <Fragment key={factor}>
            {index > 0 ? <View style={styles.rule} /> : null}
            <View style={styles.factor} testID={chooseFactorTestID(factor)}>
              <Text style={styles.title}>{words(factorWords[factor].title)}</Text>
              <Text style={styles.text}>{words(factorWords[factor].text)}</Text>
            </View>
          </Fragment>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  column: { gap: space.spaceMd },
  factor: { gap: space.spaceXs },
  heading: {
    color: colour.secondaryText,
    textTransform: 'uppercase',
    ...textStyle('label-md'),
  },
  rule: { backgroundColor: colour.line, height: stroke.hairline },
  text: { color: colour.secondaryText, ...textStyle('body-sm') },
  title: { color: colour.text, ...textStyle('button-md') },
});
