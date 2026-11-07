/**
 * How the two pages of the account move a reader from one address to another.
 *
 * A whole load rather than the move the framework offers inside the page. The session lives in
 * `sessionStorage` and a server of this site never sees it, so the page she lands on has to read
 * the browser for itself, and a whole load is the one way that reading cannot be skipped. It also
 * leaves both components drawable on a server with no router mounted, which is how every test of
 * this repository draws a page.
 *
 * `instead` is for a reader who may not be where she is: the account page with no session moves
 * her to the sign in page, and leaving the account in her history would send her back to it the
 * moment she pressed back.
 */

export function goTo(address: string): void {
  window.location.assign(address);
}

export function goInsteadTo(address: string): void {
  window.location.replace(address);
}
