import { words } from '../../language';
import { patternsNeedCycles } from './patternsRead';

/**
 * What Emi says about the symptoms that came back before it has read enough to name one.
 *
 * Two screens say it: the Insights screen, and the waiting section of the screen she opens. It
 * lives here rather than in either of them, so a woman reads the same sentence in both places and
 * nobody keeps two copies of it in step.
 *
 * The count of her complete cycles is named, because a woman who is told to wait deserves to know
 * how long.
 */

/** The sentence, in the two parts the screen she opens draws it as. */
export interface PatternsWaiting {
  /** What Emi needs before it names anything. */
  readonly needs: string;
  /** How far off she is, or nothing at all where the sentence above carries no count. */
  readonly read?: string;
}

export function patternsWaiting(completeCycles: number): PatternsWaiting {
  // Enough cycles to name one, and nothing came back in them. The count is no longer the reason
  // she is waiting, so naming it would answer a question she is not asking.
  if (completeCycles >= patternsNeedCycles) {
    return { needs: words('history.nothingRepeats') };
  }

  return {
    needs: words('history.patternsNeed', undefined, { needs: patternsNeedCycles }),
    read: words('history.patternsComplete', completeCycles),
  };
}

/** The same thing as one sentence, which is how the Insights screen draws it. */
export function patternsWaitingSentence(completeCycles: number): string {
  const said = patternsWaiting(completeCycles);

  return said.read === undefined ? said.needs : `${said.needs} ${said.read}`;
}
