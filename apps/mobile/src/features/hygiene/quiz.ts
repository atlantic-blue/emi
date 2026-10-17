import type { WordKey } from '../../language/words';
import { type ProductSlug, productSummaryKey } from './products';

/**
 * The four questions of "Find a product to try" (issue 306), their answers, and the rule that turns
 * four answers into two products to read about. The rule is a suggestion to read about a product,
 * never advice, and nothing here is saved: the answers live on the quiz screen until she leaves it.
 */

export const quizQuestions = ['now', 'sex', 'sport', 'reusable'] as const;

export type QuizQuestion = (typeof quizQuestions)[number];

export const quizChoices = {
  now: ['pads', 'tampons', 'cupOrDisc', 'underwear', 'other'],
  sex: ['often', 'sometimes', 'no', 'ratherNotSay'],
  sport: ['often', 'sometimes', 'no', 'ratherNotSay'],
  reusable: ['yes', 'no', 'either'],
} as const;

export type QuizChoice<Question extends QuizQuestion> = (typeof quizChoices)[Question][number];

/** Her answers so far. A question she has not answered is left out. */
export type QuizAnswers = { readonly [Question in QuizQuestion]?: QuizChoice<Question> };

/** All four answers, which is what the result needs. */
export type FinishedQuiz = { readonly [Question in QuizQuestion]: QuizChoice<Question> };

/** One product to read about, and the sentence that says why it is on the list. */
export interface Suggestion {
  readonly slug: ProductSlug;
  readonly why: WordKey;
}

/** How many products the result names, as the hygieneQuizResult board draws them. */
export const SUGGESTION_COUNT = 2;

/**
 * The words of each question and each answer, as whole keys, so the scan that proves every key is
 * read can find them in the source.
 */
const questionWords: Readonly<Record<QuizQuestion, WordKey>> = {
  now: 'hygiene.quiz.now.question',
  sex: 'hygiene.quiz.sex.question',
  sport: 'hygiene.quiz.sport.question',
  reusable: 'hygiene.quiz.reusable.question',
};

const choiceWords: {
  readonly [Question in QuizQuestion]: Readonly<Record<QuizChoice<Question>, WordKey>>;
} = {
  now: {
    pads: 'hygiene.quiz.now.pads',
    tampons: 'hygiene.quiz.now.tampons',
    cupOrDisc: 'hygiene.quiz.now.cupOrDisc',
    underwear: 'hygiene.quiz.now.underwear',
    other: 'hygiene.quiz.now.other',
  },
  sex: {
    often: 'hygiene.quiz.sex.often',
    sometimes: 'hygiene.quiz.sex.sometimes',
    no: 'hygiene.quiz.sex.no',
    ratherNotSay: 'hygiene.quiz.sex.ratherNotSay',
  },
  sport: {
    often: 'hygiene.quiz.sport.often',
    sometimes: 'hygiene.quiz.sport.sometimes',
    no: 'hygiene.quiz.sport.no',
    ratherNotSay: 'hygiene.quiz.sport.ratherNotSay',
  },
  reusable: {
    yes: 'hygiene.quiz.reusable.yes',
    no: 'hygiene.quiz.reusable.no',
    either: 'hygiene.quiz.reusable.either',
  },
};

export function questionWord(question: QuizQuestion): WordKey {
  return questionWords[question];
}

export function choiceWord<Question extends QuizQuestion>(
  question: Question,
  choice: QuizChoice<Question>,
): WordKey {
  return (choiceWords[question] as Readonly<Record<QuizChoice<Question>, WordKey>>)[choice];
}

/** Whether every question has an answer. */
export function isFinished(answers: QuizAnswers): answers is FinishedQuiz {
  return quizQuestions.every((question) => answers[question] !== undefined);
}

/** The products she uses now, which the result leaves out because she wants to change. */
const productsInUse: Readonly<Record<QuizChoice<'now'>, readonly ProductSlug[]>> = {
  pads: ['pad', 'panty-liner'],
  tampons: ['tampon'],
  cupOrDisc: ['menstrual-cup', 'menstrual-disc'],
  underwear: ['period-underwear'],
  other: [],
};

/** Products that are only made to use again. A "No" to the last question leaves them out. */
const onlyReusable: readonly ProductSlug[] = [
  'menstrual-cup',
  'reusable-cloth-pad',
  'period-underwear',
];

/** The order the rest of the products fill the list in, each with its own one line summary. */
const fillOrder: readonly ProductSlug[] = [
  'pad',
  'tampon',
  'period-underwear',
  'menstrual-cup',
  'menstrual-disc',
  'sponge',
  'panty-liner',
  'reusable-cloth-pad',
];

function hasSex(answers: FinishedQuiz): boolean {
  return answers.sex === 'often' || answers.sex === 'sometimes';
}

function doesSport(answers: FinishedQuiz): boolean {
  return answers.sport === 'often' || answers.sport === 'sometimes';
}

/** The reason beside a product the answers point at. */
const reasons: Readonly<
  Record<
    | 'cupSport'
    | 'discOften'
    | 'discSometimes'
    | 'reusable'
    | 'spongeOften'
    | 'spongeSometimes'
    | 'tamponSport',
    WordKey
  >
> = {
  cupSport: 'hygiene.quiz.why.cupSport',
  discOften: 'hygiene.quiz.why.discOften',
  discSometimes: 'hygiene.quiz.why.discSometimes',
  reusable: 'hygiene.quiz.why.reusable',
  spongeOften: 'hygiene.quiz.why.spongeOften',
  spongeSometimes: 'hygiene.quiz.why.spongeSometimes',
  tamponSport: 'hygiene.quiz.why.tamponSport',
};

/** The products her answers point at, in the order the rule ranks them, before any is left out. */
function rankedByAnswers(answers: FinishedQuiz): Suggestion[] {
  const often = answers.sex === 'often';
  const ranked: Suggestion[] = [];

  if (hasSex(answers)) {
    ranked.push({
      slug: 'menstrual-disc',
      why: often ? reasons.discOften : reasons.discSometimes,
    });
  }
  if (doesSport(answers)) {
    ranked.push(
      answers.reusable === 'yes'
        ? { slug: 'menstrual-cup', why: reasons.cupSport }
        : { slug: 'tampon', why: reasons.tamponSport },
    );
  }
  if (answers.reusable === 'yes') {
    ranked.push(
      { slug: 'menstrual-cup', why: reasons.reusable },
      { slug: 'period-underwear', why: reasons.reusable },
    );
  }
  if (hasSex(answers)) {
    ranked.push({
      slug: 'sponge',
      why: often ? reasons.spongeOften : reasons.spongeSometimes,
    });
  }

  return ranked;
}

/**
 * Two different products to read about. The rule, in the order it is applied:
 * 1. Sex during her period, often or sometimes: the menstrual disc.
 * 2. Swimming or sport during her period: the menstrual cup when she wants a product to use again,
 *    and a tampon when she does not.
 * 3. A product to use again: the menstrual cup, then period underwear.
 * 4. Sex during her period: the sponge.
 * 5. Then the rest, in a fixed order, each with its own summary as the reason.
 * What she uses now is left out, and a "No" to using a product again leaves out the products only
 * made to use again. The first two different products that are left are the result.
 */
export function suggestProducts(answers: FinishedQuiz): readonly Suggestion[] {
  const leftOut = new Set<ProductSlug>([
    ...productsInUse[answers.now],
    ...(answers.reusable === 'no' ? onlyReusable : []),
  ]);
  const filled = fillOrder.map((slug) => ({ slug, why: productSummaryKey(slug) }));
  const chosen: Suggestion[] = [];

  for (const suggestion of [...rankedByAnswers(answers), ...filled]) {
    const isNew = chosen.every((held) => held.slug !== suggestion.slug);
    if (isNew && !leftOut.has(suggestion.slug) && chosen.length < SUGGESTION_COUNT) {
      chosen.push(suggestion);
    }
  }

  return chosen;
}
