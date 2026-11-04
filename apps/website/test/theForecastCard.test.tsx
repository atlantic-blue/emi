/**
 * @jest-environment jsdom
 */
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { type Language, languages, wordsIn } from '../app/words';
import { NextPeriodWindow } from '../components/nextPeriodWindow';
import { theDayWritten, theWindowOn } from '../lib/theNextPeriodRange';

/**
 * The one sentence of the home page that answers the day it is read on.
 *
 * The board drew a window in October 2026 and the page served it, so a reader in November was
 * shown the product forecasting a week that had already gone. The card now counts the week, and it
 * counts it twice: once where the page is drawn, which is what a reader whose scripts never run is
 * handed, and once in her browser, which is what corrects a page that came out of a cache.
 *
 * The cases below are the second draw. They drive the real component into a real document with a
 * day it was drawn for that is weeks old, and then read what a woman is looking at afterwards. The
 * first draw is read in `homePage.test.tsx`, where the whole page is drawn the way a server draws
 * it, because what matters there is that the card is sensible with no script at all.
 */

/** The day the page was drawn for, weeks before the day these cases are read on. */
const WHEN_THE_PAGE_WAS_DRAWN = '2026-10-01';

/** The day the clock says, which is the day her browser counts the window from. */
const THE_DAY_SHE_OPENS_IT = new Date(2026, 10, 4);

/** What the card says in each language for the day the page is standing on. */
const whatHerBrowserCounts: Readonly<Record<Language, string>> = {
  en: 'Between the 16th and the 22nd of November',
  ru: 'Между 16 и 22 ноября',
  es: 'Entre el 16 y el 22 de noviembre',
};

/** What the card would still say if the second draw never happened. */
function whatTheStalePageSays(language: Language): string {
  return theWindowOn(wordsIn(language), theDayWritten(WHEN_THE_PAGE_WAS_DRAWN));
}

let holder: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

/**
 * Only the clock is stood in for. React waits on the ordinary timers of the platform to run an
 * effect, and a run that held those still would never reach the second draw at all.
 */
beforeEach(() => {
  jest.useFakeTimers({
    now: THE_DAY_SHE_OPENS_IT,
    doNotFake: [
      'cancelAnimationFrame',
      'cancelIdleCallback',
      'clearImmediate',
      'clearInterval',
      'clearTimeout',
      'hrtime',
      'nextTick',
      'performance',
      'queueMicrotask',
      'requestAnimationFrame',
      'requestIdleCallback',
      'setImmediate',
      'setInterval',
      'setTimeout',
    ],
  });

  holder = document.createElement('div');
  document.body.append(holder);
  root = createRoot(holder);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  holder.remove();
  jest.useRealTimers();
});

function whatSheReads(language: Language): string {
  act(() => {
    root.render(<NextPeriodWindow drawnOn={WHEN_THE_PAGE_WAS_DRAWN} language={language} />);
  });

  return holder.textContent ?? '';
}

describe('the window on the forecast card', () => {
  it.each(languages)('counts the week again from her own clock, in %s', (language) => {
    expect(whatSheReads(language)).toBe(whatHerBrowserCounts[language]);
  });

  /**
   * The point of the second draw. A page a cache held for a month would otherwise name a week in
   * October to a woman reading it in November, which is the thing that was wrong with the card.
   */
  it.each(languages)(
    'does not leave her reading the week the page was drawn for, in %s',
    (language) => {
      expect(whatTheStalePageSays(language)).not.toBe(whatHerBrowserCounts[language]);
      expect(whatSheReads(language)).not.toBe(whatTheStalePageSays(language));
    },
  );

  it('leaves no hole of the sentence unfilled in what she reads', () => {
    for (const language of languages) {
      expect(whatSheReads(language)).not.toMatch(/[{}]/);
    }
  });
});
