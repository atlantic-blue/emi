import { hostsIn, theOneHost } from '../lib/theOnePrice';

/**
 * The chat the Emi Community reads and writes on, which is the first of the three hosts that are
 * not Emi and that a page of this site is allowed to name.
 *
 * Written out here rather than read from the address the pages use. A check that took the host
 * from the file it is checking would agree with that file whatever the file said.
 */
export const theChatTheCommunityIsOn = 't.me';

/** Where the code of Emi is, which the page that explains the encryption rests on. */
export const theHostTheCodeIsOn = 'github.com';

/** Where the beta is, which Apple runs and which the band at the foot of every page offers. */
export const theHostTheBetaIsOn = 'testflight.apple.com';

/** The three hosts a press may carry, and nothing else a page may name. */
export const theHostsAPressMayCarry = [
  theChatTheCommunityIsOn,
  theHostTheCodeIsOn,
  theHostTheBetaIsOn,
];

/**
 * Every host a piece of markup names that this site has no business naming.
 *
 * A link is not a request. SITE-4 holds the site to asking no other company for anything, and a
 * press she has not made yet asks nobody for anything: her browser goes to the community, to the
 * code or to the beta when she decides to, and not before. So those three hosts are allowed in the
 * markup, and the list below is still empty for a tracker, a font service or an analytics host,
 * which a page would fetch without her ever pressing anything.
 */
export function hostsAPageMayNotName(markup: string): string[] {
  return hostsIn(markup).filter(
    (host) => host !== theOneHost && !theHostsAPressMayCarry.includes(host),
  );
}
