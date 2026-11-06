import type { DayRecord } from '@emi/crypto';
import { addDays } from '@emi/cycle';
import type { ComponentProps } from 'react';

import { listCycles } from '../../src/data/cycleRepository';
import type { CalendarScreen } from '../../src/features/calendar/CalendarScreen';
import { herMonth } from '../../src/features/calendar/herMonth';
import { theDayPhaseOn } from '../../src/features/calendar/herMonthPhases';
import type { HerReading } from '../../src/features/calendar/theDaySheet';
import { recordedDays } from '../../src/features/cycle/rebuild';
import { daysLogged } from './cycleCache';
import { herVault } from './herVault';

const today = '2026-11-06';
export const theNovember = '2026-11-01';
const month = theNovember;
const herPeriodRuns = 5;
const herPeriodStarts = ['2026-08-14', '2026-09-11', '2026-10-09'];

function herDays(): DayRecord[] {
  return herPeriodStarts.flatMap((start) =>
    Array.from({ length: herPeriodRuns + 1 }, (_unused, offset) => {
      const day = addDays(start, offset);

      return {
        day,
        flow: offset === herPeriodRuns ? ('none' as const) : ('medium' as const),
        recordedAt: `${day}T08:00:00.000Z`,
      };
    }),
  );
}

/** November as a woman with three recorded periods reads it, with every way out doing nothing. */
export function theNovemberSheReads(): ComponentProps<typeof CalendarScreen> {
  const database = daysLogged(herDays(), new Date(`${today}T20:00:00.000Z`));
  const from: HerReading = {
    cycles: listCycles(database),
    records: recordedDays(database, (payload) => herVault().open(payload)),
    today,
    statedCycleLengthDays: 28,
    statedPeriodLengthDays: herPeriodRuns,
  };
  const doNothing = (): undefined => undefined;

  return {
    days: herMonth(from, month),
    month,
    today,
    phaseOn: (day) => theDayPhaseOn(from, day),
    onBack: doNothing,
    onToday: doNothing,
    onPressDay: doNothing,
    onEarlierMonth: doNothing,
    onLaterMonth: doNothing,
    onOpenDay: doNothing,
    onRecordSex: doNothing,
    onRemovePeriodDay: doNothing,
    onEditPeriod: doNothing,
  };
}
