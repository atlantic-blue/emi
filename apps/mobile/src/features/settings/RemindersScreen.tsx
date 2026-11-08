import { MINIMUM_TAP_TARGET, colour, radius, space, textStyle } from '@emi/tokens';
import { Icon, CappedText as Text } from '@emi/ui';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { PrimaryButton } from '../../components/Button';
import { SingleChoiceRow } from '../../components/ChoiceRow';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { firstRunCopy, reminderChoices, reminderLabels } from '../onboarding/copy';
import type { DailyLogReminder } from '../reminder/dailyLogReminder';
import {
  type MinutesOfTheDay,
  type ReminderLead,
  reminderNotificationWords,
  reminderTimeSaid,
} from '../reminder/reminder';
import { settingsCopy } from './copy';

export const remindersScreenTestID = 'reminders';
export const remindersHeaderTestID = 'reminders-header';
export const remindersTitleTestID = 'reminders-title';
export const remindersBackTestID = 'reminders-back';
export const remindersPreviewTestID = 'reminders-preview';
export const remindersPreviewWordsTestID = 'reminders-preview-words';
export const remindersTimeTestID = 'reminders-time';
export const remindersEarlierTestID = 'reminders-earlier';
export const remindersLaterTestID = 'reminders-later';
export const remindersNoteTestID = 'reminders-note';
export const remindersSaveTestID = 'reminders-save';
export const remindersDailyLogCardTestID = 'reminders-daily-log';
export const remindersDailyLogTestID = 'reminders-daily-log-switch';
export const remindersDailyLogTimeTestID = 'reminders-daily-log-time';
export const remindersDailyLogEarlierTestID = 'reminders-daily-log-earlier';
export const remindersDailyLogLaterTestID = 'reminders-daily-log-later';
/** The foot, which holds the note and Save and never scrolls, so the note is never cut by Save. */
export const remindersFooterTestID = 'reminders-footer';

/** One of the three moments before her period, or no reminder at all. */
export type ReminderChoice = ReminderLead | 'never';

export const reminderChoicesOnTheScreen: readonly ReminderChoice[] = [...reminderChoices, 'never'];

export function remindersChoiceTestID(choice: ReminderChoice): string {
  return `reminders-choice-${choice}`;
}

/** The words of a choice, which are the words the first run offers, and Never. */
export function reminderChoiceSaid(choice: ReminderChoice): string {
  return choice === 'never' ? settingsCopy.reminders.never : reminderLabels[choice];
}

/** Points. The way back is read at the size every other way back is read at. */
const CHEVRON_SIZE = 22;

/** Points. The square the word emi stands in, which is how the phone draws an application. */
const TILE = 34;

/** Points. The lock beside the note. */
const NOTE_ICON = 16;

/** The icon set holds one chevron, pointing the way on, so the way back is that drawing turned. */
const TURNED_AROUND = [{ rotate: '180deg' }] as const;

/** What the reminders are set to: the period reminder and its time, the daily log reminder and its time. */
export interface ReminderSettings {
  readonly choice: ReminderChoice;
  readonly time: MinutesOfTheDay;
  readonly dailyLog: DailyLogReminder;
  readonly dailyLogTime: MinutesOfTheDay;
}

/** Points. The track of the switch and the knob that slides along it. */
const TRACK_WIDTH = 51;
const TRACK_HEIGHT = 31;
const KNOB = 27;

interface TimeOfDayTestIDs {
  readonly time: string;
  readonly earlier: string;
  readonly later: string;
}

interface TimeOfDayProps {
  readonly minutes: MinutesOfTheDay;
  readonly onEarlier: () => void;
  readonly onLater: () => void;
  readonly testIDs: TimeOfDayTestIDs;
}

function TimeOfDay({ minutes, onEarlier, onLater, testIDs }: TimeOfDayProps): ReactNode {
  const time = reminderTimeSaid(minutes);

  return (
    <View style={styles.timeRow}>
      <Text style={styles.timeLabel}>{settingsCopy.reminders.timeOfDay}</Text>
      <View style={styles.timeControl}>
        <Pressable
          accessibilityLabel={settingsCopy.reminders.earlier}
          accessibilityRole="button"
          onPress={onEarlier}
          style={styles.step}
          testID={testIDs.earlier}
        >
          <View style={styles.turned}>
            <Icon colour={colour.text} name="chevron" size={CHEVRON_SIZE} />
          </View>
        </Pressable>
        <Text
          accessibilityLabel={`${settingsCopy.reminders.timeOfDay}, ${time}`}
          style={styles.time}
          testID={testIDs.time}
        >
          {time}
        </Text>
        <Pressable
          accessibilityLabel={settingsCopy.reminders.later}
          accessibilityRole="button"
          onPress={onLater}
          style={styles.step}
          testID={testIDs.later}
        >
          <Icon colour={colour.text} name="chevron" size={CHEVRON_SIZE} />
        </Pressable>
      </View>
    </View>
  );
}

interface Props {
  /** What the phone holds, which is what Save is compared against. */
  readonly held: ReminderSettings;
  /** What she is holding on the screen now. */
  readonly holding: ReminderSettings;
  readonly onChoose: (choice: ReminderChoice) => void;
  readonly onEarlier: () => void;
  readonly onLater: () => void;
  readonly onSave: () => void;
  readonly onBack: () => void;
  readonly onDailyLog: () => void;
  readonly onDailyLogEarlier: () => void;
  readonly onDailyLogLater: () => void;
}

/**
 * Reminders: when the period reminder comes, at what time of day, or never. The words she would
 * read on her lock screen stand at the top, so she chooses the words and not an idea of them.
 *
 * Nothing is written until she presses Save, and Save waits until something differs from what the
 * phone holds.
 */
export function RemindersScreen({
  held,
  holding,
  onChoose,
  onEarlier,
  onLater,
  onSave,
  onBack,
  onDailyLog,
  onDailyLogEarlier,
  onDailyLogLater,
}: Props): ReactNode {
  const hasChanged =
    held.choice !== holding.choice ||
    held.time !== holding.time ||
    held.dailyLog !== holding.dailyLog ||
    held.dailyLogTime !== holding.dailyLogTime;
  const isDailyLogOn = holding.dailyLog === 'on';

  return (
    <Screen drawsTheWash testID={remindersScreenTestID}>
      <ScrollView contentContainerStyle={styles.body} style={styles.scroll}>
        <ScreenHeader
          start={
            <Pressable
              accessibilityLabel={settingsCopy.reminders.back}
              accessibilityRole="button"
              onPress={onBack}
              style={styles.back}
              testID={remindersBackTestID}
            >
              <View style={styles.turned}>
                <Icon colour={colour.text} name="chevron" size={CHEVRON_SIZE} />
              </View>
            </Pressable>
          }
          testID={remindersHeaderTestID}
          title={settingsCopy.reminders.title}
          titleTestID={remindersTitleTestID}
        />

        <View style={styles.preview} testID={remindersPreviewTestID}>
          <View style={styles.tile}>
            <Text style={styles.tileWord}>{firstRunCopy.reminder.tile}</Text>
          </View>
          <View style={styles.previewWords}>
            <Text style={styles.previewName}>{firstRunCopy.reminder.name}</Text>
            <Text style={styles.previewLine} testID={remindersPreviewWordsTestID}>
              {reminderNotificationWords}
            </Text>
          </View>
        </View>

        <View style={styles.choices}>
          {reminderChoicesOnTheScreen.map((choice) => (
            <SingleChoiceRow
              isChosen={holding.choice === choice}
              key={choice}
              label={reminderChoiceSaid(choice)}
              onPress={() => onChoose(choice)}
              testID={remindersChoiceTestID(choice)}
            />
          ))}
        </View>

        <View style={styles.timeCard}>
          <TimeOfDay
            minutes={holding.time}
            onEarlier={onEarlier}
            onLater={onLater}
            testIDs={{
              earlier: remindersEarlierTestID,
              later: remindersLaterTestID,
              time: remindersTimeTestID,
            }}
          />
        </View>

        <View style={styles.dailyLogCard} testID={remindersDailyLogCardTestID}>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: isDailyLogOn }}
            onPress={onDailyLog}
            style={styles.dailyLogRow}
            testID={remindersDailyLogTestID}
          >
            <Text style={styles.dailyLogLabel}>{settingsCopy.reminders.dailyLog}</Text>
            <View style={[styles.track, isDailyLogOn ? styles.trackOn : styles.trackOff]}>
              <View style={[styles.knob, isDailyLogOn && styles.knobOn]} />
            </View>
          </Pressable>
          {isDailyLogOn && (
            <TimeOfDay
              minutes={holding.dailyLogTime}
              onEarlier={onDailyLogEarlier}
              onLater={onDailyLogLater}
              testIDs={{
                earlier: remindersDailyLogEarlierTestID,
                later: remindersDailyLogLaterTestID,
                time: remindersDailyLogTimeTestID,
              }}
            />
          )}
        </View>
      </ScrollView>

      <View style={styles.footer} testID={remindersFooterTestID}>
        <View style={styles.note}>
          <Icon colour={colour.secondaryText} name="lock" size={NOTE_ICON} />
          <Text style={styles.noteWords} testID={remindersNoteTestID}>
            {settingsCopy.reminders.note}
          </Text>
        </View>
        <PrimaryButton
          isReady={hasChanged}
          label={settingsCopy.reminders.save}
          onPress={onSave}
          testID={remindersSaveTestID}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: {
    alignItems: 'center',
    backgroundColor: colour.card,
    borderRadius: radius.full,
    height: MINIMUM_TAP_TARGET,
    justifyContent: 'center',
    width: MINIMUM_TAP_TARGET,
  },
  body: {
    flexGrow: 1,
    gap: space.spaceLg,
    paddingHorizontal: space.spaceLg,
    paddingVertical: space.spaceXl,
  },
  choices: { gap: space.spaceSm },
  dailyLogCard: {
    backgroundColor: colour.card,
    borderRadius: radius.xl,
    gap: space.spaceSm,
    padding: space.spaceMd,
  },
  dailyLogLabel: { color: colour.text, flexShrink: 1, ...textStyle('choice-lg') },
  dailyLogRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.spaceMd,
    justifyContent: 'space-between',
    minHeight: MINIMUM_TAP_TARGET,
  },
  footer: { gap: space.spaceMd, padding: space.spaceLg },
  note: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.spaceSm,
    justifyContent: 'center',
  },
  noteWords: { color: colour.secondaryText, flexShrink: 1, ...textStyle('body-sm') },
  preview: {
    alignItems: 'center',
    backgroundColor: colour.card,
    borderRadius: radius.lg,
    flexDirection: 'row',
    gap: space.spaceMd,
    padding: space.spaceMd,
  },
  previewLine: { color: colour.text, ...textStyle('body-sm') },
  previewName: { color: colour.text, ...textStyle('label-md') },
  previewWords: { flexShrink: 1 },
  scroll: { flex: 1 },
  step: {
    alignItems: 'center',
    height: MINIMUM_TAP_TARGET,
    justifyContent: 'center',
    width: MINIMUM_TAP_TARGET,
  },
  knob: {
    backgroundColor: colour.card,
    borderRadius: radius.full,
    height: KNOB,
    width: KNOB,
  },
  knobOn: { alignSelf: 'flex-end' },
  tile: {
    alignItems: 'center',
    backgroundColor: colour.accent,
    borderRadius: radius.sm,
    height: TILE,
    justifyContent: 'center',
    width: TILE,
  },
  tileWord: { color: colour.onAccent, ...textStyle('label-md') },
  time: {
    backgroundColor: colour.accentTile,
    borderRadius: radius.sm,
    color: colour.text,
    overflow: 'hidden',
    paddingHorizontal: space.spaceMd,
    paddingVertical: space.spaceXs,
    ...textStyle('headline-sm'),
  },
  timeCard: {
    backgroundColor: colour.card,
    borderRadius: radius.xl,
    padding: space.spaceMd,
  },
  timeControl: { alignItems: 'center', flexDirection: 'row' },
  timeLabel: { color: colour.text, ...textStyle('choice-lg') },
  timeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.spaceSm,
    justifyContent: 'space-between',
  },
  track: {
    borderRadius: radius.full,
    height: TRACK_HEIGHT,
    justifyContent: 'center',
    padding: (TRACK_HEIGHT - KNOB) / 2,
    width: TRACK_WIDTH,
  },
  trackOff: { backgroundColor: colour.field },
  trackOn: { backgroundColor: colour.accent },
  turned: { transform: TURNED_AROUND },
});
