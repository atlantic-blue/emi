import {
  type FinishedQuiz,
  type QuizChoice,
  SUGGESTION_COUNT,
  isFinished,
  quizChoices,
  suggestProducts,
} from '../../../src/features/hygiene/quiz';
import { english } from '../../../src/language/english';

/**
 * Issue 306: the rule that turns four answers into two products to read about. It is a suggestion,
 * so every result names two different products, never one she uses now, and every reason is a
 * line of the catalogue.
 */

function anAnswer(overrides: Partial<FinishedQuiz> = {}): FinishedQuiz {
  return { now: 'other', sex: 'no', sport: 'no', reusable: 'either', ...overrides };
}

function slugsOf(answers: FinishedQuiz): readonly string[] {
  return suggestProducts(answers).map((suggestion) => suggestion.slug);
}

function everyAnswer(): FinishedQuiz[] {
  return quizChoices.now.flatMap((now: QuizChoice<'now'>) =>
    quizChoices.sex.flatMap((sex: QuizChoice<'sex'>) =>
      quizChoices.sport.flatMap((sport: QuizChoice<'sport'>) =>
        quizChoices.reusable.map((reusable: QuizChoice<'reusable'>) => ({
          now,
          sex,
          sport,
          reusable,
        })),
      ),
    ),
  );
}

describe('the quiz suggestion', () => {
  it('should suggest the disc and the cup for the answers the result board draws', () => {
    const answers = anAnswer({ now: 'pads', sex: 'sometimes', sport: 'often', reusable: 'yes' });

    expect(suggestProducts(answers)).toEqual([
      { slug: 'menstrual-disc', why: 'hygiene.quiz.why.discSometimes' },
      { slug: 'menstrual-cup', why: 'hygiene.quiz.why.cupSport' },
    ]);
    expect(english['hygiene.quiz.why.discSometimes']).toBe(
      'You said you sometimes have sex during your period. Some people wear a disc then.',
    );
  });

  it('should give the reason for sex often when she has sex often', () => {
    expect(suggestProducts(anAnswer({ sex: 'often' }))[0]).toEqual({
      slug: 'menstrual-disc',
      why: 'hygiene.quiz.why.discOften',
    });
  });

  it('should suggest the sponge after the disc when she already uses a disc', () => {
    expect(slugsOf(anAnswer({ now: 'cupOrDisc', sex: 'sometimes' }))).toEqual(['sponge', 'pad']);
  });

  it('should suggest a tampon for sport when she does not want a product to use again', () => {
    expect(suggestProducts(anAnswer({ sport: 'sometimes', reusable: 'no' }))[0]).toEqual({
      slug: 'tampon',
      why: 'hygiene.quiz.why.tamponSport',
    });
  });

  it('should suggest the cup and period underwear when she only wants to use it again', () => {
    expect(slugsOf(anAnswer({ reusable: 'yes' }))).toEqual(['menstrual-cup', 'period-underwear']);
  });

  it('should fall back to a pad and a tampon, with their summaries, when no answer points', () => {
    expect(suggestProducts(anAnswer())).toEqual([
      { slug: 'pad', why: 'hygiene.pad.summary' },
      { slug: 'tampon', why: 'hygiene.tampon.summary' },
    ]);
  });

  it('should not read "Rather not say" as a yes', () => {
    expect(slugsOf(anAnswer({ sex: 'ratherNotSay', sport: 'ratherNotSay' }))).toEqual([
      'pad',
      'tampon',
    ]);
  });

  it.each(everyAnswer())(
    'should name two different products she does not use now, for %o',
    (answers) => {
      const slugs = slugsOf(answers);
      const inUse: Readonly<Record<QuizChoice<'now'>, readonly string[]>> = {
        pads: ['pad', 'panty-liner'],
        tampons: ['tampon'],
        cupOrDisc: ['menstrual-cup', 'menstrual-disc'],
        underwear: ['period-underwear'],
        other: [],
      };

      expect(slugs).toHaveLength(SUGGESTION_COUNT);
      expect(new Set(slugs).size).toBe(SUGGESTION_COUNT);
      expect(slugs.filter((slug) => inUse[answers.now].includes(slug))).toEqual([]);
      if (answers.reusable === 'no') {
        expect(
          slugs.filter((slug) =>
            ['menstrual-cup', 'reusable-cloth-pad', 'period-underwear'].includes(slug),
          ),
        ).toEqual([]);
      }
      for (const { why } of suggestProducts(answers)) {
        expect(typeof english[why]).toBe('string');
      }
    },
  );

  it('should hold a quiz unfinished until all four questions have an answer', () => {
    expect(isFinished({})).toBe(false);
    expect(isFinished({ now: 'pads', sex: 'no', sport: 'no' })).toBe(false);
    expect(isFinished(anAnswer())).toBe(true);
  });
});
