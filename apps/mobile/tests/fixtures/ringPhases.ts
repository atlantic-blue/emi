import type { PhaseSpan } from '@emi/tokens';

import { phasesOf, shapeFromLength } from '../../src/features/cycle/ringInput';

/**
 * The four phase boundaries the ring is handed for a cycle nobody has forecast yet. The
 * application works these out in `features/cycle/ringInput`, and this is the name the ring tests
 * already read them by.
 */
export function phasesFromCycle(lengthDays: number, periodDays: number): PhaseSpan[] {
  return phasesOf(shapeFromLength(lengthDays, periodDays));
}
