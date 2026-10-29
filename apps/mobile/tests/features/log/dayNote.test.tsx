import { join } from 'node:path';

import { type DayRecord, longestNote } from '@emi/crypto';
import { addDays } from '@emi/cycle';
import { tabTestID } from '@emi/ui';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { AccessibilityInfo } from 'react-native';

import { readDayLog } from '../../../src/data/dayLogRepository';
import { daySheetLineTestID } from '../../../src/features/calendar/DaySheet';
import { dayTestID } from '../../../src/features/calendar/CycleMonth';
import { exportActionTestID, exportHeldTestID } from '../../../src/features/export/ExportScreen';
import { exportFileStem } from '../../../src/features/export/files';
import { dayNoteCopy, dayNoteFieldTestID } from '../../../src/features/log/DayNote';
import { logHeaderLeaveTestID } from '../../../src/features/log/LogHeader';
import {
  logFlowDoneTestID,
  logFlowFootDoneTestID,
  logFlowSavedTestID,
} from '../../../src/features/log/LogFlow';
import {
  deleteActionTestID,
  deletedScreenTestID,
} from '../../../src/features/settings/DeleteEverything';
import {
  settingsDeleteTestID,
  settingsExportTestID,
} from '../../../src/features/settings/SettingsScreen';
import { rowsHeld } from '../../../src/services/vault/wipe';
import { resetExpoSqlite } from '../../data/expoSqlite';
import { fileOnThePhone, resetExpoFileSystem } from '../../fixtures/expoFileSystem';
import { resetExpoLocalAuthentication } from '../../fixtures/expoLocalAuthentication';
import { resetExpoSecureStore } from '../../fixtures/expoSecureStore';
import { resetExpoSharing } from '../../fixtures/expoSharing';
import { aBleedingDay, dayOf, herDatabase, herPhoneHolds } from '../../fixtures/herPhone';
import { herVault } from '../../fixtures/herVault';

jest.mock('expo-sqlite', () => jest.requireActual('../../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../../fixtures/expoCrypto'));
jest.mock('expo-local-authentication', () =>
  jest.requireActual('../../fixtures/expoLocalAuthentication'),
);
jest.mock('expo-file-system', () => jest.requireActual('../../fixtures/expoFileSystem'));
jest.mock('expo-sharing', () => jest.requireActual('../../fixtures/expoSharing'));

/**
 * The note in the day entry: she writes her own thoughts on a day, and the day keeps them sealed
 * beside everything else she logged. She reads the note when she opens the day again, the month
 * names it, the export carries it, and the delete takes it with the rest.
 */

const appDirectory = join(__dirname, '..', '..', '..', 'src', 'app');

const whenSheOpensIt = new Date('2026-10-12T12:00:00.000Z');
const today = dayOf(whenSheOpensIt);
const thatDay = addDays(today, -4);

const herNote = 'Tired after work. A long walk in the evening helped, and I slept well.';

async function herPhone(days: readonly DayRecord[] = [aBleedingDay(thatDay)]): Promise<void> {
  await herPhoneHolds(whenSheOpensIt, days, 28, 5);
}

async function sheOpens(url: string): Promise<void> {
  await renderRouter(appDirectory, { initialUrl: url });
}

async function shePresses(testID: string): Promise<void> {
  await fireEvent.press(screen.getByTestId(testID));
}

async function sheWrites(note: string): Promise<void> {
  await fireEvent.changeText(screen.getByTestId(dayNoteFieldTestID), note);
}

async function sheLeavesTheBox(): Promise<void> {
  await fireEvent(screen.getByTestId(dayNoteFieldTestID), 'endEditing');
}

function theDayOnHerPhone(day: string): DayRecord | undefined {
  const held = readDayLog(herDatabase(), day);

  return held === undefined ? undefined : herVault().open(held.payload);
}

function theBoxHolds(): unknown {
  return screen.getByTestId(dayNoteFieldTestID).props.value;
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(whenSheOpensIt);
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  resetExpoSqlite();
  resetExpoSecureStore();
  resetExpoFileSystem();
  resetExpoSharing();
  resetExpoLocalAuthentication();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('the note on a day she lived', () => {
  it('is a visible field with its own heading and an invitation to write', async () => {
    await herPhone();
    await sheOpens(`/day/${thatDay}`);

    expect(screen.getByText(dayNoteCopy.title)).toBeTruthy();
    expect(screen.getByTestId(dayNoteFieldTestID).props.placeholder).toBe(dayNoteCopy.placeholder);
    expect(theBoxHolds()).toBe('');
  });

  it('is saved sealed with the day, beside the flow it already held', async () => {
    await herPhone();
    await sheOpens(`/day/${thatDay}`);
    await sheWrites(herNote);
    await sheLeavesTheBox();

    const held = readDayLog(herDatabase(), thatDay);

    expect(new TextDecoder().decode(held?.payload)).not.toContain('slept well');
    expect(theDayOnHerPhone(thatDay)).toMatchObject({ flow: 'medium', note: herNote });
    expect(held?.revision).toBe(2);
  });

  it('shows in the field when she opens the day again', async () => {
    await herPhone();
    await sheOpens(`/day/${thatDay}`);
    await sheWrites(herNote);
    await sheLeavesTheBox();
    await shePresses(logHeaderLeaveTestID);

    await sheOpens(`/day/${thatDay}`);

    expect(theBoxHolds()).toBe(herNote);
    expect(screen.getByTestId(logFlowSavedTestID)).toBeTruthy();
  });

  it('is saved when she presses Done before she leaves the box', async () => {
    await herPhone();
    await sheOpens(`/day/${thatDay}`);
    await sheWrites(herNote);
    await shePresses(logFlowFootDoneTestID);

    expect(theDayOnHerPhone(thatDay)?.note).toBe(herNote);
  });

  it('writes nothing when she leaves the box as she found it', async () => {
    await herPhone();
    await sheOpens(`/day/${thatDay}`);
    await sheLeavesTheBox();
    await shePresses(logFlowFootDoneTestID);

    expect(readDayLog(herDatabase(), thatDay)?.revision).toBe(1);
  });

  it('writes nothing for a box that holds only spaces', async () => {
    await herPhone();
    await sheOpens(`/day/${thatDay}`);
    await sheWrites('   ');
    await sheLeavesTheBox();
    await shePresses(logFlowFootDoneTestID);

    expect(readDayLog(herDatabase(), thatDay)?.revision).toBe(1);
  });

  it('comes off the day when she empties the box, and the flow stays', async () => {
    await herPhone([{ ...aBleedingDay(thatDay), note: herNote }]);
    await sheOpens(`/day/${thatDay}`);

    expect(theBoxHolds()).toBe(herNote);

    await sheWrites('');
    await sheLeavesTheBox();

    const day = theDayOnHerPhone(thatDay);

    expect(day?.flow).toBe('medium');
    expect(day !== undefined && 'note' in day).toBe(false);
  });

  it('stops at the longest note a day can hold', async () => {
    await herPhone();
    await sheOpens(`/day/${thatDay}`);

    expect(screen.getByTestId(dayNoteFieldTestID).props.maxLength).toBe(longestNote);
    expect(longestNote).toBe(2000);
  });

  it('is never sent off the phone when she writes it', async () => {
    const sent = jest.spyOn(global, 'fetch').mockImplementation(() => {
      throw new Error('the note left the phone');
    });
    await herPhone();
    await sheOpens(`/day/${thatDay}`);
    await sheWrites(herNote);
    await sheLeavesTheBox();
    await shePresses(logFlowFootDoneTestID);

    expect(theDayOnHerPhone(thatDay)?.note).toBe(herNote);
    expect(sent).not.toHaveBeenCalled();
  });
});

describe('the note on today', () => {
  it('is written from the log tab on a day with nothing else in it', async () => {
    await herPhone();
    await sheOpens('/log');
    await sheWrites(herNote);
    await shePresses(logFlowDoneTestID);

    expect(theDayOnHerPhone(today)).toEqual({
      day: today,
      note: herNote,
      recordedAt: whenSheOpensIt.toISOString(),
    });
  });
});

describe('the note after the day entry', () => {
  it('is named on the card of that day in the month', async () => {
    await herPhone([{ ...aBleedingDay(thatDay), note: herNote }]);
    await sheOpens('/calendar');
    await shePresses(dayTestID(thatDay));

    expect(screen.getByTestId(daySheetLineTestID)).toHaveTextContent(/a note/);
  });

  it('is in both files of the export, word for word', async () => {
    await herPhone();
    await sheOpens(`/day/${thatDay}`);
    await sheWrites(herNote);
    await sheLeavesTheBox();
    await shePresses(logFlowFootDoneTestID);

    await shePresses(tabTestID('settings/index'));
    await shePresses(settingsExportTestID);
    await shePresses(exportActionTestID);
    await waitFor(() => expect(screen.getByTestId(exportHeldTestID)).toBeTruthy());

    const stem = exportFileStem(whenSheOpensIt);

    expect(fileOnThePhone(`${stem}.html`)).toContain(herNote);
    expect(fileOnThePhone(`${stem}.json`)).toContain(JSON.stringify(herNote));
  });

  it('goes with everything else when she deletes her data', async () => {
    await herPhone();
    await sheOpens(`/day/${thatDay}`);
    await sheWrites(herNote);
    await sheLeavesTheBox();
    await shePresses(logFlowFootDoneTestID);

    expect(theDayOnHerPhone(thatDay)?.note).toBe(herNote);

    await shePresses(tabTestID('settings/index'));
    await shePresses(settingsDeleteTestID);
    await shePresses(deleteActionTestID);

    expect(screen.getByTestId(deletedScreenTestID)).toBeTruthy();
    expect(theDayOnHerPhone(thatDay)).toBeUndefined();
    expect(rowsHeld(herDatabase())).toBe(0);
  });
});
