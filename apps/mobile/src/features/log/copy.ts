import type { DayRecord } from '@emi/crypto';
import { findSymptom } from '@emi/cycle';

import { words } from '../../language';
import { hadSex } from '../sex/hadSex';
import { flowLabel } from './FlowPicker';
import { symptomName } from './symptomName';

/** The title of the day entry, which always opens on today. */
export const logTitleToday = words('log.title.today');

/**
 * The words of the unexpected bleeding control. Two rules matter more here than anywhere else in
 * the product. Emi gives her no advice, because mid cycle bleeding is a question for a person who
 * can examine her and Emi cannot. And Emi raises no alarm, because the record is the thing she came
 * to make and a warning over it would make her put the phone down instead.
 */
export const unexpectedBleedingCopy = {
  invitation: words('log.unexpected.invitation'),
  mark: words('log.unexpected.mark'),
  marked: words('log.unexpected.marked'),
} as const;

/**
 * Everything one day holds, in the order a row names it, each one in her own words.
 *
 * The flow comes first because it is the thing she opens the log for. A measurement is named and
 * never read out, because the row says what she marked and the day itself says what she wrote.
 */
function theMarksOn(record: DayRecord): string[] {
  const named: string[] = [];

  if (record.flow !== undefined) {
    named.push(
      record.flow === 'none'
        ? words('home.loggedToday.noFlow')
        : words('home.loggedToday.flow', undefined, {
            flow: flowLabel[record.flow].toLowerCase(),
          }),
    );
  }

  for (const slug of [...(record.symptoms ?? []), ...(record.moods ?? [])]) {
    if (findSymptom(slug) !== undefined) {
      named.push(symptomName(slug).toLowerCase());
    }
  }

  if (record.energy !== undefined) {
    named.push(words('home.loggedToday.energy'));
  }

  if (record.temperatureCelsius !== undefined) {
    named.push(words('home.loggedToday.temperature'));
  }

  if (record.weightKilograms !== undefined) {
    named.push(words('home.loggedToday.weight'));
  }

  if (record.note !== undefined && record.note.trim().length > 0) {
    named.push(words('home.loggedToday.note'));
  }

  const sex = theSexMarkOn(record);
  if (sex !== undefined) {
    named.push(sex);
  }

  return named;
}

/**
 * The Sex page as one mark. Her answer to "Did you have sex?" names it when she gave one, and the
 * other two name it only on a day without that answer.
 */
function theSexMarkOn(record: DayRecord): string | undefined {
  if (record.sex !== undefined) {
    return hadSex(record) ? words('home.loggedToday.sex') : words('home.loggedToday.noSex');
  }

  if (record.sexDrive !== undefined) {
    return words('home.loggedToday.sexDrive');
  }

  return record.orgasm === undefined ? undefined : words('home.loggedToday.orgasm');
}

/**
 * The marks as one sentence. A comma separates a list in all three languages Emi is written in, so
 * the only part the catalogue has to hold is the word before the last mark.
 */
function saidTogether(named: readonly string[], last: string): string {
  const before = named.slice(0, -1).join(', ');

  return before.length === 0
    ? last
    : words('home.loggedToday.andTheLast', undefined, { last, said: before });
}

/**
 * What she marked on one day, as one line, and nothing at all where she marked nothing. Two
 * screens read a day back to her, the one she opens and the month, so the absent case is decided
 * once here rather than once in each of them.
 */
export function whatSheMarkedOn(record: DayRecord | undefined): string | undefined {
  const named = record === undefined ? [] : theMarksOn(record);
  const last = named[named.length - 1];

  if (last === undefined) {
    return undefined;
  }

  const said = saidTogether(named, last);

  return said.charAt(0).toUpperCase() + said.slice(1);
}
