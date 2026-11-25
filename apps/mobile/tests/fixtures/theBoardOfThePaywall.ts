import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  addressesLinkedOn,
  prototypeDirectory,
  screenSuffix,
  wordsDrawnOn,
} from '../../../../tools/pipeline/prototype';

/**
 * The approved board of the paywall, read back so the built screen can be held to it.
 *
 * The mockups stage holds every other screen to the parts its drawing places and never to its
 * words, because that stage did not settle the wording. This board did: it was approved with every
 * sentence written out, in three languages, and the sentences are the whole of what App Review
 * reads. So the comparison here reads the words and the two addresses, in the board's order.
 *
 * The amounts on the board are the figures the store quoted on the day it was drawn, so a
 * comparison only holds where the store in front of the screen quotes the same ones.
 *
 * Two boards were approved, one for a woman who has never paid and one for a woman who has, and
 * each is read the same way.
 */

const repositoryRoot = join(__dirname, '..', '..', '..', '..');

export const theBoardOfThePaywall = 'paywall';

/** The second board: the same screen for a woman who paid before, with no free month on it. */
export const theBoardOfThePaywallAfterALapse = 'paywallLapsed';

function theMarkup(board: string): string {
  return readFileSync(join(repositoryRoot, prototypeDirectory, `${board}${screenSuffix}`), 'utf8');
}

/** Every sentence the board writes, in the order it writes them. */
export function theWordsTheBoardWrites(board: string = theBoardOfThePaywall): string[] {
  return wordsDrawnOn(theMarkup(board));
}

/** The two addresses the board presses to. */
export function theAddressesTheBoardPressesTo(board: string = theBoardOfThePaywall): string[] {
  return addressesLinkedOn(theMarkup(board));
}

/**
 * What the screen does not answer for, given the board's sentences and the words the screen drew.
 *
 * The walk keeps its place in what the screen drew, so a sentence found above the sentence ahead of
 * it counts as out of order rather than as present. A board writing no sentence is refused rather
 * than passed, because a comparison of nothing reads exactly like a comparison everything answered.
 */
export function wordsMissingFromTheScreen(
  said: readonly string[],
  drawn: readonly string[],
): string[] {
  if (said.length === 0) {
    throw new Error('a board writing no sentence was compared, and it can refuse nothing');
  }

  const problems: string[] = [];
  let at = 0;
  let after: string | null = null;

  for (const sentence of said) {
    const found = drawn.findIndex((written, where) => where >= at && written === sentence);

    if (found < 0) {
      const where = after === null ? 'anywhere on the screen' : `after "${after}"`;

      problems.push(`the board writes "${sentence}", and the screen draws it nowhere ${where}`);
      continue;
    }

    after = drawn[found] ?? null;
    at = found + 1;
  }

  return problems;
}
