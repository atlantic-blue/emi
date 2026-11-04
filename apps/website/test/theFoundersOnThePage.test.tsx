/**
 * @jest-environment jsdom
 */
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import HomePage from '../app/[lang]/page';
import { type Language, languages, wordsIn } from '../app/words';
import { LESS_MOTION } from '../components/carousels';
import { JULIANS_PHOTOGRAPH } from '../lib/addresses';

/**
 * The band of the two people building Emi, driven on the real page rather than on a list written
 * for a test.
 *
 * The cases beside the components prove the band draws what it is given. This file proves the page
 * gives it the right thing: a note in the reader's own language for each of them, her initials in
 * the circle because she has not sent a photograph, and his photograph in it because he has.
 *
 * Only the first of the two stands on the page a reader is handed, so the second is read after the
 * press that moves the band. A case that stopped at the markup of the page would have checked the
 * half that cannot be wrong.
 */

let holder: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

/** jsdom answers no media query, and the band reads one to decide whether to move on its own. */
function answerTheMotionQuery(): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: query === LESS_MOTION,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  });
}

async function openThePageIn(language: Language): Promise<void> {
  const page = await HomePage({ params: Promise.resolve({ lang: language }) });

  await act(async () => {
    root.render(page);
  });
}

/** The caption under the note: the circle, the name and the role of whoever is standing there. */
function theCaption(): HTMLElement {
  const caption = holder.querySelector('figcaption');

  if (caption === null) {
    throw new Error('The page draws no caption under the note of the founders.');
  }

  return caption;
}

function theNote(): HTMLElement {
  const note = holder.querySelector('blockquote');

  if (note === null) {
    throw new Error('The page draws no note of the founders.');
  }

  return note;
}

async function pressNext(called: string): Promise<void> {
  const next = [...holder.querySelectorAll('button')].find(
    (press) => press.getAttribute('aria-label') === called,
  );

  if (next === undefined) {
    throw new Error('The band of the founders offers no press to the next of them.');
  }

  await act(async () => {
    next.click();
  });
}

beforeEach(() => {
  // React refuses to believe an update was wrapped in `act` unless the run says it is that kind of
  // run, and without it every render here prints a warning.
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  answerTheMotionQuery();
  holder = document.createElement('div');
  document.body.append(holder);
  root = createRoot(holder);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  holder.remove();
});

describe('the two people building Emi, on the page she opens', () => {
  it.each(languages)('gives each of them the note they wrote, in %s', async (language) => {
    const words = wordsIn(language);

    await openThePageIn(language);

    expect(theNote().textContent).toBe(words.founderIuliiaNote);
    expect(theCaption().textContent).toContain('Iuliia Nikolaeva');

    await pressNext(words.founderNext);

    expect(theNote().textContent).toBe(words.founderJulianNote);
    expect(theCaption().textContent).toContain('Julian Tellez');
  });

  it('draws her initials in the circle, because she has not sent a photograph', async () => {
    await openThePageIn('en');

    expect(theCaption().querySelector('img')).toBe(null);
    expect(theCaption().querySelector('span')?.textContent).toBe('IN');
  });

  it('draws his photograph in that same circle, at the size the board draws it', async () => {
    await openThePageIn('en');
    await pressNext(wordsIn('en').founderNext);

    const photograph = theCaption().querySelector('img');

    expect(photograph?.getAttribute('src')).toBe(JULIANS_PHOTOGRAPH);
    expect(photograph?.className).toContain('h-[48px]');
    expect(photograph?.className).toContain('w-[48px]');
    expect(photograph?.className).toContain('rounded-full');

    // The name and the role are read out beside it, so her software is told to pass the picture by
    // rather than announce a file name.
    expect(photograph?.getAttribute('alt')).toBe('');
    expect(theCaption().textContent).toContain('Julian Tellez');
  });

  it('draws both notes in the same ink, now that both of them are written', async () => {
    await openThePageIn('en');

    const hers = theNote().className;

    await pressNext(wordsIn('en').founderNext);

    expect(theNote().className).toBe(hers);
    expect(hers).toContain('text-siteText');
    expect(hers).not.toContain('text-siteQuietText');
  });
});
