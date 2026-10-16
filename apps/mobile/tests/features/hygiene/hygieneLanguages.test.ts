import { english } from '../../../src/language/english';
import { russian } from '../../../src/language/russian';
import { spanish } from '../../../src/language/spanish';

/**
 * Issue 304: every word of the hygiene pages is in English, Spanish and Russian, and the Spanish
 * and Russian words are a translation rather than a copy of the English.
 */

const hygieneKeys = (Object.keys(english) as (keyof typeof english)[]).filter((key) =>
  key.startsWith('hygiene.'),
);

describe('the hygiene words', () => {
  it('should hold every line of eight products and the four section titles', () => {
    // Eight products of seventeen lines each, the heading and four section titles.
    expect(hygieneKeys).toHaveLength(8 * 17 + 5);
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
});
