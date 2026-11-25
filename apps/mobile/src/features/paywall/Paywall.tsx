import { colour, radius, space, textStyle } from '@emi/tokens';
import { Icon, CappedText as Text } from '@emi/ui';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { PrimaryButton, TextLink } from '../../components/Button';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import type { HoldsTheAnswer } from '../../services/store/theAnswerThePhoneHolds';
import {
  type FilesWhatTheStoreNamed,
  filesNothing,
} from '../../services/store/theEntitlementWhenSheOpens';
import type { WhatSheIsEntitledToNow } from '../../services/store/theEntitlement';
import type { APlanInTheStore } from '../../services/store/thePlans';
import {
  type BuysInTheStore,
  type WhereThePressLeftHer,
  sheBuys,
  sheIsPaidUp,
  sheRestores,
} from '../../services/store/thePurchase';
import { PlanRow } from './PlanRow';
import {
  THE_TERMS_OF_USE,
  type TheFreeMonth,
  type WhichPlan,
  thePaywallSaid,
  theActionFor,
  thePlanRowsOf,
  thePrivacyPolicyAddress,
  theRenewalPriceOf,
} from './copy';

/**
 * The paywall of the first run. She has no free version of Emi to fall back on, so this screen is
 * the one place she can buy it and it has no way out: no close control, no back arrow, and the
 * hardware back of a phone is refused here.
 *
 * Every line App Review asks of a subscription is on it: the name and the period of each plan, the
 * full renewal price, how long the free month lasts and what is taken when it ends, a way to
 * restore a purchase, and a press to the terms and to the privacy policy.
 *
 * It is the last screen of the first run, reached once her answers are written, and a purchase or
 * a restore is the only way off it.
 *
 * A woman who paid before reads the same screen with the free month taken out of it, because Apple
 * gives that offer once. Her two ways to her own records are on it, since a wall with no way to
 * export and no way to delete would hold what she wrote.
 */

/**
 * What the route that draws this screen has to give the navigator.
 *
 * A swipe back is the navigator's to refuse and not the screen's, so the screen cannot close
 * that way out on its own. It names what it needs instead, and the layout of the first run passes
 * this through. The hardware back is refused below, where the screen can answer it.
 */
export const theOptionsThePaywallNeeds = {
  gestureEnabled: false,
  headerShown: false,
} as const;

export const paywallTestID = 'paywall';
export const paywallTitleTestID = 'paywall-title';
export const paywallLineTestID = 'paywall-line';
export const paywallGetsTestID = 'paywall-gets';
export const paywallActionTestID = 'paywall-action';
export const paywallRenewalTestID = 'paywall-renewal';
export const paywallRestoreTestID = 'paywall-restore';
export const paywallTermsTestID = 'paywall-terms';
export const paywallPrivacyTestID = 'paywall-privacy';
export const paywallExportTestID = 'paywall-export';
export const paywallDeleteTestID = 'paywall-delete';

export function paywallGetTestID(at: number): string {
  return `${paywallGetsTestID}-${String(at)}`;
}

/** The drawing beside each thing she gets, in the order the board draws them. */
const theMarksOfWhatSheGets = ['drop', 'calendar', 'key'] as const;

/** Points. The tile a mark sits on, and the mark inside it. */
const TILE_SIZE = 32;
const MARK_SIZE = 18;

const theTileGrounds = [colour.accentSoft, colour.washWarm, colour.accentTile];
const theMarkInks = [colour.accent, colour.ovulationInk, colour.lutealInk];

function WhatSheGets(): ReactNode {
  return (
    <Card testID={paywallGetsTestID}>
      {thePaywallSaid().gets.map((gets, at) => (
        <View key={gets} style={styles.get} testID={paywallGetTestID(at)}>
          <View style={[styles.tile, { backgroundColor: theTileGrounds[at] }]}>
            <Icon
              colour={String(theMarkInks[at])}
              name={theMarksOfWhatSheGets[at] ?? 'drop'}
              size={MARK_SIZE}
            />
          </View>
          <Text style={styles.getSaid}>{gets}</Text>
        </View>
      ))}
    </Card>
  );
}

export function Paywall({
  plans,
  buying,
  holding,
  now,
  month = 'hers',
  files = filesNothing,
  onPaid,
  onExport,
  onDelete,
  openThePage,
}: {
  /** The plans the store named, with the figure it quoted for each one. */
  readonly plans: readonly APlanInTheStore[];
  readonly buying: BuysInTheStore;
  readonly holding: HoldsTheAnswer;
  readonly now: () => Date;
  /** Whether the free month is still hers, which is the whole difference between the two boards. */
  readonly month?: TheFreeMonth;
  /**
   * How a transaction reaches the server, which is the same route the launch read files with.
   * A build with nothing to file with files nothing.
   */
  readonly files?: FilesWhatTheStoreNamed;
  /** Where she goes once the store says she is paid up, which is out of this screen. */
  readonly onPaid: (entitlement: WhatSheIsEntitledToNow) => void;
  /** The two ways to her own records, drawn only for a woman who already wrote some. */
  readonly onExport?: () => void;
  readonly onDelete?: () => void;
  readonly openThePage: (address: string) => void;
}): ReactNode {
  const said = thePaywallSaid();
  const rows = thePlanRowsOf(plans);
  const [chosen, setChosen] = useState<WhichPlan>('yearly');
  const [isAsking, setIsAsking] = useState(false);
  const askingNow = useRef(false);
  const row = rows.find((one) => one.which === chosen) ?? rows[0];

  /**
   * A phone with a hardware back and a screen with no way out. Answering the press rather than
   * ignoring it is what stops the system from taking her back to the question she just answered.
   */
  useEffect(() => {
    const held = BackHandler.addEventListener('hardwareBackPress', () => true);

    return () => {
      held.remove();
    };
  }, []);

  function readWhatHappened(left: WhereThePressLeftHer): void {
    if (left.did === 'itRefusedThePress') {
      Alert.alert(said.troubleTitle, said.troubleLine, [{ text: said.troubleOk }]);

      return;
    }

    if (left.did === 'itAnswered' && sheIsPaidUp(left.entitlement) && left.entitlement !== null) {
      onPaid(left.entitlement);
    }
  }

  /**
   * One press at a time, held in a reference as well as in state, because two taps inside one
   * frame read the same state and the second would open a second system sheet.
   */
  async function ask(what: () => Promise<WhereThePressLeftHer>): Promise<void> {
    if (askingNow.current) {
      return;
    }

    askingNow.current = true;
    setIsAsking(true);

    const left = await what();

    askingNow.current = false;
    setIsAsking(false);
    readWhatHappened(left);
  }

  return (
    <Screen drawsTheWash testID={paywallTestID}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.argument}>
          <Text style={styles.title} testID={paywallTitleTestID}>
            {said.title}
          </Text>
          <Text style={styles.line} testID={paywallLineTestID}>
            {said.line}
          </Text>
        </View>

        <WhatSheGets />

        <View accessibilityRole="radiogroup" style={styles.plans}>
          {rows.map((one) => (
            <PlanRow
              isChosen={one.which === chosen}
              key={one.which}
              month={month}
              onPress={() => {
                setChosen(one.which);
              }}
              price={one.plan.priceInWords}
              which={one.which}
            />
          ))}
        </View>

        <View style={styles.foot}>
          {row === undefined ? null : (
            <>
              <PrimaryButton
                isReady={!isAsking}
                label={theActionFor(row.which, row.plan.priceInWords, month)}
                onPress={() => {
                  void ask(() => sheBuys(row.plan.product.identifier, buying, holding, now, files));
                }}
                testID={paywallActionTestID}
              />
              <Text style={styles.renewal} testID={paywallRenewalTestID}>
                {theRenewalPriceOf(row.which, row.plan.priceInWords, month)}
              </Text>
            </>
          )}

          <TextLink
            isReady={!isAsking}
            label={said.restore}
            onPress={() => {
              void ask(() => sheRestores(buying, holding, now, files));
            }}
            testID={paywallRestoreTestID}
          />

          <View style={styles.links}>
            <Pressable
              accessibilityRole="link"
              onPress={() => {
                openThePage(THE_TERMS_OF_USE);
              }}
              style={styles.link}
              testID={paywallTermsTestID}
            >
              <Text style={styles.linkSaid}>{said.terms}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="link"
              onPress={() => {
                openThePage(thePrivacyPolicyAddress());
              }}
              style={styles.link}
              testID={paywallPrivacyTestID}
            >
              <Text style={styles.linkSaid}>{said.privacy}</Text>
            </Pressable>
            {onExport === undefined ? null : (
              <Pressable
                accessibilityRole="link"
                onPress={onExport}
                style={styles.link}
                testID={paywallExportTestID}
              >
                <Text style={styles.linkSaid}>{said.exportHerData}</Text>
              </Pressable>
            )}
            {onDelete === undefined ? null : (
              <Pressable
                accessibilityRole="link"
                onPress={onDelete}
                style={styles.link}
                testID={paywallDeleteTestID}
              >
                <Text style={styles.linkSaid}>{said.deleteHerData}</Text>
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

/** Points. The two links sit under the restore row, closer to it than any other pair. */
const LINKS_APART = 18;

const styles = StyleSheet.create({
  argument: { rowGap: space.spaceSm },
  body: {
    flexGrow: 1,
    paddingHorizontal: space.margin,
    paddingVertical: space.spaceXl,
    rowGap: space.spaceMd,
  },
  foot: { alignItems: 'center', marginTop: 'auto', rowGap: space.spaceMd, width: '100%' },
  get: {
    alignItems: 'center',
    columnGap: space.spaceMd,
    flexDirection: 'row',
    paddingVertical: space.spaceXs,
  },
  getSaid: { color: colour.text, flexShrink: 1, ...textStyle('label-md') },
  line: { color: colour.secondaryText, textAlign: 'center', ...textStyle('body-sm') },
  link: { alignItems: 'center', justifyContent: 'center', paddingVertical: space.spaceXs },
  linkSaid: {
    color: colour.secondaryText,
    textDecorationLine: 'underline',
    ...textStyle('label-sm'),
  },
  links: {
    alignItems: 'center',
    columnGap: LINKS_APART,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  plans: { rowGap: space.spaceMd },
  renewal: { color: colour.text, textAlign: 'center', ...textStyle('body-sm') },
  tile: {
    alignItems: 'center',
    borderRadius: radius.sm,
    height: TILE_SIZE,
    justifyContent: 'center',
    width: TILE_SIZE,
  },
  title: { color: colour.text, textAlign: 'center', ...textStyle('headline-lg') },
});
