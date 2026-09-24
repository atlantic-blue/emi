import { ICON_SIZE, colour, radius, space, stroke, textStyle } from '@emi/tokens';
import type { IconName } from '@emi/tokens';
import { Icon } from '@emi/ui';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../../components/Button';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { type PromiseLine, promiseCopy, promiseLines } from './copy';

/**
 * What Emi promises her, read after the forecast and before the hold. It asks her nothing, so it
 * carries no bar and no way past it.
 *
 * Each line says one thing the product does today, and nothing about the hardware the key sits in
 * or about a standard nobody has checked Emi against. The wording gate refuses those words now, so
 * a line that grows one fails rather than shipping.
 */

export const thePromiseTestID = 'onboarding-the-promise';
export const promiseActionTestID = 'promise-action';

export function promiseLineTestID(line: PromiseLine): string {
  return `promise-${line}`;
}

/**
 * The drawing beside each line. A record rather than a list, so a fourth line arriving in
 * `promiseLines` leaves this file failing to compile rather than leaving one line undrawn.
 */
export const promiseIcons: Readonly<Record<PromiseLine, IconName>> = {
  encrypted: 'lock',
  noTracking: 'shield',
  delete: 'delete',
};

/** Points. The disc each drawing stands in, which is the tap floor even though nothing is pressed. */
const DISC_DIAMETER = 44;

export function ThePromise({ onContinue }: { readonly onContinue: () => void }): ReactNode {
  return (
    <Screen testID={thePromiseTestID}>
      <ScrollView contentContainerStyle={styles.body} style={styles.scroll}>
        <Text accessibilityRole="header" style={styles.title}>
          {promiseCopy.title}
        </Text>

        <View style={styles.lines}>
          {promiseLines.map((line) => (
            <Card key={line} testID={promiseLineTestID(line)}>
              <View style={styles.row}>
                <View style={styles.disc}>
                  <Icon colour={colour.primary} name={promiseIcons[line]} size={ICON_SIZE} />
                </View>
                <View style={styles.said}>
                  <Text style={styles.lineTitle}>{promiseCopy.lines[line].title}</Text>
                  <Text style={styles.line}>{promiseCopy.lines[line].line}</Text>
                </View>
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label={promiseCopy.action}
          onPress={onContinue}
          testID={promiseActionTestID}
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
  line: {
    color: colour.onSurfaceVariant,
    ...textStyle('body-sm'),
  },
  lineTitle: {
    color: colour.onSurface,
    ...textStyle('label-md'),
    marginBottom: space.spaceXs,
  },
  lines: { gap: space.spaceMd, marginTop: space.spaceLg },
  row: { flexDirection: 'row', gap: space.spaceMd },
  // The words take what is left of the row after the disc, so a long line wraps inside the card
  // rather than pushing the drawing off the side of it.
  said: { flex: 1 },
  scroll: { flex: 1 },
  title: {
    color: colour.onSurface,
    ...textStyle('headline-lg'),
  },
});
