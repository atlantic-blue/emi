import { resolve } from 'node:path';

import {
  describeSingleDayUse,
  interfaceFilesOf,
  interfaceRoot,
  scannedExtensions,
  singleDayForecastFields,
  singleDayUsesIn,
  singleDayUsesUnder,
} from './singleDayForecast';

const repositoryRoot = resolve(__dirname, '..', '..');

function theFieldStartingWith(beginning: string): string {
  const found = singleDayForecastFields.find((field) => field.startsWith(beginning));

  if (found === undefined) {
    throw new Error(`the forecast has no single day field starting with "${beginning}"`);
  }

  return found;
}

const theMiddleOfTheRange = theFieldStartingWith('expected');
const theOvulationDay = theFieldStartingWith('estimated');
const aScreen = 'apps/mobile/src/features/forecast/NextPeriod.tsx';

describe('a single predicted day rendered anywhere in the application fails the pipeline', () => {
  const files = interfaceFilesOf(repositoryRoot);

  it('finds no single day named in the application today, and says how much it read', () => {
    expect(singleDayUsesUnder(repositoryRoot, files).map(describeSingleDayUse)).toEqual([]);
    expect(files.length).toBeGreaterThan(20);
  });

  it('reads the screens and the modules behind them, and nothing outside the application', () => {
    expect(files).toContain(aScreen);
    expect(files).toContain('apps/mobile/src/data/cycleRepository.ts');
    expect(files.every((file) => file.startsWith(interfaceRoot))).toBe(true);
    expect(files.filter((file) => file.includes('apps/mobile/tests'))).toEqual([]);
  });

  it('reads TypeScript and the screens written in it, and leaves the rest alone', () => {
    expect([...scannedExtensions].sort()).toEqual(['.ts', '.tsx']);
  });

  it('refuses a screen that reads the middle of the range, and names the file and the line', () => {
    const screen = `<Text>{whenItStarts(forecast.${theMiddleOfTheRange})}</Text>\n`;
    const [described] = singleDayUsesIn(aScreen, screen).map(describeSingleDayUse);

    expect(described).toContain(aScreen);
    expect(described).toContain(theMiddleOfTheRange);
    expect(described).toContain('<Text>');
  });

  it('accepts the same screen once it reads the two ends instead', () => {
    const screen = '<Text>{rangeSentence(forecast.start)}</Text>\n';

    expect(singleDayUsesIn(aScreen, screen)).toEqual([]);
  });

  it('refuses the estimated ovulation day on the same terms', () => {
    const screen = `<Text>{dayInWords(forecast.${theOvulationDay})}</Text>\n`;

    expect(singleDayUsesIn(aScreen, screen).map((use) => use.field)).toEqual([theOvulationDay]);
  });

  it('reports every single day a file names, and not only the first', () => {
    const screen = `const day = forecast.${theMiddleOfTheRange};\nconst other = forecast.${theOvulationDay};\n`;

    expect(singleDayUsesIn(aScreen, screen).map((use) => use.field)).toEqual([
      theMiddleOfTheRange,
      theOvulationDay,
    ]);
  });

  it('reads a name in a comment as a use, because a grep cannot tell a comment from a call', () => {
    const screen = `// ${theMiddleOfTheRange} is the day this screen must never draw\n`;

    expect(singleDayUsesIn(aScreen, screen)).toHaveLength(1);
  });

  it('does not read a longer name that merely begins with one', () => {
    const screen = `const ${theMiddleOfTheRange}OfTheWeek = 'Monday';\n`;

    expect(singleDayUsesIn(aScreen, screen)).toEqual([]);
  });

  it('names both days of the forecast that are days and not ranges', () => {
    expect([...singleDayForecastFields].sort()).toEqual([theOvulationDay, theMiddleOfTheRange]);
  });
});
