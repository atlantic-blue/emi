import { type ColourName, type IconName, colour, radius, space, textStyle } from '@emi/tokens';
import { Icon } from '@emi/ui';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { PrimaryButton } from '../../components/Button';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { type PromiseLine, promiseCopy, promiseLines } from './copy';

/**
 * What Emi promises her, read after the forecast and before the hold. It asks her nothing, so it
 * carries no bar and no way past it.
 *
 * Each line says one thing the product does today. No line says a copy of her days is sent,
 * because no build sends one: the one request the application can make is the account delete, and
 * no build carries the address it needs.
 */

export const thePromiseTestID = 'onboarding-the-promise';
export const promiseShieldTestID = 'promise-shield';
export const promiseLinesTestID = 'promise-lines';
export const promiseActionTestID = 'promise-action';

export function promiseLineTestID(line: PromiseLine): string {
  return `promise-${line}`;
}

/** The drawing beside each line, and the tile and ink it is drawn in, as the redesign paints them. */
interface LineDrawing {
  readonly icon: IconName;
  readonly tile: ColourName;
  readonly ink: ColourName;
}

/**
 * A record rather than a list, so a fourth line arriving in `promiseLines` leaves this file
 * failing to compile rather than leaving one line undrawn.
 */
export const promiseDrawings: Readonly<Record<PromiseLine, LineDrawing>> = {
  encrypted: { icon: 'key', tile: 'accentSoft', ink: 'accent' },
  noTracking: { icon: 'search', tile: 'washWarm', ink: 'ovulationInk' },
  delete: { icon: 'delete', tile: 'accentTile', ink: 'lutealInk' },
};

/** Points. The tile the shield stands on, and the shield inside it. */
const SHIELD_TILE = 96;
const SHIELD_SIZE = 48;

/** Points. The tile each line's drawing stands on, which is the tap floor though nothing is pressed. */
const LINE_TILE = 44;
const LINE_ICON = 22;

const shieldGradientID = 'promise-shield-gradient';

/** The shield on a tile that warms from white at the top left to the warm stop of the wash. */
function Shield(): ReactNode {
  return (
    <View style={styles.shield} testID={promiseShieldTestID}>
      <View style={styles.shieldGround}>
        <Svg height={SHIELD_TILE} width={SHIELD_TILE}>
          <Defs>
            <LinearGradient id={shieldGradientID} x1="0" x2="1" y1="0" y2="1">
              <Stop offset="0" stopColor={colour.card} />
              <Stop offset="1" stopColor={colour.washWarm} />
            </LinearGradient>
          </Defs>
          <Rect
            fill={`url(#${shieldGradientID})`}
            height={SHIELD_TILE}
            rx={radius.xxl}
            width={SHIELD_TILE}
          />
        </Svg>
      </View>
      <View style={styles.shieldMark}>
        <Icon colour={colour.accent} name="shield" size={SHIELD_SIZE} />
      </View>
    </View>
  );
}

export function ThePromise({ onContinue }: { readonly onContinue: () => void }): ReactNode {
  return (
    <Screen drawsTheWash testID={thePromiseTestID}>
      <ScrollView contentContainerStyle={styles.body} style={styles.scroll}>
        <View style={styles.head}>
          <Shield />
          <Text accessibilityRole="header" style={styles.title}>
            {promiseCopy.title}
          </Text>
        </View>

        <Card testID={promiseLinesTestID}>
          {promiseLines.map((line) => (
            <View key={line} style={styles.row} testID={promiseLineTestID(line)}>
              <View style={[styles.tile, { backgroundColor: colour[promiseDrawings[line].tile] }]}>
                <Icon
                  colour={colour[promiseDrawings[line].ink]}
                  name={promiseDrawings[line].icon}
                  size={LINE_ICON}
                />
              </View>
              <Text style={styles.line}>{promiseCopy.lines[line]}</Text>
            </View>
          ))}
        </Card>
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
    gap: space.spaceLg,
    paddingBottom: space.spaceLg,
    paddingHorizontal: space.spaceLg,
    paddingTop: space.spaceXl,
  },
  footer: { padding: space.spaceLg },
  head: { alignItems: 'center', gap: space.spaceLg, paddingTop: space.spaceXl },
  // The words take what is left of the row after the tile, so a long line wraps inside the card
  // rather than pushing the drawing off the side of it.
  line: {
    color: colour.text,
    flex: 1,
    ...textStyle('choice-lg'),
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.spaceMd,
    minHeight: LINE_TILE + space.spaceMd,
  },
  scroll: { flex: 1 },
  shield: {
    alignItems: 'center',
    height: SHIELD_TILE,
    justifyContent: 'center',
    width: SHIELD_TILE,
  },
  shieldGround: { left: 0, position: 'absolute', top: 0 },
  // Positioned as well, so it is drawn over the ground in every renderer and not only on the phone.
  shieldMark: { position: 'relative' },
  tile: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: LINE_TILE,
    justifyContent: 'center',
    width: LINE_TILE,
  },
  title: {
    color: colour.text,
    textAlign: 'center',
    ...textStyle('headline-lg'),
  },
});
