/**
 * Where a link points when the page it would point at does not exist yet, in this site or outside
 * it. The home page of the site rather than a guess at the address Apple or anybody else will give
 * a page later, because a link to an address nobody has issued is a promise the site cannot keep.
 *
 * A page this site will serve later is not this: it is linked at its own address under the
 * language, and until it exists that address answers 404 with the Emi page.
 */
export const NO_PAGE_YET = '/';
