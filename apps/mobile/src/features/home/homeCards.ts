import type { Goal } from '@emi/crypto';
import type { Forecast, ForecastResult } from '@emi/cycle';

/**
 * Which of the two cards the home screen draws, from what she asked Emi for at the first run.
 *
 * A card answers a question she asked, so a woman who asked nothing reads the screen she read
 * yesterday. That is the whole rule, and it is here rather than inside the screen so that the two
 * cards cannot drift apart from each other.
 */

/**
 * Whether the fertile window is drawn. She has to have asked for it, and the arithmetic has to
 * have a window to draw: before two cycles are complete there is no median to count ovulation
 * back from, and a window drawn from the length she typed would be a window about her answer.
 *
 * The answer narrows the forecast it was asked about, so the card cannot be drawn from a result
 * that carries no window at all.
 */
export function theFertileWindowIsOffered(
  goals: readonly Goal[] | undefined,
  forecast: ForecastResult,
): forecast is Forecast {
  return (goals ?? []).includes('fertileWindow') && forecast.kind === 'forecast';
}

/**
 * Whether the way to the export is offered as a line of its own. The export is on the screen for
 * everybody, at the foot with the history and the settings. This is the shortcut, and it names
 * her own answer back to her.
 */
export function theRecordForHerDoctorIsOffered(goals: readonly Goal[] | undefined): boolean {
  return (goals ?? []).includes('doctorRecord');
}
