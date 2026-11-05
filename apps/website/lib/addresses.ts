/**
 * The home page of the site, as the one address a page can send her to without naming a language.
 *
 * No press carries it. A press whose page does not exist yet is not drawn at all, because a press
 * that leads to the page she is already reading tells her nothing and a press to an address nobody
 * has issued is a promise the site cannot keep. The entries that wait for a page are marked
 * `waitsForItsPage` where they are listed, and the scenario of step 26.26 refuses this address
 * anywhere a reader can press.
 *
 * It stays here because the page she reaches by accident offers one way back, and because every
 * test of that rule needs the address the rule is about.
 */
export const NO_PAGE_YET = '/';

/**
 * This site, written out whole. Every address a page gives a browser is a path, because a path is
 * the one form that cannot send her to another host by mistake. A chat application is the
 * exception: it reads the tags of a page on its own server, where a path beginning with a slash
 * points at the chat company instead, so the tags it reads name the host and the path together.
 */
export const SITE_ORIGIN = 'https://myemi.app';

/** The picture a chat draws beside the words. One picture, in every language. */
export const SHARE_PREVIEW = '/share-preview.png';

/**
 * Where the Emi Community reads and writes, which is the first of the three hosts outside this site
 * that a page names. An invite rather than a public name, so it can be revoked: it is held here alone, and one
 * edit moves every press that carries it.
 */
export const THE_EMI_COMMUNITY = 'https://t.me/+89GgSCh6Ff85YTZk';

/**
 * Where the code of Emi is, which is the second host outside this site that a page names. The
 * page that explains the encryption rests on it: every claim on that page is one a reader can go
 * and check, and the press that takes her there is the whole of that offer.
 */
export const THE_EMI_CODE = 'https://github.com/atlantic-blue/emi';

/**
 * Where she joins the beta, which is the third host outside this site that a page names. Apple
 * runs it, and the invite is a whole address on Apple's host rather than a path, so the press that
 * carries it leaves the site the way the community press does.
 *
 * The invite can be closed, so it is held here alone and one edit moves every press that carries
 * it.
 */
export const THE_EMI_BETA = 'https://testflight.apple.com/join/xFSv5Gqa';

/**
 * Where the listing of Emi is in Apple's store. Apple issues the address with the pre-order on
 * 17 November 2026, so it is empty today, and empty is the one thing it is allowed to be: a guess
 * at the address Apple will give is a press that answers nothing.
 *
 * Every press to the store reads `theStoreListingIsOpen`, which is this address being filled in,
 * so pasting the address Apple gives here draws all three of them and changes nothing else.
 */
export const THE_APP_STORE_LISTING = '';

/**
 * Where a privacy question goes, which is the one address of this site a reader writes to rather
 * than opens. It carries the scheme, because that is the form a mail application answers.
 *
 * It is not a word of a catalogue: it reads the same in every language, and a word there is
 * translated into three.
 */
export const THE_PRIVACY_INBOX = 'mailto:privacy@myemi.app';

/**
 * Where a question about using Emi goes, which the approved support board writes. It is a second
 * address rather than the one above, because a woman asking why a forecast moved is not writing
 * about her own data and the two are read by different people.
 *
 * Neither address receives mail yet. The domain answered with no mail record on 4 November 2026.
 */
export const THE_SUPPORT_INBOX = 'mailto:hello@myemi.app';

/**
 * The same address as a reader reads it on the page, and as she would type it into her own mail
 * application. A press cannot carry this form, so it is not an address of the list above.
 */
export function thePrivacyAddress(): string {
  return THE_PRIVACY_INBOX.replace('mailto:', '');
}

/** The support address in the same form, for a page that writes it out rather than pressing it. */
export function theSupportAddress(): string {
  return THE_SUPPORT_INBOX.replace('mailto:', '');
}

/**
 * The photograph of one of the two people building Emi, served beside the pages. The other is
 * drawn as her initials until she sends one, so this is one name and not a list.
 *
 * It is not a word of a catalogue: a face reads the same in every language. It is held here
 * because the distribution is told each file under `public` by name, and a test reads the file
 * under this name to prove the page does not point at one that is not there.
 */
export const JULIANS_PHOTOGRAPH = '/julian-tellez.jpg';
