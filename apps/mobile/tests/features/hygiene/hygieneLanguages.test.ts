import { english } from '../../../src/language/english';
import { russian } from '../../../src/language/russian';
import { spanish } from '../../../src/language/spanish';

/**
 * Issues 304 and 305: every word of the hygiene pages is in English, Spanish and Russian, and the Spanish
 * and Russian words are a translation rather than a copy of the English.
 */

const hygieneKeys = (Object.keys(english) as (keyof typeof english)[]).filter((key) =>
  key.startsWith('hygiene.'),
);

describe('the hygiene words', () => {
  it('should hold every line of eight products, the four section titles and How to choose', () => {
    // Eight products of seventeen lines each, the heading, four section titles, and the How to
    // choose heading with a title and a text for each of its six factors.
    expect(hygieneKeys).toHaveLength(8 * 17 + 5 + 1 + 6 * 2);
  });

  it.each([
    ['Spanish', spanish],
    ['Russian', russian],
  ] as const)('should carry every hygiene line in %s, translated', (_language, catalogue) => {
    for (const key of hygieneKeys) {
      const said = catalogue[key];

      expect(typeof said).toBe('string');
      expect(String(said).length).toBeGreaterThan(0);
      expect(said).not.toBe(english[key]);
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
