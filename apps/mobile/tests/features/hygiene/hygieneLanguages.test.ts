import { english } from '../../../src/language/english';
import { russian } from '../../../src/language/russian';
import { spanish } from '../../../src/language/spanish';

/**
 * Issues 304, 305 and 306: every word of the hygiene pages is in English, Spanish and Russian, and the Spanish
 * and Russian words are a translation rather than a copy of the English.
 */

const hygieneKeys = (Object.keys(english) as (keyof typeof english)[]).filter(
  (key) => key.startsWith('hygiene.') || key.startsWith('sex.periodSuggestion.'),
);

/** "No" is the same word in English and Spanish, so these three answers are not a copy. */
const sameInSpanish: readonly string[] = [
  'hygiene.quiz.reusable.no',
  'hygiene.quiz.sex.no',
  'hygiene.quiz.sport.no',
];

describe('the hygiene words', () => {
  it('should hold every line of eight products, the section titles, How to choose and the quiz', () => {
    // Eight products of seventeen lines each, the heading, four section titles, the How to choose
    // heading with a title and a text for each of its six factors, and the 39 lines of the quiz, and the five lines of the sheet on the Sex page.
    expect(hygieneKeys).toHaveLength(8 * 17 + 5 + 1 + 6 * 2 + 39 + 5);
  });

  it.each([
    ['Spanish', spanish],
    ['Russian', russian],
  ] as const)('should carry every hygiene line in %s, translated', (_language, catalogue) => {
    for (const key of hygieneKeys) {
      const said = catalogue[key];

      expect(typeof said).toBe('string');
      expect(String(said).length).toBeGreaterThan(0);
      if (!(catalogue === spanish && sameInSpanish.includes(key))) {
        expect(said).not.toBe(english[key]);
      }
    }
  });

  it('should name the sections in Russian as the feedback did', () => {
    expect(russian['hygiene.section.suits']).toBe('Кому подходит');
    expect(russian['hygiene.section.advantages']).toBe('Преимущества');
    expect(russian['hygiene.section.disadvantages']).toBe('Недостатки');
    expect(russian['highlight.hygieneProducts.title']).toBe('Средства гигиены');
  });

  it('should name How to choose in Spanish and Russian', () => {
    expect(spanish['hygiene.choose.heading']).toBe('Cómo elegir');
    expect(russian['hygiene.choose.heading']).toBe('Как выбрать');
  });
});

describe('the quiz words', () => {
  it('should name the quiz in Spanish and Russian, with no Russian word the claims scan refuses', () => {
    expect(spanish['hygiene.quiz.title']).toBe('Encuentra un producto para probar');
    expect(russian['hygiene.quiz.title']).toBe('Подберите средство');
    expect(String(russian['hygiene.quiz.disclaimer'])).toContain('совет врача');
  });
});
