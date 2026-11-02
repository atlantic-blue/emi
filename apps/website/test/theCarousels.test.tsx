/**
 * @jest-environment jsdom
 */
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { websiteCarouselWait } from '@emi/tokens';

import { CarouselsProvider, LESS_MOTION } from '../components/carousels';
import { FounderNote } from '../components/founderNote';
import { ReviewRow } from '../components/reviewRow';
import { A_NAME_NOBODY_HAS_SIGNED, A_REVIEW_NOBODY_HAS_WRITTEN } from '../lib/thePlaceholders';

/**
 * The two bands of the home page that move on their own.
 *
 * The cases below drive the real components with the real clock: they render into a document,
 * let the wait go by, and then read what a reader would be looking at. A case that asserted on the
 * call the press makes would have checked the half that cannot be wrong.
 *
 * Both bands run on one clock and one Pause, so pressing Pause beside the reviews holds the
 * founders still as well, and the cases read both after one press.
 */

/** The six cards of the board, named by where each one was said, so one card can be told apart. */
const theReviews = [
  'App Store review',
  'Emi Community member',
  'TestFlight beta tester',
  'App Store review again',
  'Emi Community member again',
  'TestFlight beta tester again',
].map((source) => ({
  quote: A_REVIEW_NOBODY_HAS_WRITTEN,
  name: A_NAME_NOBODY_HAS_SIGNED,
  source,
}));

const theFounders = [
  { initials: 'IN', name: 'Iuliia Nikolaeva', role: 'Co-founder', note: 'Hers', awaited: true },
  { initials: 'JT', name: 'Julian Tellez', role: 'Co-founder', note: 'His', awaited: false },
];

interface Reading {
  /** Where each card on screen was said, in the order a reader meets them. */
  readonly sources: string[];
  /** The name of the founder a reader is looking at. */
  readonly founder: string;
  /** What the press that holds both bands still says right now. */
  readonly pause: string;
  /** Which dot of the row of reviews is the wide one. */
  readonly dot: number;
}

let holder: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
let lessMotion = false;

/**
 * jsdom answers no media query at all, so the page's read of the reader's own settings is answered
 * here. A test that left it undefined would prove the carousel moves on a machine nobody has.
 */
function answerTheMotionQuery(): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: query === LESS_MOTION && lessMotion,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  });
}

/** A fresh page, for a case that changes what the reader's machine answers before it is drawn. */
function openThePageAgain(): void {
  act(() => {
    root.unmount();
  });
  holder.remove();
  holder = document.createElement('div');
  document.body.append(holder);
  root = createRoot(holder);
  draw();
}

function draw(): void {
  act(() => {
    root.render(
      <CarouselsProvider founders={theFounders.length} reviews={theReviews.length}>
        <FounderNote
          controls="founder controls"
          eyebrow="WHY WE ARE BUILDING EMI"
          founders={theFounders}
          next="Next founder"
          pause="Pause"
          play="Play"
          previous="Previous founder"
        />
        <ReviewRow
          controls="review controls"
          eyebrow="REVIEWS"
          headline="What people say about Emi."
          next="Next review"
          pause="Pause"
          play="Play"
          previous="Previous review"
          rating="[RATING] on the App Store, from [COUNT] ratings"
          reviews={theReviews}
        />
      </CarouselsProvider>,
    );
  });
}

/** What a reader is looking at, read off the document rather than off any state. */
function whatSheSees(): Reading {
  const sources = [...holder.querySelectorAll('figure blockquote')].map((quote) => {
    const card = quote.closest('figure');

    return card?.querySelector('figcaption span:last-child')?.textContent ?? '';
  });

  const pause = [...holder.querySelectorAll('button')]
    .map((press) => press.textContent ?? '')
    .find((said) => said === 'Pause' || said === 'Play');

  const dots = [...holder.querySelectorAll('[aria-hidden="true"]')]
    .filter((row) => row.children.length === theReviews.length)
    .flatMap((row) => [...row.children]);

  return {
    sources: sources.slice(1),
    founder: holder.querySelector('figcaption span span')?.textContent ?? '',
    pause: pause ?? '',
    dot: dots.findIndex((dot) => dot.className.includes('w-spaceXl')),
  };
}

function press(name: string): void {
  const found = [...holder.querySelectorAll('button')].find(
    (press) => press.getAttribute('aria-label') === name || press.textContent === name,
  );

  if (found === undefined) {
    throw new Error(`No press on the page is called ${name}.`);
  }

  act(() => {
    found.click();
  });
}

function letTheWaitGoBy(times = 1): void {
  act(() => {
    jest.advanceTimersByTime(websiteCarouselWait * times);
  });
}

beforeEach(() => {
  // React refuses to believe an update was wrapped in `act` unless the run says it is that kind of
  // run, and without it every render here prints a warning and the clock never settles.
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  lessMotion = false;
  jest.useFakeTimers();
  answerTheMotionQuery();
  holder = document.createElement('div');
  document.body.append(holder);
  root = createRoot(holder);
  draw();
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  holder.remove();
  jest.useRealTimers();
});

describe('the row of reviews a reader is handed', () => {
  it('starts on the first card of the board, with the first dot wide', () => {
    const seen = whatSheSees();

    expect(seen.sources).toEqual([
      'App Store review',
      'Emi Community member',
      'TestFlight beta tester',
    ]);
    expect(seen.dot).toBe(0);
  });

  it('moves on by one card once the wait has gone by', () => {
    letTheWaitGoBy();

    const seen = whatSheSees();

    expect(seen.sources).toEqual([
      'Emi Community member',
      'TestFlight beta tester',
      'App Store review again',
    ]);
    expect(seen.dot).toBe(1);
  });

  it('comes back to the first card after the last one, rather than running out', () => {
    letTheWaitGoBy(theReviews.length);

    const seen = whatSheSees();

    expect(seen.sources).toEqual([
      'App Store review',
      'Emi Community member',
      'TestFlight beta tester',
    ]);
    expect(seen.dot).toBe(0);
  });

  it('stands still while the wait has not gone by', () => {
    act(() => {
      jest.advanceTimersByTime(websiteCarouselWait - 1);
    });

    expect(whatSheSees().dot).toBe(0);
  });

  it('does not move after she presses Pause, however long she waits', () => {
    press('Pause');
    letTheWaitGoBy(4);

    const seen = whatSheSees();

    expect(seen.pause).toBe('Play');
    expect(seen.dot).toBe(0);
    expect(seen.sources[0]).toBe('App Store review');
  });

  it('moves again after she presses Play', () => {
    press('Pause');
    letTheWaitGoBy(2);
    press('Play');
    letTheWaitGoBy();

    const seen = whatSheSees();

    expect(seen.pause).toBe('Pause');
    expect(seen.dot).toBe(1);
  });

  it('goes back a card when she presses the one that goes back, round the start of the list', () => {
    press('Previous review');

    const seen = whatSheSees();

    expect(seen.dot).toBe(theReviews.length - 1);
    expect(seen.sources).toEqual([
      'TestFlight beta tester again',
      'App Store review',
      'Emi Community member',
    ]);
  });

  it('never moves at all for a reader who asked her machine for less motion', () => {
    lessMotion = true;
    openThePageAgain();
    letTheWaitGoBy(3);

    const seen = whatSheSees();

    expect(seen.dot).toBe(0);
    expect(seen.founder).toBe('Iuliia Nikolaeva');

    // She is not told it is paused, because she never asked this page for anything. The press is
    // still there and still says Pause, so she can move a card herself.
    expect(seen.pause).toBe('Pause');
  });
});

describe('the band of the founders, on the same clock', () => {
  it('stands Iuliia first, before the wait has gone by once', () => {
    expect(whatSheSees().founder).toBe('Iuliia Nikolaeva');
  });

  it('moves to the other founder on the same wait as the reviews', () => {
    letTheWaitGoBy();

    expect(whatSheSees().founder).toBe('Julian Tellez');
  });

  it('is held still by the one press beside the reviews, because both run on one clock', () => {
    press('Pause');
    letTheWaitGoBy(3);

    const seen = whatSheSees();

    expect(seen.founder).toBe('Iuliia Nikolaeva');
    expect(seen.sources[0]).toBe('App Store review');
  });

  it('comes back to Iuliia after the other founder, rather than running out', () => {
    press('Next founder');
    press('Next founder');

    expect(whatSheSees().founder).toBe('Iuliia Nikolaeva');
  });
});
