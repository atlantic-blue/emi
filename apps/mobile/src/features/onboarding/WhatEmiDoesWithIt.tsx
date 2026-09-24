import type { Focus } from '@emi/crypto';
import { ICON_SIZE, colour, radius, space, stroke, textStyle } from '@emi/tokens';
import type { IconName } from '@emi/tokens';
import { Icon } from '@emi/ui';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../../components/Button';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import {
  type WhatEmiDoesCard,
  whatComesFirstWhenSheLogs,
  whatEmiDoesCards,
  whatEmiDoesCopy,
} from './copy';

/**
 * The last screen before the hold: her own answers, read back as the three things they change.
 *
 * The log card is the one that reads her: it names the groups she pressed on the focus screen, in
 * the order she pressed them, because that is the order her log sheet will open in. A woman who
 * pressed none is told what she will open instead of being shown an empty list.
 */

export const whatEmiDoesTestID = 'onboarding-what-emi-does';
export const whatEmiDoesActionTestID = 'what-emi-does-action';

export function whatEmiDoesCardTestID(card: WhatEmiDoesCard): string {
  return `what-emi-does-${card}`;
}

/**
 * The drawing beside each card. A record rather than a list, so a fourth card arriving in
 * `whatEmiDoesCards` leaves this file failing to compile rather than leaving one card undrawn.
 */
export const whatEmiDoesIcons: Readonly<Record<WhatEmiDoesCard, IconName>> = {
  forecast: 'ring',
  log: 'note',
  privacy: 'lock',
};

/** Points. The disc each drawing stands in, which is the tap floor even though nothing is pressed. */
const DISC_DIAMETER = 44;

interface Props {
  /** The groups she pressed, in the order she pressed them, and empty where she pressed none. */
  readonly focus: readonly Focus[];
  readonly onContinue: () => void;
}

export function WhatEmiDoesWithIt({ focus, onContinue }: Props): ReactNode {
  const said: Readonly<Record<WhatEmiDoesCard, { readonly title: string; readonly line: string }>> =
    {
      forecast: whatEmiDoesCopy.forecast,
      log: { title: whatEmiDoesCopy.log.title, line: whatComesFirstWhenSheLogs(focus) },
      privacy: whatEmiDoesCopy.privacy,
    };

  return (
    <Screen testID={whatEmiDoesTestID}>
      <ScrollView contentContainerStyle={styles.body} style={styles.scroll}>
        <Text accessibilityRole="header" style={styles.title}>
          {whatEmiDoesCopy.title}
        </Text>

        <View style={styles.cards}>
          {whatEmiDoesCards.map((card) => (
            <Card key={card} testID={whatEmiDoesCardTestID(card)}>
              <View style={styles.row}>
                <View style={styles.disc}>
                  <Icon colour={colour.primary} name={whatEmiDoesIcons[card]} size={ICON_SIZE} />
                </View>
                <View style={styles.saying}>
                  <Text style={styles.cardTitle}>{said[card].title}</Text>
                  <Text style={styles.cardLine}>{said[card].line}</Text>
                </View>
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label={whatEmiDoesCopy.action}
          onPress={onContinue}
          testID={whatEmiDoesActionTestID}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingBottom: space.spaceLg,
    paddingHorizontal: space.spaceLg,
    paddingTop: space.spaceXl,
  },
  cardLine: {
    color: colour.onSurfaceVariant,
    ...textStyle('body-sm'),
  },
  cardTitle: {
    color: colour.onSurface,
    ...textStyle('label-md'),
    marginBottom: space.spaceXs,
  },
  cards: { gap: space.spaceMd, marginTop: space.spaceLg },
  disc: {
    alignItems: 'center',
    backgroundColor: colour.surfaceContainer,
    borderRadius: radius.full,
    height: DISC_DIAMETER,
    justifyContent: 'center',
    width: DISC_DIAMETER,
  },
  footer: {
    borderTopColor: colour.outlineVariant,
    borderTopWidth: stroke.hairline,
    padding: space.spaceLg,
  },
  row: { flexDirection: 'row', gap: space.spaceMd },
  // The words take what is left of the row after the disc, so a long line wraps inside the card
  // rather than pushing the drawing off the side of it.
  saying: { flex: 1 },
  scroll: { flex: 1 },
  title: {
    color: colour.onSurface,
    ...textStyle('headline-lg'),
  },
});
