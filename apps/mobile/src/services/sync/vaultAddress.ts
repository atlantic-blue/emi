/**
 * Where the vault lives, taken from the build rather than written here, because a debug build and
 * a store build talk to different accounts of the same shape.
 *
 * A build with no address never talked to a vault at all: registration needs the same address, so
 * there is no account anywhere for it to have made. That is why an absent address is an answer here
 * rather than a fault, and the delete reads it as nothing to take.
 */

/** The variable the build carries it in. Expo inlines anything with this prefix at bundle time. */
export const vaultAddressVariable = 'EXPO_PUBLIC_EMI_VAULT_URL';

/**
 * An address with no trailing slash, so the path joined onto it has one slash and not two. The
 * signature covers the path, and a request sent to a path that is not the one signed is refused.
 */
export function withoutATrailingSlash(address: string): string {
  return address.replace(/\/+$/, '');
}

/**
 * The address, or nothing at all when this build has none.
 *
 * The variable is written out rather than read through the constant above, because the bundler
 * replaces `process.env.EXPO_PUBLIC_*` by finding it spelled out in the source. A read through a
 * name is not replaced, and it answers nothing on a phone while answering correctly under a test
 * runner, which is the shape of a fault that only appears once it is installed.
 */
export function vaultAddress(
  carried: string | undefined = process.env.EXPO_PUBLIC_EMI_VAULT_URL,
): string | null {
  const given = carried?.trim() ?? '';

  return given.length === 0 ? null : withoutATrailingSlash(given);
}
