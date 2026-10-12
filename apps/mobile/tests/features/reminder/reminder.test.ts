import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { type ForecastResult, addDays } from '@emi/cycle';

import { migrate } from '../../../src/data/schema';
import { readSetting, settingKeys, writeSetting } from '../../../src/data/settingRepository';
import type { Database } from '../../../src/data/database';
import { english, russian, spanish } from '../../../src/language';
import { logFlow } from '../../../src/features/log/logDay';
import {
  completeFirstRun,
  forecastFromHerAnswers,
} from '../../../src/features/onboarding/firstRun';
import {
  daysBeforeTheRange,
  readReminderLead,
  reminderHour,
  reminderLeads,
  reminderWords,
  whenToRemindHer,
} from '../../../src/features/reminder/reminder';
import { rescheduleHerReminder } from '../../../src/features/reminder/rescheduleHerReminder';
import { settingsRows } from '../../../src/features/settings/SettingsScreen';
import { reminderIdentifier } from '../../../src/services/notifications/localReminder';
import { openTestDatabase } from '../../data/nodeDatabase';
import {
  resetExpoNotifications,
  theRemindersOnThePhone,
  thePhoneWasAnswered,
  theSchedulerRefuses,
} from '../../fixtures/expoNotifications';
import { herProfileVault, herVault } from '../../fixtures/herVault';

jest.mock('expo-notifications', () => jest.requireActual('../../fixtures/expoNotifications'));

/** Midday, away from any change of the clocks, so her calendar reads the same anywhere. */
const now = new Date('2026-05-14T12:00:00.000Z');
const herPeriodStarted = '2026-05-09';
const herCycleLengthDays = 28;

/** The first day of the range she was shown, worked out by the arithmetic the screens read. */
function theFirstDayOfHerRange(periodStartedOn: string = herPeriodStarted): string {
  const forecast = forecastFromHerAnswers({
    periodStartedOn,
    cycleLengthDays: herCycleLengthDays,
  });

  if (forecast.start === undefined) {
    throw new Error('her answers left the arithmetic with no range');
  }

  return forecast.start.from;
}

/** Nine in the morning of her own day, that many days before the day given. */
function nineOClockBefore(day: string, daysBefore: number): Date {
  const [year, month, date] = addDays(day, -daysBefore).split('-').map(Number);

  return new Date(year ?? 0, (month ?? 1) - 1, date ?? 1, 9, 0, 0, 0);
}

/** A phone whose first run is done, with or without a reminder chosen. */
function herPhoneAfterTheHold(reminderLead?: (typeof reminderLeads)[number]): Database {
  const db = openTestDatabase();

  migrate(db);
  completeFirstRun(
    db,
    { day: herVault(), profile: herProfileVault() },
    {
      periodStartedOn: herPeriodStarted,
      cycleLengthDays: herCycleLengthDays,
      ...(reminderLead === undefined ? {} : { reminderLead }),
    },
    now,
  );

  return db;
}

const aForecastWithNoRange: ForecastResult = {
  kind: 'learning',
  completeCycles: 0,
  needsCycles: 2,
};

describe('the reminder is worked out on this phone from the forecast it already holds', () => {
  beforeEach(() => {
    resetExpoNotifications();
  });

  describe('the moment', () => {
    for (const lead of reminderLeads) {
      it(`is nine in the morning, ${String(daysBeforeTheRange[lead])} day(s) before the range, for ${lead}`, () => {
        const forecast = forecastFromHerAnswers({
          periodStartedOn: herPeriodStarted,
          cycleLengthDays: herCycleLengthDays,
        });

        expect(whenToRemindHer(forecast, lead, now)).toEqual(
          nineOClockBefore(theFirstDayOfHerRange(), daysBeforeTheRange[lead]),
        );
      });
    }

    it('counts two days, one day and none, in the order the screen offers them', () => {
      expect(reminderLeads.map((lead) => daysBeforeTheRange[lead])).toEqual([2, 1, 0]);
      expect(reminderHour).toBe(9);
    });

    it('is nothing at all where the forecast has no range yet', () => {
      expect(whenToRemindHer(aForecastWithNoRange, 'twoDaysBefore', now)).toBeUndefined();
    });

    it('is nothing at all where the moment has already gone', () => {
      const forecast = forecastFromHerAnswers({
        periodStartedOn: herPeriodStarted,
        cycleLengthDays: herCycleLengthDays,
      });
      const afterIt = new Date(nineOClockBefore(theFirstDayOfHerRange(), 0).getTime() + 1);

      expect(whenToRemindHer(forecast, 'onTheDay', afterIt)).toBeUndefined();
    });
  });

  describe('the words on the lock screen', () => {
    /** Words that would tell a stranger holding the phone what the reminder is about. */
    const aboutHerBody: Readonly<Record<string, readonly string[]>> = {
      english: [
        'period',
        'bleed',
        'blood',
        'cycle',
        'symptom',
        'cramp',
        'pain',
        'ovulat',
        'fertil',
        'pregnan',
        'pms',
      ],
      spanish: [
        'regla',
        'periodo',
        'período',
        'sangr',
        'ciclo',
        'síntoma',
        'dolor',
        'ovula',
        'fértil',
        'embaraz',
      ],
      russian: [
        'месячн',
        'менстру',
        'кров',
        'цикл',
        'симптом',
        'бол',
        'овуляц',
        'фертил',
        'беремен',
      ],
    };
    const catalogues = { english, spanish, russian };

    for (const [language, catalogue] of Object.entries(catalogues)) {
      it(`never names her body or a symptom, in ${language}`, () => {
        const said = reminderLeads
          .map((lead) => catalogue[`reminder.notification.${lead}`])
          .join(' ')
          .toLowerCase();

        expect(said.length).toBeGreaterThan(0);
        for (const word of aboutHerBody[language] ?? []) {
          expect(said).not.toContain(word);
        }
      });
    }

    it('says when, in words that change with the moment she chose', () => {
      expect(reminderWords).toEqual({
        twoDaysBefore: 'Your forecast starts in two days.',
        oneDayBefore: 'Your forecast starts tomorrow.',
        onTheDay: 'Your forecast starts today.',
      });
    });
  });

  describe('where her choice is kept', () => {
    it('is the setting table, written at the hold with everything else', () => {
      const db = herPhoneAfterTheHold('oneDayBefore');

      expect(readSetting(db, 'reminderLead')).toBe('oneDayBefore');
      expect(readReminderLead(db)).toBe('oneDayBefore');
    });

    it('holds nothing where she said Not now', () => {
      const db = herPhoneAfterTheHold();

      expect(readSetting(db, 'reminderLead')).toBeUndefined();
    });

    it('reads a value it does not offer as no choice at all', () => {
      const db = herPhoneAfterTheHold();

      writeSetting(db, 'reminderLead', 'everyHour');

      expect(readReminderLead(db)).toBeUndefined();
    });
  });

  describe('a reschedule', () => {
    it('puts one reminder on the phone, at the moment the forecast gives, with the words for it', async () => {
      const db = herPhoneAfterTheHold('twoDaysBefore');
      thePhoneWasAnswered('allow');

      expect(await rescheduleHerReminder(db, herProfileVault(), now)).toBe('scheduled');
      expect(theRemindersOnThePhone()).toEqual([
        {
          identifier: reminderIdentifier,
          body: 'Your forecast starts in two days.',
          at: nineOClockBefore(theFirstDayOfHerRange(), 2),
        },
      ]);
    });

    it('moves the reminder when a new period moves the forecast, and leaves one behind', async () => {
      const db = herPhoneAfterTheHold('twoDaysBefore');
      thePhoneWasAnswered('allow');
      await rescheduleHerReminder(db, herProfileVault(), now);

      const later = new Date('2026-05-30T12:00:00.000Z');
      logFlow(db, herVault(), {
        day: '2026-05-30',
        flow: 'medium',
        bleedingIsUnexpected: false,
        now: later,
      });

      expect(await rescheduleHerReminder(db, herProfileVault(), later)).toBe('scheduled');
      expect(theRemindersOnThePhone()).toHaveLength(1);
      expect(theRemindersOnThePhone()[0]?.at).toEqual(
        nineOClockBefore(theFirstDayOfHerRange('2026-05-30'), 2),
      );
    });

    it('schedules nothing and keeps her choice where there is no date to count from', async () => {
      const db = openTestDatabase();
      migrate(db);
      completeFirstRun(
        db,
        { day: herVault(), profile: herProfileVault() },
        { cycleLengthDays: herCycleLengthDays, reminderLead: 'onTheDay' },
        now,
      );
      thePhoneWasAnswered('allow');

      expect(await rescheduleHerReminder(db, herProfileVault(), now)).toBe('no-date-yet');
      expect(theRemindersOnThePhone()).toEqual([]);
      expect(readReminderLead(db)).toBe('onTheDay');
    });

    it('schedules nothing where she chose no reminder', async () => {
      const db = herPhoneAfterTheHold();
      thePhoneWasAnswered('allow');

      expect(await rescheduleHerReminder(db, herProfileVault(), now)).toBe('she-chose-none');
      expect(theRemindersOnThePhone()).toEqual([]);
    });

    it('schedules nothing where the phone said no', async () => {
      const db = herPhoneAfterTheHold('twoDaysBefore');
      thePhoneWasAnswered('refuse');

      expect(await rescheduleHerReminder(db, herProfileVault(), now)).toBe('the-phone-said-no');
      expect(theRemindersOnThePhone()).toEqual([]);
    });

    it('says the scheduler refused rather than raising, so no screen goes down with it', async () => {
      const db = herPhoneAfterTheHold('twoDaysBefore');
      thePhoneWasAnswered('allow');
      theSchedulerRefuses();

      await expect(rescheduleHerReminder(db, herProfileVault(), now)).resolves.toBe(
        'the-scheduler-refused',
      );
    });
  });

  describe('what Settings says about the reminder', () => {
    it('draws no row for it yet, while the first run keeps her choice in the setting table', () => {
      expect(settingsRows).not.toContain('reminder');
      expect(settingKeys).toContain('reminderLead');
    });

    it('no longer says the reminder is not built', () => {
      const source = readFileSync(
        join(__dirname, '..', '..', '..', 'src', 'features', 'settings', 'SettingsScreen.tsx'),
        'utf8',
      );

      expect(source).not.toMatch(/reminder is not built/i);
      expect(source).toMatch(
        /She chooses the reminder in\s+\* the first run and this phone schedules it/,
      );
    });
  });
});

/** Every source file under a directory, read as text. */
function sourcesUnder(
  directory: string,
): readonly { readonly path: string; readonly text: string }[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);

    if (statSync(path).isDirectory()) {
      return sourcesUnder(path);
    }

    return /\.tsx?$/.test(name) ? [{ path, text: readFileSync(path, 'utf8') }] : [];
  });
}

describe('this phone works it out and this phone raises it', () => {
  const source = join(__dirname, '..', '..', '..', 'src');
  const everyFile = sourcesUnder(source);

  it('asks the phone for no push token anywhere in the application', () => {
    const asking = everyFile.filter(({ text }) =>
      /getExpoPushTokenAsync|getDevicePushTokenAsync|addPushTokenListener|registerTaskAsync/.test(
        text,
      ),
    );

    expect(asking.map(({ path }) => path)).toEqual([]);
  });

  it('reaches expo-notifications from one file, which names only the scheduler and the permission', () => {
    const importing = everyFile.filter(({ text }) => text.includes("from 'expo-notifications'"));

    expect(importing.map(({ path }) => path.slice(source.length + 1))).toEqual([
      join('services', 'notifications', 'localReminder.ts'),
    ]);

    const named = /import \{([^}]*)\} from 'expo-notifications'/.exec(
      importing[0]?.text ?? '',
    )?.[1];

    expect(
      (named ?? '')
        .split(',')
        .map((name) => name.trim())
        .filter((name) => name !== '')
        .sort(),
    ).toEqual([
      'SchedulableTriggerInputTypes',
      'cancelScheduledNotificationAsync',
      'getPermissionsAsync',
      'requestPermissionsAsync',
      'scheduleNotificationAsync',
    ]);
  });

  it('opens no connection from the reminder, the scheduler or the screen', () => {
    const reminderFiles = everyFile.filter(({ path }) =>
      /notifications|reminder|Reminder/.test(path),
    );

    expect(reminderFiles.length).toBeGreaterThanOrEqual(4);
    for (const { text } of reminderFiles) {
      expect(text).not.toMatch(/\bfetch\(|XMLHttpRequest|WebSocket|\/sync\//);
    }
  });
});
