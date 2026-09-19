/**
 * Where the articles are read from, taken from the build rather than written here, because a debug
 * build and a store build read different accounts of the same shape.
 *
 * No endpoint is deployed yet, so no build carries an address today. An absent address is an answer
 * here rather than a fault: the client answers no article, and the card is simply not drawn.
 */

/** The variable the build carries it in. Expo inlines anything with this prefix at bundle time. */
export const articleAddressVariable = 'EXPO_PUBLIC_EMI_ARTICLES_URL';

/**
 * The address, or nothing at all when this build has none.
 *
 * The variable is written out rather than read through the constant above, because the bundler
 * replaces `process.env.EXPO_PUBLIC_*` by finding it spelled out in the source. A read through a
 * name is not replaced, and it answers nothing on a phone while answering correctly under a test
 * runner, which is the shape of a fault that only appears once it is installed.
 */
export function articleAddress(
  carried: string | undefined = process.env.EXPO_PUBLIC_EMI_ARTICLES_URL,
): string | null {
  const given = carried?.trim() ?? '';

  return given.length === 0 ? null : given;
}
