import { phasesOf } from '../../src/features/cycle/ringInput';

/**
 * The four phase boundaries the ring is handed. The application works these out in
 * `features/cycle/ringInput`, and this is the name the ring tests already read them by.
 */
export const phasesFromCycle = phasesOf;
