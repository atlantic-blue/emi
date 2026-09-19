/**
 * Expo's runtime installs `structuredClone` from this package, and the package ships no types, so
 * the import is named here once rather than cast at the place it is installed.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const structuredCloneOf = require('@ungap/structured-clone').default as (held: unknown) => unknown;

export default structuredCloneOf;
