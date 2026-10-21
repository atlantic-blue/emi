import { languages } from '../../src/language/language';
import { catalogueOf } from '../../src/language/words';

/**
 * Issue 323: the guide to a phase gives a short practical tip in each area, and says that everyone
 * is different. A tip is general wellbeing, so it carries no number, which nobody could source, and
 * no more than two sentences, so it reads as a tip and not as a lecture.
 */

const phases = ['period', 'follicular', 'ovulation', 'luteal'] as const;
const areas = ['mood', 'food', 'body', 'training'] as const;

const sentencesIn = (said: string): number => said.split(/[.!?]\s/).length;

describe('the tips of the phase guide', () => {
  it.each(languages)(
    'should give every tip in at most two sentences, with no number, in %s',
    (language) => {
      const catalogue = catalogueOf(language);

      for (const phase of phases) {
        for (const area of areas) {
          const tip = String(catalogue[`phase.guide.${phase}.${area}`]);

          expect(sentencesIn(tip)).toBeLessThanOrEqual(2);
          expect(tip).not.toMatch(/\d/);
        }
      }
    },
  );

  it.each(languages)(
    'should carry one title for each phase and the line that everyone is different, in %s',
    (language) => {
      const catalogue = catalogueOf(language);

      expect(new Set(phases.map((phase) => catalogue[`phase.guide.title.${phase}`])).size).toBe(4);
      expect(String(catalogue['phase.guide.everyone'])).not.toBe('');
    },
  );

  it('should carry the Russian words of the native speaker for the days before the period', () => {
    const russian = catalogueOf('ru');

    expect(russian['phase.guide.title.luteal']).toBe('Перед месячными: что может помочь');
    expect(russian['phase.guide.luteal.mood']).toBe(
      'Может появиться раздражительность или тревога. Если чувствуете перегрузку, сделайте паузу.',
    );
    expect(russian['phase.guide.luteal.body']).toBe(
      'Возможны вздутие и болезненность груди. Выбирайте удобную одежду, которая не давит.',
    );
    expect(russian['phase.guide.everyone']).toBe(
      'Ощущения у всех разные. Если симптомы мешают обычной жизни, обсудите их с врачом.',
    );
  });

  it('should no longer say the old luteal lines that read unnatural in Russian', () => {
    const russian = Object.values(catalogueOf('ru')).map(String);

    expect(
      russian.filter((said) =>
        /запас в своих планах|чувствовать себя ровнее|Ровные умеренные/.test(said),
      ),
    ).toEqual([]);
  });
});
