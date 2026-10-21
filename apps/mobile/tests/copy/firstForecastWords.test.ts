import { english } from '../../src/language/english';
import { russian } from '../../src/language/russian';
import { spanish } from '../../src/language/spanish';
import type { Words } from '../../src/language/words';

/**
 * The first forecast and the screen after it, in the meaning the Russian review asked for: the
 * dates are when her period may start, the card says why there is more than one date and which
 * cycles made them, and no confidence word is left on either screen.
 */

const catalogues = { en: english, es: spanish, ru: russian } as const;

function formsOf(held: Words | undefined): string[] {
  if (held === undefined) {
    return [];
  }

  return typeof held === 'string' ? [held] : Object.values(held);
}

function wordsUnder(catalogue: Readonly<Record<string, Words>>, prefix: string): string[] {
  return Object.entries(catalogue)
    .filter(([key]) => key.startsWith(prefix))
    .flatMap(([, held]) => formsOf(held));
}

describe('the words of the first forecast and of the screen after it', () => {
  it('titles the forecast as the start of her period, in all three languages', () => {
    expect(english['onboarding.firstForecast.title']).toBe('Your period may start');
    expect(spanish['onboarding.firstForecast.title']).toBe('Tu regla puede empezar');
    expect(russian['onboarding.firstForecast.title']).toBe('Месячные могут начаться');
  });

  it('asks why there is more than one date, in all three languages', () => {
    expect(english['onboarding.firstForecast.why.title']).toBe('Why more than one date?');
    expect(spanish['onboarding.firstForecast.why.title']).toBe('¿Por qué más de una fecha?');
    expect(russian['onboarding.firstForecast.why.title']).toBe('Почему несколько дат?');
  });

  it('has no sentence left that reports how many complete cycles Emi has read', () => {
    for (const catalogue of Object.values(catalogues)) {
      expect(Object.keys(catalogue)).not.toContain('onboarding.firstForecast.why.read');
    }
  });

  it('carries no confidence word on either screen, in any of the three languages', () => {
    const sureWords = {
      en: /confiden|how sure/i,
      es: /confianza/i,
      ru: /уверен/i,
    } as const;

    for (const [language, catalogue] of Object.entries(catalogues)) {
      const read = [
        ...wordsUnder(catalogue, 'onboarding.firstForecast.'),
        ...wordsUnder(catalogue, 'onboarding.whatEmiDoes.'),
      ].join('\n');

      expect({ language, sure: sureWords[language as keyof typeof sureWords].test(read) }).toEqual({
        language,
        sure: false,
      });
    }
  });

  it('names the Russian log with one word, on the tab and on the screen after the forecast', () => {
    expect(russian['tab.log']).toBe('Дневник');
    expect(russian['onboarding.whatEmiDoes.log.title']).toBe(russian['tab.log']);
    expect(wordsUnder(russian, 'onboarding.whatEmiDoes.log.').join('\n')).not.toMatch(
      /Ваша запись/,
    );
  });
});
