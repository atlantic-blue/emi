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
 */
export const theKeysTheFrameHoldsBack: readonly SiteWordKey[] = [
  'headerCalculator',
  'headerPulse',
  'headerBuy',
  'headerSupport',
  'footerAppStore',
  'footerBuyOnTheWeb',
  'footerTransparency',
  'footerLearnGroup',
  'footerCalculator',
  'footerGuides',
  'footerPulse',
  'footerSupport',
  'footerAccount',
  'footerTerms',
];

/**
 * The words the home page no longer draws, for the same reason and written out for the same
 * reason.
 *
 * The two of the store wait for Apple to issue an address for the listing rather than for a page of
 * this site. The six after them are the band of the two offers, which is two cards that are each a
 * press and the sentence explaining it, so neither has anything left to say without its page.
 */
export const theKeysTheHomePageHoldsBack: readonly SiteWordKey[] = [
  'store',
  'storeSmall',
  'tryTitle',
  'tryLine',
  'tryLink',
  'askTitle',
  'askLine',
  'askLink',
];

/** Every sentence a press took with it, in one language, as a reader would have read it. */
export function theWordsHeldBackIn(language: Language): string[] {
  const words = wordsIn(language);

  return [...theKeysTheFrameHoldsBack, ...theKeysTheHomePageHoldsBack].map((key) => words[key]);
}
