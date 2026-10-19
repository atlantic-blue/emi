import { symptoms } from '@emi/cycle';
import { render, screen } from '@testing-library/react-native';

import { readableHtml } from '../../../src/features/export/readableDocument';
import { MoodPicker } from '../../../src/features/log/MoodPicker';
import { SymptomChip } from '../../../src/features/log/SymptomGroup';
import { whatSheMarkedOn } from '../../../src/features/log/copy';
import { searchSymptoms } from '../../../src/features/log/search';
import { symptomName, symptomNameKeys } from '../../../src/features/log/symptomName';
import { todayChoices, todayLabels } from '../../../src/features/onboarding/copy';
import { type WordKey, catalogueOf, english, languages } from '../../../src/language';

jest.mock('expo-localization', () => ({ getLocales: jest.fn(() => [{ languageTag: 'ru-RU' }]) }));

/**
 * Issue 316: the symptom and mood names came from the English catalogue, so a Russian reader saw
 * "Fatigue" on the chip and "Fatigue и exhausted" under Today. Each name now has a key in every
 * language, and every screen reads it through one function.
 */

const fatigue = symptoms.find((each) => each.slug === 'fatigue');

if (fatigue === undefined) {
  throw new Error('the catalogue holds no fatigue');
}

function keyOf(slug: string): WordKey {
  const key = symptomNameKeys.get(slug);

  if (key === undefined) {
    throw new Error(`no key names ${slug}`);
  }

  return key;
}

describe('the name of a symptom', () => {
  it('should have a key in every language for every symptom and mood of the catalogue', () => {
    for (const language of languages) {
      const catalogue = catalogueOf(language);
      const missing = symptoms
        .map((each) => each.slug)
        .filter((slug) => {
          const key = symptomNameKeys.get(slug);
          const said: unknown = key === undefined ? undefined : catalogue[key];

          return typeof said !== 'string' || said.trim().length === 0;
        });

      expect(missing).toEqual([]);
    }
  });

  it('should give Russian words that are not the English ones', () => {
    const left = symptoms.filter(
      (each) => catalogueOf('ru')[keyOf(each.slug)] === english[keyOf(each.slug)],
    );

    expect(left).toEqual([]);
  });

  it('should be read in Russian by the chip of the log sheet', async () => {
    await render(<SymptomChip isPicked={false} onToggle={() => undefined} symptom={fatigue} />);

    expect(screen.getByText('Усталость')).toBeTruthy();
    expect(screen.queryByText('Fatigue')).toBeNull();
  });

  it('should be read in Russian by the mood picker', async () => {
    await render(<MoodPicker onToggle={() => undefined} picked={[]} />);

    expect(screen.getByText('Тревога')).toBeTruthy();
    expect(screen.queryByText('Anxious')).toBeNull();
  });

  it('should be read in Russian by the line under Today', () => {
    const said = whatSheMarkedOn({
      day: '2026-10-19',
      recordedAt: '2026-10-19T10:00:00.000Z',
      symptoms: ['fatigue'],
      moods: ['anxious'],
    });

    expect(said).toBe('Усталость и тревога');
  });

  it('should be read in Russian by the readable export', () => {
    const document = readableHtml({
      format: 'emi-export',
      writtenAt: '2026-10-19T10:00:00.000Z',
      schemaVersion: 1,
      tables: {
        day_log: [
          {
            day: '2026-10-19',
            deleted_at: null,
            payload: { day: '2026-10-19', symptoms: ['fatigue'], moods: ['anxious'] },
          },
        ],
      },
    });

    expect(document).toContain('Усталость');
    expect(document).toContain('Тревога');
    expect(document).not.toContain('Fatigue');
  });

  it('should be found by search in her language', () => {
    expect(searchSymptoms('устал').map((each) => each.slug)).toContain('fatigue');
  });

  it('should be the name of the log sheet on the six tiles of the first run', () => {
    for (const slug of todayChoices) {
      expect(todayLabels[slug]).toBe(symptomName(slug));
    }
    expect(todayLabels.fatigue).toBe('Усталость');
  });

  it('should show the slug for a symptom the language files do not name', () => {
    expect(symptomName('a-symptom-from-a-later-version')).toBe('a-symptom-from-a-later-version');
  });
});
