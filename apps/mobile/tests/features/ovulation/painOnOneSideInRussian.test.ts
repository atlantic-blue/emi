import { diaryRows } from '../../../src/features/phase/diary';
import { signOptions } from '../../../src/features/ovulation/signs';
import { catalogueOf } from '../../../src/language/words';

jest.mock('expo-localization', () => ({ getLocales: jest.fn(() => [{ languageTag: 'ru-RU' }]) }));

/**
 * Issue 303: a Russian reader did not understand "Боль с одной стороны". The sign is pain low in
 * the belly, on one side, so the Russian words say where the pain is. The stored values do not
 * change, so a day saved under the old words still reads with the new ones.
 */

const theNewWords = 'Боль внизу живота с одной стороны';
const theOldWords = 'Боль с одной стороны';

describe('the one sided pain sign in Russian', () => {
  it('should say where the pain is on the chip of the ovulation popup', () => {
    const chip = signOptions.find((option) => option.value === 'pain-on-one-side');

    expect(chip?.label).toBe(theNewWords);
  });

  it('should say the same words on the chip of the symptoms list', () => {
    const chip = diaryRows.symptoms.find((each) => each.slug === 'ovulation-pain');

    expect(chip?.label).toBe(theNewWords);
  });

  it('should no longer show the words she did not understand anywhere', () => {
    const russian = Object.values(catalogueOf('ru')).map(String);

    expect(russian.filter((said) => said.includes(theOldWords))).toEqual([]);
    expect(russian.filter((said) => /боль с одной стороны/i.test(said))).toEqual([]);
  });

  it('should name the same place in the guide to the ovulation phase', () => {
    expect(catalogueOf('ru')['phase.guide.ovulation.body']).toContain('боль внизу живота');
  });

  it('should keep the English and Spanish words of the board', () => {
    for (const key of ['ovulation.sign.painOnOneSide', 'phase.chip.painOnOneSide'] as const) {
      expect(catalogueOf('en')[key]).toBe('Pain on one side');
      expect(catalogueOf('es')[key]).toBe('Dolor en un lado');
    }
  });

  it('should keep the values a saved day holds, so an old record reads with the new words', () => {
    expect(signOptions.map((option) => option.value)).toContain('pain-on-one-side');
    expect(diaryRows.symptoms.map((each) => each.slug)).toContain('ovulation-pain');
  });
});
