/**
 * Where a link points when the page it would point at does not exist yet, in this site or outside
 * it. The home page of the site rather than a guess at the address Apple or anybody else will give
 * a page later, because a link to an address nobody has issued is a promise the site cannot keep.
 *
 * A page this site will serve later is not this: it is linked at its own address under the
 * language, and until it exists that address answers 404 with the Emi page.
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
 * Where the Emi Community reads and writes, which is the one host outside this site that a page
 * names. An invite rather than a public name, so it can be revoked: it is held here alone, and one
 * edit moves every press that carries it.
 */
export const THE_EMI_COMMUNITY = 'https://t.me/+89GgSCh6Ff85YTZk';
