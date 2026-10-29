import { type CyclePhaseDays, type ForecastResult, daysBetween } from '@emi/cycle';
import { ringGeometry } from '@emi/tokens';

import type { RingInput } from '../cycle/ringInput';

/**
 * How long until a range of days, counted from today to each end of it. A forecast never names one
 * day, so a countdown is a range, the open end of one, or the last day of one.
 */
export type Countdown =
  | { readonly kind: 'in'; readonly fromDays: number; readonly toDays: number }
  | { readonly kind: 'within'; readonly toDays: number }
  | { readonly kind: 'today' };

/** An ovulation arc that has begun is not counted down to, so that countdown never reaches today. */
export type OvulationCountdown = Exclude<Countdown, { readonly kind: 'today' }>;

/** What the ring of Today counts down to. Each part is absent where there is nothing true to say. */
export interface RingCountdown {
  readonly nextPeriod?: Countdown;
  readonly ovulation?: OvulationCountdown;
}

export interface RingCountdownFrom {
  readonly forecast: ForecastResult;
  readonly ring: RingInput;
  readonly phaseDays: CyclePhaseDays | undefined;
  readonly today: string;
}

function countdownBetween(fromDays: number, toDays: number): Countdown | undefined {
  if (toDays < 0) {
    return undefined;
  }
  if (toDays === 0) {
    return { kind: 'today' };
  }

  return fromDays > 0 && fromDays < toDays
    ? { fromDays, kind: 'in', toDays }
    : { kind: 'within', toDays };
}

/**
 * The next period is the range the forecast gives, which is the range the card under the ring
 * names. Nothing during her period, and nothing once the range has passed, where the card says she
 * is late.
 */
function untilHerNextPeriod({ forecast, ring, today }: RingCountdownFrom): Countdown | undefined {
  if (forecast.start === undefined || ringGeometry(ring).phase === 'period') {
    return undefined;
  }

  return countdownBetween(
    daysBetween(today, forecast.start.from),
    daysBetween(today, forecast.start.to),
  );
}

/**
 * The estimated ovulation is counted to the ovulation arc the ring draws, so the words and the arc
 * name the same days. Nothing once that arc has begun, because the estimate may then be behind her.
 */
function untilOvulation({ ring, phaseDays }: RingCountdownFrom): OvulationCountdown | undefined {
  if (phaseDays === undefined || phaseDays.ovulation.to < phaseDays.ovulation.from) {
    return undefined;
  }

  const fromDays = phaseDays.ovulation.from - ring.day;
  const toDays = phaseDays.ovulation.to - ring.day;
  if (fromDays <= 0) {
    return undefined;
  }

  return fromDays < toDays ? { fromDays, kind: 'in', toDays } : { kind: 'within', toDays };
}

export function ringCountdownFor(from: RingCountdownFrom): RingCountdown {
  const nextPeriod = untilHerNextPeriod(from);
  const ovulation = untilOvulation(from);

  return {
    ...(nextPeriod === undefined ? {} : { nextPeriod }),
    ...(ovulation === undefined ? {} : { ovulation }),
  };
}
