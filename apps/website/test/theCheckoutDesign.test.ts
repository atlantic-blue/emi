import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { renderToStaticMarkup } from 'react-dom/server';

import CheckoutPage from '../app/[lang]/checkout/page';
import { wordsIn } from '../app/words';
import { thePriceOnThisSite } from '../lib/theOnePrice';

/**
 * The approved board of the Buy Emi page, read against the words the page draws.
 *
 * This design holds a board and no render, so there is no picture to compare the page with. What
 * can be held is the text: every sentence the board draws is a sentence the page says, in the
 * language the board is written in.
 *
 * Two places the page differs from the board, each one a decision the operator can reverse.
 *
 * The board draws a press that opens the Emi bot. No bot exists, so the page says paying in Stars
 * is not ready yet and draws no press that would open nothing.
 *
 * The board draws the wallets and the card form as two boxes the payment provider fills. The page
 * mounts Stripe's two elements there, so neither box carries words of ours.
 */

const repositoryRoot = resolve(__dirname, '..', '..', '..');

const theBoard = join(
  repositoryRoot,
  'docs',
  'design',
  'website',
  'checkout',
  'boards',
  'Checkout.dc.html',
);

/** The board as a reader sees it: the text of every element, with the markup taken out. */
function whatTheBoardSays(): string {
  return (
    readFileSync(theBoard, 'utf8')
      .replace(/<script[\s\S]*?<\/script>/g, '')
      .replace(/<style[\s\S]*?<\/style>/g, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      // A tag between a word and the punctuation after it leaves a space behind, so a sentence that
      // ends in a link reads with a gap before its full stop until that gap is closed.
      .replace(/ ([.,])/g, (_whole, mark: string) => mark)
      .trim()
  );
}

const words = wordsIn('en');

/**
 * The two sentences that carry the figure, built the way the page builds them: the words of the
 * catalogue with the amount the one price rule gives. The board was approved with that amount in
 * it, so a price the site changed without changing the board is read here as a difference.
 */
const theAmountOfThePlan = words.checkoutPlanAmount.replace('{amount}', thePriceOnThisSite.amount);
const thePressThatPays = words.checkoutPay.replace('{amount}', thePriceOnThisSite.amount);

/**
 * The page as a reader sees it, read the same way as the board, so the two can be held against
 * each other. The key is set first, because a build with none draws the plan and no form at all.
 */
async function whatThePageSays(): Promise<string> {
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_not_a_real_key';

  const page = await CheckoutPage({ params: Promise.resolve({ lang: 'en' }) });

  return renderToStaticMarkup(page)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/ ([.,])/g, (_whole, mark: string) => mark)
    .trim();
}

/** Every word of the page that the board draws in the same characters. */
const theWordsTheBoardDraws = [
  words.checkoutTitle,
  words.checkoutPlanHeading,
  words.checkoutPlanEveryYear,
  words.checkoutPlanYearly,
  words.checkoutPlanRenews,
  theAmountOfThePlan,
  words.checkoutMethodHeading,
  words.checkoutMethodQuestion,
  words.checkoutPayByCard,
  words.checkoutPayByCardWhere,
  words.checkoutPayByStars,
  words.checkoutPayByStarsWhere,
  words.checkoutTermsLink,
  thePressThatPays,
  words.checkoutCancelAnyTime,
] as const;

/**
 * The two sentences of the board that only a browser can draw. The line under the title names the
 * way she signed in, which a server of this site cannot read, and the line over the card form is
 * drawn once a wallet of her device has answered. Both are read against the board here and against
 * the page in `theCheckoutPage.test.tsx`, which drives it in a browser.
 */
const theWordsHerBrowserAdds = [words.checkoutNotYou, words.checkoutOrPayByCard] as const;

describe('the approved board of the page she buys Emi on', () => {
  it('is in this repository, and it draws something to read', () => {
    expect(whatTheBoardSays().length).toBeGreaterThan(200);
  });

  it.each(theWordsTheBoardDraws)('draws "%s", and the page says it too', async (said) => {
    expect(whatTheBoardSays()).toContain(said);
    expect(await whatThePageSays()).toContain(said);
  });

  it('says every sentence of the board a server can draw', async () => {
    const page = await whatThePageSays();
    const missing = theWordsTheBoardDraws.filter((said) => !page.includes(said));

    expect(theWordsTheBoardDraws.length).toBeGreaterThan(13);
    expect(missing).toEqual([]);
  });

  it.each(theWordsHerBrowserAdds)('draws "%s", which only her browser can draw', async (said) => {
    expect(whatTheBoardSays()).toContain(said);
    expect(await whatThePageSays()).not.toContain(said);
  });

  it('says which way she signed in, which the board writes for one way and the page reads', () => {
    expect(whatTheBoardSays()).toContain('Signed in with Apple.');
    expect(words.checkoutSignedInWith.replace('{way}', 'Apple')).toBe('Signed in with Apple.');
  });

  it('says the terms line as the board says it, with the link inside the sentence', async () => {
    const said = words.checkoutTerms.replace('{terms}', words.checkoutTermsLink);

    expect(whatTheBoardSays()).toContain(said);
    expect(await whatThePageSays()).toContain(said);
  });

  it('leaves the Emi bot press of the board undrawn, because no bot answers it yet', async () => {
    expect(whatTheBoardSays()).toContain('Open the Emi bot');
    expect(Object.values(words)).not.toContain('Open the Emi bot');
    expect(words.checkoutStarsNotReady).toContain('not ready yet');
    expect(await whatThePageSays()).not.toContain('Open the Emi bot');
  });

  it('leaves the card form of the board to the payment provider, as the board does', async () => {
    expect(whatTheBoardSays()).toContain('[CARD FORM FROM THE PAYMENT PROVIDER]');
    expect(Object.values(words).join(' ')).not.toContain('CARD FORM');
    expect(await whatThePageSays()).not.toContain('CARD FORM');
  });

  it('draws the plan and no form at all when the build was given no key', async () => {
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = '';

    const page = await CheckoutPage({ params: Promise.resolve({ lang: 'en' }) });
    const said = renderToStaticMarkup(page);

    expect(said).toContain(theAmountOfThePlan);
    expect(said).toContain(words.checkoutNoPaymentFormYet);
    expect(said).not.toContain(thePressThatPays);
    expect(said).not.toContain(words.checkoutPayByCard);
  });
});
