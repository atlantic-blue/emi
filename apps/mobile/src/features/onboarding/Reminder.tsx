import { colour, radius, space, textStyle } from '@emi/tokens';
import { Icon, CappedText as Text } from '@emi/ui';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Chip } from '../../components/Chip';
import { type ReminderLead, reminderNotificationWords } from '../reminder/reminder';
import { OnboardingScreen } from './OnboardingScreen';
import { firstRunCopy, reminderChoices, reminderLabels, reminderLines } from './copy';

export const reminderPreviewTestID = 'reminder-preview';
export const reminderPreviewWordsTestID = 'reminder-preview-words';
export const reminderLineTestID = 'reminder-line';

/** One of the three moments, named so a test presses the moment rather than a place in the row. */
export function reminderTestID(lead: ReminderLead): string {
  return `reminder-${lead}`;
}

/** Points. The bell over the sample, read at the size the redesign draws it. */
const BELL_SIZE = 34;

/** Points. The square the word emi stands in, which is how the phone draws an application. */
const TILE = 34;

interface Props {
  /** Nothing at all until she presses one of the three. */
  readonly chosen: ReminderLead | undefined;
  readonly onChoose: (lead: ReminderLead) => void;
  /** "Turn on reminders", which waits for a choice. */
  readonly onRemind: () => void;
  /** "Not now" and Skip. Both go on, write nothing and ask the phone nothing. */
  readonly onNotNow: () => void;
  readonly onBack: () => void;
}

/**
 * The reminder, at the end of the questions. The words she would read on her lock screen stand at
 * the top, before anything is asked, so she agrees to the words and not to an idea of them.
 *
 * Nothing is chosen until she presses a moment, and "Turn on reminders" waits for one. The phone's own
 * permission dialog comes only after she presses it.
 */
export function Reminder({ chosen, onChoose, onRemind, onNotNow, onBack }: Props): ReactNode {
  return (
    <OnboardingScreen
      above={<ThePreview />}
      actionIsReady={chosen !== undefined}
      actionLabel={firstRunCopy.reminder.action}
      lines={[]}
      onAction={onRemind}
      onBack={onBack}
      onSkip={onNotNow}
      onWayPast={onNotNow}
      question={firstRunCopy.reminder.question}
      screen="reminder"
      standsOnTheSheet={false}
      title={firstRunCopy.reminder.title}
      wayPastLabel={firstRunCopy.reminder.notNow}
      wayPastSits="underTheAction"
    >
      <View style={styles.answer}>
        {chosen === undefined ? null : (
          <Text style={styles.line} testID={reminderLineTestID}>
            {reminderLines[chosen]}
          </Text>
        )}
        <View style={styles.choices}>
          {reminderChoices.map((lead) => (
            <Chip
              isChosen={chosen === lead}
              key={lead}
              label={reminderLabels[lead]}
              onPress={() => {
                onChoose(lead);
              }}
              testID={reminderTestID(lead)}
            />
          ))}
        </View>
      </View>
    </OnboardingScreen>
  );
}

/** The notification as the lock screen would draw it, with the words the phone will raise. */
function ThePreview(): ReactNode {
  return (
    <View style={styles.preview} testID={reminderPreviewTestID}>
      <View style={styles.bell}>
        <Icon colour={colour.washAmber} name="bell" size={BELL_SIZE} />
      </View>
      <View style={styles.banner}>
        <View style={styles.tile}>
          <Text style={styles.tileWord}>{firstRunCopy.reminder.tile}</Text>
        </View>
        <View style={styles.bannerWords}>
          <Text style={styles.bannerTitle}>{firstRunCopy.reminder.name}</Text>
          <Text style={styles.bannerLine} testID={reminderPreviewWordsTestID}>
            {reminderNotificationWords}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  answer: { alignItems: 'center', gap: space.spaceLg },
  banner: {
    alignItems: 'center',
    backgroundColor: colour.card,
    borderRadius: radius.lg,
    flexDirection: 'row',
    gap: space.spaceMd,
    paddingHorizontal: space.spaceLg,
    paddingVertical: space.spaceMd,
  },
  bannerLine: { color: colour.text, ...textStyle('body-sm') },
  bannerTitle: { color: colour.text, ...textStyle('label-md') },
  bannerWords: { flexShrink: 1 },
  bell: { alignItems: 'center' },
  choices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.spaceSm,
    justifyContent: 'center',
  },
  line: {
    color: colour.secondaryText,
    textAlign: 'center',
    ...textStyle('body-lg'),
  },
  preview: {
    backgroundColor: colour.darkCard,
    borderRadius: radius.xxl,
    gap: space.spaceMd,
    marginBottom: space.spaceXl,
    paddingHorizontal: space.spaceLg,
    paddingVertical: space.spaceXl,
  },
  tile: {
    alignItems: 'center',
    backgroundColor: colour.accent,
    borderRadius: radius.sm,
    height: TILE,
    justifyContent: 'center',
    width: TILE,
  },
  tileWord: { color: colour.onAccent, ...textStyle('label-md') },
});
