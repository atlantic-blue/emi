import { hostsIn, theOneHost } from '../lib/theOnePrice';

/**
 * The one host that is not Emi and that a page of this site is allowed to name: the chat the Emi
 * Community reads and writes on.
 *
 * Written out here rather than read from the address the pages use. A check that took the host
 * from the file it is checking would agree with that file whatever the file said.
 */
export const theChatTheCommunityIsOn = 't.me';

/**
 * Every host a piece of markup names that this site has no business naming.
 *
 * A link is not a request. SITE-4 holds the site to asking no other company for anything, and a
 * press she has not made yet asks nobody for anything: her browser goes to the community when she
 * decides to, and not before. So the community's chat is allowed in the markup, and the list below
 * is still empty for a tracker, a font service or an analytics host, which a page would fetch
 * without her ever pressing anything.
 */
export function hostsAPageMayNotName(markup: string): string[] {
  return hostsIn(markup).filter((host) => host !== theOneHost && host !== theChatTheCommunityIsOn);
}
