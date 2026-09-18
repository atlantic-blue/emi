/**
 * Words that carry no information about the thing being described, so a comment built only from
 * these and from the identifier says nothing. The list is deliberately short: every word left out
 * of it makes the echo check more forgiving, never less.
 */
export const wordsThatCarryNothing: readonly string[] = [
  'a',
  'about',
  'after',
  'again',
  'against',
  'all',
  'also',
  'an',
  'and',
  'another',
  'any',
  'anything',
  'are',
  'as',
  'at',
  'be',
  'because',
  'been',
  'before',
  'being',
  'both',
  'but',
  'by',
  'can',
  'could',
  'did',
  'do',
  'does',
  'each',
  'else',
  'ever',
  'every',
  'for',
  'from',
  'had',
  'has',
  'have',
  'he',
  'her',
  'here',
  'hers',
  'herself',
  'him',
  'his',
  'how',
  'i',
  'if',
  'in',
  'into',
  'is',
  'it',
  'its',
  'itself',
  'just',
  'least',
  'less',
  'may',
  'me',
  'might',
  'more',
  'most',
  'much',
  'must',
  'my',
  'never',
  'no',
  'none',
  'nor',
  'not',
  'nothing',
  'of',
  'on',
  'once',
  'one',
  'only',
  'onto',
  'or',
  'other',
  'our',
  'out',
  'over',
  'own',
  'per',
  'rather',
  'same',
  'shall',
  'she',
  'should',
  'so',
  'some',
  'something',
  'such',
  'than',
  'that',
  'the',
  'their',
  'them',
  'then',
  'there',
  'these',
  'they',
  'this',
  'those',
  'through',
  'to',
  'two',
  'under',
  'until',
  'up',
  'us',
  'very',
  'via',
  'was',
  'we',
  'were',
  'what',
  'when',
  'where',
  'which',
  'while',
  'who',
  'whom',
  'will',
  'with',
  'within',
  'without',
  'would',
  'you',
  'your',
];

const carriesNothing = new Set(wordsThatCarryNothing);

/**
 * `fontNameFor` is three words to a reader and one word to a parser, so a boundary between a
 * lowercase letter and a capital becomes a space before anything is split.
 */
export function wordsIn(text: string): string[] {
  return text
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 0);
}

/**
 * A plural and its singular are the same word for this purpose. The stem is crude on purpose: a
 * stem that misses leaves a comment word counted as new, which is the forgiving direction.
 */
export function stem(word: string): string {
  return word.length > 3 && word.endsWith('s') ? word.slice(0, -1) : word;
}

export function meaningfulWords(text: string): string[] {
  return wordsIn(text)
    .filter((word) => !carriesNothing.has(word))
    .map(stem);
}

export interface Echo {
  /** The words of the comment that the signature does not already carry. Empty is the offence. */
  readonly newWords: readonly string[];
  readonly isEcho: boolean;
}

/**
 * A comment earns its place by saying something the signature cannot. This measures that the only
 * way a machine can: every word of the comment is already written in the declaration it sits on,
 * so a reader who read the declaration learns nothing by reading the comment.
 */
export function echoOf(comment: string, signature: string): Echo {
  const carried = new Set(meaningfulWords(signature));
  const newWords = [...new Set(meaningfulWords(comment))].filter((word) => !carried.has(word));

  return { newWords, isEcho: newWords.length === 0 };
}
