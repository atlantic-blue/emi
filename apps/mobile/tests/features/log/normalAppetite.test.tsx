import { join } from 'node:path';

import type { DayRecord } from '@emi/crypto';
import { addDays } from '@emi/cycle';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { AccessibilityInfo } from 'react-native';

import { LogSymptoms, logSymptomsSaveTestID } from '../../../src/features/log/LogSymptoms';
import { symptomChipTestID, symptomGroupTestID } from '../../../src/features/log/SymptomGroup';
import { symptomNameKeys } from '../../../src/features/log/symptomName';
import { historyPatternTestID } from '../../../src/features/history/HistoryScreen';
import { patternEvidenceSentence } from '../../../src/features/history/copy';
import { catalogueOf } from '../../../src/language';
import { resetExpoSqlite } from '../../data/expoSqlite';
import { resetExpoSecureStore } from '../../fixtures/expoSecureStore';
import { dayOf, herPhoneHolds } from '../../fixtures/herPhone';
import { herCyclesStartOn, theCyclesEmiReads } from '../../fixtures/herRepeatingSymptoms';
import { daysOfHerSixCycles } from '../../fixtures/herSixCycles';
import { textIn } from '../../fixtures/renderedText';
import { OnAPhone } from '../../fixtures/theSafeArea';

jest.mock('expo-sqlite', () => jest.requireActual('../../data/expoSqlite'));
jest.mock('expo-secure-store', () => jest.requireActual('../../fixtures/expoSecureStore'));
jest.mock('expo-crypto', () => jest.requireActual('../../fixtures/expoCrypto'));

const appDirectory = join(__dirname, '..', '..', '..', 'src', 'app');
const whenSheOpensIt = new Date('2026-05-14T12:00:00.000Z');
const today = dayOf(whenSheOpensIt);

async function sheOpensAppetite(
  held: readonly string[],
  onSave: (picked: readonly string[]) => void = () => undefined,
): Promise<void> {
  await render(
    <OnAPhone>
      <LogSymptoms
        asked={{ groups: ['appetite'], opensOn: 'groups' }}
        focus={[]}
        held={held}
        leave="close"
        onLeave={() => undefined}
        onSave={onSave}
        title="Today"
      />
    </OnAPhone>,
  );
}

function theChipsOfAppetite(): string[] {
  return within(screen.getByTestId(symptomGroupTestID('appetite')))
    .getAllByTestId(/^symptom-chip-/)
    .map((chip) => String(chip.props.testID));
}

describe('a normal appetite in the Appetite group', () => {
  it('should offer Normal appetite first in Appetite', async () => {
    await sheOpensAppetite([]);

    expect(theChipsOfAppetite()[0]).toBe(symptomChipTestID('appetite-normal'));
    expect(screen.getByTestId(symptomChipTestID('appetite-normal'))).toHaveTextContent(
      'Normal appetite',
    );
  });

  it('should save appetite-normal on the day when she picks it and presses Save', async () => {
    const saved: (readonly string[])[] = [];
    await sheOpensAppetite([], (picked) => saved.push(picked));

    await fireEvent.press(screen.getByTestId(symptomChipTestID('appetite-normal')));
    await fireEvent.press(screen.getByTestId(logSymptomsSaveTestID));

    expect(saved).toEqual([['appetite-normal']]);
  });

  it('should read a day saved before Normal appetite existed with no change', async () => {
    await sheOpensAppetite(['appetite-increase']);

    expect(screen.getByTestId(symptomChipTestID('appetite-increase'))).toBeChecked();
    expect(screen.getByTestId(symptomChipTestID('appetite-normal'))).not.toBeChecked();
  });

  it('should name Normal appetite in English, Spanish and Russian', () => {
    const key = symptomNameKeys.get('appetite-normal') ?? '';
    const said = (language: 'en' | 'es' | 'ru'): unknown =>
      (catalogueOf(language) as Readonly<Record<string, string>>)[key];

    expect([said('en'), said('es'), said('ru')]).toEqual([
      'Normal appetite',
      'Apetito normal',
      'Нормальный аппетит',
    ]);
  });
});

describe('Insights counts the days with a normal appetite', () => {
  const theCyclesWithIt = 4;
  const theCycleDay = 14;

  function herDaysWithANormalAppetite(): DayRecord[] {
    const starts = herCyclesStartOn(today);
    const marked: DayRecord[] = [];

    for (let cycle = 0; cycle < theCyclesWithIt; cycle += 1) {
      const day = addDays(String(starts[cycle]), theCycleDay - 1);
      marked.push({ day, symptoms: ['appetite-normal'], recordedAt: `${day}T20:00:00.000Z` });
    }

    return [...daysOfHerSixCycles(today), ...marked].sort((one, other) =>
      one.day.localeCompare(other.day),
    );
  }

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(whenSheOpensIt);
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    resetExpoSqlite();
    resetExpoSecureStore();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('should name Normal appetite on Insights with the cycles it came back in', async () => {
    await herPhoneHolds(whenSheOpensIt, herDaysWithANormalAppetite(), 29);
    await renderRouter(appDirectory, { initialUrl: '/history' });

    const said = textIn(screen.getByTestId(historyPatternTestID('appetite-normal'))).join(' ');

    expect(said).toContain('Normal appetite');
    expect(said).toContain(patternEvidenceSentence(theCyclesWithIt, theCyclesEmiReads));
  });
});
