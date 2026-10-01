import { words } from '../../language';
import { patternsNeedCycles } from './patternsRead';

/**
 * What Emi says about the symptoms that came back before it has read enough to name one.
 *
 * Two screens say it: the Insights screen, and the waiting section of the screen she opens. It
 * lives here rather than in either of them, so a woman reads the same sentence in both places and
 * nobody has to keep two copies of it in step.
 *
 * The count of her complete cycles is named, because a woman who is told to wait deserves to know
 * how long.
 */
export function patternsWaitingSentence(completeCycles: number): string {
  if (completeCycles >= patternsNeedCycles) {
    return words('history.nothingRepeats');
  }

  return words('history.patternsWaiting', completeCycles, { needs: patternsNeedCycles });
}
