import { type Language, type SiteWordKey, wordsIn } from '../app/words';

/**
 * The words the two bands the whole site shares no longer draw, by the name the catalogues give
 * them.
 *
 * Each one belonged to a press whose page is still to be built, and a press like that is not drawn
 * at all: a press that answers 404 reads as broken software at the moment she decides whether to
 * trust Emi with her cycle. The words stay in all three catalogues, because each press comes back
 * on the day its page ships.
 *
 * Written out here rather than read off the marks in the components. A list taken from the marks
 * would follow them, so the day somebody marks a press that has a page the list would agree. The
 * marks themselves are read against the bands in `test/components.test.tsx` and in the scenario of
 * step 26.19.
 *
 * The heading of the group about learning is among them. All three of its presses wait for a page,
 * so the band draws neither the group nor its heading: a heading over nothing reads as a part of
 * the page that failed to load.
 *
 * "Support" is no longer among them, in either band. Its page ships in step 27.2, so step 27.3
 * takes the mark off the two presses that carry it and they are drawn again.
 */
export const theKeysTheFrameHoldsBack: readonly SiteWordKey[] = [
  'headerCalculator',
  'headerPulse',
  'headerBuy',
  'footerAppStore',
  'footerBuyOnTheWeb',
  'footerTransparency',
  'footerLearnGroup',
  'footerCalculator',
  'footerGuides',
  'footerPulse',
  'footerAccount',
  'footerTerms',
];

/**
 * The words the home page no longer draws, for the same reason and written out for the same
 * reason.
 *
 * The two of the store wait for Apple to issue an address for the listing rather than for a page of
 * this site. The three after them are one card of the band of two offers, which is a press and the
 * sentence explaining it, so it has nothing left to say without its page. The other card of that
 * band offers the support page, which ships in step 27.2, so its three words are drawn again.
 */
export const theKeysTheHomePageHoldsBack: readonly SiteWordKey[] = [
  'store',
  'storeSmall',
  'tryTitle',
  'tryLine',
  'tryLink',
];

/** Every sentence a press took with it, in one language, as a reader would have read it. */
export function theWordsHeldBackIn(language: Language): string[] {
  const words = wordsIn(language);

  return [...theKeysTheFrameHoldsBack, ...theKeysTheHomePageHoldsBack].map((key) => words[key]);
}
