import {
  FERTILE_DAYS_AFTER_OVULATION,
  FERTILE_DAYS_BEFORE_OVULATION,
  LUTEAL_LENGTH_DAYS,
} from '@emi/cycle';
import type { PhaseSpan } from '@emi/tokens';

/**
 * The four phase boundaries the ring is handed, built from the numbers design section 8 publishes:
 * a luteal length counted back from the next period, and a fertile window of five days before
 * ovulation through one day after it.
 *
 * The product's own derivation lands with feature 3, which is why the ring takes the boundaries as
 * its input and works none of this out for itself.
 */
export function phasesFromCycle(lengthDays: number, periodDays: number): PhaseSpan[] {
  const ovulationDay = lengthDays - LUTEAL_LENGTH_DAYS;
  const fertileFrom = ovulationDay - FERTILE_DAYS_BEFORE_OVULATION;
  const fertileTo = Math.min(lengthDays, ovulationDay + FERTILE_DAYS_AFTER_OVULATION);

  // A short cycle runs its fertile window into its period, and a phase never takes a day from the
  // phase before it, so the days that are left over are what each phase gets.
  const period = Math.max(0, Math.min(periodDays, lengthDays));
  const follicularEnds = Math.max(period, fertileFrom - 1);
  const ovulationEnds = Math.max(follicularEnds, fertileTo);

  return [
    { phase: 'period', days: period },
    { phase: 'follicular', days: follicularEnds - period },
    { phase: 'ovulation', days: ovulationEnds - follicularEnds },
    { phase: 'luteal', days: lengthDays - ovulationEnds },
  ];
}
