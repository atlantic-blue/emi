import { render, screen, within } from '@testing-library/react-native';

import { LogSymptoms } from '../../../src/features/log/LogSymptoms';
import {
  groupHeadings,
  symptomChipTestID,
  symptomGroupHeadingTestID,
  symptomGroupTestID,
} from '../../../src/features/log/SymptomGroup';
import { symptomNameKeys } from '../../../src/features/log/symptomName';
import { catalogueOf } from '../../../src/language';
import { OnAPhone } from '../../fixtures/theSafeArea';

/**
 * Issue 329: Digestion became two groups, Appetite and Digestive symptoms, and Sweet and Salty
 * joined Appetite. A day keeps slugs and never a group, so a day saved before the split reads
 * under the new groups with no change to the day.
 */

async function sheOpensADaySavedBeforeTheSplit(): Promise<void> {
  await render(
    <OnAPhone>
      <LogSymptoms
        asked={{ groups: [], opensOn: 'groups' }}
        focus={[]}
        held={['nausea', 'food-craving']}
        leave="close"
        onLeave={() => undefined}
        onSave={() => undefined}
        title="Today"
      />
    </OnAPhone>,
  );
}

describe('a day saved while digestion was one group', () => {
  it('should read food craving under Appetite and nausea under Digestive symptoms', async () => {
    await sheOpensADaySavedBeforeTheSplit();

    const appetite = screen.getByTestId(symptomGroupTestID('appetite'));
    const digestive = screen.getByTestId(symptomGroupTestID('digestive'));

    expect(within(appetite).getByTestId(symptomChipTestID('food-craving'))).toBeChecked();
    expect(within(digestive).getByTestId(symptomChipTestID('nausea'))).toBeChecked();
    expect(screen.getByTestId(symptomGroupHeadingTestID('appetite'))).toHaveTextContent('Appetite');
    expect(screen.getByTestId(symptomGroupHeadingTestID('digestive'))).toHaveTextContent(
      'Digestive symptoms',
    );
  });

  it('should draw no Digestion group any more', async () => {
    await sheOpensADaySavedBeforeTheSplit();

    expect(screen.queryByTestId('symptom-group-digestion')).toBeNull();
    expect(screen.queryByText('Digestion')).toBeNull();
  });

  it('should offer Sweet and Salty under Appetite', async () => {
    await sheOpensADaySavedBeforeTheSplit();

    const appetite = screen.getByTestId(symptomGroupTestID('appetite'));

    expect(within(appetite).getByTestId(symptomChipTestID('sweet-craving'))).toHaveTextContent(
      'Sweet',
    );
    expect(within(appetite).getByTestId(symptomChipTestID('salty-craving'))).toHaveTextContent(
      'Salty',
    );
  });
});

describe('the words of the two groups and the two new symptoms', () => {
  const said = (language: 'en' | 'es' | 'ru', key: string): unknown =>
    (catalogueOf(language) as Readonly<Record<string, string>>)[key];

  it('should name the groups in English, Spanish and Russian', () => {
    expect(groupHeadings.appetite).toBe('Appetite');
    expect(groupHeadings.digestive).toBe('Digestive symptoms');
    expect(said('es', 'log.group.appetite')).toBe('Apetito');
    expect(said('es', 'log.group.digestive')).toBe('Síntomas digestivos');
    expect(said('ru', 'log.group.appetite')).toBe('Аппетит');
    expect(said('ru', 'log.group.digestive')).toBe('Работа ЖКТ');
  });

  it('should name Sweet and Salty in English, Spanish and Russian', () => {
    const sweet = symptomNameKeys.get('sweet-craving') ?? '';
    const salty = symptomNameKeys.get('salty-craving') ?? '';

    expect([said('en', sweet), said('es', sweet), said('ru', sweet)]).toEqual([
      'Sweet',
      'Dulce',
      'Сладкое',
    ]);
    expect([said('en', salty), said('es', salty), said('ru', salty)]).toEqual([
      'Salty',
      'Salado',
      'Солёное',
    ]);
  });

  it('should keep no key for the Digestion group in any language', () => {
    for (const language of ['en', 'es', 'ru'] as const) {
      expect(said(language, 'log.group.digestion')).toBeUndefined();
    }
  });
});
